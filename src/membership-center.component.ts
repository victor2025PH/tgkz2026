/**
 * 會員中心組件
 * 獨立的會員管理頁面：等級權益、使用統計、升級購買、邀請獎勵
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// 🔧 P4-5: 遷移至 Core AuthService（統一認證入口）
import { AuthService } from './core/auth.service';
import { MembershipService, MembershipLevel } from './membership.service';
import { I18nService } from './i18n.service';
import { ToastService } from './toast.service';
import { LicenseClientService } from './license-client.service';
import { WalletService, Wallet } from './services/wallet.service';
import { UserLevelBadgeComponent } from './components/user-level-badge.component';

type MembershipTab = 'overview' | 'benefits' | 'upgrade' | 'history';

@Component({
  selector: 'app-membership-center',
  standalone: true,
  imports: [CommonModule, FormsModule, UserLevelBadgeComponent],
  template: `
    <div class="membership-container">
      <!-- 頁面標題 -->
      <div class="page-header">
        <h1 class="page-title">
          <span class="title-icon">⭐</span>
          會員中心
        </h1>
        <p class="page-desc">管理您的會員權益和訂閱</p>
      </div>
      
      <!-- 當前會員狀態卡片 -->
      <div class="membership-status-card" [class]="'level-' + membershipLevel()">
        <div class="status-left">
          <div class="level-badge">
            {{ getMembershipIcon() }}
          </div>
          <div class="level-info">
            <!-- 🔧 P1-2: 使用統一的會員等級徽章組件 -->
            <user-level-badge [level]="membershipLevel()" size="lg" />
            @if (membershipExpires()) {
              <p class="expires-info">
                有效期至 {{ formatDate(membershipExpires()) }}
                <span class="days-left">(剩餘 {{ membershipDaysLeft() }} 天)</span>
              </p>
            } @else {
              <p class="expires-info">永久免費版</p>
            }
          </div>
        </div>
        <div class="status-right">
          @if (membershipLevel() !== 'king') {
            <button (click)="activeTab.set('upgrade')" class="upgrade-btn">
              🚀 立即升級
            </button>
          }
        </div>
      </div>
      
      <!-- 快速統計 -->
      <div class="quick-stats">
        <div class="stat-card">
          <div class="stat-icon">🤖</div>
          <div class="stat-content">
            <div class="stat-label">AI 調用</div>
            <div class="stat-value">
              {{ usageStats()?.aiCalls?.used || 0 }} / {{ usageStats()?.aiCalls?.limit || 50 }}
            </div>
            <div class="stat-bar">
              <div class="stat-fill" [style.width.%]="getAiUsagePercent()"></div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📨</div>
          <div class="stat-content">
            <div class="stat-label">消息發送</div>
            <div class="stat-value">
              {{ usageStats()?.messagesSent?.used || 0 }} / {{ usageStats()?.messagesSent?.limit || 100 }}
            </div>
            <div class="stat-bar">
              <div class="stat-fill" [style.width.%]="getMessageUsagePercent()"></div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-label">帳號數量</div>
            <div class="stat-value">
              {{ usageStats()?.accounts?.used || 0 }} / {{ usageStats()?.accounts?.limit || 2 }}
            </div>
            <div class="stat-bar">
              <div class="stat-fill" [style.width.%]="getAccountUsagePercent()"></div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🎁</div>
          <div class="stat-content">
            <div class="stat-label">邀請獎勵</div>
            <div class="stat-value">{{ invitedCount() }} 人</div>
            <div class="stat-hint">已獲 {{ rewardDays() }} 天獎勵</div>
          </div>
        </div>
      </div>
      
      <!-- 標籤導航 -->
      <div class="tabs">
        <button 
          (click)="activeTab.set('overview')"
          [class.active]="activeTab() === 'overview'"
          class="tab-btn">
          📊 總覽
        </button>
        <button 
          (click)="activeTab.set('benefits')"
          [class.active]="activeTab() === 'benefits'"
          class="tab-btn">
          🎯 權益對比
        </button>
        <button 
          (click)="activeTab.set('upgrade')"
          [class.active]="activeTab() === 'upgrade'"
          class="tab-btn">
          🚀 升級購買
        </button>
        <button 
          (click)="activeTab.set('history')"
          [class.active]="activeTab() === 'history'"
          class="tab-btn">
          📜 訂閱記錄
        </button>
      </div>
      
      <!-- 總覽 -->
      @if (activeTab() === 'overview') {
        <div class="tab-content">
          <!-- 功能使用詳情 -->
          <div class="section-card">
            <h3 class="section-title">📊 本月使用詳情</h3>
            
            <div class="usage-details">
              <div class="usage-row">
                <span class="usage-name">🤖 AI 調用次數</span>
                <div class="usage-bar-container">
                  <div class="usage-bar">
                    <div class="usage-fill" [style.width.%]="getAiUsagePercent()"></div>
                  </div>
                </div>
                <span class="usage-count">{{ usageStats()?.aiCalls?.used || 0 }} / {{ usageStats()?.aiCalls?.limit || 50 }}</span>
              </div>
              
              <div class="usage-row">
                <span class="usage-name">📨 消息發送</span>
                <div class="usage-bar-container">
                  <div class="usage-bar">
                    <div class="usage-fill" [style.width.%]="getMessageUsagePercent()"></div>
                  </div>
                </div>
                <span class="usage-count">{{ usageStats()?.messagesSent?.used || 0 }} / {{ usageStats()?.messagesSent?.limit || 100 }}</span>
              </div>
              
              <div class="usage-row">
                <span class="usage-name">👥 帳號數量</span>
                <div class="usage-bar-container">
                  <div class="usage-bar">
                    <div class="usage-fill" [style.width.%]="getAccountUsagePercent()"></div>
                  </div>
                </div>
                <span class="usage-count">{{ usageStats()?.accounts?.used || 0 }} / {{ usageStats()?.accounts?.limit || 2 }}</span>
              </div>
              
              <div class="usage-row">
                <span class="usage-name">💾 存儲空間</span>
                <div class="usage-bar-container">
                  <div class="usage-bar">
                    <div class="usage-fill" [style.width.%]="getStorageUsagePercent()"></div>
                  </div>
                </div>
                <span class="usage-count">{{ usageStats()?.storage?.used || 0 }} MB / {{ usageStats()?.storage?.limit || 10 }} MB</span>
              </div>
            </div>
          </div>
          
          <!-- 邀請獎勵卡片 -->
          <div class="section-card invite-card">
            <h3 class="section-title">🎁 邀請好友得獎勵</h3>
            <p class="invite-desc">每邀請 1 位好友註冊並激活，您將獲得 <strong>3 天白銀精英</strong> 獎勵！</p>
            
            <div class="invite-code-display">
              <span class="label">我的邀請碼</span>
              <span class="code">{{ inviteCode() }}</span>
              <button (click)="copyInviteCode()" class="copy-btn">📋 複製</button>
            </div>
            
            <div class="invite-stats-row">
              <div class="invite-stat">
                <span class="value">{{ invitedCount() }}</span>
                <span class="label">已邀請人數</span>
              </div>
              <div class="invite-stat">
                <span class="value">{{ rewardDays() }}</span>
                <span class="label">獲得獎勵天數</span>
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- 權益對比 -->
      @if (activeTab() === 'benefits') {
        <div class="tab-content">
          <div class="benefits-table-container">
            <table class="benefits-table">
              <thead>
                <tr>
                  <th class="feature-col">功能</th>
                  <th class="level-col bronze">⚔️ 青銅</th>
                  <th class="level-col silver">🥈 白銀</th>
                  <th class="level-col gold">🥇 黃金</th>
                  <th class="level-col diamond">💎 鑽石</th>
                  <th class="level-col star">🌟 星耀</th>
                  <th class="level-col king">👑 王者</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="feature-name">帳號數量</td>
                  <td>2 個</td>
                  <td>5 個</td>
                  <td>10 個</td>
                  <td>20 個</td>
                  <td>50 個</td>
                  <td>無限</td>
                </tr>
                <tr>
                  <td class="feature-name">每日消息</td>
                  <td>20 條</td>
                  <td>100 條</td>
                  <td>300 條</td>
                  <td>1,000 條</td>
                  <td>無限</td>
                  <td>無限</td>
                </tr>
                <tr>
                  <td class="feature-name">每日 AI 調用</td>
                  <td>10 次</td>
                  <td>50 次</td>
                  <td>200 次</td>
                  <td>無限</td>
                  <td>無限</td>
                  <td>無限</td>
                </tr>
                <tr>
                  <td class="feature-name">群組數量</td>
                  <td>3 個</td>
                  <td>10 個</td>
                  <td>30 個</td>
                  <td>100 個</td>
                  <td>無限</td>
                  <td>無限</td>
                </tr>
                <tr>
                  <td class="feature-name">廣告發送</td>
                  <td>❌</td>
                  <td>✅</td>
                  <td>✅</td>
                  <td>✅</td>
                  <td>✅</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td class="feature-name">批量操作</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>✅</td>
                  <td>✅</td>
                  <td>✅</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td class="feature-name">AI 銷售漏斗</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>✅</td>
                  <td>✅</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td class="feature-name">智能防封</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>✅</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td class="feature-name">API 接口</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>✅</td>
                </tr>
                <tr>
                  <td class="feature-name">優先支持</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>❌</td>
                  <td>✅</td>
                  <td>✅ 專屬</td>
                </tr>
                <tr class="price-row">
                  <td class="feature-name">價格</td>
                  <td class="price">免費</td>
                  <td class="price">4.99 USDT/月</td>
                  <td class="price">19.9 USDT/月</td>
                  <td class="price">59.9 USDT/月</td>
                  <td class="price">199 USDT/月</td>
                  <td class="price">599 USDT/月</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      }
      
      <!-- 升級購買（王者榮耀等級） -->
      @if (activeTab() === 'upgrade') {
        <div class="tab-content">
          <div class="pricing-cards">
            <!-- 白銀精英 -->
            <div class="pricing-card silver" [class.current]="membershipLevel() === 'silver'">
              @if (membershipLevel() === 'silver') {
                <div class="current-badge">當前方案</div>
              }
              <div class="plan-icon">🥈</div>
              <h3 class="plan-name">白銀精英</h3>
              <div class="plan-price">
                <span class="amount">4.99 USDT</span>
                <span class="period">/月</span>
              </div>
              <ul class="plan-features">
                <li>✅ 5 個帳號</li>
                <li>✅ 每日 100 條消息</li>
                <li>✅ 每日 50 次 AI</li>
                <li>✅ 10 個群組</li>
                <li>✅ 廣告發送</li>
              </ul>
              @if (membershipLevel() !== 'silver') {
                <button class="buy-btn" (click)="onPurchase('silver', 'month')">
                  {{ membershipLevel() === 'bronze' ? '立即開通' : '切換方案' }}
                </button>
              } @else {
                <button class="buy-btn renew" (click)="onPurchase('silver', 'month')">
                  續費
                </button>
              }
            </div>
            
            <!-- 黃金大師 -->
            <div class="pricing-card gold" [class.current]="membershipLevel() === 'gold'">
              @if (membershipLevel() === 'gold') {
                <div class="current-badge">當前方案</div>
              }
              <div class="plan-icon">🥇</div>
              <h3 class="plan-name">黃金大師</h3>
              <div class="plan-price">
                <span class="amount">19.9 USDT</span>
                <span class="period">/月</span>
              </div>
              <ul class="plan-features">
                <li>✅ 15 個帳號</li>
                <li>✅ 每日 500 條消息</li>
                <li>✅ 每日 300 次 AI</li>
                <li>✅ 50 個群組</li>
                <li>✅ 批量操作</li>
                <li>✅ 數據導出</li>
              </ul>
              @if (membershipLevel() !== 'gold') {
                <button class="buy-btn" (click)="onPurchase('gold', 'month')">
                  {{ ['bronze', 'silver'].includes(membershipLevel()) ? '立即升級' : '切換方案' }}
                </button>
              } @else {
                <button class="buy-btn renew" (click)="onPurchase('gold', 'month')">
                  續費
                </button>
              }
            </div>
            
            <!-- 鑽石王牌 -->
            <div class="pricing-card diamond popular" [class.current]="membershipLevel() === 'diamond'">
              <div class="popular-badge">推薦</div>
              @if (membershipLevel() === 'diamond') {
                <div class="current-badge">當前方案</div>
              }
              <div class="plan-icon">💎</div>
              <h3 class="plan-name">鑽石王牌</h3>
              <div class="plan-price">
                <span class="amount">59.9 USDT</span>
                <span class="period">/月</span>
              </div>
              <ul class="plan-features">
                <li>✅ 50 個帳號</li>
                <li>✅ 每日 2000 條消息</li>
                <li>✅ 無限 AI 調用</li>
                <li>✅ 200 個群組</li>
                <li>✅ AI 銷售漏斗</li>
                <li>✅ 高級分析</li>
              </ul>
              @if (membershipLevel() !== 'diamond') {
                <button class="buy-btn" (click)="onPurchase('diamond', 'month')">
                  {{ ['bronze', 'silver', 'gold'].includes(membershipLevel()) ? '立即升級' : '切換方案' }}
                </button>
              } @else {
                <button class="buy-btn renew" (click)="onPurchase('diamond', 'month')">
                  續費
                </button>
              }
            </div>
            
            <!-- 星耀傳說 -->
            <div class="pricing-card star" [class.current]="membershipLevel() === 'star'">
              @if (membershipLevel() === 'star') {
                <div class="current-badge">當前方案</div>
              }
              <div class="plan-icon">🌟</div>
              <h3 class="plan-name">星耀傳說</h3>
              <div class="plan-price">
                <span class="amount">199 USDT</span>
                <span class="period">/月</span>
              </div>
              <ul class="plan-features">
                <li>✅ 100 個帳號</li>
                <li>✅ 無限消息</li>
                <li>✅ 無限 AI</li>
                <li>✅ 無限群組</li>
                <li>✅ 智能防封</li>
                <li>✅ 團隊管理</li>
              </ul>
              @if (membershipLevel() !== 'star') {
                <button class="buy-btn" (click)="onPurchase('star', 'month')">
                  {{ membershipLevel() !== 'king' ? '立即升級' : '切換方案' }}
                </button>
              } @else {
                <button class="buy-btn renew" (click)="onPurchase('star', 'month')">
                  續費
                </button>
              }
            </div>
            
            <!-- 榮耀王者 -->
            <div class="pricing-card king" [class.current]="membershipLevel() === 'king'">
              @if (membershipLevel() === 'king') {
                <div class="current-badge">當前方案</div>
              }
              <div class="plan-icon">👑</div>
              <h3 class="plan-name">榮耀王者</h3>
              <div class="plan-price">
                <span class="amount">599 USDT</span>
                <span class="period">/月</span>
              </div>
              <div class="savings">尊享特權</div>
              <ul class="plan-features">
                <li>✅ 無限帳號</li>
                <li>✅ 無限一切</li>
                <li>✅ API 接口</li>
                <li>✅ 自定義品牌</li>
                <li>✅ 專屬顧問</li>
                <li>✅ 新功能內測</li>
              </ul>
              @if (membershipLevel() !== 'king') {
                <button class="buy-btn" (click)="onPurchase('king', 'month')">
                  終極升級
                </button>
              } @else {
                <button class="buy-btn renew" (click)="onPurchase('king', 'month')">
                  續費
                </button>
              }
            </div>
          </div>
          
          <!-- 卡密激活 -->
          <div class="section-card">
            <h3 class="section-title">🎫 使用卡密激活</h3>
            <div class="license-input-row">
              <input 
                type="text" 
                [(ngModel)]="licenseKey" 
                class="license-input"
                placeholder="輸入卡密：XXXX-XXXX-XXXX-XXXX">
              <button 
                (click)="onActivateLicense()" 
                [disabled]="!licenseKey"
                class="activate-btn">
                激活
              </button>
            </div>
          </div>
          
          <!-- 支付方式 -->
          <div class="section-card">
            <h3 class="section-title">💳 支付方式</h3>
            <div class="payment-methods">
              <button class="payment-btn" [class.active]="selectedPayment() === 'alipay'" (click)="selectedPayment.set('alipay')">
                <span class="payment-icon">💙</span> 支付寶
              </button>
              <button class="payment-btn" [class.active]="selectedPayment() === 'wechat'" (click)="selectedPayment.set('wechat')">
                <span class="payment-icon">💚</span> 微信支付
              </button>
              <button class="payment-btn" [class.active]="selectedPayment() === 'usdt'" (click)="selectedPayment.set('usdt')">
                <span class="payment-icon">💎</span> USDT
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 訂閱記錄 -->
      @if (activeTab() === 'history') {
        <div class="tab-content">
          <div class="section-card">
            <h3 class="section-title">📜 訂閱歷史</h3>
            
            <div class="history-list">
              @if (isLoadingHistory()) {
                <div class="loading-state">載入中...</div>
              } @else if (subscriptionHistory().length === 0) {
                <div class="empty-state">暫無訂閱記錄</div>
              } @else {
                @for (record of subscriptionHistory(); track record.id) {
                  <div class="history-item">
                    <div class="history-icon">{{ record.level_icon || '🎫' }}</div>
                    <div class="history-info">
                      <div class="history-title">{{ record.level_name }} {{ record.duration_name }}激活</div>
                      <div class="history-meta">{{ formatActivationDate(record.activated_at) }} · 卡密激活</div>
                    </div>
                    <div class="history-status" [class.active]="record.is_active" [class.used]="!record.is_active">
                      {{ record.is_active ? '生效中' : '已過期' }}
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .membership-container {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 1.5rem;
    }
    
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary, white);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    
    .title-icon {
      font-size: 1.75rem;
    }
    
    .page-desc {
      color: var(--text-muted, #94a3b8);
      margin: 0.5rem 0 0 0;
    }
    
    .membership-status-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-radius: 1rem;
      margin-bottom: 1.5rem;
      border: 1px solid;
    }
    
    .membership-status-card.level-free {
      background: linear-gradient(135deg, rgba(71, 85, 105, 0.3), rgba(51, 65, 85, 0.3));
      border-color: rgba(71, 85, 105, 0.5);
    }
    
    .membership-status-card.level-vip {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2));
      border-color: rgba(245, 158, 11, 0.5);
    }
    
    .membership-status-card.level-svip {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2));
      border-color: rgba(139, 92, 246, 0.5);
    }
    
    .membership-status-card.level-mvp {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.2));
      border-color: rgba(236, 72, 153, 0.5);
    }
    
    /* 錢包卡片樣式 */
    .wallet-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-radius: 1rem;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
      border: 1px solid rgba(102, 126, 234, 0.5);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .wallet-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .wallet-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .wallet-icon {
      font-size: 2rem;
    }
    
    .wallet-label {
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
    }
    
    .wallet-amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: #22c55e;
    }
    
    .wallet-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .wallet-bonus {
      font-size: 0.875rem;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
    }
    
    .wallet-recharge-btn {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: none;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .wallet-recharge-btn:hover {
      transform: scale(1.05);
    }
    
    .status-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .level-badge {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
    
    .level-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary, white);
      margin: 0;
    }
    
    .expires-info {
      color: var(--text-secondary, #cbd5e1);
      margin: 0.25rem 0 0 0;
    }
    
    .days-left {
      color: var(--text-muted, #94a3b8);
    }
    
    .upgrade-btn {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.75rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .upgrade-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(6, 182, 212, 0.5);
    }
    
    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 0.75rem;
    }
    
    .stat-icon {
      font-size: 1.5rem;
    }
    
    .stat-content {
      flex: 1;
    }
    
    .stat-label {
      color: var(--text-muted, #94a3b8);
      font-size: 0.75rem;
    }
    
    .stat-value {
      font-weight: 600;
      color: var(--text-primary, white);
    }
    
    .stat-bar {
      height: 4px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 2px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    
    .stat-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #3b82f6);
      border-radius: 2px;
    }
    
    .stat-hint {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
    }
    
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    
    .tab-btn {
      padding: 0.5rem 1rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 0.5rem;
      color: var(--text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .tab-btn:hover {
      border-color: var(--primary, #06b6d4);
    }
    
    .tab-btn.active {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-color: transparent;
      color: white;
    }
    
    .section-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, white);
      margin: 0 0 1rem 0;
    }
    
    .usage-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .usage-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .usage-name {
      width: 150px;
      color: var(--text-secondary, #cbd5e1);
    }
    
    .usage-bar-container {
      flex: 1;
    }
    
    .usage-bar {
      height: 8px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 4px;
      overflow: hidden;
    }
    
    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #3b82f6);
      border-radius: 4px;
    }
    
    .usage-count {
      width: 100px;
      text-align: right;
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
    }
    
    .invite-card {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1));
      border-color: rgba(6, 182, 212, 0.3);
    }
    
    .invite-desc {
      color: var(--text-secondary, #cbd5e1);
      margin-bottom: 1rem;
    }
    
    .invite-code-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
      margin-bottom: 1rem;
    }
    
    .invite-code-display .label {
      color: var(--text-muted, #94a3b8);
    }
    
    .invite-code-display .code {
      flex: 1;
      font-family: monospace;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary, #06b6d4);
    }
    
    .copy-btn {
      padding: 0.5rem 1rem;
      background: var(--primary-bg, rgba(6, 182, 212, 0.1));
      border: 1px solid var(--primary, #06b6d4);
      border-radius: 0.5rem;
      color: var(--primary, #06b6d4);
      cursor: pointer;
    }
    
    .invite-stats-row {
      display: flex;
      gap: 2rem;
    }
    
    .invite-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .invite-stat .value {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--primary, #06b6d4);
    }
    
    .invite-stat .label {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
    }
    
    /* Benefits Table */
    .benefits-table-container {
      overflow-x: auto;
    }
    
    .benefits-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    
    .benefits-table th, .benefits-table td {
      padding: 0.75rem 1rem;
      text-align: center;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }
    
    .benefits-table th {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      color: var(--text-primary, white);
      font-weight: 600;
    }
    
    .benefits-table .feature-col {
      text-align: left;
      min-width: 150px;
    }
    
    .benefits-table .feature-name {
      text-align: left;
      color: var(--text-secondary, #cbd5e1);
    }
    
    .benefits-table td {
      color: var(--text-primary, white);
    }
    
    .benefits-table .price {
      font-weight: 600;
      color: var(--primary, #06b6d4);
    }
    
    /* Pricing Cards */
    .pricing-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .pricing-card {
      position: relative;
      padding: 2rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 2px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 1rem;
      text-align: center;
    }
    
    .pricing-card.vip { border-color: rgba(245, 158, 11, 0.3); }
    .pricing-card.svip { border-color: rgba(139, 92, 246, 0.3); }
    .pricing-card.mvp { border-color: rgba(236, 72, 153, 0.3); }
    
    .pricing-card.popular {
      transform: scale(1.02);
      box-shadow: 0 20px 40px -20px rgba(139, 92, 246, 0.3);
    }
    
    .pricing-card.current {
      border-width: 3px;
    }
    
    .popular-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.25rem 1rem;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      border-radius: 1rem;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .current-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.25rem 0.5rem;
      background: var(--success, #22c55e);
      border-radius: 0.25rem;
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
    }
    
    .plan-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    
    .plan-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary, white);
      margin: 0 0 0.5rem 0;
    }
    
    .plan-price {
      margin-bottom: 0.5rem;
    }
    
    .plan-price .amount {
      font-size: 2rem;
      font-weight: bold;
      color: var(--primary, #06b6d4);
    }
    
    .plan-price .period {
      color: var(--text-muted, #94a3b8);
    }
    
    .savings {
      font-size: 0.75rem;
      color: var(--success, #22c55e);
      margin-bottom: 1rem;
    }
    
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 1rem 0;
      text-align: left;
    }
    
    .plan-features li {
      padding: 0.5rem 0;
      color: var(--text-secondary, #cbd5e1);
    }
    
    .buy-btn {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    
    .buy-btn.renew {
      background: linear-gradient(135deg, #22c55e, #16a34a);
    }
    
    .license-input-row {
      display: flex;
      gap: 0.5rem;
    }
    
    .license-input {
      flex: 1;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary, white);
      font-family: monospace;
    }
    
    .activate-btn {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    
    .activate-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .payment-methods {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .payment-btn {
      padding: 0.75rem 1.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-secondary, #cbd5e1);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .payment-btn.active {
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
      background: rgba(6, 182, 212, 0.1);
    }
    
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .history-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
    }
    
    .history-icon {
      font-size: 1.5rem;
    }
    
    .history-info {
      flex: 1;
    }
    
    .history-title {
      font-weight: 500;
      color: var(--text-primary, white);
    }
    
    .history-meta {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }
    
    .history-status {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }
    
    .history-status.active {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }
    
    .history-status.used {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }
  `]
})
export class MembershipCenterComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private membershipService = inject(MembershipService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private licenseClient = inject(LicenseClientService);
  private cdr = inject(ChangeDetectorRef);
  private walletService = inject(WalletService);
  private router = inject(Router);
  
  // 用於清理事件監聯
  private membershipUpdateHandler: ((event: Event) => void) | null = null;

  // 狀態
  activeTab = signal<MembershipTab>('overview');
  selectedPayment = signal<'alipay' | 'wechat' | 'usdt'>('alipay');
  licenseKey = '';
  
  // 錢包狀態
  wallet = signal<Wallet | null>(null);
  walletBalanceDisplay = computed(() => {
    const w = this.wallet();
    if (!w) return '$0.00';
    return '$' + (w.available_balance / 100).toFixed(2);
  });
  walletBonusDisplay = computed(() => {
    const w = this.wallet();
    if (!w) return '$0.00';
    return '$' + ((w.bonus_balance || 0) / 100).toFixed(2);
  });
  
  // 計算屬性
  // 🔧 P0 修復：使用 MembershipService 作為會員等級的單一數據源
  // 確保與 app.component.ts 和其他組件保持一致
  user = computed(() => this.authService.user());
  membershipLevel = computed(() => this.membershipService.level());
  membershipExpires = computed(() => {
    // 優先從 AuthService 獲取（保持與舊邏輯兼容）
    return this.authService.user()?.membershipExpires;
  });
  membershipDaysLeft = computed(() => this.membershipService.daysRemaining());
  usageStats = computed(() => this.authService.usageStats());
  
  inviteCode = signal('');
  invitedCount = signal(0);
  rewardDays = signal(0);
  
  // 訂閱記錄
  subscriptionHistory = signal<any[]>([]);
  isLoadingHistory = signal(false);
  
  async ngOnInit(): Promise<void> {
    // 🔧 P4-5: 載入使用統計到 Core AuthService 信號
    this.authService.loadUsageStats().catch(e => console.warn('[Membership] Load usage stats error:', e));
    
    const rewards = await this.authService.getInviteRewards();
    this.inviteCode.set(rewards.inviteCode);
    this.invitedCount.set(rewards.invitedCount);
    this.rewardDays.set(rewards.rewardDays);

    // 載入錢包數據
    await this.loadWallet();
    
    // 載入訂閱記錄
    await this.loadSubscriptionHistory();
    
    // 監聽會員狀態更新事件
    this.membershipUpdateHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[MembershipCenterComponent] 收到會員狀態更新事件:', customEvent.detail);
      // 強制觸發變更檢測以刷新 UI
      this.cdr.detectChanges();
    };
    window.addEventListener('membership-updated', this.membershipUpdateHandler);
  }
  
  ngOnDestroy(): void {
    // 清理事件監聯
    if (this.membershipUpdateHandler) {
      window.removeEventListener('membership-updated', this.membershipUpdateHandler);
    }
  }
  
  async loadSubscriptionHistory(): Promise<void> {
    this.isLoadingHistory.set(true);
    try {
      const result = await this.licenseClient.getActivationHistory(50, 0);
      if (result.success && result.data) {
        this.subscriptionHistory.set(result.data);
      }
    } catch (error) {
      console.error('載入訂閱記錄失敗:', error);
    } finally {
      this.isLoadingHistory.set(false);
    }
  }
  
  async loadWallet(): Promise<void> {
    try {
      const wallet = await this.walletService.loadWallet();
      if (wallet) {
        this.wallet.set(wallet);
      }
    } catch (error) {
      console.error('載入錢包失敗:', error);
    }
  }
  
  goToWallet(): void {
    // 使用 Router 導航到錢包頁面
    this.router.navigate(['/wallet']);
  }
  
  goToRecharge(): void {
    // 導航到充值頁面
    this.router.navigate(['/wallet/recharge']);
  }
  
  getMembershipIcon(): string {
    const icons: Record<string, string> = {
      bronze: '⚔️',
      silver: '🥈',
      gold: '🥇',
      diamond: '💎',
      star: '🌟',
      king: '👑'
    };
    return icons[this.membershipLevel()] || '⚔️';
  }
  
  getMembershipName(): string {
    const level = this.membershipLevel();
    return this.i18n.t(`membershipLevels.${level}`) || this.i18n.t('membershipLevels.bronze');
  }
  
  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW');
  }
  
  getAiUsagePercent(): number {
    const stats = this.usageStats();
    if (!stats?.aiCalls) return 0;
    return Math.min(100, (stats.aiCalls.used / stats.aiCalls.limit) * 100);
  }
  
  getMessageUsagePercent(): number {
    const stats = this.usageStats();
    if (!stats?.messagesSent) return 0;
    return Math.min(100, (stats.messagesSent.used / stats.messagesSent.limit) * 100);
  }
  
  getAccountUsagePercent(): number {
    const stats = this.usageStats();
    if (!stats?.accounts) return 0;
    return Math.min(100, (stats.accounts.used / stats.accounts.limit) * 100);
  }
  
  getStorageUsagePercent(): number {
    const stats = this.usageStats();
    if (!stats?.storage) return 0;
    return Math.min(100, (stats.storage.used / stats.storage.limit) * 100);
  }
  
  copyInviteCode(): void {
    navigator.clipboard.writeText(this.inviteCode());
    this.toast.success('邀請碼已複製');
  }
  
  onPurchase(level: string, period: string): void {
    this.toast.info(`正在跳轉到支付頁面... (${level} ${period})`);
    // 實際實現會調用支付 API
  }
  
  async onActivateLicense(): Promise<void> {
    const result = await this.authService.renewMembership(this.licenseKey);
    if (result.success) {
      this.toast.success(result.message || '卡密激活成功！');
      this.licenseKey = '';
      // 重新載入訂閱記錄
      await this.loadSubscriptionHistory();
      // 強制刷新 UI
      this.cdr.detectChanges();
    } else {
      this.toast.error(result.message);
    }
  }
  
  formatActivationDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW');
  }
}
