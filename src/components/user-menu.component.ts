/**
 * 用戶菜單組件
 * 
 * 優化設計：
 * 1. 頭像和用戶信息顯示
 * 2. 下拉菜單（設置、登出等）
 * 3. 訂閱狀態顯示
 * 4. 使用量概覽
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- SaaS 模式顯示用戶菜單 -->
    @if (showUserMenu()) {
      <div class="user-menu-container">
        <!-- 觸發按鈕 -->
        <button 
          class="user-trigger"
          (click)="toggleMenu()"
          [class.active]="isOpen()"
        >
          <div class="user-avatar">
            @if (user()?.avatar_url) {
              <img [src]="user()?.avatar_url" alt="Avatar" />
            } @else {
              <span class="avatar-fallback">{{ avatarInitial() }}</span>
            }
          </div>
          <div class="user-info">
            <span class="user-name">{{ user()?.display_name || user()?.username || '用戶' }}</span>
            <span class="user-tier" [class]="tierClass()">
              {{ tierLabel() }}
            </span>
          </div>
          <span class="dropdown-arrow" [class.open]="isOpen()">▼</span>
        </button>
        
        <!-- 下拉菜單 -->
        @if (isOpen()) {
          <div class="dropdown-menu" (click)="$event.stopPropagation()">
            <!-- 用戶信息 -->
            <div class="menu-header">
              <div class="header-avatar">
                @if (user()?.avatar_url) {
                  <img [src]="user()?.avatar_url" alt="Avatar" />
                } @else {
                  <span class="avatar-fallback large">{{ avatarInitial() }}</span>
                }
              </div>
              <div class="header-info">
                <strong>{{ user()?.display_name || user()?.username }}</strong>
                <span class="header-email">{{ user()?.email }}</span>
              </div>
            </div>
            
            <!-- 使用量概覽 -->
            <div class="usage-overview">
              <div class="usage-item">
                <span class="usage-label">帳號</span>
                <div class="usage-bar">
                  <div 
                    class="usage-fill"
                    [style.width.%]="accountsPercentage()"
                  ></div>
                </div>
                <span class="usage-text">{{ accountsUsed() }}/{{ maxAccounts() }}</span>
              </div>
            </div>
            
            <!-- 菜單項 -->
            <div class="menu-items">
              <a class="menu-item" routerLink="/user-settings" (click)="closeMenu()">
                <span class="item-icon">👤</span>
                <span>{{ t('auth.profile') }}</span>
              </a>
              <a class="menu-item" routerLink="/user-settings" (click)="closeMenu()">
                <span class="item-icon">⚙️</span>
                <span>{{ t('auth.settings') }}</span>
              </a>
              @if (!isPro()) {
                <a class="menu-item upgrade" routerLink="/upgrade" (click)="closeMenu()">
                  <span class="item-icon">⭐</span>
                  <span>{{ t('subscription.upgrade') }}</span>
                  <span class="upgrade-badge">PRO</span>
                </a>
              }
            </div>
            
            <!-- 分隔線 -->
            <div class="menu-divider"></div>
            
            <!-- 登出 -->
            <button class="menu-item logout" (click)="logout()">
              <span class="item-icon">🚪</span>
              <span>{{ t('auth.logout') }}</span>
            </button>
          </div>
        }
      </div>
    } @else {
      <!-- Electron 模式顯示簡單的設置按鈕 -->
      <button class="settings-btn" routerLink="/settings">
        <span>⚙️</span>
      </button>
    }
  `,
  styles: [`
    .user-menu-container {
      position: relative;
    }
    
    /* 觸發按鈕 */
    .user-trigger {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .user-trigger:hover,
    .user-trigger.active {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-color, #333);
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    }
    
    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
    }
    
    .avatar-fallback.large {
      font-size: 1.25rem;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.125rem;
    }
    
    .user-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .user-tier {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-weight: 600;
    }
    
    .user-tier.free {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }
    
    .user-tier.basic {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
    
    .user-tier.pro {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
      color: #c084fc;
    }
    
    .user-tier.enterprise {
      background: rgba(234, 179, 8, 0.2);
      color: #fbbf24;
    }
    
    .dropdown-arrow {
      font-size: 0.625rem;
      color: var(--text-secondary, #888);
      transition: transform 0.2s ease;
    }
    
    .dropdown-arrow.open {
      transform: rotate(180deg);
    }
    
    /* 下拉菜單 */
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 280px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      z-index: 1000;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* 菜單頭部 */
    .menu-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--bg-tertiary, #151515);
      border-bottom: 1px solid var(--border-color, #333);
    }
    
    .header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    }
    
    .header-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .header-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    
    .header-info strong {
      font-size: 0.875rem;
    }
    
    .header-email {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    /* 使用量概覽 */
    .usage-overview {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color, #333);
    }
    
    .usage-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .usage-label {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
      width: 32px;
    }
    
    .usage-bar {
      flex: 1;
      height: 4px;
      background: var(--bg-tertiary, #333);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .usage-text {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
      min-width: 40px;
      text-align: right;
    }
    
    /* 菜單項 */
    .menu-items {
      padding: 0.5rem;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      color: var(--text-primary, #fff);
      text-decoration: none;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s ease;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
    }
    
    .menu-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .menu-item.upgrade {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
    }
    
    .menu-item.upgrade:hover {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
    }
    
    .upgrade-badge {
      margin-left: auto;
      padding: 0.125rem 0.5rem;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
    }
    
    .item-icon {
      font-size: 1rem;
      width: 20px;
      text-align: center;
    }
    
    .menu-divider {
      height: 1px;
      background: var(--border-color, #333);
      margin: 0.25rem 0;
    }
    
    .menu-item.logout {
      color: #f87171;
    }
    
    .menu-item.logout:hover {
      background: rgba(239, 68, 68, 0.1);
    }
    
    /* Electron 模式的設置按鈕 */
    .settings-btn {
      padding: 0.5rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 1.25rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .settings-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  `]
})
export class UserMenuComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private elementRef = inject(ElementRef);
  
  // 狀態
  isOpen = signal(false);
  
  // 用戶信息
  user = this.authService.user;
  
  // 計算屬性
  showUserMenu = computed(() => environment.apiMode === 'http');
  
  avatarInitial = computed(() => {
    const user = this.user();
    if (user?.display_name) return user.display_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  });
  
  tierClass = computed(() => {
    return this.authService.subscriptionTier();
  });
  
  tierLabel = computed(() => {
    const tier = this.authService.subscriptionTier();
    const labels: Record<string, string> = {
      'free': '免費版',
      'basic': '基礎版',
      'pro': '專業版',
      'enterprise': '企業版'
    };
    return labels[tier] || tier;
  });
  
  isPro = computed(() => this.authService.isPro());
  
  maxAccounts = computed(() => this.authService.maxAccounts());
  accountsUsed = signal(0);  // TODO: 從 API 獲取
  accountsPercentage = computed(() => {
    const max = this.maxAccounts();
    const used = this.accountsUsed();
    return Math.min(100, (used / max) * 100);
  });
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  toggleMenu() {
    this.isOpen.update(v => !v);
  }
  
  closeMenu() {
    this.isOpen.set(false);
  }
  
  async logout() {
    this.closeMenu();
    await this.authService.logout();
  }
  
  // 點擊外部關閉菜單
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }
}
