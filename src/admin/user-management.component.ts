/**
 * 用戶管理組件
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserListItem, UserDetail } from './admin.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-management">
      <div class="page-header">
        <h1>{{ t('admin.userManagement') }}</h1>
        <div class="search-bar">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            [placeholder]="t('admin.searchUsers')"
            (keyup.enter)="search()">
          <select [(ngModel)]="filterStatus" (change)="search()">
            <option value="">{{ t('admin.allStatus') }}</option>
            <option value="active">{{ t('admin.active') }}</option>
            <option value="suspended">{{ t('admin.suspended') }}</option>
          </select>
          <select [(ngModel)]="filterTier" (change)="search()">
            <option value="">{{ t('admin.allTiers') }}</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>
      
      <!-- 用戶列表 -->
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>{{ t('admin.user') }}</th>
              <th>{{ t('admin.email') }}</th>
              <th>{{ t('admin.tier') }}</th>
              <th>{{ t('admin.status') }}</th>
              <th>{{ t('admin.createdAt') }}</th>
              <th>{{ t('admin.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users()">
              <td>
                <div class="user-cell">
                  <div class="user-avatar">{{ getInitial(user.username) }}</div>
                  <span>{{ user.username }}</span>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span class="tier-badge" [class]="user.subscription_tier">
                  {{ user.subscription_tier }}
                </span>
              </td>
              <td>
                <span class="status-badge" [class]="user.status">
                  {{ user.status }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-view" (click)="viewUser(user)">
                    {{ t('admin.view') }}
                  </button>
                  <button 
                    class="btn-suspend" 
                    *ngIf="user.status === 'active'"
                    (click)="suspendUser(user)">
                    {{ t('admin.suspend') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分頁 -->
      <div class="pagination" *ngIf="totalPages() > 1">
        <button 
          [disabled]="currentPage() <= 1"
          (click)="goToPage(currentPage() - 1)">
          ← {{ t('common.prev') }}
        </button>
        <span class="page-info">
          {{ currentPage() }} / {{ totalPages() }}
        </span>
        <button 
          [disabled]="currentPage() >= totalPages()"
          (click)="goToPage(currentPage() + 1)">
          {{ t('common.next') }} →
        </button>
      </div>
      
      <!-- 用戶詳情彈窗 -->
      <div class="modal-overlay" *ngIf="selectedUser()" (click)="closeDetail()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ t('admin.userDetail') }}</h2>
            <button class="btn-close" (click)="closeDetail()">×</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <label>{{ t('admin.userId') }}</label>
                <span>{{ selectedUser()?.user_id }}</span>
              </div>
              <div class="detail-item">
                <label>{{ t('admin.username') }}</label>
                <span>{{ selectedUser()?.username }}</span>
              </div>
              <div class="detail-item">
                <label>{{ t('admin.email') }}</label>
                <span>{{ selectedUser()?.email }}</span>
              </div>
              <div class="detail-item">
                <label>{{ t('admin.tier') }}</label>
                <span>{{ selectedUser()?.subscription_tier }}</span>
              </div>
              <div class="detail-item">
                <label>{{ t('admin.accounts') }}</label>
                <span>{{ selectedUser()?.accounts_count || 0 }}</span>
              </div>
              <div class="detail-item">
                <label>{{ t('admin.role') }}</label>
                <span>{{ selectedUser()?.role }}</span>
              </div>
            </div>
            
            <div class="recent-logins" *ngIf="selectedUser()?.recent_logins?.length">
              <h3>{{ t('admin.recentLogins') }}</h3>
              <div class="login-list">
                <div *ngFor="let login of selectedUser()?.recent_logins" class="login-item">
                  <span class="login-ip">{{ login.ip_address }}</span>
                  <span class="login-time">{{ formatDate(login.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeDetail()">
              {{ t('common.close') }}
            </button>
            <button 
              class="btn-danger" 
              *ngIf="selectedUser()?.status === 'active'"
              (click)="suspendUser(selectedUser()!)">
              {{ t('admin.suspend') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-management {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .page-header h1 {
      margin: 0;
      font-size: 24px;
    }
    
    .search-bar {
      display: flex;
      gap: 12px;
    }
    
    .search-bar input, .search-bar select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    
    .search-bar input {
      width: 200px;
    }
    
    .users-table-container {
      overflow-x: auto;
    }
    
    .users-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    .users-table th, .users-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .users-table th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 13px;
      color: #666;
    }
    
    .user-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #1976d2;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }
    
    .tier-badge, .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .tier-badge.free { background: #eceff1; color: #546e7a; }
    .tier-badge.basic { background: #e3f2fd; color: #1565c0; }
    .tier-badge.pro { background: #fff3e0; color: #ef6c00; }
    .tier-badge.enterprise { background: #f3e5f5; color: #7b1fa2; }
    
    .status-badge.active { background: #e8f5e9; color: #2e7d32; }
    .status-badge.suspended { background: #ffebee; color: #c62828; }
    
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    
    .btn-view, .btn-suspend {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    
    .btn-view {
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .btn-suspend {
      background: #ffebee;
      color: #c62828;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
    }
    
    .pagination button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .page-info {
      color: #666;
    }
    
    /* 彈窗 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 18px;
    }
    
    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .detail-item label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .detail-item span {
      font-size: 14px;
      font-weight: 500;
    }
    
    .recent-logins h3 {
      font-size: 14px;
      margin: 0 0 12px 0;
    }
    
    .login-list {
      background: #f5f5f5;
      border-radius: 6px;
      padding: 12px;
    }
    
    .login-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .login-item:last-child {
      border-bottom: none;
    }
    
    .login-ip {
      font-family: monospace;
    }
    
    .login-time {
      font-size: 12px;
      color: #666;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #eee;
    }
    
    .btn-secondary {
      padding: 10px 20px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .btn-danger {
      padding: 10px 20px;
      background: #c62828;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users = signal<UserListItem[]>([]);
  selectedUser = signal<UserDetail | null>(null);
  currentPage = signal(1);
  totalPages = signal(1);
  
  searchTerm = '';
  filterStatus = '';
  filterTier = '';
  
  constructor(
    private adminService: AdminService,
    private i18n: I18nService
  ) {}
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    this.loadUsers();
  }
  
  async loadUsers() {
    const result = await this.adminService.getUsers(
      this.currentPage(),
      20,
      {
        search: this.searchTerm || undefined,
        status: this.filterStatus || undefined,
        tier: this.filterTier || undefined
      }
    );
    
    this.users.set(result.items);
    this.totalPages.set(result.total_pages);
  }
  
  search() {
    this.currentPage.set(1);
    this.loadUsers();
  }
  
  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadUsers();
  }
  
  async viewUser(user: UserListItem) {
    const detail = await this.adminService.getUserDetail(user.user_id);
    this.selectedUser.set(detail);
  }
  
  closeDetail() {
    this.selectedUser.set(null);
  }
  
  async suspendUser(user: UserListItem | UserDetail) {
    const reason = prompt(this.t('admin.suspendReason'));
    if (reason !== null) {
      const success = await this.adminService.suspendUser(user.user_id, reason);
      if (success) {
        this.loadUsers();
        this.closeDetail();
      }
    }
  }
  
  getInitial(name: string): string {
    return (name || 'U').charAt(0).toUpperCase();
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }
}
