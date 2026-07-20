/**
 * 账户卡片列表组件
 * 以卡片形式展示账户，支持点击展开详情侧边栏
 */

import { Component, signal, inject, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { I18nService } from './i18n.service';
import { EmptyStateComponent } from './components/empty-state.component';
import { PersonaManagerComponent } from './components/persona-manager.component';
import { PersonaService, AIPersona } from './services/persona.service';

export interface Account {
  id: number;
  phone: string;
  apiId?: string;
  apiHash?: string;
  proxy?: string;
  group?: string;
  role?: string;
  status: 'Online' | 'Offline' | 'Banned' | 'Proxy Error' | 'Warming Up' | 'Cooldown';
  twoFactorPassword?: string;
  deviceModel?: string;
  systemVersion?: string;
  appVersion?: string;
  langCode?: string;
  platform?: string;
  deviceId?: string;
  proxyType?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  proxyCountry?: string;
  proxyRotationEnabled?: boolean;
  enableWarmup?: boolean;
  warmupStatus?: string;
  dailySendCount?: number;
  dailySendLimit?: number;
  healthScore?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  nickname?: string;
  notes?: string;
  bio?: string;
  avatarPath?: string;
  telegramId?: string;
  aiEnabled?: boolean;
  aiModel?: string;
  aiPersonality?: string;
  tags?: string[];  // 标签列表
  created_at?: string;
  updated_at?: string;
}

// 标签颜色预设
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// 分組
export interface AccountGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  accountCount?: number;
}

// ========== 帳號角色配置系統 ==========
// 角色配置介面
export interface AccountRoleConfig {
  id: string;           // 後端使用的角色ID（英文）
  name: string;         // 顯示名稱（中文）
  icon: string;         // 角色圖標
  color: string;        // 角色顏色
  description: string;  // 角色描述
  features: string[];   // 支持的功能列表
  priority: number;     // 自動分配優先級（數字越小優先級越高）
}

// 角色配置（可擴展）
export const ACCOUNT_ROLES: AccountRoleConfig[] = [
  {
    id: 'Listener',
    name: '監控號',
    icon: '👁️',
    color: '#22c55e',
    description: '監控群組消息，捕獲潛在客戶',
    features: ['群組監控', '關鍵詞匹配', 'Lead 捕獲'],
    priority: 1
  },
  {
    id: 'Sender',
    name: '發送號',
    icon: '📤',
    color: '#3b82f6',
    description: '發送消息給潛在客戶',
    features: ['消息發送', '自動回覆', '廣告群發', '私聊跟進'],
    priority: 2
  },
  {
    id: 'Explorer',
    name: '探索號',
    icon: '🔍',
    color: '#f59e0b',
    description: '發現新資源，加入群組',
    features: ['資源搜索', '群組加入', '成員提取', '鏈接分析'],
    priority: 3
  },
  {
    id: 'AI',
    name: 'AI號',
    icon: '🤖',
    color: '#8b5cf6',
    description: 'AI 自動聊天和智能回覆',
    features: ['AI 自動聊天', '智能回覆', '意圖分析'],
    priority: 4
  },
  {
    id: 'Backup',
    name: '備用號',
    icon: '⚡',
    color: '#06b6d4',
    description: '負載均衡和故障備援',
    features: ['負載均衡', '故障備援', '批量操作'],
    priority: 5
  },
  {
    id: 'Unassigned',
    name: '未分配',
    icon: '⭕',
    color: '#94a3b8',
    description: '新帳號，等待分配角色',
    features: [],
    priority: 99
  }
];

// 根據角色ID獲取角色配置
export function getRoleConfig(roleId: string): AccountRoleConfig {
  return ACCOUNT_ROLES.find(r => r.id === roleId) || ACCOUNT_ROLES.find(r => r.id === 'Unassigned')!;
}

// 獲取角色中文名
export function getRoleName(roleId: string): string {
  return getRoleConfig(roleId).name;
}

// 獲取角色圖標
export function getRoleIcon(roleId: string): string {
  return getRoleConfig(roleId).icon;
}

// 獲取角色顏色
export function getRoleColor(roleId: string): string {
  return getRoleConfig(roleId).color;
}

// 获取可分配的角色列表（排除未分配）
export function getAssignableRoles(): AccountRoleConfig[] {
  return ACCOUNT_ROLES.filter(r => r.id !== 'Unassigned');
}

// 预设标签
export const DEFAULT_TAGS: Tag[] = [
  { id: 'vip', name: 'VIP', color: '#f59e0b' },
  { id: 'active', name: '活跃', color: '#10b981' },
  { id: 'new', name: '新号', color: '#3b82f6' },
  { id: 'stable', name: '稳定', color: '#8b5cf6' },
  { id: 'test', name: '测试', color: '#6b7280' },
  { id: 'priority', name: '优先', color: '#ef4444' },
];

// 预设角色模板
export const ROLE_TEMPLATES = [
  { id: 'sales', name: '🛒 销售达人', description: '积极、善于引导购买' },
  { id: 'support', name: '💬 客服专员', description: '耐心、专业、解决问题' },
  { id: 'expert', name: '🎓 行业专家', description: '专业、权威、深度分析' },
  { id: 'friendly', name: '😊 亲和助手', description: '轻松、友善、闲聊式' },
  { id: 'efficient', name: '🤖 效率助手', description: '简洁、直接、快速响应' },
];

// AI 人設模板介面與预设模板已遷移至 services/persona.service.ts；此處 re-export 保持兼容
export { DEFAULT_AI_PERSONAS } from './services/persona.service';
export type { AIPersona } from './services/persona.service';

// 代理类型選項
export const PROXY_TYPES = [
  { id: 'none', name: '直連（無代理）' },
  { id: 'socks5', name: 'SOCKS5' },
  { id: 'http', name: 'HTTP/HTTPS' },
  { id: 'mtproto', name: 'MTProto' },
];

