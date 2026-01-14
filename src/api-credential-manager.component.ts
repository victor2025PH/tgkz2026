/**
 * API 憑據管理組件（重構版）
 * 
 * 兩個 Tab：
 * 1. 我的自建 API - 管理用戶自己申請的 API
 * 2. 平台 API 配額 - 查看會員的平台 API 使用情況
 */

import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { MembershipService } from './membership.service';

interface LocalApiCredential {
  api_id: string;
  api_hash: string;
  name: string;
  source: string;
  created_at: string;
  is_active: boolean;
  account_count: number;
  max_accounts: number;
  bound_phones: string[];
}

interface PlatformAllocation {
  phone: string;
  api_id: string;
  allocated_at: string;
  status: string;
}

type Tab = 'local' | 'platform';

@Component({
  selector: 'app-api-credential-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-manager">
      <!-- 頁面標題 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-icon">🔐</span>
          API 憑據管理
        </h1>
        <p class="page-subtitle">管理您的 Telegram API 憑據，確保帳號安全</p>
      </div>

      <!-- Tab 切換 -->
      <div class="tabs">
        <button 
          (click)="currentTab.set('local')"
          [class.active]="currentTab() === 'local'"
          class="tab-btn">
          <span class="tab-icon">🔧</span>
          我的自建 API
        </button>
        <button 
          (click)="currentTab.set('platform')"
          [class.active]="currentTab() === 'platform'"
          class="tab-btn">
          <span class="tab-icon">🔐</span>
          平台 API 配額
          @if (canUsePlatformApi()) {
            <span class="tab-badge">{{ platformQuotaText() }}</span>
          }
        </button>
      </div>

      <!-- Tab 1: 我的自建 API -->
      @if (currentTab() === 'local') {
        <div class="tab-content">
          <!-- 添加新 API -->
          <div class="add-section">
            <button (click)="showAddForm.set(!showAddForm())" class="add-btn">
              @if (showAddForm()) {
                ✕ 取消
              } @else {
                ➕ 添加新 API 憑據
              }
            </button>
          </div>

          @if (showAddForm()) {
            <div class="form-card">
              <h3>添加自建 API 憑據</h3>
              
              <div class="form-group">
                <label>API ID <span class="required">*</span></label>
                <input 
                  type="text" 
                  [(ngModel)]="newApiId"
                  placeholder="例如：12345678"
                  class="form-input">
              </div>

              <div class="form-group">
                <label>API Hash <span class="required">*</span></label>
                <input 
                  type="text" 
                  [(ngModel)]="newApiHash"
                  placeholder="例如：a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
                  class="form-input">
              </div>

              <div class="form-group">
                <label>憑據名稱</label>
                <input 
                  type="text" 
                  [(ngModel)]="newApiName"
                  placeholder="例如：主力 API"
                  class="form-input">
              </div>

              <div class="form-actions">
                <button (click)="showAddForm.set(false)" class="btn-secondary">取消</button>
                <button 
                  (click)="addLocalApi()" 
                  [disabled]="!isNewApiValid()"
                  class="btn-primary">
                  添加 API
                </button>
              </div>

              <!-- 申請指南 -->
              <div class="guide-box">
                <h4>📖 如何獲取 API 憑據？</h4>
                <ol>
                  <li>訪問 <a href="https://my.telegram.org" target="_blank">https://my.telegram.org</a></li>
                  <li>使用 Telegram 帳號登入</li>
                  <li>點擊「API development tools」</li>
                  <li>創建應用並複製 API ID 和 Hash</li>
                </ol>
              </div>
            </div>
          }

          <!-- API 列表 -->
          <div class="api-list">
            @if (localApis().length === 0) {
              <div class="empty-state">
                <div class="empty-icon">🔧</div>
                <h3>尚未添加自建 API</h3>
                <p>添加您自己的 API 憑據，享受最高安全性</p>
                <button (click)="showAddForm.set(true)" class="btn-primary">
                  ➕ 添加第一個 API
                </button>
              </div>
            } @else {
              @for (api of localApis(); track api.api_id) {
                <div class="api-card" [class.inactive]="!api.is_active">
                  <div class="api-header">
                    <div class="api-info">
                      <span class="api-name">{{ api.name || 'API ' + api.api_id }}</span>
                      <span class="api-id">ID: {{ api.api_id }}</span>
                    </div>
                    <div class="api-status">
                      @if (api.is_active) {
                        <span class="status-badge active">✅ 啟用</span>
                      } @else {
                        <span class="status-badge inactive">⏸️ 停用</span>
                      }
                    </div>
                  </div>

                  <div class="api-usage">
                    <div class="usage-label">已綁帳號</div>
                    <div class="usage-bar">
                      <div 
                        class="usage-fill" 
                        [style.width.%]="(api.account_count / api.max_accounts) * 100">
                      </div>
                    </div>
                    <div class="usage-text">{{ api.account_count }}/{{ api.max_accounts }}</div>
                  </div>

                  @if (api.bound_phones && api.bound_phones.length > 0) {
                    <div class="bound-phones">
                      <span class="phones-label">綁定帳號：</span>
                      @for (phone of api.bound_phones; track phone) {
                        <span class="phone-tag">{{ phone }}</span>
                      }
                    </div>
                  }

                  <div class="api-actions">
                    @if (api.is_active) {
                      <button (click)="toggleApiStatus(api.api_id, false)" class="action-btn">
                        ⏸️ 停用
                      </button>
                    } @else {
                      <button (click)="toggleApiStatus(api.api_id, true)" class="action-btn">
                        ▶️ 啟用
                      </button>
                    }
                    <button (click)="removeApi(api.api_id)" class="action-btn danger">
                      🗑️ 刪除
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          <!-- 使用建議 -->
          <div class="tips-box">
            <h4>💡 使用建議</h4>
            <ul>
              <li>每個 API 建議最多綁定 <strong>3-5 個帳號</strong></li>
              <li>定期輪換 API 可降低風險</li>
              <li>如有帳號被封，建議更換 API</li>
              <li>API 憑據請妥善保管，不要洩露</li>
            </ul>
          </div>
        </div>
      }

      <!-- Tab 2: 平台 API 配額 -->
      @if (currentTab() === 'platform') {
        <div class="tab-content">
          <!-- 會員信息 -->
          <div class="membership-card">
            <div class="membership-header">
              <div class="level-info">
                <span class="level-icon">{{ membershipService.levelIcon() }}</span>
                <div class="level-details">
                  <span class="level-name">{{ membershipService.levelName() }}</span>
                  <span class="level-label">當前會員等級</span>
                </div>
              </div>
              @if (!canUsePlatformApi()) {
                <button (click)="openUpgrade()" class="upgrade-btn">
                  🔼 升級解鎖平台 API
                </button>
              }
            </div>

            @if (canUsePlatformApi()) {
              <div class="quota-section">
                <div class="quota-item">
                  <div class="quota-header">
                    <span class="quota-title">API 配額</span>
                    <span class="quota-value">
                      {{ platformUsage().usedApis }}/{{ platformUsage().totalApis === -1 ? '∞' : platformUsage().totalApis }}
                    </span>
                  </div>
                  <div class="quota-bar">
                    <div 
                      class="quota-fill" 
                      [style.width.%]="platformUsage().totalApis === -1 ? 30 : (platformUsage().usedApis / platformUsage().totalApis) * 100">
                    </div>
                  </div>
                </div>

                <div class="quota-item">
                  <div class="quota-header">
                    <span class="quota-title">帳號配額</span>
                    <span class="quota-value">
                      {{ platformUsage().usedAccounts }}/{{ platformUsage().totalAccounts === -1 ? '∞' : platformUsage().totalAccounts }}
                    </span>
                  </div>
                  <div class="quota-bar">
                    <div 
                      class="quota-fill" 
                      [style.width.%]="platformUsage().totalAccounts === -1 ? 30 : (platformUsage().usedAccounts / platformUsage().totalAccounts) * 100">
                    </div>
                  </div>
                </div>

                <div class="quota-summary">
                  @if (platformUsage().canAddMore) {
                    <span class="summary-text good">
                      ✅ 您還可以使用平台 API 添加 {{ platformUsage().remainingSlots }} 個帳號
                    </span>
                  } @else {
                    <span class="summary-text warning">
                      ⚠️ 平台 API 配額已滿
                    </span>
                  }
                </div>
              </div>

              <!-- 已分配的平台 API -->
              @if (platformAllocations().length > 0) {
                <div class="allocations-section">
                  <h3>📋 已分配的平台 API</h3>
                  <p class="section-desc">這些帳號正在使用平台 API 池</p>

                  <div class="allocations-list">
                    @for (alloc of platformAllocations(); track alloc.phone) {
                      <div class="allocation-item">
                        <div class="alloc-phone">{{ alloc.phone }}</div>
                        <div class="alloc-info">
                          <span class="alloc-api">API: {{ alloc.api_id }}</span>
                          <span class="alloc-date">{{ formatDate(alloc.allocated_at) }}</span>
                        </div>
                        <div class="alloc-status">
                          @if (alloc.status === 'active') {
                            <span class="status-dot active"></span>
                            <span>運行中</span>
                          } @else {
                            <span class="status-dot inactive"></span>
                            <span>已停止</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else {
              <!-- 未解鎖提示 -->
              <div class="locked-section">
                <div class="locked-icon">🔒</div>
                <h3>平台 API 池尚未解鎖</h3>
                <p>升級到 <strong>白銀精英</strong> 或更高會員等級，即可使用平台 API 池功能</p>

                <div class="benefit-list">
                  <div class="benefit-item">
                    <span class="benefit-icon">🚀</span>
                    <span>無需申請，一鍵使用</span>
                  </div>
                  <div class="benefit-item">
                    <span class="benefit-icon">🔄</span>
                    <span>智能分配，自動輪換</span>
                  </div>
                  <div class="benefit-item">
                    <span class="benefit-icon">🛡️</span>
                    <span>專業維護，風險可控</span>
                  </div>
                </div>

                <button (click)="openUpgrade()" class="upgrade-btn large">
                  🔼 升級會員解鎖
                </button>
              </div>
            }
          </div>

          <!-- 會員等級對比 -->
          <div class="level-compare">
            <h3>📊 會員等級 API 配額對比</h3>
            <table class="compare-table">
              <thead>
                <tr>
                  <th>會員等級</th>
                  <th>月費 (USDT)</th>
                  <th>平台 API</th>
                  <th>最大帳號</th>
                </tr>
              </thead>
              <tbody>
                <tr [class.current]="membershipService.level() === 'bronze'">
                  <td><span class="level-badge bronze">⚔️ 青銅戰士</span></td>
                  <td>免費</td>
                  <td>❌ 需自備</td>
                  <td>2</td>
                </tr>
                <tr [class.current]="membershipService.level() === 'silver'">
                  <td><span class="level-badge silver">🥈 白銀精英</span></td>
                  <td>9.9</td>
                  <td>1 個 API</td>
                  <td>3 (平台) / 5 (總)</td>
                </tr>
                <tr [class.current]="membershipService.level() === 'gold'">
                  <td><span class="level-badge gold">🥇 黃金大師</span></td>
                  <td>29.9</td>
                  <td>3 個 API</td>
                  <td>9 (平台) / 15 (總)</td>
                </tr>
                <tr [class.current]="membershipService.level() === 'diamond'">
                  <td><span class="level-badge diamond">💎 鑽石王牌</span></td>
                  <td>99.9</td>
                  <td>10 個 API</td>
                  <td>30 (平台) / 50 (總)</td>
                </tr>
                <tr [class.current]="membershipService.level() === 'star'">
                  <td><span class="level-badge star">🌟 星耀傳說</span></td>
                  <td>299</td>
                  <td>30 個 API</td>
                  <td>90 (平台) / 100 (總)</td>
                </tr>
                <tr [class.current]="membershipService.level() === 'king'">
                  <td><span class="level-badge king">👑 榮耀王者</span></td>
                  <td>999</td>
                  <td>∞ 無限</td>
                  <td>∞ 無限</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .api-manager {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .page-header {
      margin-bottom: 2rem;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      color: var(--text-primary, white);
    }

    .title-icon { font-size: 2rem; }

    .page-subtitle {
      margin: 0;
      color: var(--text-muted, #94a3b8);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      padding: 0.375rem;
      border-radius: 0.75rem;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      color: var(--text-muted, #94a3b8);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn:hover { color: var(--text-primary, white); }

    .tab-btn.active {
      background: var(--primary, #06b6d4);
      color: white;
    }

    .tab-icon { font-size: 1.125rem; }

    .tab-badge {
      padding: 0.125rem 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 1rem;
      font-size: 0.7rem;
    }

    /* Tab Content */
    .tab-content {
      animation: fadeIn 0.2s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Add Section */
    .add-section {
      margin-bottom: 1rem;
    }

    .add-btn {
      padding: 0.75rem 1.5rem;
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
    }

    /* Form Card */
    .form-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-card h3 {
      margin: 0 0 1rem 0;
      color: var(--text-primary, white);
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .required { color: #ef4444; }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary, #06b6d4);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .btn-primary {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.5rem;
      color: var(--text-secondary, #cbd5e1);
      cursor: pointer;
    }

    /* Guide Box */
    .guide-box {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }

    .guide-box h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .guide-box ol {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .guide-box a { color: var(--primary, #06b6d4); }

    /* API List */
    .api-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .api-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.75rem;
      padding: 1rem;
      transition: all 0.2s;
    }

    .api-card:hover {
      border-color: var(--primary, #06b6d4);
    }

    .api-card.inactive {
      opacity: 0.6;
    }

    .api-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .api-name {
      font-weight: 600;
      color: var(--text-primary, white);
    }

    .api-id {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.7rem;
    }

    .status-badge.active { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .status-badge.inactive { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

    .api-usage {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .usage-label {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      min-width: 60px;
    }

    .usage-bar {
      flex: 1;
      height: 6px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 3px;
      overflow: hidden;
    }

    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #22c55e);
      border-radius: 3px;
    }

    .usage-text {
      font-size: 0.75rem;
      color: var(--text-secondary, #cbd5e1);
      min-width: 40px;
      text-align: right;
    }

    .bound-phones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .phones-label {
      font-size: 0.7rem;
      color: var(--text-muted, #94a3b8);
    }

    .phone-tag {
      padding: 0.125rem 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.25rem;
      font-size: 0.7rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .api-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      padding: 0.375rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
    }

    .action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #fca5a5;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border-radius: 0.75rem;
      border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));
    }

    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary, white);
    }

    .empty-state p {
      margin: 0 0 1.5rem 0;
      color: var(--text-muted, #94a3b8);
    }

    /* Tips Box */
    .tips-box {
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      padding: 1rem;
      border-radius: 0.75rem;
    }

    .tips-box h4 {
      margin: 0 0 0.75rem 0;
      color: var(--text-primary, white);
    }

    .tips-box ul {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .tips-box li { margin-bottom: 0.375rem; }

    /* Membership Card */
    .membership-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .membership-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .level-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .level-icon { font-size: 2.5rem; }

    .level-details {
      display: flex;
      flex-direction: column;
    }

    .level-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary, white);
    }

    .level-label {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .upgrade-btn {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .upgrade-btn:hover {
      transform: translateY(-1px);
    }

    .upgrade-btn.large {
      padding: 1rem 2rem;
      font-size: 1.125rem;
    }

    /* Quota Section */
    .quota-section {
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
    }

    .quota-item {
      margin-bottom: 1rem;
    }

    .quota-item:last-child { margin-bottom: 0; }

    .quota-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }

    .quota-title {
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .quota-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, white);
    }

    .quota-bar {
      height: 8px;
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border-radius: 4px;
      overflow: hidden;
    }

    .quota-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #22c55e);
    }

    .quota-summary {
      margin-top: 1rem;
      text-align: center;
    }

    .summary-text {
      font-size: 0.875rem;
    }

    .summary-text.good { color: #22c55e; }
    .summary-text.warning { color: #f59e0b; }

    /* Allocations Section */
    .allocations-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .allocations-section h3 {
      margin: 0 0 0.25rem 0;
      color: var(--text-primary, white);
    }

    .section-desc {
      margin: 0 0 1rem 0;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .allocations-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .allocation-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
    }

    .alloc-phone {
      font-weight: 500;
      color: var(--text-primary, white);
    }

    .alloc-info {
      flex: 1;
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .alloc-status {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.active { background: #22c55e; }
    .status-dot.inactive { background: #94a3b8; }

    /* Locked Section */
    .locked-section {
      text-align: center;
      padding: 2rem;
    }

    .locked-icon { font-size: 4rem; margin-bottom: 1rem; }

    .locked-section h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary, white);
    }

    .locked-section p {
      margin: 0 0 1.5rem 0;
      color: var(--text-muted, #94a3b8);
    }

    .benefit-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }

    /* Level Compare Table */
    .level-compare {
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .level-compare h3 {
      margin: 0 0 1rem 0;
      color: var(--text-primary, white);
    }

    .compare-table {
      width: 100%;
      border-collapse: collapse;
    }

    .compare-table th,
    .compare-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .compare-table th {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
    }

    .compare-table td {
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.875rem;
    }

    .compare-table tr.current {
      background: rgba(6, 182, 212, 0.1);
    }

    .compare-table tr.current td {
      color: var(--text-primary, white);
    }

    .level-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.8rem;
    }

    .level-badge.bronze { background: rgba(205, 127, 50, 0.2); color: #cd7f32; }
    .level-badge.silver { background: rgba(192, 192, 192, 0.2); color: #c0c0c0; }
    .level-badge.gold { background: rgba(255, 215, 0, 0.2); color: #ffd700; }
    .level-badge.diamond { background: rgba(185, 242, 255, 0.2); color: #67e8f9; }
    .level-badge.star { background: rgba(255, 215, 0, 0.2); color: #fcd34d; }
    .level-badge.king { background: rgba(139, 69, 19, 0.2); color: #fbbf24; }
  `]
})
export class ApiCredentialManagerComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  membershipService = inject(MembershipService);

  // 狀態
  currentTab = signal<Tab>('local');
  showAddForm = signal(false);
  
  // 本地 API
  localApis = signal<LocalApiCredential[]>([]);
  newApiId = '';
  newApiHash = '';
  newApiName = '';
  
  // 平台 API 使用情況
  platformUsage = signal({
    usedApis: 0,
    totalApis: 0,
    usedAccounts: 0,
    totalAccounts: 0,
    canAddMore: false,
    remainingSlots: 0
  });
  platformAllocations = signal<PlatformAllocation[]>([]);

  private ipcChannels: string[] = [];

  // 計算屬性
  canUsePlatformApi = computed(() => {
    const quotas = this.membershipService.quotas();
    return quotas.platformApiQuota > 0;
  });

  platformQuotaText = computed(() => {
    const usage = this.platformUsage();
    return `${usage.usedAccounts}/${usage.totalAccounts}`;
  });

  isNewApiValid = computed(() => {
    return this.newApiId && 
           /^\d+$/.test(this.newApiId) && 
           this.newApiHash && 
           /^[a-f0-9]{32}$/i.test(this.newApiHash);
  });

  ngOnInit(): void {
    this.loadLocalApis();
    this.loadPlatformUsage();
    this.setupIpcListeners();
  }

  ngOnDestroy(): void {
    this.ipcChannels.forEach(ch => this.ipcService.cleanup(ch));
  }

  private loadLocalApis(): void {
    this.ipcService.send('get-api-credentials', {});
  }

  private loadPlatformUsage(): void {
    if (this.canUsePlatformApi()) {
      this.ipcService.send('get-platform-api-usage', {
        membershipLevel: this.membershipService.level()
      });
    } else {
      // 設置默認值
      const quotas = this.membershipService.quotas();
      this.platformUsage.set({
        usedApis: 0,
        totalApis: quotas.platformApiQuota,
        usedAccounts: 0,
        totalAccounts: quotas.platformApiMaxAccounts,
        canAddMore: false,
        remainingSlots: 0
      });
    }
  }

  private setupIpcListeners(): void {
    // 本地 API 更新
    this.ipcService.on('api-credentials-updated', (data: any) => {
      if (data.credentials) {
        this.localApis.set(data.credentials.filter((c: any) => c.source === 'expert' || c.source === 'local'));
      }
    });
    this.ipcChannels.push('api-credentials-updated');

    // 平台 API 使用情況
    this.ipcService.on('platform-api-usage', (data: any) => {
      if (data.success !== false) {
        this.platformUsage.set({
          usedApis: data.usedApis || 0,
          totalApis: data.totalApis || 0,
          usedAccounts: data.usedAccounts || 0,
          totalAccounts: data.totalAccounts || 0,
          canAddMore: data.canAddMore || false,
          remainingSlots: data.remainingSlots || 0
        });
      }
    });
    this.ipcChannels.push('platform-api-usage');

    // 用戶分配
    this.ipcService.on('user-api-allocations', (data: any) => {
      if (data.allocations) {
        this.platformAllocations.set(data.allocations);
      }
    });
    this.ipcChannels.push('user-api-allocations');
  }

  addLocalApi(): void {
    if (!this.isNewApiValid()) return;

    this.ipcService.send('add-api-credential', {
      apiId: this.newApiId,
      apiHash: this.newApiHash,
      name: this.newApiName || `API ${this.newApiId}`,
      source: 'expert'
    });

    this.newApiId = '';
    this.newApiHash = '';
    this.newApiName = '';
    this.showAddForm.set(false);
    this.toast.success('API 添加成功');
  }

  toggleApiStatus(apiId: string, active: boolean): void {
    this.ipcService.send('toggle-api-credential', { apiId, active });
    this.toast.info(active ? 'API 已啟用' : 'API 已停用');
  }

  removeApi(apiId: string): void {
    if (confirm('確定要刪除此 API 憑據嗎？')) {
      this.ipcService.send('remove-api-credential', { apiId });
      this.toast.success('API 已刪除');
    }
  }

  openUpgrade(): void {
    window.dispatchEvent(new CustomEvent('open-membership-dialog'));
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
