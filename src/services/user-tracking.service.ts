/**
 * User Tracking Service
 * 用戶追蹤系統服務
 * 
 * 🆕 Phase 16: 從 app.component.ts 提取
 * 
 * 管理用戶追蹤、價值評級、群組分析等功能
 */

import { Injectable, signal, inject } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// 類型定義
export interface TrackedUser {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  notes?: string;
  valueLevel: 'vip' | 'high' | 'medium' | 'low';
  status: 'pending' | 'tracking' | 'completed' | 'failed';
  groupCount: number;
  source: 'manual' | 'auto' | 'lead';
  createdAt: string;
  updatedAt: string;
}

export interface HighValueGroup {
  groupId: string;
  title: string;
  memberCount: number;
  trackedUserCount: number;
  avgValueScore: number;
}

export interface TrackingStats {
  totalTracked: number;
  vipCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  pendingCount: number;
  completedCount: number;
}

export interface NewTrackedUser {
  userId: string;
  username: string;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserTrackingService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  
  // 狀態
  readonly trackedUsers = signal<TrackedUser[]>([]);
  readonly highValueGroups = signal<HighValueGroup[]>([]);
  readonly trackingStats = signal<TrackingStats>({
    totalTracked: 0,
    vipCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    pendingCount: 0,
    completedCount: 0
  });
  readonly selectedUser = signal<TrackedUser | null>(null);
  readonly userGroups = signal<any[]>([]);
  
  // UI 狀態
  readonly showAddUserForm = signal(false);
  readonly isTrackingUser = signal(false);
  readonly userValueFilter = signal<string>('');
  readonly newTrackedUser = signal<NewTrackedUser>({ userId: '', username: '', notes: '' });
  
  // ==================== 載入方法 ====================
  
  loadTrackedUsers(limit = 100): void {
    this.ipcService.send('get-tracked-users', { 
      limit,
      valueLevel: this.userValueFilter() || undefined
    });
  }
  
  loadTrackingStats(): void {
    this.ipcService.send('get-tracking-stats', {});
  }
  
  loadHighValueGroups(limit = 50): void {
    this.ipcService.send('get-high-value-groups', { limit });
  }
  
  loadAll(): void {
    this.loadTrackedUsers();
    this.loadTrackingStats();
    this.loadHighValueGroups();
  }
  
  // ==================== 用戶操作 ====================
  
  addUserToTrack(): boolean {
    const form = this.newTrackedUser();
    if (!form.userId.trim()) {
      this.toastService.warning('請輸入用戶 ID');
      return false;
    }
    
    this.ipcService.send('add-user-to-track', {
      userId: form.userId.trim(),
      username: form.username.trim() || undefined,
      notes: form.notes.trim() || undefined,
      source: 'manual'
    });
    
    this.resetForm();
    return true;
  }
  
  addLeadToTracking(leadId: number): void {
    this.ipcService.send('add-user-from-lead', { leadId });
  }
  
  removeTrackedUser(userId: string): void {
    if (!confirm('確定要移除此用戶追蹤嗎？')) return;
    this.ipcService.send('remove-tracked-user', { userId });
  }
  
  trackUserGroups(userId: string, accountPhone: string): void {
    this.isTrackingUser.set(true);
    this.ipcService.send('track-user-groups', { userId, accountPhone });
  }
  
  viewUserGroups(user: TrackedUser): void {
    this.selectedUser.set(user);
    this.ipcService.send('get-user-groups', { userId: user.userId });
  }
  
  updateUserValueLevel(userId: string, valueLevel: string): void {
    this.ipcService.send('update-user-value-level', { userId, valueLevel });
  }
  
  resetForm(): void {
    this.newTrackedUser.set({ userId: '', username: '', notes: '' });
    this.showAddUserForm.set(false);
  }
  
  // ==================== 表單更新輔助方法 ====================
  
  updateUserId(value: string): void {
    this.newTrackedUser.update(u => ({ ...u, userId: value }));
  }
  
  updateUsername(value: string): void {
    this.newTrackedUser.update(u => ({ ...u, username: value }));
  }
  
  updateNotes(value: string): void {
    this.newTrackedUser.update(u => ({ ...u, notes: value }));
  }
  
  // ==================== 標籤輔助方法 ====================
  
  getValueLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'vip': 'VIP',
      'high': '高價值',
      'medium': '中等',
      'low': '低'
    };
    return labels[level] || level;
  }
  
  getValueLevelColor(level: string): string {
    const colors: Record<string, string> = {
      'vip': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'medium': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'low': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[level] || 'bg-slate-500/20 text-slate-400';
  }
  
  getTrackingStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '待追蹤',
      'tracking': '追蹤中',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  getTrackingStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'tracking': 'bg-blue-500/20 text-blue-400',
      'completed': 'bg-green-500/20 text-green-400',
      'failed': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  // ==================== IPC 回調處理 ====================
  
  handleTrackedUsersResponse(data: any): void {
    if (data.success) {
      this.trackedUsers.set(data.users || []);
    }
  }
  
  handleTrackingStatsResponse(data: any): void {
    if (data.success) {
      this.trackingStats.set(data);
    }
  }
  
  handleHighValueGroupsResponse(data: any): void {
    if (data.success) {
      this.highValueGroups.set(data.groups || []);
    }
  }
  
  handleUserGroupsResponse(data: any): void {
    if (data.success) {
      this.userGroups.set(data.groups || []);
    }
  }
  
  handleTrackingComplete(): void {
    this.isTrackingUser.set(false);
    this.loadTrackedUsers();
    this.toastService.success('用戶群組追蹤完成');
  }
  
  handleAddUserResponse(data: any): void {
    if (data.success) {
      this.toastService.success('用戶添加成功');
      this.loadTrackedUsers();
    } else {
      this.toastService.error(data.error || '添加失敗');
    }
  }
}
