/**
 * API 選擇器組件
 * 
 * 支持三種模式：
 * 1. 智能推薦 - 自動選擇最佳 API
 * 2. 我的 API 池 - 從已添加的 API 中選擇
 * 3. 手動輸入 - 輸入新的 API 並可選保存
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { MembershipService } from './membership.service';

export interface ApiCredential {
  api_id: string;
  api_hash?: string;
  name: string;
  source?: string;
  account_count: number;
  max_accounts: number;
  is_active: boolean;
  is_public?: boolean;
}

export interface SelectedApi {
  api_id: string;
  api_hash: string;
  name?: string;
  /** API 來源: pool=用戶API池, platform=平台公共API, manual=手動輸入 */
  source: 'pool' | 'platform' | 'manual';
}

type SelectMode = 'recommend' | 'pool' | 'manual';

@Component({
  selector: 'app-api-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-selector">
      <!-- 模式 Tab -->
      <div class="mode-tabs">
        <button 
          (click)="selectMode('recommend')"
          [class.active]="currentMode() === 'recommend'"
          class="mode-tab">
          🎯 智能推薦
        </button>
        <button 
          (click)="selectMode('pool')"
          [class.active]="currentMode() === 'pool'"
          class="mode-tab">
          📋 我的 API
        </button>
        <button 
          (click)="selectMode('manual')"
          [class.active]="currentMode() === 'manual'"
          class="mode-tab">
          ✏️ 手動輸入
        </button>
      </div>

      <!-- 智能推薦模式 -->
      @if (currentMode() === 'recommend') {
        <div class="mode-content">
          @if (isLoading()) {
            <div class="loading-state">
              <span class="spinner"></span>
              <span>正在分析最佳 API...</span>
            </div>
          } @else if (recommendedApi()) {
            <div class="recommended-card">
              <div class="recommend-badge">⭐ 推薦</div>
              <div class="api-info">
                <div class="api-name">{{ safeDisplayName(recommendedApi()!.name, recommendedApi()!.api_id) }}</div>
                <div class="api-id">ID: {{ recommendedApi()!.api_id }}</div>
              </div>
              <div class="api-quota">
                <div class="quota-bar">
                  <div class="quota-fill" 
                       [style.width.%]="(recommendedApi()!.account_count / recommendedApi()!.max_accounts) * 100">
                  </div>
                </div>
                <span class="quota-text">{{ recommendedApi()!.account_count }}/{{ recommendedApi()!.max_accounts }}</span>
              </div>
              <button (click)="useRecommended()" class="use-btn">使用此 API</button>
            </div>
            <p class="recommend-reason">💡 此 API 負載最低，可用空間充足</p>
          } @else {
            <!-- 🆕 没有用户 API 时，显示平台公共 API 选项 -->
            <div class="platform-api-card">
              <div class="platform-badge">🚀 一鍵登入</div>
              <div class="platform-icon">🔐</div>
              <h3>使用平台公共 API</h3>
              <p class="platform-desc">無需了解 API，直接開始登入</p>
              <ul class="platform-features">
                <li>✅ 免配置，即開即用</li>
                <li>✅ 穩定可靠</li>
                <li>✅ 適合新手用戶</li>
              </ul>
              <button (click)="usePlatformApi()" class="platform-btn">
                🚀 立即使用
              </button>
            </div>
            
            <div class="divider-text">
              <span>或者</span>
            </div>
            
            <div class="advanced-option">
              <button (click)="selectMode('manual')" class="advanced-btn">
                🔧 我有自己的 API（進階用戶）
              </button>
              <p class="advanced-hint">如果您有自己的 Telegram API 憑據，點擊此處添加</p>
            </div>
          }
        </div>
      }

      <!-- 我的 API 池模式 -->
      @if (currentMode() === 'pool') {
        <div class="mode-content">
          @if (apiList().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📭</span>
              <p>您還沒有添加任何 API</p>
              <button (click)="selectMode('manual')" class="add-btn">➕ 添加第一個 API</button>
            </div>
          } @else {
            <div class="api-list">
              @for (api of apiList(); track api.api_id) {
                <div 
                  class="api-item" 
                  [class.selected]="selectedPoolApi() === api.api_id"
                  [class.disabled]="!api.is_active || api.account_count >= api.max_accounts"
                  (click)="selectPoolApi(api)">
                  <div class="api-item-info">
                    <span class="api-item-name">{{ safeDisplayName(api.name, api.api_id) }}</span>
                    <span class="api-item-id">ID: {{ api.api_id }}</span>
                  </div>
                  <div class="api-item-right">
                    <span class="quota-badge" 
                          [class.warning]="api.account_count >= api.max_accounts * 0.8"
                          [class.full]="api.account_count >= api.max_accounts">
                      {{ api.account_count }}/{{ api.max_accounts }}
                    </span>
                    @if (!api.is_active) {
                      <span class="status-badge inactive">停用</span>
                    } @else if (api.account_count >= api.max_accounts) {
                      <span class="status-badge full">已滿</span>
                    } @else if (recommendedApi()?.api_id === api.api_id) {
                      <span class="status-badge recommend">推薦</span>
                    }
                  </div>
                </div>
              }
            </div>
            
            @if (selectedPoolApi()) {
              <button (click)="confirmPoolSelection()" class="confirm-btn">確認選擇</button>
            }
            
            <div class="pool-footer">
              <button (click)="selectMode('manual')" class="add-more-btn">➕ 添加新 API</button>
            </div>
          }
        </div>
      }

      <!-- 手動輸入模式 -->
      @if (currentMode() === 'manual') {
        <div class="mode-content">
          <div class="form-group">
            <label>API ID <span class="required">*</span></label>
            <input 
              type="text"
              [value]="manualApiId()"
              (input)="manualApiId.set($any($event.target).value)"
              placeholder="例如：12345678"
              class="form-input">
          </div>
          
          <div class="form-group">
            <label>API Hash <span class="required">*</span></label>
            <input 
              type="text"
              [value]="manualApiHash()"
              (input)="manualApiHash.set($any($event.target).value)"
              placeholder="例如：a1b2c3d4e5f6g7h8..."
              class="form-input">
          </div>
          
          <div class="save-option">
            <input type="checkbox" [checked]="saveToPool()" (change)="saveToPool.set($any($event.target).checked)" id="saveToPool">
            <label for="saveToPool">保存到我的 API 池（方便下次使用）</label>
          </div>
          
          @if (saveToPool()) {
            <div class="form-group">
              <label>API 名稱（可選）</label>
              <input 
                type="text"
                [value]="manualApiName()"
                (input)="manualApiName.set($any($event.target).value)"
                placeholder="例如：主力 API"
                class="form-input">
            </div>
          }
          
          <button 
            (click)="confirmManualInput()" 
            [disabled]="!isManualValid()"
            class="confirm-btn">
            確認使用
          </button>
          
          <!-- 簡潔的申請指南 -->
          <div class="guide-link">
            <span>👉</span>
            <a href="https://my.telegram.org" target="_blank">前往申請 API 憑據</a>
          </div>
        </div>
      }

      <!-- 已選擇的 API 顯示 -->
      @if (selectedApi() && showSelected) {
        <div class="selected-display">
          <div class="selected-info">
            <span class="selected-label">已選擇：</span>
            <span class="selected-name">{{ safeDisplayName(selectedApi()!.name, selectedApi()!.api_id) }}</span>
            <span class="selected-id">ID: {{ selectedApi()!.api_id }}</span>
          </div>
          <button (click)="clearSelection()" class="clear-btn">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .api-selector {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 0.75rem;
      overflow: hidden;
    }

    /* Mode Tabs */
    .mode-tabs {
      display: flex;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 0.25rem;
    }

    .mode-tab {
      flex: 1;
      padding: 0.625rem 0.5rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-tab:hover {
      color: var(--text-primary, white);
    }

    .mode-tab.active {
      background: var(--primary, #06b6d4);
      color: white;
    }

    /* Mode Content */
    .mode-content {
      padding: 1rem;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      color: var(--text-muted, #94a3b8);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 1.5rem;
    }

    .empty-icon {
      font-size: 2rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      margin: 0 0 0.25rem 0;
      color: var(--text-secondary, #cbd5e1);
    }

    .empty-state .hint {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 1rem;
    }

    .add-btn {
      padding: 0.5rem 1rem;
      background: var(--primary, #06b6d4);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-size: 0.8rem;
      cursor: pointer;
    }

    /* Recommended Card */
    .recommended-card {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 2px solid var(--primary, #06b6d4);
      border-radius: 0.75rem;
      padding: 1rem;
      position: relative;
    }

    .recommend-badge {
      position: absolute;
      top: -10px;
      right: 12px;
      padding: 0.25rem 0.75rem;
      background: var(--primary, #06b6d4);
      border-radius: 1rem;
      font-size: 0.7rem;
      color: white;
      font-weight: 600;
    }

    .api-info {
      margin-bottom: 0.75rem;
    }

    .api-name {
      font-weight: 600;
      color: var(--text-primary, white);
      font-size: 1rem;
    }

    .api-id {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .api-quota {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .quota-bar {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .quota-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #06b6d4);
      border-radius: 3px;
    }

    .quota-text {
      font-size: 0.75rem;
      color: var(--text-secondary, #cbd5e1);
      min-width: 40px;
    }

    .use-btn {
      width: 100%;
      padding: 0.625rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }

    .recommend-reason {
      margin: 0.75rem 0 0 0;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      text-align: center;
    }

    /* API List */
    .api-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .api-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid transparent;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .api-item:hover:not(.disabled) {
      border-color: var(--primary, #06b6d4);
    }

    .api-item.selected {
      border-color: var(--primary, #06b6d4);
      background: rgba(6, 182, 212, 0.1);
    }

    .api-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .api-item-info {
      display: flex;
      flex-direction: column;
    }

    .api-item-name {
      font-weight: 500;
      color: var(--text-primary, white);
      font-size: 0.875rem;
    }

    .api-item-id {
      font-size: 0.7rem;
      color: var(--text-muted, #94a3b8);
    }

    .api-item-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .quota-badge {
      padding: 0.125rem 0.5rem;
      background: rgba(34, 197, 94, 0.2);
      border-radius: 0.25rem;
      font-size: 0.7rem;
      color: #86efac;
    }

    .quota-badge.warning {
      background: rgba(245, 158, 11, 0.2);
      color: #fcd34d;
    }

    .quota-badge.full {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .status-badge {
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .status-badge.recommend {
      background: rgba(6, 182, 212, 0.2);
      color: #67e8f9;
    }

    .status-badge.inactive {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .status-badge.full {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .confirm-btn {
      width: 100%;
      padding: 0.625rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      margin-top: 0.75rem;
    }

    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pool-footer {
      margin-top: 0.75rem;
      text-align: center;
    }

    .add-more-btn {
      background: none;
      border: none;
      color: var(--primary, #06b6d4);
      font-size: 0.8rem;
      cursor: pointer;
    }

    /* Form Group */
    .form-group {
      margin-bottom: 0.75rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.25rem;
      font-size: 0.8rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .required {
      color: #ef4444;
    }

    .form-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
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

    .save-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.8rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .save-option input {
      accent-color: var(--primary, #06b6d4);
    }

    .guide-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      margin-top: 0.75rem;
      font-size: 0.75rem;
    }

    .guide-link a {
      color: var(--primary, #06b6d4);
    }

    /* 🆕 Platform API Card - 一鍵登入 */
    .platform-api-card {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15));
      border: 2px solid rgba(6, 182, 212, 0.5);
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: center;
      position: relative;
    }

    .platform-badge {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.25rem 1rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-radius: 1rem;
      font-size: 0.75rem;
      color: white;
      font-weight: 600;
      white-space: nowrap;
    }

    .platform-icon {
      font-size: 2.5rem;
      margin: 0.5rem 0;
    }

    .platform-api-card h3 {
      margin: 0.5rem 0;
      color: var(--text-primary, white);
      font-size: 1.125rem;
    }

    .platform-desc {
      margin: 0 0 0.75rem 0;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .platform-features {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem 0;
      text-align: left;
      display: inline-block;
    }

    .platform-features li {
      font-size: 0.8rem;
      color: var(--text-secondary, #cbd5e1);
      margin-bottom: 0.25rem;
    }

    .platform-btn {
      width: 100%;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .platform-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
    }

    .divider-text {
      display: flex;
      align-items: center;
      margin: 1rem 0;
      color: var(--text-muted, #64748b);
      font-size: 0.75rem;
    }

    .divider-text::before,
    .divider-text::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-default, rgba(148, 163, 184, 0.2));
    }

    .divider-text span {
      padding: 0 0.75rem;
    }

    .advanced-option {
      text-align: center;
    }

    .advanced-btn {
      background: transparent;
      border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.5rem;
      padding: 0.625rem 1rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .advanced-btn:hover {
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
    }

    .advanced-hint {
      margin: 0.5rem 0 0 0;
      font-size: 0.7rem;
      color: var(--text-muted, #64748b);
    }

    /* Selected Display */
    .selected-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: rgba(34, 197, 94, 0.1);
      border-top: 1px solid rgba(34, 197, 94, 0.2);
    }

    .selected-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .selected-label {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .selected-name {
      font-weight: 500;
      color: #86efac;
    }

    .selected-id {
      font-size: 0.7rem;
      color: var(--text-muted, #94a3b8);
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      font-size: 1rem;
    }

    /* Spinner */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--primary, #06b6d4);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ApiSelectorComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private membershipService = inject(MembershipService);

  @Input() showSelected = true;
  @Output() apiSelected = new EventEmitter<SelectedApi>();
  @Output() selectionCleared = new EventEmitter<void>();

  // 狀態
  currentMode = signal<SelectMode>('recommend');
  isLoading = signal(false);
  apiList = signal<ApiCredential[]>([]);
  selectedApi = signal<SelectedApi | null>(null);
  
  // 🆕 安全顯示 API 名稱（處理編碼問題）
  safeDisplayName(name: string | undefined, apiId: string): string {
    if (!name) return `API ${apiId}`;
    
    // 檢測亂碼：包含無法識別的字符或替換字符
    // 常見亂碼特徵：
    // 1. Unicode 替換字符 \uFFFD
    // 2. 控制字符 \u0000-\u001F
    // 3. 顯示為 � 的字符
    // 4. 非常規 UTF-8 錯誤解碼的字符模式
    const hasGarbledChars = /[\uFFFD\u0000-\u001F]/.test(name) || 
                           name.includes('�') ||
                           // 檢測常見的編碼錯誤模式（如 Big5/GBK 被錯誤解碼）
                           /[\uE000-\uF8FF]/.test(name) ||
                           // 檢測字符中有過多的私用區字符
                           (name.match(/[\u4E00-\u9FFF]/g)?.length || 0) === 0 && 
                           /[^\x00-\x7F]/.test(name) && 
                           name.length < 10;
    
    if (hasGarbledChars) {
      return `API ${apiId}`;
    }
    
    // 額外檢查：如果名稱看起來像亂碼（大量非中英文字符）
    const validChars = name.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\w\s\-_@#$%&*()+=\[\]{}|;:'",.<>?/\\]/g, '');
    if (validChars.length > name.length * 0.3) {
      return `API ${apiId}`;
    }
    
    return name;
  }

  // 推薦 API
  recommendedApi = signal<ApiCredential | null>(null);

  // 池選擇
  selectedPoolApi = signal<string | null>(null);

  // 手動輸入
  manualApiId = signal('');
  manualApiHash = signal('');
  manualApiName = signal('');
  saveToPool = signal(true);

  private ipcChannels: string[] = [];

  // 計算屬性
  isManualValid = computed(() => {
    const apiId = this.manualApiId();
    const apiHash = this.manualApiHash();
    return apiId && /^\d+$/.test(apiId) && apiHash && /^[a-f0-9]{32}$/i.test(apiHash);
  });

  ngOnInit(): void {
    this.setupIpcListeners();
    this.loadApiList();
  }

  ngOnDestroy(): void {
    this.ipcChannels.forEach(ch => this.ipcService.cleanup(ch));
  }

  private setupIpcListeners(): void {
    this.ipcService.on('api-credentials-updated', (data: any) => {
      this.isLoading.set(false);
      if (data.credentials) {
        // 過濾掉公共 API，只顯示用戶自建的
        const userApis = data.credentials.filter((c: any) => !c.is_public && c.is_active);
        this.apiList.set(userApis);
        
        // 自動推薦最佳 API
        this.findBestApi(userApis);
      }
    });
    this.ipcChannels.push('api-credentials-updated');

    // 🆕 監聽 API 憑據添加結果
    this.ipcService.on('api-credential-added', (data: any) => {
      if (data.success) {
        this.toast.success('✅ API 憑據已保存到 API 池');
        // 刷新列表以顯示新添加的 API
        this.loadApiList();
      } else {
        this.toast.error(`保存失敗: ${data.error || '未知錯誤'}`);
      }
    });
    this.ipcChannels.push('api-credential-added');
  }

  private loadApiList(): void {
    this.isLoading.set(true);
    this.ipcService.send('get-api-credentials', {});
  }

  private findBestApi(apis: ApiCredential[]): void {
    // 找到負載最低的可用 API
    const available = apis.filter(a => a.is_active && a.account_count < a.max_accounts);
    if (available.length > 0) {
      available.sort((a, b) => (a.account_count / a.max_accounts) - (b.account_count / b.max_accounts));
      this.recommendedApi.set(available[0]);
    } else {
      this.recommendedApi.set(null);
    }
  }

  selectMode(mode: SelectMode): void {
    this.currentMode.set(mode);
  }

  useRecommended(): void {
    const api = this.recommendedApi();
    if (api && api.api_hash) {
      const safeName = this.safeDisplayName(api.name, api.api_id);
      const selected: SelectedApi = {
        api_id: api.api_id,
        api_hash: api.api_hash,
        name: safeName,
        source: 'pool'
      };
      this.selectedApi.set(selected);
      this.apiSelected.emit(selected);
      this.toast.success(`已選擇 ${safeName}`);
    } else if (api) {
      // 如果沒有 hash，提示用戶
      this.toast.error('此 API 缺少 Hash，請重新添加');
    }
  }

  /**
   * 🆕 使用平台公共 API（一鍵登入）
   * 使用 Telegram Desktop 的公共 API 憑據，讓用戶無需了解 API 即可登入
   */
  usePlatformApi(): void {
    // 使用 Telegram Desktop 的公共 API 憑據
    // 這是官方公開的 API，安全可靠
    const platformApi: SelectedApi = {
      api_id: '2040',
      api_hash: 'b18441a1ff607e10a989891a5462e627',
      name: '平台公共 API',
      source: 'platform'
    };
    
    this.selectedApi.set(platformApi);
    this.apiSelected.emit(platformApi);
    this.toast.success('✅ 已選擇平台公共 API，可直接登入');
  }

  selectPoolApi(api: ApiCredential): void {
    if (!api.is_active || api.account_count >= api.max_accounts) return;
    this.selectedPoolApi.set(api.api_id);
  }

  confirmPoolSelection(): void {
    const apiId = this.selectedPoolApi();
    const api = this.apiList().find(a => a.api_id === apiId);
    if (api && api.api_hash) {
      const safeName = this.safeDisplayName(api.name, api.api_id);
      const selected: SelectedApi = {
        api_id: api.api_id,
        api_hash: api.api_hash,
        name: safeName,
        source: 'pool'
      };
      this.selectedApi.set(selected);
      this.apiSelected.emit(selected);
      this.toast.success(`已選擇 ${safeName}`);
    }
  }

  confirmManualInput(): void {
    if (!this.isManualValid()) return;

    const apiId = this.manualApiId();
    const apiHash = this.manualApiHash();
    const apiName = this.manualApiName() || `API ${apiId}`;

    // 如果選擇保存到池
    if (this.saveToPool()) {
      this.ipcService.send('add-api-credential', {
        api_id: apiId,
        api_hash: apiHash,
        name: apiName,
        source: 'manual'
      });
    }

    const selected: SelectedApi = {
      api_id: apiId,
      api_hash: apiHash,
      name: apiName,
      source: 'manual'
    };
    this.selectedApi.set(selected);
    this.apiSelected.emit(selected);
    this.toast.success('API 已確認');
  }

  clearSelection(): void {
    this.selectedApi.set(null);
    this.selectedPoolApi.set(null);
    this.manualApiId.set('');
    this.manualApiHash.set('');
    this.manualApiName.set('');
    this.selectionCleared.emit();
  }
}