@Component({
  selector: 'app-account-card-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, PersonaManagerComponent],
  template: `
    <div class="account-card-list">
      <!-- 頂部工具欄 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              [placeholder]="t('accounts.searchPlaceholder')"
              class="search-input">
          </div>
          
          <select [(ngModel)]="statusFilter" class="filter-select">
            <option value="all">{{ t('accounts.allStatus') }}</option>
            <option value="Online">🟢 {{ t('accounts.online') }}</option>
            <option value="Offline">⚪ {{ t('accounts.offline') }}</option>
            <option value="Banned">🔴 {{ t('accounts.banned') }}</option>
            <option value="Warming Up">🟡 {{ t('accounts.warmingUp') }}</option>
          </select>

          <select [(ngModel)]="groupFilter" class="filter-select">
            <option value="all">{{ t('accounts.allGroups') }}</option>
            <option value="_ungrouped">📁 {{ t('accounts.ungrouped') }}</option>
            @for (group of groups(); track group.id) {
              <option [value]="group.id">📁 {{ group.name }}</option>
            }
          </select>

          <div class="tag-filter-dropdown">
            <button class="filter-btn" (click)="toggleTagFilter()">
              🏷️ {{ t('accounts.tags') }} @if (tagFilter.length > 0) { <span class="tag-count">{{ tagFilter.length }}</span> }
            </button>
            @if (showTagFilter()) {
              <div class="tag-dropdown">
                <div class="tag-dropdown-header">
                  <span>{{ t('accounts.selectTags') }}</span>
                  <button (click)="clearTagFilter()" class="clear-btn">{{ t('common.clear') }}</button>
                </div>
                @for (tag of availableTags(); track tag.id) {
                  <label class="tag-option" [style.--tag-color]="tag.color">
                    <input type="checkbox" [checked]="tagFilter.includes(tag.id)" (change)="toggleTagFilterItem(tag.id)">
                    <span class="tag-dot" [style.background]="tag.color"></span>
                    <span>{{ tag.name }}</span>
                  </label>
                }
                <button class="manage-tags-btn" (click)="openTagManager()">⚙️ {{ t('accounts.manageTags') }}</button>
              </div>
            }
          </div>
        </div>
        
        <div class="toolbar-right">
          <div class="view-toggle">
            <button 
              (click)="viewMode.set('card')"
              [class.active]="viewMode() === 'card'"
              class="toggle-btn"
              [title]="t('accounts.gridView')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button 
              (click)="viewMode.set('table')"
              [class.active]="viewMode() === 'table'"
              class="toggle-btn"
              [title]="t('accounts.listView')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="3" rx="1"/>
                <rect x="3" y="10" width="18" height="3" rx="1"/>
                <rect x="3" y="16" width="18" height="3" rx="1"/>
              </svg>
            </button>
          </div>
          
          <button (click)="openGroupManager()" class="manage-btn">
            📁 {{ t('accounts.manageGroups') }}
          </button>

          <button (click)="addAccount.emit()" class="add-btn">
            ➕ {{ t('accounts.addAccount') }}
          </button>
        </div>
      </div>

      <!-- 統計信息 + 批量操作 -->
      <div class="stats-bar">
        <div class="stats-left">
          <label class="batch-checkbox">
            <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll()">
            <span class="checkbox-label">{{ t('accounts.selectAll') }}</span>
          </label>
          <div class="stat-item">
            <span class="stat-dot online"></span>
            <span class="stat-label">{{ t('accounts.online') }}</span>
            <span class="stat-value">{{ onlineCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot offline"></span>
            <span class="stat-label">{{ t('accounts.offline') }}</span>
            <span class="stat-value">{{ offlineCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot banned"></span>
            <span class="stat-label">{{ t('accounts.banned') }}</span>
            <span class="stat-value">{{ bannedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('accounts.total') }}</span>
            <span class="stat-value">{{ accounts.length }}</span>
          </div>
        </div>
        
        @if (selectedIds.size > 0) {
          <div class="batch-actions">
            <span class="batch-count">已選 {{ selectedIds.size }} 個</span>
            <button (click)="batchLogin()" class="batch-btn success" [disabled]="batchLoggingIn()" title="批量登入離線帳號">
              {{ batchLoggingIn() ? '⏳' : '▶️' }} 批量登入
            </button>
            <button (click)="batchLogout()" class="batch-btn warning" [disabled]="batchLoggingOut()" title="批量退出在線帳號">
              {{ batchLoggingOut() ? '⏳' : '⏹️' }} 批量退出
            </button>
            <button (click)="openBatchEditModal()" class="batch-btn primary">
              ⚙️ 批量设置
            </button>
            <button (click)="batchSync()" class="batch-btn" [disabled]="batchSyncing()">
              🔄 批量同步
            </button>
            <button (click)="confirmBatchDelete()" class="batch-btn danger">
              🗑️ 批量删除
            </button>
            <button (click)="clearSelection()" class="batch-btn">
              ✕ 取消选择
            </button>
          </div>
        }
      </div>

      <!-- 卡片视图 -->
      @if (viewMode() === 'card') {
        <div class="card-grid">
          @for (account of filteredAccounts; track account.id) {
            <div 
              class="account-card" 
              [class.online]="account.status === 'Online'"
              [class.offline]="account.status === 'Offline'"
              [class.banned]="account.status === 'Banned'"
              [class.warming]="account.status === 'Warming Up'"
              [class.logging-in]="isLoggingIn(account.id) || account.status === 'Logging in...' || account.status === 'Waiting Code' || account.status === 'Waiting 2FA'"
              [class.selected]="selectedIds.has(account.id)"
              (click)="selectAccount(account)">
              
              <!-- 选择框 -->
              <div class="card-select" (click)="$event.stopPropagation()">
                <input 
                  type="checkbox" 
                  [checked]="selectedIds.has(account.id)" 
                  (change)="toggleSelect(account.id)">
              </div>
              
              <!-- 頭部：头像 + 状态 + 角色 -->
              <div class="card-header">
                @if (isValidAvatarPath(account.avatarPath)) {
                  <div class="card-avatar-wrapper">
                    <img [src]="getAvatarUrl(account.avatarPath!)" class="card-avatar-img" alt="" (error)="onAvatarError($event)">
                    <div class="card-avatar avatar-fallback" style="display: none;">{{ getAvatarLetter(account) }}</div>
                  </div>
                } @else {
                  <div class="card-avatar">{{ getAvatarLetter(account) }}</div>
                }
                <div class="card-status-role">
                  <div class="card-status">
                    <span class="status-dot" [class]="getStatusClass(account.status)"></span>
                    <span class="status-text">{{ getStatusText(account.status) }}</span>
                  </div>
                  <!-- 角色標籤（可點擊切換） -->
                  <div class="card-role" (click)="openRoleSelector(account, $event)">
                    <span class="role-icon">{{ getRoleIcon(account.role) }}</span>
                    <span class="role-name" [style.color]="getRoleColor(account.role)">{{ getRoleName(account.role) }}</span>
                    <span class="role-arrow">▼</span>
                  </div>
                </div>
              </div>
              
              <!-- 主要信息 -->
              <div class="card-main">
                @if (account.nickname) {
                  <div class="card-nickname">{{ account.nickname }}</div>
                }
                <div class="card-phone">{{ account.phone }}</div>
                <div class="card-name">
                  {{ account.firstName || '' }} {{ account.lastName || '' }}
                  @if (account.username) {
                    <span class="card-username">{{ '@' + account.username }}</span>
                  }
                </div>
                
                <!-- 标签顯示 -->
                @if (account.tags && account.tags.length > 0) {
                  <div class="card-tags">
                    @for (tagId of account.tags.slice(0, 3); track tagId) {
                      @if (getTagById(tagId); as tag) {
                        <span class="tag-badge" [style.background]="tag.color">{{ tag.name }}</span>
                      }
                    }
                    @if (account.tags.length > 3) {
                      <span class="tag-more">+{{ account.tags.length - 3 }}</span>
                    }
                  </div>
                }
              </div>
              
              <!-- 设备信息 -->
              <div class="card-device">
                <span class="device-icon">{{ getDeviceIcon(account.platform) }}</span>
                <span class="device-name">{{ account.deviceModel || 'Unknown Device' }}</span>
              </div>
              
              <!-- 健康度 -->
              <div class="card-health">
                <div class="health-bar">
                  <div 
                    class="health-fill" 
                    [style.width.%]="account.healthScore || 100"
                    [class.good]="(account.healthScore || 100) >= 80"
                    [class.warning]="(account.healthScore || 100) >= 50 && (account.healthScore || 100) < 80"
                    [class.danger]="(account.healthScore || 100) < 50">
                  </div>
                </div>
                <span class="health-text">{{ account.healthScore || 100 }}%</span>
              </div>
              
              <!-- 登入進度指示器（簡化版：僅 spinner，驗證碼輸入已移至獨立彈窗） -->
              @if (isLoggingIn(account.id) && account.status !== 'Waiting Code' && account.status !== 'Waiting 2FA') {
                <div class="login-progress-overlay" (click)="$event.stopPropagation()">
                  <div class="login-spinner"></div>
                  <span class="login-status-text">
                    {{ getLoginProgress(account.id)?.step || '正在連接...' }}
                  </span>
                  <button class="overlay-cancel-btn" (click)="cancelLogin(account)">取消</button>
                </div>
              }

              <!-- 快捷操作（帶文字标签） -->
              <div class="card-actions" (click)="$event.stopPropagation()">
                @if (canLogin(account) && !isLoggingIn(account.id)) {
                  <button (click)="openLoginModal(account)" class="action-btn login" title="登入账号">
                    <span class="action-icon">▶️</span>
                    <span class="action-label">登入</span>
                  </button>
                }
                @if (isLoggingIn(account.id) || account.status === 'Logging in...' || account.status === 'Waiting Code' || account.status === 'Waiting 2FA') {
                  <button class="action-btn logging-in" (click)="openLoginModal(account)" title="查看登入進度">
                    <span class="action-icon spinning">⏳</span>
                    <span class="action-label">登入中</span>
                  </button>
                }
                @if (account.status === 'Online') {
                  <button (click)="onLogout(account)" class="action-btn logout" title="退出账号">
                    <span class="action-icon">⏹️</span>
                    <span class="action-label">退出</span>
                  </button>
                }
                <button (click)="openEditModal(account); $event.stopPropagation()" class="action-btn edit" title="编辑设置">
                  <span class="action-icon">⚙️</span>
                  <span class="action-label">设置</span>
                </button>
                <button (click)="onRemove(account)" class="action-btn remove" title="删除账号" [disabled]="isLoggingIn(account.id)">
                  <span class="action-icon">🗑️</span>
                  <span class="action-label">删除</span>
                </button>
              </div>
            </div>
          }
          
        </div>
      }

      <!-- 表格视图 -->
      @if (viewMode() === 'table') {
        <div class="table-container">
          <table class="account-table">
            <thead>
              <tr>
                <th><input type="checkbox" [(ngModel)]="selectAll" (change)="toggleSelectAll()"></th>
                <th>状态</th>
                <th>手機號</th>
                <th>角色</th>
                <th>名稱</th>
                <th>设备</th>
                <th>健康度</th>
                <th>今日发送</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              @for (account of filteredAccounts; track account.id) {
                <tr [class.selected]="selectedIds.has(account.id)" (click)="selectAccount(account)">
                  <td (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="selectedIds.has(account.id)" (change)="toggleSelect(account.id)">
                  </td>
                  <td>
                    <span class="status-dot small" [class]="getStatusClass(account.status)"></span>
                  </td>
                  <td class="phone-cell">{{ account.phone }}</td>
                  <td class="role-cell">
                    <span class="role-tag-small" (click)="openRoleSelector(account, $event)"
                          [style.background]="getRoleColor(account.role) + '20'" 
                          [style.color]="getRoleColor(account.role)"
                          [style.border-color]="getRoleColor(account.role) + '40'">
                      {{ getRoleIcon(account.role) }} {{ getRoleName(account.role) }}
                    </span>
                  </td>
                  <td>{{ (account.firstName || '') + ' ' + (account.lastName || '') }}</td>
                  <td class="device-cell">{{ account.deviceModel || '-' }}</td>
                  <td>
                    <div class="health-inline">
                      <div class="health-bar small">
                        <div class="health-fill" [style.width.%]="account.healthScore || 100"></div>
                      </div>
                      <span>{{ account.healthScore || 100 }}%</span>
                    </div>
                  </td>
                  <td>{{ account.dailySendCount || 0 }}/{{ account.dailySendLimit || 50 }}</td>
                  <td class="actions-cell" (click)="$event.stopPropagation()">
                    @if (canLogin(account)) {
                      <button (click)="openLoginModal(account)" class="table-action login" title="登入账号">▶️</button>
                    }
                    @if (account.status === 'Online') {
                      <button (click)="onLogout(account)" class="table-action logout" title="退出账号">⏹️</button>
                    }
                    <button (click)="openEditModal(account); $event.stopPropagation()" class="table-action edit" title="账号设置">⚙️</button>
                    <button (click)="onRemove(account)" class="table-action remove" title="删除账号">🗑️</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- 空状态 -->
      @if (filteredAccounts.length === 0 && accounts.length === 0) {
        <app-empty-state iconKind="users"
                         [title]="t('accounts.noAccountsYet')"
                         [description]="t('accounts.clickToAddFirst')"
                         [ctaLabel]="t('accounts.addAccount')"
                         (cta)="addAccount.emit()">
        </app-empty-state>
      }

      @if (filteredAccounts.length === 0 && accounts.length > 0) {
        <app-empty-state iconKind="search"
                         title="emptyStates.accountsFiltered.title"
                         description="emptyStates.accountsFiltered.description">
        </app-empty-state>
      }
    </div>

    <!-- 账户详情側邊欄 -->
    @if (selectedAccount()) {
      <div class="detail-overlay" (click)="closeDetail()"></div>
      <div class="detail-panel" [class.open]="selectedAccount()">
        <div class="detail-header">
          <h3>账户详情</h3>
          <button (click)="closeDetail()" class="close-btn">×</button>
        </div>
        
        <div class="detail-content">
          <!-- 基本信息 -->
          <div class="detail-section">
            @if (isValidAvatarPath(selectedAccount()!.avatarPath)) {
              <div class="detail-avatar-wrapper">
                <img [src]="getAvatarUrl(selectedAccount()!.avatarPath!)" class="detail-avatar-img" alt="Avatar" (error)="onAvatarError($event)">
                <div class="detail-avatar avatar-fallback" style="display: none;">
                  {{ getAvatarLetter(selectedAccount()!) }}
                </div>
              </div>
            } @else {
              <div class="detail-avatar">
                {{ getAvatarLetter(selectedAccount()!) }}
              </div>
            }
            <div class="detail-nickname" *ngIf="selectedAccount()!.nickname">
              {{ selectedAccount()!.nickname }}
            </div>
            <div class="detail-name">
              {{ selectedAccount()!.firstName || '' }} {{ selectedAccount()!.lastName || '' }}
            </div>
            <div class="detail-phone">{{ selectedAccount()!.phone }}</div>
            @if (selectedAccount()!.username) {
              <div class="detail-username">{{ '@' + selectedAccount()!.username }}</div>
            }

            <!-- 角色標籤（醒目顯示） -->
            <div class="detail-role-badge" (click)="openRoleSelector(selectedAccount()!, $event)">
              <span class="role-icon-large" [style.background]="getRoleColor(selectedAccount()!.role) + '20'" [style.color]="getRoleColor(selectedAccount()!.role)">
                {{ getRoleIcon(selectedAccount()!.role) }}
              </span>
              <span class="role-label" [style.color]="getRoleColor(selectedAccount()!.role)">
                {{ getRoleName(selectedAccount()!.role) }}
              </span>
              <span class="role-change-hint">點擊更改</span>
            </div>

            @if (selectedAccount()!.bio) {
              <div class="detail-bio">{{ selectedAccount()!.bio }}</div>
            }
          </div>

          <!-- 状态信息 -->
          <div class="detail-section">
            <h4>📊 状态信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">登入状态</span>
                <span class="value status" [class]="getStatusClass(selectedAccount()!.status)">
                  {{ getStatusText(selectedAccount()!.status) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">健康分数</span>
                <span class="value">{{ selectedAccount()!.healthScore || 100 }}/100</span>
              </div>
              <div class="detail-item">
                <span class="label">今日发送</span>
                <span class="value">{{ selectedAccount()!.dailySendCount || 0 }}/{{ selectedAccount()!.dailySendLimit || 50 }}</span>
              </div>
              <div class="detail-item">
                <span class="label">角色</span>
                <div class="value role-value" (click)="openRoleSelector(selectedAccount()!, $event)">
                  <span class="role-badge" [style.background]="getRoleColor(selectedAccount()!.role) + '20'" [style.color]="getRoleColor(selectedAccount()!.role)">
                    {{ getRoleIcon(selectedAccount()!.role) }} {{ getRoleName(selectedAccount()!.role) }}
                  </span>
                  <span class="role-edit">✏️</span>
                </div>
              </div>
              <div class="detail-item">
                <span class="label">分組</span>
                <span class="value">{{ selectedAccount()!.group || '未分組' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="label">标签</span>
                <div class="detail-tags">
                  @if (selectedAccount()!.tags && selectedAccount()!.tags!.length > 0) {
                    @for (tagId of selectedAccount()!.tags!; track tagId) {
                      @if (getTagById(tagId); as tag) {
                        <span class="tag-badge" [style.background]="tag.color">{{ tag.name }}</span>
                      }
                    }
                  } @else {
                    <span class="no-tags">無标签</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- P1-5 + P2-3: 最近事件（含篩選 + 相對時間） -->
          <div class="detail-section">
            <div class="detail-events-header">
              <h4>📜 最近事件</h4>
              <div class="event-filter-tabs">
                @for (f of [
                  {id: 'all',             label: '全部'},
                  {id: 'login',           label: '登入'},
                  {id: 'logout',          label: '登出'},
                  {id: 'disconnect',      label: '斷開'},
                  {id: 'session_expired', label: '過期'},
                  {id: 'reconnect_ok',    label: '重連'}
                ]; track f.id) {
                  <button
                    class="event-filter-tab"
                    [class.active]="accountEventsFilter() === f.id"
                    (click)="accountEventsFilter.set($any(f.id))"
                  >{{ f.label }}</button>
                }
              </div>
            </div>
            @if (filteredAccountEvents().length > 0) {
              <ul class="detail-events-list">
                @for (ev of filteredAccountEvents(); track ev.created_at + ev.event_type) {
                  <li>
                    <span class="event-type" [ngClass]="getEventTypeClass(ev.event_type)">{{ getAccountEventLabel(ev.event_type) }}</span>
                    @if (ev.reason) { <span class="event-reason">— {{ ev.reason }}</span> }
                    <span class="event-time" [title]="ev.created_at">{{ formatRelativeTime(ev.created_at) }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="detail-events-empty">{{ accountEvents().length === 0 ? '暫無記錄' : '此類型無記錄' }}</p>
            }
          </div>

          <!-- 设备信息 -->
          <div class="detail-section">
            <h4>🔧 设备信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">设备型號</span>
                <span class="value">{{ selectedAccount()!.deviceModel || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">系統版本</span>
                <span class="value">{{ selectedAccount()!.systemVersion || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">平台</span>
                <span class="value">{{ selectedAccount()!.platform || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">API ID</span>
                <span class="value">{{ selectedAccount()!.apiId || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 代理设置 -->
          <div class="detail-section">
            <h4>🌐 代理设置</h4>
            <div class="detail-grid">
              <div class="detail-item full">
                <span class="label">代理地址</span>
                <span class="value">{{ selectedAccount()!.proxy || '直連（無代理）' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">代理类型</span>
                <span class="value">{{ selectedAccount()!.proxyType || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">代理国家</span>
                <span class="value">{{ selectedAccount()!.proxyCountry || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 登入進度指示（詳情面板） -->
        @if (isLoggingIn(selectedAccount()!.id) || selectedAccount()!.status === 'Logging in...' || selectedAccount()!.status === 'Waiting Code' || selectedAccount()!.status === 'Waiting 2FA') {
          <div class="detail-login-progress" (click)="openLoginModal(selectedAccount()!)" style="cursor: pointer;">
            <div class="login-spinner"></div>
            <span class="login-progress-text">
              @switch (selectedAccount()!.status) {
                @case ('Logging in...') { 正在連接中...（點擊查看） }
                @case ('Waiting Code') { 需要驗證碼（點擊輸入） }
                @case ('Waiting 2FA') { 需要二步驗證（點擊輸入） }
                @default { {{ getLoginProgress(selectedAccount()!.id)?.step || '處理中...' }} }
              }
            </span>
          </div>
        }

        <!-- 操作按钮 -->
        <div class="detail-actions-grid">
          @if (canLogin(selectedAccount()!) && !isLoggingIn(selectedAccount()!.id)) {
            <button (click)="openLoginModal(selectedAccount()!)" class="action-btn-sm primary">▶️ 登入</button>
          }
          @if (isLoggingIn(selectedAccount()!.id) || selectedAccount()!.status === 'Logging in...' || selectedAccount()!.status === 'Waiting Code' || selectedAccount()!.status === 'Waiting 2FA') {
            <button class="action-btn-sm logging-in" (click)="openLoginModal(selectedAccount()!)">⏳ 登入中...</button>
          }
          @if (selectedAccount()!.status === 'Online') {
            <button (click)="onLogout(selectedAccount()!)" class="action-btn-sm warning">⏹️ 退出</button>
          }
          <button (click)="syncAccountInfo(selectedAccount()!)" class="action-btn-sm" [disabled]="syncing()">
            {{ syncing() ? '⏳' : '🔄' }} 同步
          </button>
          <button (click)="openAccountTagEditor(selectedAccount()!)" class="action-btn-sm">🏷️ 标签</button>
          <button (click)="openPersonaManager(selectedAccount()!)" class="action-btn-sm">🤖 人設</button>
          <button (click)="onExport(selectedAccount()!)" class="action-btn-sm">📤 導出</button>
          <button (click)="openEditModal(selectedAccount()!)" class="action-btn-sm">✏️ 编辑</button>
          <button (click)="onRemove(selectedAccount()!)" class="action-btn-sm danger" [disabled]="isLoggingIn(selectedAccount()!.id)">🗑️ 删除</button>
        </div>
      </div>
    }

    <!-- 编辑账号弹窗 -->
    @if (showEditModal()) {
      <div class="modal-overlay" (click)="closeEditModal()"></div>
      <div class="modal-container">
        <div class="modal-header">
          <h3>✏️ 编辑账号</h3>
          <button (click)="closeEditModal()" class="close-btn">×</button>
        </div>
        
        <div class="modal-content">
          <!-- 選項卡导航 -->
          <div class="tab-nav">
            <button 
              (click)="editTab.set('basic')" 
              [class.active]="editTab() === 'basic'"
              class="tab-btn">
              📋 基本设置
            </button>
            <button 
              (click)="editTab.set('proxy')" 
              [class.active]="editTab() === 'proxy'"
              class="tab-btn">
              🌐 代理设置
            </button>
            <button 
              (click)="editTab.set('role')" 
              [class.active]="editTab() === 'role'"
              class="tab-btn">
              🎭 角色设置
            </button>
            <button 
              (click)="editTab.set('ai')" 
              [class.active]="editTab() === 'ai'"
              class="tab-btn">
              🤖 AI 设置
            </button>
          </div>

          <!-- 基本设置面板 -->
          @if (editTab() === 'basic') {
            <div class="tab-panel">
              <div class="form-group">
                <label>昵称</label>
                <input type="text" [(ngModel)]="editForm.nickname" placeholder="自定义昵称（方便识别）">
              </div>
              <div class="form-group">
                <label>备注</label>
                <textarea [(ngModel)]="editForm.notes" placeholder="添加备注信息..." rows="3"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>API ID</label>
                  <input type="text" [(ngModel)]="editForm.apiId" placeholder="从 my.telegram.org 获取">
                </div>
                <div class="form-group">
                  <label>API Hash</label>
                  <input type="text" [(ngModel)]="editForm.apiHash" placeholder="从 my.telegram.org 获取">
                </div>
              </div>
              <p class="form-hint">API 凭证用于连接 Telegram，可从 <a href="https://my.telegram.org" target="_blank">my.telegram.org</a> 获取</p>
              <div class="form-row">
                <div class="form-group">
                  <label>每日发送上限</label>
                  <input type="number" [(ngModel)]="editForm.dailySendLimit" min="1" max="500">
                </div>
                <div class="form-group">
                  <label>群組分類</label>
                  <input type="text" [(ngModel)]="editForm.group" placeholder="例如：營銷組A">
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editForm.enableWarmup">
                  <span>启用預熱模式</span>
                </label>
                <p class="form-hint">預熱模式會逐步增加每日发送量，降低封號風險</p>
              </div>
            </div>
          }

          <!-- 代理设置面板 -->
          @if (editTab() === 'proxy') {
            <div class="tab-panel">
              <div class="form-group">
                <label>代理类型</label>
                <select [(ngModel)]="editForm.proxyType" (ngModelChange)="onProxyTypeChange()">
                  @for (type of proxyTypes; track type.id) {
                    <option [value]="type.id">{{ type.name }}</option>
                  }
                </select>
              </div>
              
              @if (editForm.proxyType && editForm.proxyType !== 'none') {
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label>代理地址</label>
                    <input type="text" [(ngModel)]="editForm.proxyHost" placeholder="例如：127.0.0.1">
                  </div>
                  <div class="form-group flex-1">
                    <label>端口</label>
                    <input type="number" [(ngModel)]="editForm.proxyPort" placeholder="1080">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>用戶名（可選）</label>
                    <input type="text" [(ngModel)]="editForm.proxyUsername" placeholder="代理用戶名">
                  </div>
                  <div class="form-group">
                    <label>密碼（可選）</label>
                    <input type="password" [(ngModel)]="editForm.proxyPassword" placeholder="代理密碼">
                  </div>
                </div>

                <div class="form-group">
                  <label>代理国家/地區</label>
                  <select [(ngModel)]="editForm.proxyCountry">
                    <option value="">选择国家</option>
                    <option value="US">🇺🇸 美國</option>
                    <option value="JP">🇯🇵 日本</option>
                    <option value="SG">🇸🇬 新加坡</option>
                    <option value="HK">🇭🇰 香港</option>
                    <option value="TW">🇹🇼 台灣</option>
                    <option value="KR">🇰🇷 韓國</option>
                    <option value="DE">🇩🇪 德國</option>
                    <option value="UK">🇬🇧 英國</option>
                  </select>
                </div>

                <button (click)="testProxy()" class="test-btn" [disabled]="testingProxy()">
                  {{ testingProxy() ? '测试中...' : '🔍 测试代理连接' }}
                </button>
                
                @if (proxyTestResult()) {
                  <div class="test-result" [class.success]="proxyTestResult()!.success" [class.error]="!proxyTestResult()!.success">
                    {{ proxyTestResult()!.message }}
                  </div>
                }

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="editForm.proxyRotationEnabled">
                    <span>启用智能代理輪換</span>
                  </label>
                  <p class="form-hint">自动切換代理以避免 IP 被封</p>
                </div>
              }
            </div>
          }

          <!-- 角色设置面板 -->
          @if (editTab() === 'role') {
            <div class="tab-panel">
              <div class="form-group">
                <label>选择角色模板</label>
                <div class="role-grid">
                  @for (role of roleTemplates; track role.id) {
                    <div 
                      class="role-card" 
                      [class.selected]="editForm.role === role.id"
                      (click)="selectRole(role.id)">
                      <div class="role-name">{{ role.name }}</div>
                      <div class="role-desc">{{ role.description }}</div>
                    </div>
                  }
                </div>
              </div>
              
              <div class="form-group">
                <label>自定義角色名稱</label>
                <input type="text" [(ngModel)]="editForm.customRoleName" placeholder="例如：VIP客服小美">
              </div>
              
              <div class="form-group">
                <label>角色人設描述</label>
                <textarea [(ngModel)]="editForm.roleDescription" rows="4" 
                  placeholder="描述这个角色的性格特點、說話风格、专业領域等..."></textarea>
              </div>
            </div>
          }

          <!-- AI 设置面板 -->
          @if (editTab() === 'ai') {
            <div class="tab-panel">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editForm.aiEnabled">
                  <span>启用 AI 自动回复</span>
                </label>
              </div>
              
              @if (editForm.aiEnabled) {
                <!-- 人設选择 -->
                <div class="form-group">
                  <label>AI 人設</label>
                  <div class="persona-select-row">
                    <div class="current-persona" (click)="openPersonaManagerFromEdit()">
                      @if (editForm.aiPersonality && getPersonaById(editForm.aiPersonality); as persona) {
                        <span class="persona-icon-small">{{ persona.icon }}</span>
                        <span class="persona-name-small">{{ persona.name }}</span>
                      } @else {
                        <span class="no-persona">点击选择人設</span>
                      }
                      <span class="select-arrow">▼</span>
                    </div>
                    <button (click)="openPersonaManagerFromEdit()" class="btn-persona-manager">
                      🤖 人設庫
                    </button>
                  </div>
                  <p class="form-hint">人設决定了 AI 的性格和回复风格</p>
                </div>

                <div class="form-group">
                  <label>AI 模型</label>
                  <select [(ngModel)]="editForm.aiModel">
                    <option value="gpt-4-turbo">GPT-4 Turbo（推薦）</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo（快速）</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="ollama">本地 Ollama</option>
                  </select>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>創造力 {{ editForm.aiCreativity }}%</label>
                    <input type="range" [(ngModel)]="editForm.aiCreativity" min="0" max="100" step="5">
                  </div>
                  <div class="form-group">
                    <label>回复長度</label>
                    <select [(ngModel)]="editForm.aiResponseLength">
                      <option [ngValue]="0">简短</option>
                      <option [ngValue]="50">適中</option>
                      <option [ngValue]="100">详细</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="editForm.aiAutoReply">
                    <span>自动发送回复（無需確認）</span>
                  </label>
                  <p class="form-hint warning">⚠️ 启用後 AI 會自动发送回复，請確保已设置好人設</p>
                </div>

                <div class="form-group">
                  <label>禁止回复关鍵詞</label>
                  <input type="text" [(ngModel)]="editForm.aiBlockKeywords" 
                    placeholder="用逗號分隔，例如：退款,投訴,競品">
                  <p class="form-hint">包含這些关鍵詞的消息會標記為待人工處理</p>
                </div>
              }
            </div>
          }
        </div>

        <div class="modal-footer">
          <button (click)="closeEditModal()" class="btn-cancel">取消</button>
          <button (click)="saveEdit()" class="btn-save" [disabled]="saving()">
            {{ saving() ? '保存中...' : '💾 保存设置' }}
          </button>
        </div>
      </div>
    }

    <!-- 批量编辑弹窗 -->
    @if (showBatchEditModal()) {
      <div class="modal-overlay" (click)="closeBatchEditModal()"></div>
      <div class="modal-container batch-modal">
        <div class="modal-header">
          <h3>⚙️ 批量设置 - 已選 {{ selectedIds.size }} 個账号</h3>
          <button (click)="closeBatchEditModal()" class="close-btn">×</button>
        </div>
        
        <div class="modal-content">
          <div class="batch-warning">
            ⚠️ 以下勾选的设置将应用到所有選中的账号
          </div>

          <!-- 代理设置 -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableProxy">
              <span>🌐 代理设置</span>
            </label>
            @if (batchForm.enableProxy) {
              <div class="batch-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label>代理类型</label>
                    <select [(ngModel)]="batchForm.proxyType">
                      @for (type of proxyTypes; track type.id) {
                        <option [value]="type.id">{{ type.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group flex-2">
                    <label>代理地址</label>
                    <input type="text" [(ngModel)]="batchForm.proxyHost" placeholder="127.0.0.1">
                  </div>
                  <div class="form-group">
                    <label>端口</label>
                    <input type="number" [(ngModel)]="batchForm.proxyPort" placeholder="1080">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>用戶名（可選）</label>
                    <input type="text" [(ngModel)]="batchForm.proxyUsername">
                  </div>
                  <div class="form-group">
                    <label>密碼（可選）</label>
                    <input type="password" [(ngModel)]="batchForm.proxyPassword">
                  </div>
                  <div class="form-group">
                    <label>国家</label>
                    <select [(ngModel)]="batchForm.proxyCountry">
                      <option value="">选择</option>
                      <option value="US">🇺🇸 美國</option>
                      <option value="JP">🇯🇵 日本</option>
                      <option value="SG">🇸🇬 新加坡</option>
                      <option value="HK">🇭🇰 香港</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- 角色设置 -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableRole">
              <span>🎭 帳號角色設置</span>
            </label>
            @if (batchForm.enableRole) {
              <div class="batch-section-content">
                <div class="account-role-grid">
                  @for (role of assignableRoles; track role.id) {
                    <div
                      class="account-role-card"
                      [class.selected]="batchForm.role === role.id"
                      (click)="batchForm.role = role.id"
                      [style.border-color]="batchForm.role === role.id ? role.color : 'transparent'">
                      <span class="role-card-icon" [style.background]="role.color + '20'" [style.color]="role.color">{{ role.icon }}</span>
                      <div class="role-card-content">
                        <div class="role-card-name" [style.color]="role.color">{{ role.name }}</div>
                        <div class="role-card-desc">{{ role.description }}</div>
                      </div>
                      @if (batchForm.role === role.id) {
                        <span class="role-card-check" [style.color]="role.color">✓</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- AI 设置 -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableAI">
              <span>🤖 AI 设置</span>
            </label>
            @if (batchForm.enableAI) {
              <div class="batch-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="batchForm.aiEnabled">
                      <span>启用 AI 自动回复</span>
                    </label>
                  </div>
                  <div class="form-group">
                    <label>AI 模型</label>
                    <select [(ngModel)]="batchForm.aiModel">
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-sonnet">Claude 3</option>
                      <option value="ollama">本地 Ollama</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- 发送限制 -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableLimit">
              <span>📊 发送限制</span>
            </label>
            @if (batchForm.enableLimit) {
              <div class="batch-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label>每日发送上限</label>
                    <input type="number" [(ngModel)]="batchForm.dailySendLimit" min="1" max="500">
                  </div>
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="batchForm.enableWarmup">
                      <span>启用預熱模式</span>
                    </label>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- 分組设置 -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableGroup">
              <span>📁 分組设置</span>
            </label>
            @if (batchForm.enableGroup) {
              <div class="batch-section-content">
                <div class="form-group">
                  <label>分配到群組</label>
                  <input type="text" [(ngModel)]="batchForm.group" placeholder="例如：銷售組A">
                </div>
              </div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeBatchEditModal()" class="btn-cancel">取消</button>
          <button (click)="applyBatchEdit()" class="btn-save" [disabled]="batchSaving()">
            {{ batchSaving() ? '应用中...' : '✓ 应用到 ' + selectedIds.size + ' 個账号' }}
          </button>
        </div>
      </div>
    }

    <!-- 登入帳號彈窗 -->
    @if (showLoginModal()) {
      <div class="modal-overlay" (click)="closeLoginModal()"></div>
      <div class="modal-container login-modal">
        <div class="modal-header">
          <h3>
            @switch (loginStep()) {
              @case ('connecting') { 🔄 正在連接 }
              @case ('code') { 📲 驗證碼登入 }
              @case ('2fa') { 🔐 二步驗證 }
              @case ('success') { ✅ 登入成功 }
              @case ('error') { ❌ 登入失敗 }
            }
          </h3>
          <button (click)="closeLoginModal()" class="close-btn">×</button>
        </div>

        <div class="modal-content login-modal-content">
          @if (loginModalAccount(); as acc) {
            <div class="login-modal-phone">{{ acc.phone }}</div>

            @switch (loginStep()) {
              @case ('connecting') {
                <div class="login-modal-center">
                  <div class="login-spinner large"></div>
                  <p class="login-modal-hint">正在嘗試連接 Telegram 伺服器...</p>
                  <p class="login-modal-sub">這可能需要幾秒鐘</p>
                </div>
              }

              @case ('code') {
                <div class="login-modal-form">
                  <div class="code-sent-banner">
                    <span>✅</span>
                    <span>驗證碼已發送至 Telegram App</span>
                  </div>
                  <div class="form-group">
                    <label>驗證碼</label>
                    <input type="text"
                      class="code-input-large"
                      placeholder="請輸入 6 位驗證碼"
                      maxlength="6"
                      autofocus
                      [(ngModel)]="loginVerificationCode"
                      (keydown.enter)="submitLoginCode()">
                    <span class="input-hint">請查看 Telegram App 中收到的驗證碼</span>
                  </div>
                  <div class="login-modal-actions">
                    @if (loginResendCooldown() > 0) {
                      <span class="resend-countdown">{{ loginResendCooldown() }}s 後可重發</span>
                    } @else {
                      <button (click)="resendLoginCode()" class="btn-text">重新發送驗證碼</button>
                    }
                  </div>
                </div>
              }

              @case ('2fa') {
                <div class="login-modal-form">
                  <div class="form-group">
                    <label>二步驗證密碼</label>
                    <input type="password"
                      class="form-input"
                      placeholder="請輸入二步驗證密碼"
                      autofocus
                      [(ngModel)]="loginTwoFactorPassword"
                      (keydown.enter)="submitLoginCode()">
                    <span class="input-hint">此帳號啟用了兩步驗證，請輸入密碼</span>
                  </div>
                </div>
              }

              @case ('success') {
                <div class="login-modal-center">
                  <div class="login-success-icon">✅</div>
                  <p class="login-modal-hint">帳號已成功上線</p>
                </div>
              }

              @case ('error') {
                <div class="login-modal-center">
                  <div class="login-error-icon">⚠️</div>
                  <p class="login-modal-error">{{ loginErrorMessage() }}</p>
                </div>
              }
            }
          }
        </div>

        <div class="modal-footer">
          @switch (loginStep()) {
            @case ('connecting') {
              <button (click)="closeLoginModal()" class="btn-cancel">取消</button>
            }
            @case ('code') {
              <button (click)="closeLoginModal()" class="btn-cancel">取消</button>
              <button (click)="submitLoginCode()"
                class="btn-save"
                [disabled]="!loginVerificationCode || loginSubmitting()">
                {{ loginSubmitting() ? '驗證中...' : '確認登入' }}
              </button>
            }
            @case ('2fa') {
              <button (click)="closeLoginModal()" class="btn-cancel">取消</button>
              <button (click)="submitLoginCode()"
                class="btn-save"
                [disabled]="!loginTwoFactorPassword || loginSubmitting()">
                {{ loginSubmitting() ? '驗證中...' : '確認登入' }}
              </button>
            }
            @case ('success') {
              <button (click)="closeLoginModal()" class="btn-save">完成</button>
            }
            @case ('error') {
              <button (click)="closeLoginModal()" class="btn-cancel">關閉</button>
              <button (click)="retryLogin()" class="btn-save">重試</button>
            }
          }
        </div>
      </div>
    }

    <!-- P1-4: 批量登入結果彈窗 -->
    @if (showBatchLoginModal()) {
      <div class="modal-overlay" (click)="closeBatchLoginModal()"></div>
      <div class="modal-container batch-login-modal">
        <div class="modal-header">
          <h3>📋 批量登入結果</h3>
          <button (click)="closeBatchLoginModal()" class="close-btn">×</button>
        </div>
        <div class="modal-content batch-login-content">
          <p class="batch-login-summary">
            共 {{ batchLoginTotal() }} 個帳號 ·
            @if (batchLoggingIn()) { 正在發送請求... }
            @else { 已全部發送 }
          </p>
          <div class="batch-login-stats">
            <div class="batch-stat success">
              <span class="stat-num">{{ batchLoginSuccessIds().length }}</span>
              <span class="stat-label">成功</span>
            </div>
            <div class="batch-stat need-code">
              <span class="stat-num">{{ batchLoginNeedCodeIds().length }}</span>
              <span class="stat-label">需驗證碼</span>
            </div>
            <div class="batch-stat failed">
              <span class="stat-num">{{ batchLoginFailed().length }}</span>
              <span class="stat-label">失敗</span>
            </div>
          </div>
          @if (batchLoginNeedCodeIds().length > 0) {
            <div class="batch-login-section">
              <div class="batch-need-code-header">
                <h4>📲 需要輸入驗證碼</h4>
                @if (batchLoginNeedCodeIds().length > 1) {
                  <!-- P2-5: 一鍵逐個補驗證碼 -->
                  <button
                    type="button"
                    class="btn-batch-fill-code"
                    (click)="startBatchCodeQueue()"
                    title="依序打開每個帳號的驗證碼輸入視窗"
                  >⚡ 逐個輸入 ({{ batchLoginNeedCodeIds().length }})</button>
                }
              </div>
              <ul class="batch-account-list">
                @for (id of batchLoginNeedCodeIds(); track id) {
                  @if (getAccountById(id); as acc) {
                    <li>
                      <button type="button" class="batch-account-btn" (click)="openLoginModal(acc)">
                        {{ acc.phone }}
                      </button>
                    </li>
                  }
                }
              </ul>
            </div>
          }
          @if (batchLoginFailed().length > 0) {
            <div class="batch-login-section">
              <h4>❌ 登入失敗</h4>
              <ul class="batch-failed-list">
                @for (item of batchLoginFailed(); track item.accountId) {
                  <li><span class="phone">{{ item.phone }}</span> — {{ item.message }}</li>
                }
              </ul>
            </div>
          }
        </div>
        <div class="modal-footer">
          <button (click)="closeBatchLoginModal()" class="btn-save">關閉</button>
        </div>
      </div>
    }

    <!-- 标签管理弹窗 -->
    @if (showTagManager()) {
      <div class="modal-overlay" (click)="closeTagManager()"></div>
      <div class="modal-container tag-manager-modal">
        <div class="modal-header">
          <h3>🏷️ 标签管理</h3>
          <button (click)="closeTagManager()" class="close-btn">×</button>
        </div>
        
        <div class="modal-content">
          <!-- 新增标签 -->
          <div class="add-tag-form">
            <input type="text" [(ngModel)]="newTagName" placeholder="标签名稱" class="tag-input">
            <input type="color" [(ngModel)]="newTagColor" class="color-picker">
            <button (click)="addTag()" class="btn-add" [disabled]="!newTagName.trim()">➕ 添加</button>
          </div>

          <!-- 标签列表 -->
          <div class="tag-list">
            @for (tag of availableTags(); track tag.id) {
              <div class="tag-item">
                <span class="tag-preview" [style.background]="tag.color">{{ tag.name }}</span>
                <input type="text" [(ngModel)]="tag.name" class="tag-edit-input">
                <input type="color" [(ngModel)]="tag.color" class="color-picker small">
                <button (click)="deleteTag(tag.id)" class="btn-delete">🗑️</button>
              </div>
            }
            @if (availableTags().length === 0) {
              <div class="empty-state">暂无标签，請添加</div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeTagManager()" class="btn-cancel">取消</button>
          <button (click)="saveTags()" class="btn-save">💾 保存标签</button>
        </div>
      </div>
    }

    <!-- 分組管理弹窗 -->
    @if (showGroupManager()) {
      <div class="modal-overlay" (click)="closeGroupManager()"></div>
      <div class="modal-container group-manager-modal">
        <div class="modal-header">
          <h3>📁 分組管理</h3>
          <button (click)="closeGroupManager()" class="close-btn">×</button>
        </div>
        
        <div class="modal-content">
          <!-- 新增分組 -->
          <div class="add-group-form">
            <input type="text" [(ngModel)]="newGroupName" placeholder="分組名稱" class="group-input">
            <input type="color" [(ngModel)]="newGroupColor" class="color-picker">
            <button (click)="addGroup()" class="btn-add" [disabled]="!newGroupName.trim()">➕ 添加</button>
          </div>

          <!-- 分組列表 -->
          <div class="group-list">
            @for (group of groups(); track group.id) {
              <div class="group-item">
                <div class="group-color-bar" [style.background]="group.color || '#6b7280'"></div>
                <div class="group-info">
                  <input type="text" [(ngModel)]="group.name" class="group-edit-input">
                  <span class="group-count">{{ getGroupAccountCount(group.id) }} 個账号</span>
                </div>
                <input type="color" [(ngModel)]="group.color" class="color-picker small">
                <button (click)="deleteGroup(group.id)" class="btn-delete">🗑️</button>
              </div>
            }
            @if (groups().length === 0) {
              <div class="empty-state">暂无分組，請添加</div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeGroupManager()" class="btn-cancel">取消</button>
          <button (click)="saveGroups()" class="btn-save">💾 保存分組</button>
        </div>
      </div>
    }

    <!-- 账号标签编辑弹窗 -->
    @if (showAccountTagEditor()) {
      <div class="modal-overlay" (click)="closeAccountTagEditor()"></div>
      <div class="modal-container account-tag-modal">
        <div class="modal-header">
          <h3>🏷️ 编辑标签 - {{ editingTagAccount()?.phone }}</h3>
          <button (click)="closeAccountTagEditor()" class="close-btn">×</button>
        </div>
        
        <div class="modal-content">
          <div class="account-tags-grid">
            @for (tag of availableTags(); track tag.id) {
              <label class="account-tag-option" [class.selected]="accountTagsSelection.has(tag.id)">
                <input 
                  type="checkbox" 
                  [checked]="accountTagsSelection.has(tag.id)" 
                  (change)="toggleAccountTag(tag.id)">
                <span class="tag-badge large" [style.background]="tag.color">{{ tag.name }}</span>
              </label>
            }
          </div>
          @if (availableTags().length === 0) {
            <div class="empty-state">
              暂无标签，请先创建标签
            </div>
          }
          
          <!-- 快速添加标签 -->
          <div class="quick-add-tag">
            <div class="quick-add-form">
              <input type="text" [(ngModel)]="newTagName" placeholder="输入新标签名称" class="tag-input-inline">
              <input type="color" [(ngModel)]="newTagColor" class="color-picker-inline">
              <button (click)="quickAddTag()" class="btn-quick-add" [disabled]="!newTagName.trim()">➕ 添加</button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="openTagManagerFromEditor()" class="btn-manage">⚙️ 管理标签</button>
          <div class="footer-actions">
            <button (click)="closeAccountTagEditor()" class="btn-cancel">取消</button>
            <button (click)="saveAccountTags()" class="btn-save">💾 保存</button>
          </div>
        </div>
      </div>
    }

    <!-- AI 人設管理（拆分後的子組件：管理+編輯雙彈窗） -->
    <app-persona-manager
      [visible]="showPersonaManager()"
      [initialPersonaId]="personaInitialId()"
      (closed)="closePersonaManager()"
      (applied)="onPersonaApplied($event)">
    </app-persona-manager>

    <!-- 角色選擇器彈出框 -->
    @if (showRoleSelector()) {
      <div class="role-selector-overlay" (click)="closeRoleSelector()"></div>
      <div class="role-selector-popup" [style.top.px]="roleSelectorPosition().top" [style.left.px]="roleSelectorPosition().left">
        <div class="role-selector-header">
          <span class="role-selector-title">選擇角色</span>
          <span class="role-selector-phone">{{ roleSelectorAccount()?.phone }}</span>
        </div>
        <div class="role-selector-list">
          @for (role of assignableRoles; track role.id) {
            <div 
              class="role-option" 
              [class.active]="roleSelectorAccount()?.role === role.id"
              (click)="changeAccountRole(role.id)">
              <span class="role-option-icon" [style.background]="role.color + '20'" [style.color]="role.color">{{ role.icon }}</span>
              <div class="role-option-info">
                <span class="role-option-name">{{ role.name }}</span>
                <span class="role-option-desc">{{ role.description }}</span>
              </div>
              @if (roleSelectorAccount()?.role === role.id) {
                <span class="role-option-check">✓</span>
              }
            </div>
          }
        </div>
        <div class="role-selector-footer">
          <button (click)="closeRoleSelector()" class="role-selector-cancel">取消</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .account-card-list {
      padding: 1rem;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .toolbar-left {
      display: flex;
      gap: 0.75rem;
      flex: 1;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      flex: 1;
      max-width: 300px;
    }

    .search-icon { font-size: 0.875rem; }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 0.875rem;
      outline: none;
    }

    .filter-select {
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .toolbar-right {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .view-toggle {
      display: flex;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .toggle-btn {
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .toggle-btn.active {
      background: var(--primary);
      color: white;
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .add-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }

    .add-btn.large {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border-radius: 0.5rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .stats-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .batch-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .batch-checkbox input {
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }

    .checkbox-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .batch-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .batch-count {
      font-size: 0.875rem;
      color: var(--primary);
      font-weight: 500;
      margin-right: 0.5rem;
    }

    .batch-btn {
      padding: 0.375rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .batch-btn:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }

    .batch-btn.primary {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      color: white;
    }

    .batch-btn.primary:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .batch-btn.danger:hover:not(:disabled) {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .batch-btn.success {
      border-color: #22c55e;
      color: #22c55e;
    }

    .batch-btn.success:hover:not(:disabled) {
      background: rgba(34, 197, 94, 0.1);
    }

    .batch-btn.warning {
      border-color: #f59e0b;
      color: #f59e0b;
    }

    .batch-btn.warning:hover:not(:disabled) {
      background: rgba(245, 158, 11, 0.1);
    }

    .batch-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .stat-dot.online { background: #22c55e; }
    .stat-dot.offline { background: #94a3b8; }
    .stat-dot.banned { background: #ef4444; }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .stat-value {
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Card Grid */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    /* Account Card */
    .account-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.75rem;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
    }

    .account-card.selected {
      border-color: var(--primary);
      background: rgba(6, 182, 212, 0.1);
    }

    .card-select {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 2;
    }

    .card-select input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary);
      cursor: pointer;
    }

    .account-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .account-card.online { 
      border-left: 3px solid #22c55e;
      box-shadow: inset 0 0 20px rgba(34, 197, 94, 0.05);
    }
    .account-card.online:hover {
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2), inset 0 0 20px rgba(34, 197, 94, 0.05);
    }
    .account-card.offline { border-left: 3px solid #94a3b8; }
    .account-card.banned { 
      border-left: 3px solid #ef4444;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), transparent);
    }
    .account-card.warming { 
      border-left: 3px solid #f59e0b;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent);
    }

    /* 登入中狀態 */
    .account-card.logging-in {
      border-left: 3px solid #06b6d4;
      animation: card-pulse 2s ease-in-out infinite;
    }

    @keyframes card-pulse {
      0%, 100% { box-shadow: 0 2px 8px rgba(6, 182, 212, 0.1); }
      50% { box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3); }
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .card-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: bold;
      color: white;
      flex-shrink: 0;
    }

    .card-avatar-img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .card-nickname {
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 500;
      margin-bottom: 0.125rem;
    }

    .card-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-status-role {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      flex: 1;
    }

    .card-role {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.75rem;
    }

    .card-role:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
    }

    .role-icon {
      font-size: 0.875rem;
    }

    .role-name {
      font-weight: 500;
    }

    .role-arrow {
      font-size: 0.625rem;
      color: var(--text-muted);
      margin-left: auto;
    }

    /* 角色選擇器彈出框 */
    .role-selector-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 1000;
    }

    .role-selector-popup {
      position: fixed;
      width: 260px;
      background: var(--bg-card);
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.75rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      z-index: 1001;
      overflow: hidden;
    }

    .role-selector-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .role-selector-title {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .role-selector-phone {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .role-selector-list {
      max-height: 320px;
      overflow-y: auto;
    }

    .role-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .role-option:hover {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
    }

    .role-option.active {
      background: rgba(6, 182, 212, 0.1);
    }

    .role-option-icon {
      width: 36px;
      height: 36px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .role-option-info {
      flex: 1;
      min-width: 0;
    }

    .role-option-name {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .role-option-desc {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-option-check {
      color: #22c55e;
      font-weight: bold;
    }

    .role-selector-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      display: flex;
      justify-content: flex-end;
    }

    .role-selector-cancel {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.75rem;
    }

    .role-selector-cancel:hover {
      border-color: var(--text-muted);
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-dot.small {
      width: 8px;
      height: 8px;
    }

    .status-dot.online { 
      background: #22c55e;
      animation: pulse-online 2s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
    }
    .status-dot.offline { background: #94a3b8; }
    .status-dot.banned { 
      background: #ef4444;
      animation: pulse-banned 1.5s ease-in-out infinite;
    }
    .status-dot.warning { 
      background: #f59e0b;
      animation: pulse-warning 2s ease-in-out infinite;
    }
    .status-dot.connecting {
      background: #06b6d4;
      animation: pulse-connecting 1s ease-in-out infinite;
    }
    .status-dot.disconnected {
      background: #f97316;
    }
    .status-dot.error {
      background: #ef4444;
    }

    @keyframes pulse-online {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    @keyframes pulse-connecting {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    @keyframes pulse-banned {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes pulse-warning {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .status-text {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-main {
      flex: 1;
    }

    .card-phone {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-name {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .card-username {
      color: var(--primary);
    }

    .card-device {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .device-icon { font-size: 1rem; }

    .card-health {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .health-bar {
      flex: 1;
      height: 4px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 2px;
      overflow: hidden;
    }

    .health-bar.small {
      width: 50px;
    }

    .health-fill {
      height: 100%;
      transition: width 0.3s;
    }

    .health-fill.good { background: #22c55e; }
    .health-fill.warning { background: #f59e0b; }
    .health-fill.danger { background: #ef4444; }

    .health-text {
      font-size: 0.75rem;
      color: var(--text-muted);
      min-width: 35px;
    }

    .card-actions {
      display: flex;
      gap: 0.5rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      padding-top: 0.75rem;
    }

    .action-btn {
      padding: 0.375rem 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
      transform: translateY(-1px);
    }

    .action-btn.login {
      color: #22c55e;
    }
    .action-btn.login:hover:not(:disabled) { 
      background: rgba(34, 197, 94, 0.15);
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
    }

    .action-btn.logout {
      color: #f59e0b;
    }
    .action-btn.logout:hover:not(:disabled) { 
      background: rgba(245, 158, 11, 0.15);
    }

    .action-btn.edit {
      color: #3b82f6;
    }
    .action-btn.edit:hover:not(:disabled) { 
      background: rgba(59, 130, 246, 0.15);
    }

    .action-btn.remove {
      color: #94a3b8;
    }
    .action-btn.remove:hover:not(:disabled) { 
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .action-label {
      font-size: 0.75rem;
    }

    .action-btn.logging-in {
      background: rgba(6, 182, 212, 0.2);
      cursor: pointer;
      opacity: 0.9;
    }
    .action-btn.logging-in:hover {
      background: rgba(6, 182, 212, 0.3);
      opacity: 1;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-icon.spinning {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* 登入進度覆蓋層 */
    .login-progress-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      z-index: 10;
      border-radius: 0.75rem;
    }

    .overlay-cancel-btn {
      margin-top: 0.25rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 0.375rem;
      background: transparent;
      color: rgba(255,255,255,0.6);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .overlay-cancel-btn:hover { color: #fff; border-color: rgba(255,255,255,0.4); }

    /* ===== 登入彈窗樣式 ===== */
    .login-modal { max-width: 420px; }

    .login-modal-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .login-modal-phone {
      text-align: center;
      font-size: 1.1rem;
      font-weight: 600;
      color: #e2e8f0;
      padding: 0.5rem;
      background: rgba(6, 182, 212, 0.1);
      border-radius: 0.5rem;
      letter-spacing: 0.05em;
    }

    .login-modal-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 0;
    }

    .login-spinner.large {
      width: 48px;
      height: 48px;
      border-width: 4px;
    }

    .login-modal-hint {
      color: #94a3b8;
      font-size: 0.9rem;
      text-align: center;
    }

    .login-modal-sub {
      color: #64748b;
      font-size: 0.8rem;
      text-align: center;
    }

    .login-modal-error {
      color: #f87171;
      font-size: 0.9rem;
      text-align: center;
      line-height: 1.5;
    }
`, `    .login-success-icon, .login-error-icon {
      font-size: 2.5rem;
    }

    .login-modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .code-sent-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.25);
      border-radius: 0.5rem;
      color: #4ade80;
      font-size: 0.85rem;
    }

    .code-input-large {
      width: 100%;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary);
      font-size: 1.5rem;
      letter-spacing: 0.5rem;
      text-align: center;
      transition: border-color 0.2s;
      outline: none;
    }
    .code-input-large:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15);
    }

    .login-modal-actions {
      display: flex;
      justify-content: center;
    }

    .resend-countdown {
      color: #64748b;
      font-size: 0.85rem;
    }

    .btn-text {
      background: none;
      border: none;
      color: #06b6d4;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem 0.5rem;
      transition: color 0.2s;
    }
    .btn-text:hover { color: #22d3ee; }

    .input-hint {
      display: block;
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* P1-4: 批量登入結果彈窗 */
    .batch-login-modal { max-width: 480px; }
    .batch-login-content { padding: 1rem 1.5rem; }
    .batch-login-summary {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .batch-login-stats {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1.25rem;
    }
    .batch-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .batch-stat .stat-num { font-size: 1.5rem; font-weight: 700; }
    .batch-stat.success .stat-num { color: #22c55e; }
    .batch-stat.need-code .stat-num { color: #06b6d4; }
    .batch-stat.failed .stat-num { color: #f87171; }
    .batch-stat .stat-label { font-size: 0.75rem; color: #64748b; }
    .batch-login-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }
    .batch-login-section h4 { font-size: 0.9rem; margin-bottom: 0.5rem; color: #e2e8f0; }
    .batch-account-list, .batch-failed-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .batch-account-list li, .batch-failed-list li { margin-bottom: 0.35rem; }
    .batch-account-btn {
      background: none;
      border: none;
      color: #06b6d4;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.2rem 0;
      text-align: left;
      transition: color 0.2s;
    }
    .batch-account-btn:hover { color: #22d3ee; text-decoration: underline; }
    .batch-failed-list .phone { color: #94a3b8; margin-right: 0.25rem; }
    .batch-failed-list li { font-size: 0.85rem; color: #f87171; }

    /* P1-5 + P2-3: 詳情面板最近事件 */
    .detail-events-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .detail-events-header h4 { margin: 0; }
    .event-filter-tabs {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .event-filter-tab {
      background: rgba(148, 163, 184, 0.1);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      transition: all 0.15s;
    }
    .event-filter-tab:hover { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
    .event-filter-tab.active { background: rgba(6, 182, 212, 0.2); border-color: #06b6d4; color: #06b6d4; font-weight: 600; }
    .detail-events-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8rem;
    }
    .detail-events-list li {
      padding: 0.35rem 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
    }
    .detail-events-list .event-type { font-weight: 500; }
    .detail-events-list .event-type-login    { color: #4ade80; }
    .detail-events-list .event-type-logout   { color: #94a3b8; }
    .detail-events-list .event-type-disconnect { color: #f87171; }
    .detail-events-list .event-type-expired  { color: #fb923c; }
    .detail-events-list .event-type-reconnect { color: #06b6d4; }
    .detail-events-list .event-reason { color: #94a3b8; font-size: 0.75rem; }
    .detail-events-list .event-time { color: #64748b; margin-left: auto; font-size: 0.75rem; }
    .detail-events-empty { color: #64748b; font-size: 0.85rem; margin: 0; }

    /* P2-5: 批量補碼一鍵按鈕 */
    .batch-need-code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .batch-need-code-header h4 { margin: 0; font-size: 0.9rem; color: #e2e8f0; }
    .btn-batch-fill-code {
      background: linear-gradient(135deg, #06b6d4, #0e7490);
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      transition: opacity 0.2s;
    }
    .btn-batch-fill-code:hover { opacity: 0.85; }

    .login-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(6, 182, 212, 0.3);
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .login-status-text {
      font-size: 0.875rem;
      color: #06b6d4;
      font-weight: 500;
    }

    /* 詳情面板登入進度 */
    .detail-login-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .login-progress-text {
      font-size: 0.875rem;
      color: #06b6d4;
    }

    .action-btn-sm.logging-in {
      background: rgba(6, 182, 212, 0.2);
      color: #06b6d4;
      cursor: not-allowed;
    }

    /* Add Card */

    .add-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .add-text { color: var(--text-muted); }

    /* Table View */
    .table-container {
      overflow-x: auto;
    }

    .account-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .account-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
    }

    .account-table td {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .account-table tr:hover {
      background: rgba(6, 182, 212, 0.05);
    }

    .account-table tr.selected {
      background: rgba(6, 182, 212, 0.1);
    }

    .phone-cell {
      font-weight: 500;
      color: var(--text-primary);
    }

    .device-cell {
      font-size: 0.75rem;
    }

    .health-inline {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .table-action {
      padding: 0.25rem;
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .table-action:hover { opacity: 1; }
    .table-action.login:hover { background: rgba(34, 197, 94, 0.2); border-radius: 4px; }
    .table-action.logout:hover { background: rgba(245, 158, 11, 0.2); border-radius: 4px; }
    .table-action.edit:hover { background: rgba(59, 130, 246, 0.2); border-radius: 4px; }
    .table-action.remove:hover { background: rgba(239, 68, 68, 0.2); border-radius: 4px; }

    /* 表格角色標籤 */
    .role-cell {
      min-width: 80px;
    }

    .role-tag-small {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .role-tag-small:hover {
      filter: brightness(1.1);
      transform: scale(1.02);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border-radius: 0.75rem;
      border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));
    }

    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    .empty-state p {
      margin: 0 0 1.5rem 0;
      color: var(--text-muted);
    }

    /* Detail Panel */
    .detail-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 40;
    }

    .detail-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 100%;
      height: 100vh;
      background: var(--bg-card, rgb(30, 41, 59));
      border-left: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      z-index: 50;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s;
    }

    .detail-panel.open {
      transform: translateX(0);
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .detail-header h3 {
      margin: 0;
      color: var(--text-primary);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
    }

    .detail-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-section:first-child {
      text-align: center;
    }

    .detail-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: bold;
      color: white;
      margin: 0 auto 0.75rem;
    }

    .detail-avatar-img {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 0.75rem;
      border: 3px solid var(--primary);
    }

    .detail-nickname {
      font-size: 0.875rem;
      color: var(--primary);
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .detail-bio {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
      text-align: left;
    }

    .detail-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .detail-phone {
      color: var(--text-secondary);
    }

    .detail-username {
      color: var(--primary);
      font-size: 0.875rem;
    }

    /* 詳情面板角色標籤 */
    .detail-role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .detail-role-badge:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
    }

    .role-icon-large {
      width: 32px;
      height: 32px;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
    }

    .role-label {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .role-change-hint {
      font-size: 0.625rem;
      color: var(--text-muted);
      margin-left: 0.25rem;
    }

    /* 狀態信息中的角色 */
    .role-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .role-edit {
      font-size: 0.75rem;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .role-value:hover .role-edit {
      opacity: 1;
    }

    .detail-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item.full {
      grid-column: span 2;
    }

    .detail-item .label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .detail-item .value {
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .detail-item .value.status.online { color: #22c55e; }
    .detail-item .value.status.offline { color: #94a3b8; }
    .detail-item .value.status.banned { color: #ef4444; }

    .detail-actions-grid {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
    }

    .action-btn-sm {
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .action-btn-sm:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }

    .action-btn-sm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn-sm.primary {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-color: transparent;
      color: white;
    }

    .action-btn-sm.warning {
      background: rgba(245, 158, 11, 0.2);
      border-color: #f59e0b;
      color: #fcd34d;
    }

    .action-btn-sm.danger {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .action-btn-sm.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
    }

    .detail-btn.primary {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }

    .detail-btn.secondary {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      color: var(--text-secondary);
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
    }

    .detail-btn.warning {
      background: rgba(245, 158, 11, 0.2);
      color: #fcd34d;
    }

    .detail-btn.danger {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    /* Action Button with Labels */
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 0.375rem 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 48px;
    }

    .action-icon { font-size: 1rem; }
    .action-label { 
      font-size: 0.625rem; 
      color: var(--text-muted);
    }

    .action-btn:hover .action-label {
      color: var(--text-primary);
    }

    .action-btn.login:hover { background: rgba(34, 197, 94, 0.2); }
    .action-btn.logout:hover { background: rgba(245, 158, 11, 0.2); }
    .action-btn.edit:hover { background: rgba(59, 130, 246, 0.2); }
    .action-btn.remove:hover { background: rgba(239, 68, 68, 0.2); }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      backdrop-filter: blur(4px);
    }

    .modal-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 560px;
      max-width: 95vw;
      max-height: 90vh;
      background: var(--bg-card, rgb(30, 41, 59));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 1rem;
      z-index: 101;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
`, `    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .modal-header h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 1.125rem;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    /* Tab Navigation */
    .tab-nav {
      display: flex;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      padding: 0 1rem;
      overflow-x: auto;
    }

    .tab-btn {
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: var(--text-primary);
    }

    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-panel {
      padding: 1.5rem;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group input[type="password"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-row .form-group {
      flex: 1;
    }

    .form-row .form-group.flex-2 { flex: 2; }
    .form-row .form-group.flex-1 { flex: 1; }

    .form-hint {
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .form-hint.warning {
      color: #f59e0b;
    }

    .checkbox-label {
      display: flex !important;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }

    /* Role Grid */
    .role-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .role-card {
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 2px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .role-card:hover {
      border-color: var(--primary);
      background: rgba(6, 182, 212, 0.1);
    }

    .role-card.selected {
      border-color: var(--primary);
      background: rgba(6, 182, 212, 0.2);
    }

    .role-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .role-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Slider */

    /* Test Button */
    .test-btn {
      width: 100%;
      padding: 0.625rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 0.75rem;
    }

    .test-btn:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }

    .test-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .test-result {
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .test-result.success {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }

    .test-result.error {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    /* Modal Buttons */
    .btn-cancel {
      padding: 0.625rem 1.25rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
    }

    .btn-save {
      padding: 0.625rem 1.25rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Batch Modal Styles */
    .batch-modal {
      width: 640px;
      max-height: 85vh;
    }

    .batch-warning {
      padding: 0.75rem 1rem;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 0.5rem;
      color: #fcd34d;
      font-size: 0.875rem;
      margin: 1rem 1.5rem;
    }

    .batch-section {
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 0.5rem;
      margin: 0 1.5rem 1rem;
      overflow: hidden;
    }

    .batch-section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .batch-section-header input {
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }

    .batch-section-content {
      padding: 1rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .role-grid.compact {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.5rem;
    }

    .role-grid.compact .role-card {
      padding: 0.5rem;
    }

    .role-grid.compact .role-name {
      font-size: 0.75rem;
    }

    /* 帳號角色選擇網格（批量操作用） */
    .account-role-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.5rem;
    }

    .account-role-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 2px solid transparent;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .account-role-card:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
    }

    .account-role-card.selected {
      background: rgba(6, 182, 212, 0.1);
    }

    .role-card-icon {
      width: 36px;
      height: 36px;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .role-card-content {
      flex: 1;
      min-width: 0;
    }

    .role-card-name {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .role-card-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-card-check {
      font-weight: bold;
      font-size: 1rem;
    }

    /* 标签篩選下拉框 */
    .tag-filter-dropdown {
      position: relative;
    }

    .filter-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .filter-btn:hover {
      border-color: var(--primary);
    }

    .tag-count {
      background: var(--primary);
      color: white;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .tag-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 0.25rem;
      min-width: 200px;
      background: var(--bg-card, rgba(30, 41, 59, 0.95));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      padding: 0.5rem;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tag-dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0.5rem 0.5rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: 0.75rem;
    }

    .tag-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }

    .tag-option:hover {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
    }

    .tag-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .manage-tags-btn {
      width: 100%;
      padding: 0.5rem;
      margin-top: 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.375rem;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.75rem;
    }

    .manage-tags-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .manage-btn {
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .manage-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    /* 卡片标签 */
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .tag-badge {
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      color: white;
      font-weight: 500;
    }

    .tag-badge.large {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    .tag-more {
      padding: 0.125rem 0.375rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.25rem;
      font-size: 0.625rem;
      color: var(--text-secondary);
    }

    /* 标签管理弹窗 */
    .tag-manager-modal, .group-manager-modal, .account-tag-modal {
      width: 480px;
      max-height: 70vh;
    }

    .add-tag-form, .add-group-form {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .tag-input, .group-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .color-picker {
      width: 40px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .color-picker.small {
      width: 32px;
      height: 32px;
    }

    .btn-add {
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.375rem;
      color: white;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .btn-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tag-list, .group-list {
      padding: 1rem 1.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .tag-item, .group-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.3));
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .tag-preview {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      color: white;
      min-width: 60px;
      text-align: center;
    }

    .tag-edit-input, .group-edit-input {
      flex: 1;
      padding: 0.375rem 0.5rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.25rem;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .btn-delete {
      padding: 0.375rem 0.5rem;
      background: none;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.25rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .btn-delete:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .group-color-bar {
      width: 4px;
      height: 40px;
      border-radius: 2px;
    }

    .group-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .group-count {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .empty-state a {
      color: var(--primary);
      cursor: pointer;
    }

    /* 账号标签编辑 */
    .account-tags-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.75rem;
      padding: 1.5rem;
    }

    .account-tag-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.3));
      border: 2px solid transparent;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .account-tag-option:hover {
      border-color: var(--border-default, rgba(148, 163, 184, 0.3));
    }

    .account-tag-option.selected {
      border-color: var(--primary);
      background: rgba(6, 182, 212, 0.1);
    }

    .account-tag-option input {
      display: none;
    }

    /* 快速添加标签 */
    .quick-add-tag {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      margin-top: 0.5rem;
    }

    .quick-add-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .tag-input-inline {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .tag-input-inline:focus {
      outline: none;
      border-color: var(--primary);
    }

    .color-picker-inline {
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .btn-quick-add {
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-quick-add:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    .btn-quick-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-footer .btn-manage {
      padding: 0.5rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      color: var(--text-secondary);
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .modal-footer .btn-manage:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.5));
      color: var(--text-primary);
    }

    .modal-footer .footer-actions {
      display: flex;
      gap: 0.5rem;
    }

    .account-tag-modal .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* 详情标签 */
    .detail-item.full-width {
      grid-column: 1 / -1;
    }
`, `    .detail-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.25rem;
    }

    .no-tags {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    /* AI 人設管理 */

    .action-btn {
      padding: 0.375rem 0.5rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.25rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .action-btn.danger:hover {
      border-color: #ef4444;
      color: #ef4444;
    }

    /* 人設选择 */
    .persona-select-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .current-persona {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .current-persona:hover {
      border-color: var(--primary);
    }

    .persona-icon-small {
      font-size: 1.25rem;
    }

    .persona-name-small {
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .no-persona {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .select-arrow {
      margin-left: auto;
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .btn-persona-manager {
      padding: 0.5rem 0.75rem;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
      border: 1px solid var(--primary);
      border-radius: 0.375rem;
      color: var(--primary);
      cursor: pointer;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .btn-persona-manager:hover {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3));
    }
  `]
})
export class AccountCardListComponent implements OnInit, OnChanges, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  personaService = inject(PersonaService);
  private ipcChannels: string[] = [];
  
  // 翻譯輔助方法
  t(key: string): string {
    return this.i18n.t(key);
  }

  @Input() accounts: Account[] = [];
  
  @Output() addAccount = new EventEmitter<void>();
  @Output() accountSelected = new EventEmitter<Account>();
  @Output() accountLogin = new EventEmitter<Account>();
  @Output() accountLogout = new EventEmitter<Account>();
  @Output() accountRemove = new EventEmitter<Account>();
  @Output() accountExport = new EventEmitter<Account>();
  @Output() accountEdit = new EventEmitter<Account>();
  @Output() accountUpdated = new EventEmitter<Account>();

  // 状态
  viewMode = signal<'card' | 'table'>('card');
  searchQuery = '';
  statusFilter = 'all';
  selectedAccount = signal<Account | null>(null);
  selectedIds = new Set<number>();
  selectAll = false;

  // 编辑弹窗状态
  showEditModal = signal(false);
  editTab = signal<'basic' | 'proxy' | 'role' | 'ai'>('basic');
  editingAccount = signal<Account | null>(null);
  saving = signal(false);
  testingProxy = signal(false);
  proxyTestResult = signal<{ success: boolean; message: string } | null>(null);
  syncing = signal(false);

  // 批量编辑状态
  showBatchEditModal = signal(false);
  batchSaving = signal(false);
  batchSyncing = signal(false);
  batchLoggingIn = signal(false);
  batchLoggingOut = signal(false);

  // P1-4: 批量登入進度
  showBatchLoginModal = signal(false);
  batchLoginTotal = signal(0);
  batchLoginSuccessIds = signal<number[]>([]);
  batchLoginNeedCodeIds = signal<number[]>([]);
  batchLoginFailed = signal<{ accountId: number; phone: string; message: string }[]>([]);

  // P1-5: 帳號事件記錄（詳情面板）
  accountEvents = signal<{ event_type: string; reason: string; created_at: string }[]>([]);

  // P2-3: 事件篩選
  accountEventsFilter = signal<'all' | 'login' | 'logout' | 'disconnect' | 'session_expired' | 'reconnect_ok'>('all');

  // P2-5: 批量補驗證碼隊列
  batchCodeQueue = signal<number[]>([]);  // 待補碼帳號 ID 隊列

  // 登入狀態追踪
  loggingInAccounts = signal<Set<number>>(new Set());
  loginProgress = signal<Map<number, { step: string; progress: number }>>(new Map());
  
  // 登入彈窗狀態
  showLoginModal = signal(false);
  loginModalAccount = signal<Account | null>(null);
  loginStep = signal<'connecting' | 'code' | '2fa' | 'success' | 'error'>('connecting');
  loginVerificationCode = '';
  loginTwoFactorPassword = '';
  loginPhoneCodeHash = '';
  loginSubmitting = signal(false);
  loginErrorMessage = signal('');
  loginResendCooldown = signal(0);
  private loginTimeout: any = null;
  private loginResendTimer: any = null;

  // 标签和分組状态
  showTagFilter = signal(false);
  showTagManager = signal(false);
  showGroupManager = signal(false);
  showAccountTagEditor = signal(false);
  editingTagAccount = signal<Account | null>(null);
  
  availableTags = signal<Tag[]>([...DEFAULT_TAGS]);
  groups = signal<AccountGroup[]>([]);
  
  groupFilter = 'all';
  tagFilter: string[] = [];
  accountTagsSelection = new Set<string>();
  
  newTagName = '';
  newTagColor = '#3b82f6';
  newGroupName = '';
  newGroupColor = '#6b7280';

  // AI 人設（管理/編輯 UI 已拆至 PersonaManagerComponent，數據走 PersonaService）
  showPersonaManager = signal(false);
  /** 打開人設庫時的預選 ID */
  personaInitialId = signal<string | null>(null);
  /** 「使用人設」的寫入目標：直接應用到帳號 or 回填編輯表單 */
  private personaApplyTarget: 'account' | 'editForm' = 'account';
  private personaTargetAccount: Account | null = null;

  // 角色選擇器状态
  showRoleSelector = signal(false);
  roleSelectorAccount = signal<Account | null>(null);
  roleSelectorPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  assignableRoles = getAssignableRoles();

  // 批量编辑表單
  batchForm: {
    enableProxy: boolean;
    proxyType: string;
    proxyHost: string;
    proxyPort: number | null;
    proxyUsername: string;
    proxyPassword: string;
    proxyCountry: string;
    enableRole: boolean;
    role: string;
    enableAI: boolean;
    aiEnabled: boolean;
    aiModel: string;
    enableLimit: boolean;
    dailySendLimit: number;
    enableWarmup: boolean;
    enableGroup: boolean;
    group: string;
  } = this.getDefaultBatchForm();

  // 常量
  roleTemplates = ROLE_TEMPLATES;
  proxyTypes = PROXY_TYPES;

  // 编辑表單
  editForm: {
    nickname: string;
    notes: string;
    apiId: string;
    apiHash: string;
    dailySendLimit: number;
    group: string;
    enableWarmup: boolean;
    proxyType: string;
    proxyHost: string;
    proxyPort: number | null;
    proxyUsername: string;
    proxyPassword: string;
    proxyCountry: string;
    proxyRotationEnabled: boolean;
    role: string;
    customRoleName: string;
    roleDescription: string;
    aiEnabled: boolean;
    aiModel: string;
    aiCreativity: number;
    aiResponseLength: number;
    aiAutoReply: boolean;
    aiBlockKeywords: string;
    aiPersonality: string;
  } = this.getDefaultEditForm();

  // 计算屬性 - 使用 getter 而非 computed，因為 accounts 是 @Input 而非 signal
  get filteredAccounts(): Account[] {
    let result = this.accounts;
    
    // 搜索过滤
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(acc => 
        acc.phone.toLowerCase().includes(query) ||
        (acc.firstName?.toLowerCase().includes(query)) ||
        (acc.lastName?.toLowerCase().includes(query)) ||
        (acc.username?.toLowerCase().includes(query)) ||
        (acc.nickname?.toLowerCase().includes(query))
      );
    }
    
    // 状态过滤
    if (this.statusFilter !== 'all') {
      result = result.filter(acc => acc.status === this.statusFilter);
    }

    // 分組过滤
    if (this.groupFilter !== 'all') {
      if (this.groupFilter === '_ungrouped') {
        result = result.filter(acc => !acc.group);
      } else {
        result = result.filter(acc => acc.group === this.groupFilter);
      }
    }

    // 标签过滤
    if (this.tagFilter.length > 0) {
      result = result.filter(acc => 
        acc.tags && this.tagFilter.some(tagId => acc.tags!.includes(tagId))
      );
    }
    
    return result;
  }

  get onlineCount(): number {
    return this.accounts.filter(a => a.status === 'Online').length;
  }
  
  get offlineCount(): number {
    return this.accounts.filter(a => a.status === 'Offline').length;
  }
  
  get bannedCount(): number {
    return this.accounts.filter(a => a.status === 'Banned').length;
  }

  ngOnInit(): void {
    this.loadTagsAndGroups();
    this.personaService.load();
    this.setupLoginStatusListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 當 accounts 變化時，檢查並清理已完成登入的帳號
    if (changes['accounts'] && !changes['accounts'].firstChange) {
      const newAccounts = changes['accounts'].currentValue as Account[];
      const loggingIn = this.loggingInAccounts();
      
      // 檢查每個正在登入的帳號
      loggingIn.forEach(accountId => {
        const account = newAccounts.find(a => a.id === accountId);
        if (account) {
          // 如果狀態不再是「登入中」相關狀態，則清除 loading
          const loginStates = ['Logging in...', 'Waiting Code', 'Waiting 2FA'];
          if (!loginStates.includes(account.status)) {
            this.onLoginComplete(accountId);
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.ipcChannels.forEach(channel => {
      this.ipcService.cleanup(channel);
    });
    this.clearLoginTimeout();
    if (this.loginResendTimer) {
      clearInterval(this.loginResendTimer);
    }
  }

  setupLoginStatusListeners(): void {
    this.ipcService.on('account-login-error', (data: any) => {
      if (data.accountId) {
        this.onLoginComplete(data.accountId);
        if (this.batchLoggingIn()) {
          const ids = this.batchLoginSuccessIds().concat(this.batchLoginNeedCodeIds());
          if (!ids.includes(data.accountId)) {
            const acc = this.accounts.find(a => a.id === data.accountId);
            this.batchLoginFailed.set([
              ...this.batchLoginFailed(),
              { accountId: data.accountId, phone: acc?.phone ?? String(data.accountId), message: data.friendlyMessage || data.message || '登入失敗' }
            ]);
          }
        }
        const modalAcc = this.loginModalAccount();
        if (modalAcc && modalAcc.id === data.accountId) {
          this.clearLoginTimeout();
          this.loginSubmitting.set(false);
          this.loginErrorMessage.set(
            data.friendlyMessage || data.message || '登入失敗，請稍後重試'
          );
          this.loginStep.set('error');
        }
      }
    });
    this.ipcChannels.push('account-login-error');

    this.ipcService.on('login-success', (data: any) => {
      if (data.accountId) {
        this.onLoginComplete(data.accountId);
        if (this.batchLoggingIn()) {
          if (!this.batchLoginSuccessIds().includes(data.accountId)) {
            this.batchLoginSuccessIds.set([...this.batchLoginSuccessIds(), data.accountId]);
          }
        }
        const modalAcc = this.loginModalAccount();
        if (modalAcc && modalAcc.id === data.accountId) {
          this.clearLoginTimeout();
          this.loginSubmitting.set(false);
          this.loginStep.set('success');
          setTimeout(() => this.closeLoginModal(), 1500);
        }
      }
    });
    this.ipcChannels.push('login-success');

    this.ipcService.on('login-requires-code', (data: any) => {
      if (data.accountId && data.phoneCodeHash) {
        if (this.batchLoggingIn() && !this.batchLoginSuccessIds().includes(data.accountId)) {
          if (!this.batchLoginNeedCodeIds().includes(data.accountId)) {
            this.batchLoginNeedCodeIds.set([...this.batchLoginNeedCodeIds(), data.accountId]);
          }
        }
        const modalAcc = this.loginModalAccount();
        if (modalAcc && modalAcc.id === data.accountId) {
          this.clearLoginTimeout();
          this.loginPhoneCodeHash = data.phoneCodeHash;
          this.loginSubmitting.set(false);
          this.loginStep.set('code');
          this.startLoginResendCooldown();
          this.toast.success('驗證碼已發送');
        }
        if (!this.showLoginModal()) {
          const acc = this.accounts.find(a => a.id === data.accountId);
          if (acc) {
            this.loginModalAccount.set(acc);
            this.loginPhoneCodeHash = data.phoneCodeHash;
            this.loginStep.set('code');
            this.showLoginModal.set(true);
            this.startLoginResendCooldown();
          }
        }
      }
    });
    this.ipcChannels.push('login-requires-code');

    this.ipcService.on('login-requires-2fa', (data: any) => {
      const modalAcc = this.loginModalAccount();
      if (modalAcc && data.accountId === modalAcc.id) {
        this.clearLoginTimeout();
        this.loginSubmitting.set(false);
        this.loginStep.set('2fa');
        this.toast.info('請輸入二步驗證密碼');
      }
    });
    this.ipcChannels.push('login-requires-2fa');
  }

  loadTagsAndGroups(): void {
    // 载入标签
    this.ipcService.once('get-tags-result', (result: any) => {
      if (result.success && result.tags) {
        this.availableTags.set(result.tags.length > 0 ? result.tags : [...DEFAULT_TAGS]);
      }
    });
    this.ipcService.send('get-tags', {});

    // 载入分組
    this.ipcService.once('get-groups-result', (result: any) => {
      if (result.success && result.groups) {
        this.groups.set(result.groups);
      }
    });
    this.ipcService.send('get-groups', {});
  }

  getAvatarLetter(account: Account): string {
    if (account.nickname) {
      return account.nickname.charAt(0).toUpperCase();
    }
    if (account.firstName) {
      return account.firstName.charAt(0).toUpperCase();
    }
    if (account.phone) {
      return account.phone.replace('+', '').charAt(0);
    }
    return '?';
  }

  getDisplayName(account: Account): string {
    if (account.nickname) {
      return account.nickname;
    }
    const fullName = `${account.firstName || ''} ${account.lastName || ''}`.trim();
    return fullName || account.phone;
  }

  getAccountById(id: number): Account | undefined {
    return this.accounts.find(a => a.id === id);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Online': return 'online';
      case 'Offline': return 'offline';
      case 'Banned': return 'banned';
      case 'Warming Up':
      case 'Cooldown':
        return 'warning';
      case 'Logging in...':
      case 'Waiting Code':
      case 'Waiting 2FA':
        return 'connecting';
      case 'Disconnected':
      case 'Session Expired':
      case 'Auth Error':
        return 'disconnected';
      case 'Proxy Error':
      case 'Error':
        return 'error';
      default: return 'offline';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'Online': return '在線';
      case 'Offline': return '離線';
      case 'Disconnected': return '已斷開';
      case 'Banned': return '封禁';
      case 'Warming Up': return '預熱中';
      case 'Cooldown': return '冷卻中';
      case 'Proxy Error': return '代理錯誤';
      case 'Logging in...': return '連接中';
      case 'Waiting Code': return '待驗證';
      case 'Waiting 2FA': return '待二步驗證';
      case 'Session Expired': return 'Session 過期';
      case 'Auth Error': return '認證失敗';
      case 'Error': return '錯誤';
      default: return status;
    }
  }

  getDeviceIcon(platform?: string): string {
    switch (platform) {
      case 'ios': return '📱';
      case 'android': return '🤖';
      case 'desktop': return '💻';
      default: return '📱';
    }
  }

  // 獲取頭像 URL（使用自定義協議避免安全限制）
  getAvatarUrl(avatarPath: string): string {
    if (!avatarPath) return '';
    // 使用 local-file 協議載入本地頭像
    return 'local-file://' + avatarPath;
  }

  // 🔧 頭像載入失敗時的處理（顯示 fallback）
  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      // 隱藏失敗的圖片，讓 fallback div 顯示
      target.style.display = 'none';
      
      // 嘗試找到相鄰的 fallback 元素並顯示
      const parent = target.parentElement;
      if (parent) {
        const fallback = parent.querySelector('.avatar-fallback');
        if (fallback) {
          (fallback as HTMLElement).style.display = 'flex';
        }
      }
    }
  }
  
  // 🔧 檢查頭像路徑是否有效
  isValidAvatarPath(path: string | undefined): boolean {
    return !!path && path.length > 0 && !path.includes('undefined');
  }

  selectAccount(account: Account): void {
    this.selectedAccount.set(account);
    this.accountSelected.emit(account);
    this.loadAccountEvents(account.id);
  }

  loadAccountEvents(accountId: number): void {
    this.accountEvents.set([]);
    this.accountEventsFilter.set('all');
    this.ipcService.once('get-account-events-result', (result: any) => {
      if (result.success && result.events && result.accountId === accountId) {
        this.accountEvents.set(result.events);
      }
    });
    this.ipcService.send('get-account-events', { accountId, limit: 50 });
  }

  // P2-3: 篩選後的事件列表
  filteredAccountEvents(): { event_type: string; reason: string; created_at: string }[] {
    const filter = this.accountEventsFilter();
    const events = this.accountEvents();
    if (filter === 'all') return events;
    return events.filter(ev => ev.event_type === filter);
  }

  // P2-3: 相對時間格式化
  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return '剛剛';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} 分鐘前`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr} 小時前`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 30) return `${diffDay} 天前`;
      return dateStr.slice(0, 16).replace('T', ' ');
    } catch {
      return dateStr.slice(0, 16);
    }
  }

  // P2-3: 事件標籤（含圖示）
  getAccountEventLabel(eventType: string): string {
    const map: Record<string, string> = {
      login: '🔑 登入',
      logout: '🚪 登出',
      disconnect: '📵 斷開',
      session_expired: '⚠️ Session 過期',
      reconnect_ok: '🔄 重連成功'
    };
    return map[eventType] || eventType;
  }

  // P2-3: 事件類型顏色 class
  getEventTypeClass(eventType: string): string {
    const map: Record<string, string> = {
      login: 'event-type-login',
      logout: 'event-type-logout',
      disconnect: 'event-type-disconnect',
      session_expired: 'event-type-expired',
      reconnect_ok: 'event-type-reconnect'
    };
    return map[eventType] || '';
  }

  // P2-5: 啟動逐個補驗證碼隊列
  startBatchCodeQueue(): void {
    const queue = [...this.batchLoginNeedCodeIds()];
    if (queue.length === 0) return;
    this.batchCodeQueue.set(queue);
    this.openNextFromCodeQueue();
  }

  // P2-5: 打開隊列中下一個需要驗證碼的帳號
  openNextFromCodeQueue(): void {
    const queue = this.batchCodeQueue();
    if (queue.length === 0) return;
    const [nextId, ...rest] = queue;
    this.batchCodeQueue.set(rest);
    const acc = this.getAccountById(nextId);
    if (acc) {
      this.openLoginModal(acc);
    } else {
      // 帳號找不到，跳過
      this.openNextFromCodeQueue();
    }
  }

  closeDetail(): void {
    this.selectedAccount.set(null);
  }

  toggleSelect(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  // ========== 角色選擇器方法 ==========

  // 獲取角色配置
  getRoleConfig(roleId: string): AccountRoleConfig {
    return getRoleConfig(roleId || 'Unassigned');
  }

  // 獲取角色中文名
  getRoleName(roleId: string): string {
    return getRoleName(roleId || 'Unassigned');
  }

  // 獲取角色圖標
  getRoleIcon(roleId: string): string {
    return getRoleIcon(roleId || 'Unassigned');
  }

  // 獲取角色顏色
  getRoleColor(roleId: string): string {
    return getRoleColor(roleId || 'Unassigned');
  }

  // 打開角色選擇器
  openRoleSelector(account: Account, event: Event): void {
    event.stopPropagation();
    
    // 計算彈出位置
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    this.roleSelectorAccount.set(account);
    this.roleSelectorPosition.set({
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 280)
    });
    this.showRoleSelector.set(true);
  }

  // 關閉角色選擇器
  closeRoleSelector(): void {
    this.showRoleSelector.set(false);
    this.roleSelectorAccount.set(null);
  }

  // 更改帳號角色
  changeAccountRole(roleId: string): void {
    const account = this.roleSelectorAccount();
    if (!account) return;

    // 發送更新請求到後端
    this.ipcService.send('update-account', {
      id: account.id,
      phone: account.phone,
      role: roleId
    });

    // 更新本地顯示
    const idx = this.accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      this.accounts[idx] = { ...this.accounts[idx], role: roleId as any };
    }

    // 更新選中的帳號（如果是當前選中的）
    if (this.selectedAccount()?.id === account.id) {
      this.selectedAccount.set({ ...account, role: roleId as any });
    }

    this.toast.success(`已將 ${account.phone} 設為「${this.getRoleName(roleId)}」`);
    this.closeRoleSelector();
  }

  onLogin(account: Account): void {
    // 添加到登入中列表
    const loggingIn = new Set(this.loggingInAccounts());
    loggingIn.add(account.id);
    this.loggingInAccounts.set(loggingIn);
    
    // 設置初始進度
    const progress = new Map(this.loginProgress());
    progress.set(account.id, { step: '正在連接...', progress: 10 });
    this.loginProgress.set(progress);
    
    this.accountLogin.emit(account);
  }

  // 檢查帳號是否正在登入
  /**
   * 判斷帳號是否可以登入
   * 包括：Offline, Banned, Error, error, Proxy Error 等狀態
   */
  canLogin(account: Account): boolean {
    const loginAllowedStatuses = [
      'Offline', 
      'Banned', 
      'Error', 
      'error',
      'Proxy Error',
      'Session Expired',
      'Auth Error',
      'Disconnected'
    ];
    const isNotOnline = account.status !== 'Online';
    const isNotLoggingIn = !['Logging in...', 'Waiting Code', 'Waiting 2FA'].includes(account.status);
    const isAllowedStatus = loginAllowedStatuses.includes(account.status) || 
                           account.status.toLowerCase().includes('error') ||
                           account.status.toLowerCase().includes('offline') ||
                           account.status.toLowerCase().includes('disconnected');
    return isNotOnline && isNotLoggingIn && isAllowedStatus;
  }

  isLoggingIn(accountId: number): boolean {
    return this.loggingInAccounts().has(accountId);
  }

  // 獲取登入進度信息
  getLoginProgress(accountId: number): { step: string; progress: number } | null {
    return this.loginProgress().get(accountId) || null;
  }

  // 更新登入進度（由外部事件調用）
  updateLoginProgress(accountId: number, step: string, progress: number): void {
    const progressMap = new Map(this.loginProgress());
    progressMap.set(accountId, { step, progress });
    this.loginProgress.set(progressMap);
  }

  onLoginComplete(accountId: number): void {
    const loggingIn = new Set(this.loggingInAccounts());
    loggingIn.delete(accountId);
    this.loggingInAccounts.set(loggingIn);
    
    const progress = new Map(this.loginProgress());
    progress.delete(accountId);
    this.loginProgress.set(progress);
  }

  // ===== 登入彈窗方法 =====

  openLoginModal(account: Account): void {
    this.loginModalAccount.set(account);
    this.loginVerificationCode = '';
    this.loginTwoFactorPassword = '';
    this.loginPhoneCodeHash = '';
    this.loginSubmitting.set(false);
    this.loginErrorMessage.set('');
    this.loginResendCooldown.set(0);
    this.loginStep.set('connecting');
    this.showLoginModal.set(true);

    if (!this.isLoggingIn(account.id)) {
      this.onLogin(account);
    }

    this.loginTimeout = setTimeout(() => {
      if (this.loginStep() === 'connecting') {
        this.loginErrorMessage.set('連接超時，請檢查網路或代理設定後重試');
        this.loginStep.set('error');
        this.onLoginComplete(account.id);
        this.ipcService.send('update-account-status', { accountId: account.id, status: 'Offline' });
      }
    }, 30000);
  }

  closeLoginModal(): void {
    const acc = this.loginModalAccount();
    if (acc && this.loginStep() === 'connecting') {
      this.cancelLogin(acc);
    }
    this.clearLoginTimeout();
    this.showLoginModal.set(false);
    this.loginModalAccount.set(null);
    if (this.loginResendTimer) {
      clearInterval(this.loginResendTimer);
      this.loginResendTimer = null;
    }
    // P2-5: 若在逐個補碼隊列模式，自動打開下一個
    if (this.batchCodeQueue().length > 0) {
      setTimeout(() => this.openNextFromCodeQueue(), 300);
    }
  }

  submitLoginCode(): void {
    const acc = this.loginModalAccount();
    if (!acc) return;

    if (this.loginStep() === 'code') {
      if (!this.loginVerificationCode || !this.loginPhoneCodeHash) return;
      this.loginSubmitting.set(true);
      this.ipcService.send('login-account', {
        phone: acc.phone,
        phoneCode: this.loginVerificationCode,
        phoneCodeHash: this.loginPhoneCodeHash,
        apiId: acc.apiId,
        apiHash: acc.apiHash
      });
      this.loginTimeout = setTimeout(() => {
        if (this.loginSubmitting()) {
          this.loginSubmitting.set(false);
          this.loginErrorMessage.set('驗證超時，請重試');
          this.loginStep.set('error');
        }
      }, 30000);
    } else if (this.loginStep() === '2fa') {
      if (!this.loginTwoFactorPassword) return;
      this.loginSubmitting.set(true);
      this.ipcService.send('login-account', {
        phone: acc.phone,
        phoneCode: this.loginVerificationCode,
        phoneCodeHash: this.loginPhoneCodeHash,
        twoFactorPassword: this.loginTwoFactorPassword,
        apiId: acc.apiId,
        apiHash: acc.apiHash
      });
      this.loginTimeout = setTimeout(() => {
        if (this.loginSubmitting()) {
          this.loginSubmitting.set(false);
          this.loginErrorMessage.set('驗證超時，請重試');
          this.loginStep.set('error');
        }
      }, 30000);
    }
  }

  resendLoginCode(): void {
    const acc = this.loginModalAccount();
    if (!acc) return;
    this.loginVerificationCode = '';
    this.loginPhoneCodeHash = '';
    this.loginStep.set('connecting');
    this.ipcService.send('login-account', {
      phone: acc.phone,
      apiId: acc.apiId,
      apiHash: acc.apiHash
    });
    this.toast.info('正在重新發送驗證碼...', 3000);
    this.loginTimeout = setTimeout(() => {
      if (this.loginStep() === 'connecting') {
        this.loginErrorMessage.set('發送驗證碼超時，請重試');
        this.loginStep.set('error');
      }
    }, 30000);
  }

  retryLogin(): void {
    const acc = this.loginModalAccount();
    if (!acc) return;
    this.loginStep.set('connecting');
    this.loginVerificationCode = '';
    this.loginTwoFactorPassword = '';
    this.loginPhoneCodeHash = '';
    this.loginSubmitting.set(false);
    this.loginErrorMessage.set('');
    this.onLogin(acc);
    this.loginTimeout = setTimeout(() => {
      if (this.loginStep() === 'connecting') {
        this.loginErrorMessage.set('連接超時，請檢查網路或代理設定後重試');
        this.loginStep.set('error');
        this.onLoginComplete(acc.id);
        this.ipcService.send('update-account-status', { accountId: acc.id, status: 'Offline' });
      }
    }, 30000);
  }

  cancelLogin(account: Account): void {
    this.onLoginComplete(account.id);
    this.ipcService.send('update-account-status', { accountId: account.id, status: 'Offline' });
  }

  private clearLoginTimeout(): void {
    if (this.loginTimeout) {
      clearTimeout(this.loginTimeout);
      this.loginTimeout = null;
    }
  }

  private startLoginResendCooldown(): void {
    this.loginResendCooldown.set(60);
    if (this.loginResendTimer) clearInterval(this.loginResendTimer);
    this.loginResendTimer = setInterval(() => {
      const val = this.loginResendCooldown();
      if (val <= 1) {
        this.loginResendCooldown.set(0);
        clearInterval(this.loginResendTimer!);
        this.loginResendTimer = null;
      } else {
        this.loginResendCooldown.set(val - 1);
      }
    }, 1000);
  }

  onLogout(account: Account): void {
    this.accountLogout.emit(account);
  }

  onRemove(account: Account): void {
    if (confirm(`确定要删除账户 ${account.phone} 嗎？`)) {
      this.accountRemove.emit(account);
      this.closeDetail();
    }
  }

  onExport(account: Account): void {
    this.accountExport.emit(account);
  }

  onEdit(account: Account): void {
    this.accountEdit.emit(account);
  }

  // ========== 同步账号信息 ==========

  syncAccountInfo(account: Account): void {
    // 🔧 P0: 檢查帳號是否在線
    if (account.status !== 'Online') {
      this.toast.warning(`帳號 ${account.phone} 未登入，請先點擊「登入」按鈕`);
      return;
    }
    
    this.syncing.set(true);
    this.toast.info('正在同步账号信息...');

    // 監聯結果事件
    this.ipcService.once('sync-account-info-result', (result: any) => {
      this.syncing.set(false);
      console.log('[AccountCard] Sync result:', result);
      
      if (result.success && result.profile) {
        // 更新選中的账号顯示
        const profile = result.profile;
        const updatedAccount: Account = {
          ...account,
          firstName: profile.firstName || account.firstName,
          lastName: profile.lastName || account.lastName,
          username: profile.username || account.username,
          bio: profile.bio || account.bio,
          avatarPath: profile.avatarPath || account.avatarPath,
          telegramId: profile.id ? String(profile.id) : account.telegramId
        };
        
        // 更新 selectedAccount
        if (this.selectedAccount()?.id === account.id) {
          this.selectedAccount.set(updatedAccount);
        }
        
        // 更新 accounts 數組中對應的账号
        const idx = this.accounts.findIndex(a => a.id === account.id);
        if (idx >= 0) {
          this.accounts[idx] = updatedAccount;
        }
        
        this.toast.success(`同步成功！用戶名: @${profile.username || '無'}`);
      } else {
        this.toast.error(`同步失敗: ${result.error || '无法獲取信息（账号可能未登入）'}`);
      }
    });

    // 发送同步請求
    this.ipcService.send('sync-account-info', {
      id: account.id,
      phone: account.phone
    });

    // 超时處理
    setTimeout(() => {
      if (this.syncing()) {
        this.syncing.set(false);
        this.toast.error('同步超时，请重试');
      }
    }, 30000);
  }

  // ========== AI 人設（UI 拆至 PersonaManagerComponent，數據走 PersonaService） ==========

  /** 從帳號卡片/詳情打開人設庫：選定後直接應用到該帳號 */
  openPersonaManager(account?: Account): void {
    this.personaApplyTarget = 'account';
    this.personaTargetAccount = account ?? null;
    this.personaInitialId.set(account?.aiPersonality || null);
    this.showPersonaManager.set(true);
  }

  /** 從編輯彈窗打開人設庫：選定後回填編輯表單（取代原方法猴子補丁） */
  openPersonaManagerFromEdit(): void {
    this.personaApplyTarget = 'editForm';
    this.personaTargetAccount = null;
    this.personaInitialId.set(this.editForm.aiPersonality || null);
    this.showPersonaManager.set(true);
  }

  closePersonaManager(): void {
    this.showPersonaManager.set(false);
    this.personaInitialId.set(null);
    this.personaTargetAccount = null;
  }

  /** 子組件「使用人設」回調：按打開來源分流寫入 */
  onPersonaApplied(personaId: string): void {
    const persona = this.personaService.getById(personaId);
    if (this.personaApplyTarget === 'editForm') {
      this.editForm.aiPersonality = personaId;
      if (persona) {
        this.editForm.aiCreativity = persona.creativity;
      }
    } else {
      const account = this.personaTargetAccount;
      if (account) {
        this.ipcService.send('update-account', {
          id: account.id,
          phone: account.phone,
          aiPersonality: personaId,
          aiEnabled: true
        });
        account.aiPersonality = personaId;
        account.aiEnabled = true;
        this.toast.success(`已应用人設「${persona?.name}」`);
      }
    }
    this.closePersonaManager();
  }

  /** 模板顯示當前人設名用（編輯彈窗 AI 設置面板） */
  getPersonaById(id: string): AIPersona | undefined {
    return this.personaService.getById(id);
  }

  // ========== 标签和分組功能 ==========

  toggleTagFilter(): void {
    this.showTagFilter.set(!this.showTagFilter());
  }

  toggleTagFilterItem(tagId: string): void {
    const index = this.tagFilter.indexOf(tagId);
    if (index >= 0) {
      this.tagFilter.splice(index, 1);
    } else {
      this.tagFilter.push(tagId);
    }
  }

  clearTagFilter(): void {
    this.tagFilter = [];
  }

  getTagById(tagId: string): Tag | undefined {
    return this.availableTags().find(t => t.id === tagId);
  }

  getGroupAccountCount(groupId: string): number {
    return this.accounts.filter(a => a.group === groupId).length;
  }

  // 标签管理
  openTagManager(): void {
    this.showTagFilter.set(false);
    this.showTagManager.set(true);
  }

  closeTagManager(): void {
    this.showTagManager.set(false);
  }

  addTag(): void {
    if (!this.newTagName.trim()) return;

    const newTag: Tag = {
      id: 'tag_' + Date.now(),
      name: this.newTagName.trim(),
      color: this.newTagColor
    };

    this.availableTags.update(tags => [...tags, newTag]);
    this.newTagName = '';
    this.newTagColor = '#3b82f6';
  }

  // 快速添加标签（从账户标签编辑器中）
  quickAddTag(): void {
    if (!this.newTagName.trim()) return;

    const newTag: Tag = {
      id: 'tag_' + Date.now(),
      name: this.newTagName.trim(),
      color: this.newTagColor
    };

    this.availableTags.update(tags => [...tags, newTag]);
    
    // 自动保存到后端
    this.ipcService.send('save-tags', { tags: this.availableTags() });
    
    this.toast.success(`标签 "${newTag.name}" 已添加`);
    this.newTagName = '';
    this.newTagColor = '#3b82f6';
  }

  // 从账户标签编辑器打开标签管理器
  openTagManagerFromEditor(): void {
    this.closeAccountTagEditor();
    this.openTagManager();
  }

  deleteTag(tagId: string): void {
    if (confirm('确定要删除这个标签吗？')) {
      this.availableTags.update(tags => tags.filter(t => t.id !== tagId));
    }
  }

  saveTags(): void {
    // 保存标签到後端
    this.ipcService.send('save-tags', { tags: this.availableTags() });
    this.toast.success('标签已保存');
    this.closeTagManager();
  }

  // 分組管理
  openGroupManager(): void {
    this.showGroupManager.set(true);
  }

  closeGroupManager(): void {
    this.showGroupManager.set(false);
  }

  addGroup(): void {
    if (!this.newGroupName.trim()) return;
    
    const newGroup: AccountGroup = {
      id: 'group_' + Date.now(),
      name: this.newGroupName.trim(),
      color: this.newGroupColor
    };
    
    this.groups.update(groups => [...groups, newGroup]);
    this.newGroupName = '';
    this.newGroupColor = '#6b7280';
  }

  deleteGroup(groupId: string): void {
    if (confirm('确定要删除这个分組嗎？账号将變為未分組。')) {
      this.groups.update(groups => groups.filter(g => g.id !== groupId));
    }
  }

  saveGroups(): void {
    // 保存分組到後端
    this.ipcService.send('save-groups', { groups: this.groups() });
    this.toast.success('分組已保存');
    this.closeGroupManager();
  }

  // 账号标签编辑
  openAccountTagEditor(account: Account): void {
    this.editingTagAccount.set(account);
    this.accountTagsSelection = new Set(account.tags || []);
    this.showAccountTagEditor.set(true);
  }

  closeAccountTagEditor(): void {
    this.showAccountTagEditor.set(false);
    this.editingTagAccount.set(null);
    this.accountTagsSelection.clear();
  }

  toggleAccountTag(tagId: string): void {
    if (this.accountTagsSelection.has(tagId)) {
      this.accountTagsSelection.delete(tagId);
    } else {
      this.accountTagsSelection.add(tagId);
    }
  }

  saveAccountTags(): void {
    const account = this.editingTagAccount();
    if (!account) return;

    const tags = Array.from(this.accountTagsSelection);
    
    this.ipcService.send('update-account', {
      id: account.id,
      phone: account.phone,
      tags: tags
    });

    // 更新本地
    account.tags = tags;
    this.toast.success('标签已更新');
    this.closeAccountTagEditor();
  }

  // ========== 批量操作功能 ==========

  getDefaultBatchForm() {
    return {
      enableProxy: false,
      proxyType: 'socks5',
      proxyHost: '',
      proxyPort: null as number | null,
      proxyUsername: '',
      proxyPassword: '',
      proxyCountry: '',
      enableRole: false,
      role: '',
      enableAI: false,
      aiEnabled: false,
      aiModel: 'gpt-4-turbo',
      enableLimit: false,
      dailySendLimit: 50,
      enableWarmup: false,
      enableGroup: false,
      group: '',
    };
  }

  isAllSelected(): boolean {
    return this.filteredAccounts.length > 0 && 
           this.filteredAccounts.every(acc => this.selectedIds.has(acc.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds.clear();
    } else {
      this.filteredAccounts.forEach(acc => this.selectedIds.add(acc.id));
    }
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  openBatchEditModal(): void {
    this.batchForm = this.getDefaultBatchForm();
    this.showBatchEditModal.set(true);
  }

  closeBatchEditModal(): void {
    this.showBatchEditModal.set(false);
  }

  applyBatchEdit(): void {
    if (this.selectedIds.size === 0) {
      this.toast.warning('请先选择账号');
      return;
    }

    this.batchSaving.set(true);

    // 构建更新数据
    const updates: any = {};

    if (this.batchForm.enableProxy) {
      let proxyString = '';
      if (this.batchForm.proxyType !== 'none' && this.batchForm.proxyHost && this.batchForm.proxyPort) {
        const auth = this.batchForm.proxyUsername && this.batchForm.proxyPassword
          ? `${this.batchForm.proxyUsername}:${this.batchForm.proxyPassword}@`
          : '';
        proxyString = `${this.batchForm.proxyType}://${auth}${this.batchForm.proxyHost}:${this.batchForm.proxyPort}`;
      }
      updates.proxy = proxyString;
      updates.proxyType = this.batchForm.proxyType;
      updates.proxyHost = this.batchForm.proxyHost;
      updates.proxyPort = this.batchForm.proxyPort;
      updates.proxyUsername = this.batchForm.proxyUsername;
      updates.proxyPassword = this.batchForm.proxyPassword;
      updates.proxyCountry = this.batchForm.proxyCountry;
    }

    if (this.batchForm.enableRole) {
      // 使用角色 ID（後端存储英文 ID）
      updates.role = this.batchForm.role;
    }

    if (this.batchForm.enableAI) {
      updates.aiEnabled = this.batchForm.aiEnabled;
      updates.aiModel = this.batchForm.aiModel;
    }

    if (this.batchForm.enableLimit) {
      updates.dailySendLimit = this.batchForm.dailySendLimit;
      updates.enableWarmup = this.batchForm.enableWarmup;
    }

    if (this.batchForm.enableGroup) {
      updates.group = this.batchForm.group;
    }

    if (Object.keys(updates).length === 0) {
      this.toast.warning('請至少选择一項设置');
      this.batchSaving.set(false);
      return;
    }

    // 监听結果事件
    this.ipcService.once('batch-update-accounts-result', (result: any) => {
      this.batchSaving.set(false);
      if (result.success) {
        this.toast.success(`已更新 ${result.count || this.selectedIds.size} 個账号`);
        this.closeBatchEditModal();
        this.clearSelection();
      } else {
        this.toast.error(`批量更新失敗: ${result.error || '未知错误'}`);
      }
    });

    // 发送批量更新請求
    this.ipcService.send('batch-update-accounts', {
      accountIds: Array.from(this.selectedIds),
      updates
    });

    // 超时處理
    setTimeout(() => {
      if (this.batchSaving()) {
        this.batchSaving.set(false);
        this.toast.error('批量更新超时，請重試');
      }
    }, 60000);
  }

  // ========== 批量登入/登出 ==========

  batchLogin(): void {
    if (this.selectedIds.size === 0) {
      this.toast.warning('請先選擇帳號');
      return;
    }

    const offlineAccounts = this.accounts.filter(a => 
      this.selectedIds.has(a.id) && (a.status === 'Offline' || a.status === 'Banned')
    );

    if (offlineAccounts.length === 0) {
      this.toast.info('選中的帳號都已在線或正在登入中');
      return;
    }

    this.batchLoggingIn.set(true);
    this.batchLoginTotal.set(offlineAccounts.length);
    this.batchLoginSuccessIds.set([]);
    this.batchLoginNeedCodeIds.set([]);
    this.batchLoginFailed.set([]);
    this.showBatchLoginModal.set(true);

    const loggingIn = new Set(this.loggingInAccounts());
    offlineAccounts.forEach(account => loggingIn.add(account.id));
    this.loggingInAccounts.set(loggingIn);

    let index = 0;
    const loginNext = () => {
      if (index >= offlineAccounts.length) {
        this.batchLoggingIn.set(false);
        this.toast.success(`已發送 ${offlineAccounts.length} 個登入請求，請在彈窗中查看結果`);
        return;
      }

      const account = offlineAccounts[index];
      this.accountLogin.emit(account);
      index++;
      setTimeout(loginNext, 2000);
    };

    loginNext();
  }

  closeBatchLoginModal(): void {
    this.showBatchLoginModal.set(false);
    this.batchLoginTotal.set(0);
    this.batchLoginSuccessIds.set([]);
    this.batchLoginNeedCodeIds.set([]);
    this.batchLoginFailed.set([]);
  }

  batchLogout(): void {
    if (this.selectedIds.size === 0) {
      this.toast.warning('請先選擇帳號');
      return;
    }

    // 過濾出在線的帳號
    const onlineAccounts = this.accounts.filter(a => 
      this.selectedIds.has(a.id) && a.status === 'Online'
    );

    if (onlineAccounts.length === 0) {
      this.toast.info('選中的帳號都已離線');
      return;
    }

    if (!confirm(`確定要退出 ${onlineAccounts.length} 個在線帳號嗎？`)) {
      return;
    }

    this.batchLoggingOut.set(true);
    this.toast.info(`正在批量退出 ${onlineAccounts.length} 個帳號...`);

    // 逐個退出
    let completed = 0;
    onlineAccounts.forEach((account, idx) => {
      // 間隔發送避免觸發限制
      setTimeout(() => {
        this.accountLogout.emit(account);
        completed++;

        if (completed >= onlineAccounts.length) {
          this.batchLoggingOut.set(false);
          this.toast.success(`已發送 ${onlineAccounts.length} 個帳號的退出請求`);
        }
      }, idx * 500);
    });
  }

  batchSync(): void {
    if (this.selectedIds.size === 0) {
      this.toast.warning('请先选择账号');
      return;
    }

    this.batchSyncing.set(true);
    const accountIds = Array.from(this.selectedIds);
    let completed = 0;

    // 逐個同步
    accountIds.forEach(id => {
      const account = this.accounts.find(a => a.id === id);
      if (account) {
        this.ipcService.send('sync-account-info', { id, phone: account.phone });
      }
    });

    // 监听結果
    const handler = (result: any) => {
      completed++;
      if (completed >= accountIds.length) {
        this.batchSyncing.set(false);
        this.toast.success(`已同步 ${accountIds.length} 个账号`);
        this.ipcService.off('sync-account-info-result', handler);
      }
    };

    this.ipcService.on('sync-account-info-result', handler);

    // 超时處理
    setTimeout(() => {
      if (this.batchSyncing()) {
        this.batchSyncing.set(false);
        this.ipcService.off('sync-account-info-result', handler);
        this.toast.warning(`已同步 ${completed}/${accountIds.length} 个账号`);
      }
    }, 60000);
  }

  confirmBatchDelete(): void {
    if (this.selectedIds.size === 0) {
      this.toast.warning('请先选择账号');
      return;
    }

    if (confirm(`确定要删除選中的 ${this.selectedIds.size} 個账号嗎？此操作不可撤銷。`)) {
      this.ipcService.send('bulk-delete-accounts', {
        accountIds: Array.from(this.selectedIds)
      });
      this.clearSelection();
      this.toast.success('批量删除請求已发送');
    }
  }

  // ========== 编辑弹窗功能 ==========

  getDefaultEditForm() {
    return {
      nickname: '',
      notes: '',
      apiId: '',
      apiHash: '',
      dailySendLimit: 50,
      group: '',
      enableWarmup: false,
      proxyType: 'none',
      proxyHost: '',
      proxyPort: null as number | null,
      proxyUsername: '',
      proxyPassword: '',
      proxyCountry: '',
      proxyRotationEnabled: false,
      role: '',
      customRoleName: '',
      roleDescription: '',
      aiEnabled: false,
      aiModel: 'gpt-4-turbo',
      aiCreativity: 50,
      aiResponseLength: 50,
      aiAutoReply: false,
      aiBlockKeywords: '',
      aiPersonality: '',
    };
  }

  openEditModal(account: Account): void {
    this.editingAccount.set(account);
    this.editTab.set('basic');
    this.proxyTestResult.set(null);
    
    // 填充表單数据
    this.editForm = {
      nickname: account.nickname || '',
      notes: account.notes || '',
      apiId: account.apiId || '',
      apiHash: account.apiHash || '',
      dailySendLimit: account.dailySendLimit || 50,
      group: account.group || '',
      enableWarmup: account.enableWarmup || false,
      proxyType: account.proxyType || 'none',
      proxyHost: account.proxyHost || '',
      proxyPort: account.proxyPort || null,
      proxyUsername: account.proxyUsername || '',
      proxyPassword: account.proxyPassword || '',
      proxyCountry: account.proxyCountry || '',
      proxyRotationEnabled: account.proxyRotationEnabled || false,
      role: account.role || '',
      customRoleName: '',
      roleDescription: '',
      aiEnabled: account.aiEnabled || false,
      aiModel: account.aiModel || 'gpt-4-turbo',
      aiCreativity: 50,
      aiResponseLength: 50,
      aiAutoReply: false,
      aiBlockKeywords: '',
      aiPersonality: account.aiPersonality || '',
    };

    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingAccount.set(null);
    this.editForm = this.getDefaultEditForm();
  }

  onProxyTypeChange(): void {
    if (this.editForm.proxyType === 'none') {
      this.editForm.proxyHost = '';
      this.editForm.proxyPort = null;
      this.editForm.proxyUsername = '';
      this.editForm.proxyPassword = '';
    }
    this.proxyTestResult.set(null);
  }

  selectRole(roleId: string): void {
    this.editForm.role = roleId;
    const template = this.roleTemplates.find(r => r.id === roleId);
    if (template) {
      this.editForm.customRoleName = template.name;
    }
  }

  testProxy(): void {
    if (!this.editForm.proxyHost || !this.editForm.proxyPort) {
      this.toast.warning('請填寫代理地址和端口');
      return;
    }

    this.testingProxy.set(true);
    this.proxyTestResult.set(null);

    const proxyConfig = {
      type: this.editForm.proxyType,
      host: this.editForm.proxyHost,
      port: this.editForm.proxyPort,
      username: this.editForm.proxyUsername,
      password: this.editForm.proxyPassword,
    };

    // 监听結果事件
    this.ipcService.once('test-proxy-result', (result: any) => {
      this.testingProxy.set(false);
      if (result.success) {
        this.proxyTestResult.set({
          success: true,
          message: `✅ 代理连接成功！延遲: ${result.latency || 'N/A'}ms`,
        });
      } else {
        this.proxyTestResult.set({
          success: false,
          message: `❌ 连接失敗: ${result.error || '未知错误'}`,
        });
      }
    });

    // 发送测试請求
    this.ipcService.send('test-proxy', proxyConfig);

    // 超时處理
    setTimeout(() => {
      if (this.testingProxy()) {
        this.testingProxy.set(false);
        this.proxyTestResult.set({
          success: false,
          message: '❌ 测试超时（15秒）',
        });
      }
    }, 15000);
  }

  saveEdit(): void {
    const account = this.editingAccount();
    if (!account) return;

    this.saving.set(true);

    // 构建代理字符串
    let proxyString = '';
    if (this.editForm.proxyType !== 'none' && this.editForm.proxyHost && this.editForm.proxyPort) {
      const auth = this.editForm.proxyUsername && this.editForm.proxyPassword
        ? `${this.editForm.proxyUsername}:${this.editForm.proxyPassword}@`
        : '';
      proxyString = `${this.editForm.proxyType}://${auth}${this.editForm.proxyHost}:${this.editForm.proxyPort}`;
    }

    // 构建角色名稱
    const roleName = this.editForm.customRoleName || 
      this.roleTemplates.find(r => r.id === this.editForm.role)?.name || 
      this.editForm.role;

    const updateData = {
      id: account.id,
      phone: account.phone,
      nickname: this.editForm.nickname,
      notes: this.editForm.notes,
      apiId: this.editForm.apiId,
      apiHash: this.editForm.apiHash,
      dailySendLimit: this.editForm.dailySendLimit,
      group: this.editForm.group,
      enableWarmup: this.editForm.enableWarmup,
      proxy: proxyString,
      proxyType: this.editForm.proxyType,
      proxyHost: this.editForm.proxyHost,
      proxyPort: this.editForm.proxyPort,
      proxyUsername: this.editForm.proxyUsername,
      proxyPassword: this.editForm.proxyPassword,
      proxyCountry: this.editForm.proxyCountry,
      proxyRotationEnabled: this.editForm.proxyRotationEnabled,
      role: roleName,
      aiEnabled: this.editForm.aiEnabled,
      aiModel: this.editForm.aiModel,
      aiPersonality: this.editForm.roleDescription,
    };

    // 監聯結果事件
    this.ipcService.once('update-account-result', (result: any) => {
      this.saving.set(false);
      if (result.success) {
        this.toast.success('账号设置已保存');
        
        // 更新本地数据
        const updatedAccount = { ...account, ...updateData };
        this.accountUpdated.emit(updatedAccount);
        
        // 如果是当前選中的账号，更新側邊欄顯示
        if (this.selectedAccount()?.id === account.id) {
          this.selectedAccount.set(updatedAccount);
        }
        
        this.closeEditModal();
      } else {
        this.toast.error(`保存失敗: ${result.error || '未知错误'}`);
      }
    });

    // 发送更新請求
    this.ipcService.send('update-account', updateData);

    // 超时處理
    setTimeout(() => {
      if (this.saving()) {
        this.saving.set(false);
        this.toast.error('保存超时，請重試');
      }
    }, 30000);
  }
}
