/**
 * 錢包視圖組件
 * Wallet View Component
 * 
 * 用戶錢包主頁面，包含：
 * - 餘額概覽
 * - 交易記錄
 * - 消費分析
 * - 充值入口
 */

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  WalletService, 
  Wallet, 
  Transaction, 
  ConsumeAnalysis,
  MonthlySummary 
} from '../services/wallet.service';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-wallet-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wallet-view">
      <!-- 頂部導航 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">←</span>
          </button>
          <h1>💰 我的錢包</h1>
        </div>
        <div class="header-actions">
          <button class="action-btn" (click)="showTransactions()">
            📜 交易記錄
          </button>
          <button class="action-btn" (click)="showOrders()">
            📋 充值訂單
          </button>
          <button class="action-btn" (click)="showAnalytics()">
            📊 消費分析
          </button>
        </div>
      </div>

      <!-- 餘額卡片 -->
      <div class="balance-card">
        <div class="balance-bg"></div>
        <div class="balance-content">
          <div class="balance-label">可用餘額</div>
          <div class="balance-amount">
            <span class="currency">$</span>
            <span class="amount">{{ balanceDisplay() }}</span>
          </div>
          <div class="balance-details">
            <div class="detail-item">
              <span class="label">凍結中</span>
              <span class="value">{{ formatCents(wallet()?.frozen_balance || 0) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">贈送餘額</span>
              <span class="value">{{ wallet()?.bonus_display || '$0.00' }}</span>
            </div>
          </div>
          <!-- P2: 凍結狀態警告 -->
          @if (isFrozen()) {
            <div class="frozen-warning">
              🔒 錢包已被凍結，請聯繫客服解凍後操作
            </div>
          }
          
          <div class="balance-actions">
            <button 
              class="recharge-btn" 
              (click)="goToRecharge()"
              [disabled]="!canOperate() || isNavigating()"
              [class.loading]="isNavigating()"
            >
              @if (isNavigating()) {
                <span class="btn-spinner"></span>
              } @else {
                💳
              }
              充值
            </button>
            <button 
              class="withdraw-btn" 
              (click)="goToWithdraw()"
              [disabled]="!canOperate() || isNavigating()"
              [class.loading]="isNavigating()"
            >
              📤 提現
            </button>
            <button 
              class="redeem-btn" 
              (click)="showRedeemCode()"
              [disabled]="!canOperate()"
            >
              🎁 兌換碼
            </button>
          </div>
        </div>
      </div>
      
      <!-- P2: 離線提示條 -->
      @if (!isOnline()) {
        <div class="offline-banner">
          <span class="offline-icon">📡</span>
          <span class="offline-text">您目前處於離線狀態</span>
          <button class="retry-btn" (click)="retryConnection()">重試連接</button>
        </div>
      }
      
      <!-- P2: 全局錯誤提示 -->
      @if (globalError()) {
        <div class="global-error-toast" (click)="dismissError()">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ globalError() }}</span>
          <button class="dismiss-btn">×</button>
        </div>
      }

      <!-- 本月消費概覽 -->
      <div class="section consume-overview" *ngIf="analysis()">
        <div class="section-header">
          <h2>📊 本月消費概覽</h2>
          <span class="total">{{ analysis()?.total_display }}</span>
        </div>
        <div class="consume-bars">
          @for (item of analysis()?.by_category || []; track item.category) {
            <div class="consume-bar">
              <div class="bar-label">
                <span class="icon">{{ getCategoryIcon(item.category) }}</span>
                <span class="name">{{ item.category_name }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="item.percent"></div>
              </div>
              <div class="bar-value">
                <span class="amount">{{ item.amount_display }}</span>
                <span class="percent">{{ item.percent }}%</span>
              </div>
            </div>
          }
          @if ((analysis()?.by_category || []).length === 0) {
            <div class="empty-state">
              <span class="icon">📭</span>
              <span class="text">本月暫無消費</span>
            </div>
          }
        </div>
      </div>

      <!-- 最近交易 -->
      <div class="section recent-transactions">
        <div class="section-header">
          <h2>🕐 最近交易</h2>
          <button class="view-all-btn" (click)="showTransactions()">
            查看全部 →
          </button>
        </div>
        <div class="transaction-list">
          @for (tx of recentTransactions(); track tx.id) {
            <div class="transaction-item" [class.income]="tx.amount > 0" [class.expense]="tx.amount < 0">
              <div class="tx-icon">{{ getTypeIcon(tx.type) }}</div>
              <div class="tx-info">
                <div class="tx-desc">{{ tx.description || getTypeName(tx.type) }}</div>
                <div class="tx-time">{{ formatDate(tx.created_at) }}</div>
              </div>
              <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
                {{ tx.amount_display }}
              </div>
            </div>
          }
          @if (recentTransactions().length === 0) {
            <div class="empty-state">
              <span class="icon">📭</span>
              <span class="text">暫無交易記錄</span>
            </div>
          }
        </div>
      </div>

      <!-- 月度統計 -->
      <div class="section monthly-stats" *ngIf="monthlySummary().length > 0">
        <div class="section-header">
          <h2>📅 月度統計</h2>
        </div>
        <div class="monthly-chart">
          @for (month of monthlySummary(); track month.month) {
            <div class="month-bar">
              <div class="month-label">{{ formatMonth(month.month) }}</div>
              <div class="bars">
                <div class="income-bar" [style.height.px]="getBarHeight(month.income)">
                  <span class="tooltip">收入: {{ month.income_display }}</span>
                </div>
                <div class="expense-bar" [style.height.px]="getBarHeight(month.expense)">
                  <span class="tooltip">支出: {{ month.expense_display }}</span>
                </div>
              </div>
            </div>
          }
        </div>
        <div class="chart-legend">
          <div class="legend-item income">
            <span class="dot"></span>
            <span class="label">收入</span>
          </div>
          <div class="legend-item expense">
            <span class="dot"></span>
            <span class="label">支出</span>
          </div>
        </div>
      </div>

      <!-- 加載遮罩 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>加載中...</span>
      </div>

      <!-- 兌換碼彈窗 -->
      @if (showRedeemModal()) {
        <div class="modal-overlay" (click)="closeRedeemModal()">
          <div class="modal-content redeem-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>🎁 兌換碼</h3>
              <button class="close-btn" (click)="closeRedeemModal()">✕</button>
            </div>
            <div class="modal-body">
              <p class="modal-desc">輸入兌換碼以獲得餘額或優惠</p>
              <div class="input-group">
                <input 
                  type="text" 
                  class="redeem-input"
                  [(ngModel)]="redeemCode"
                  placeholder="請輸入兌換碼"
                  [disabled]="isRedeeming()"
                  (keyup.enter)="submitRedeemCode()"
                  maxlength="32"
                />
              </div>
              @if (redeemError()) {
                <div class="error-message">{{ redeemError() }}</div>
              }
              @if (redeemSuccess()) {
                <div class="success-message">{{ redeemSuccess() }}</div>
              }
            </div>
            <div class="modal-footer">
              <button 
                class="cancel-btn" 
                (click)="closeRedeemModal()"
                [disabled]="isRedeeming()"
              >
                取消
              </button>
              <button 
                class="submit-btn" 
                (click)="submitRedeemCode()"
                [disabled]="!redeemCode.trim() || isRedeeming()"
              >
                @if (isRedeeming()) {
                  <span class="btn-spinner"></span> 兌換中...
                } @else {
                  確認兌換
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wallet-view {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 20px;
      color: #fff;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .action-btn {
      padding: 10px 20px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* 餘額卡片 */
    .balance-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .balance-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      pointer-events: none; /* 讓點擊事件穿透到下層按鈕 */
    }

    .balance-content {
      position: relative;
      padding: 32px;
      z-index: 1;
    }

    .balance-label {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 8px;
    }

    .balance-amount {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 24px;
    }

    .balance-amount .currency {
      font-size: 24px;
      font-weight: 600;
    }

    .balance-amount .amount {
      font-size: 48px;
      font-weight: 700;
    }

    .balance-details {
      display: flex;
      gap: 32px;
      margin-bottom: 24px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 12px;
      opacity: 0.7;
    }

    .detail-item .value {
      font-size: 16px;
      font-weight: 500;
    }

    .balance-actions {
      display: flex;
      gap: 12px;
    }

    .balance-actions button {
      flex: 1;
      padding: 12px 20px;
      border-radius: 12px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .recharge-btn {
      background: #fff;
      color: #764ba2;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .recharge-btn:hover {
      background: #f8f8ff;
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
    }

    .recharge-btn:active {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .withdraw-btn {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      backdrop-filter: blur(4px);
    }

    .withdraw-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .withdraw-btn:active {
      transform: scale(0.98);
      background: rgba(255, 255, 255, 0.25);
    }

    .redeem-btn {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      backdrop-filter: blur(4px);
    }

    .redeem-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .redeem-btn:active {
      transform: scale(0.98);
      background: rgba(255, 255, 255, 0.25);
    }

    .balance-actions button:hover {
      transform: translateY(-2px);
    }

    .balance-actions button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .balance-actions button.loading {
      position: relative;
    }

    /* P2: 凍結警告 */
    .frozen-warning {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #fca5a5;
      text-align: center;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* P2: 離線提示條 */
    .offline-banner {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }

    .offline-icon {
      font-size: 20px;
    }

    .offline-text {
      font-size: 14px;
      font-weight: 500;
    }

    .retry-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .retry-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* P2: 全局錯誤提示 */
    .global-error-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      cursor: pointer;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(100%); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }

    .error-icon {
      font-size: 18px;
    }

    .error-text {
      font-size: 14px;
      max-width: 280px;
    }

    .dismiss-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
    }

    .dismiss-btn:hover {
      color: #fff;
    }

    /* 區塊通用樣式 */
    .section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .section-header .total {
      font-size: 20px;
      font-weight: 700;
      color: #f59e0b;
    }

    .view-all-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 13px;
      cursor: pointer;
    }

    /* 消費概覽 */
    .consume-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .bar-label {
      width: 100px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .bar-track {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .bar-value {
      width: 100px;
      text-align: right;
      font-size: 13px;
    }

    .bar-value .amount {
      color: #f59e0b;
      margin-right: 8px;
    }

    .bar-value .percent {
      opacity: 0.6;
    }

    /* 交易列表 */
    .transaction-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .transaction-item:last-child {
      border-bottom: none;
    }

    .tx-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .tx-info {
      flex: 1;
    }

    .tx-desc {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .tx-time {
      font-size: 12px;
      opacity: 0.5;
    }

    .tx-amount {
      font-size: 16px;
      font-weight: 600;
    }

    .tx-amount.positive {
      color: #22c55e;
    }

    .tx-amount.negative {
      color: #ef4444;
    }

    /* 月度統計 */
    .monthly-chart {
      display: flex;
      gap: 12px;
      height: 120px;
      align-items: flex-end;
      padding-bottom: 24px;
    }

    .month-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .month-label {
      font-size: 11px;
      opacity: 0.6;
    }

    .bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 80px;
    }

    .income-bar, .expense-bar {
      width: 12px;
      border-radius: 4px 4px 0 0;
      position: relative;
      min-height: 4px;
    }

    .income-bar {
      background: linear-gradient(180deg, #22c55e, #16a34a);
    }

    .expense-bar {
      background: linear-gradient(180deg, #ef4444, #dc2626);
    }

    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.7;
    }

    .legend-item .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .legend-item.income .dot {
      background: #22c55e;
    }

    .legend-item.expense .dot {
      background: #ef4444;
    }

    /* 空狀態 */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      opacity: 0.5;
    }

    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    /* 加載遮罩 */
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 100;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* 兌換碼彈窗樣式 */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 20px;
      width: 90%;
      max-width: 400px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-desc {
      color: #94a3b8;
      font-size: 14px;
      margin: 0 0 16px 0;
    }

    .input-group {
      margin-bottom: 16px;
    }

    .redeem-input {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-size: 16px;
      text-align: center;
      letter-spacing: 2px;
      text-transform: uppercase;
      transition: all 0.2s;
    }

    .redeem-input:focus {
      outline: none;
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    .redeem-input:disabled {
      opacity: 0.5;
    }

    .redeem-input::placeholder {
      color: #64748b;
      letter-spacing: normal;
      text-transform: none;
    }

    .error-message {
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      color: #fca5a5;
      font-size: 14px;
      margin-top: 12px;
    }

    .success-message {
      padding: 12px 16px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 10px;
      color: #86efac;
      font-size: 14px;
      margin-top: 12px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-footer button {
      flex: 1;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .cancel-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #94a3b8;
    }

    .cancel-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .submit-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  `]
})
export class WalletViewComponent implements OnInit, OnDestroy {
  wallet = signal<Wallet | null>(null);
  recentTransactions = signal<Transaction[]>([]);
  analysis = signal<ConsumeAnalysis | null>(null);
  monthlySummary = signal<MonthlySummary[]>([]);
  loading = signal(false);
  
  // 兌換碼狀態
  showRedeemModal = signal(false);
  redeemCode = '';
  isRedeeming = signal(false);
  redeemError = signal('');
  redeemSuccess = signal('');
  
  // P2: 網絡狀態和錯誤提示
  isOnline = signal(true);
  globalError = signal('');
  isNavigating = signal(false);
  
  // 計算屬性
  balanceDisplay = computed(() => {
    const w = this.wallet();
    if (!w) return '0.00';
    return (w.available_balance / 100).toFixed(2);
  });
  
  // P2: 錢包凍結狀態
  isFrozen = computed(() => {
    const w = this.wallet();
    return w?.status === 'frozen';
  });
  
  // P2: 操作是否可用
  canOperate = computed(() => {
    return this.isOnline() && !this.isFrozen() && !this.loading() && !this.isNavigating();
  });
  
  constructor(
    private walletService: WalletService,
    private router: Router,
    private apiService: ApiService
  ) {
    // P2: 監聽網絡狀態
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.globalError.set('');
        // 網絡恢復時自動刷新數據
        this.loadData();
      });
      window.addEventListener('offline', () => {
        this.isOnline.set(false);
        this.globalError.set('網絡連接已斷開，請檢查網絡設置');
      });
      this.isOnline.set(navigator.onLine);
    }
  }
  
  ngOnInit() {
    this.loadData();
    // P2: 啟動自動刷新
    this.walletService.startAutoRefresh();
  }
  
  ngOnDestroy() {
    // P2: 清理自動刷新
    this.walletService.stopAutoRefresh();
  }
  
  async loadData() {
    // P2: 離線時跳過加載
    if (!this.isOnline()) {
      return;
    }
    
    this.loading.set(true);
    this.globalError.set('');
    
    try {
      const [wallet, transactions, analysis, monthly] = await Promise.all([
        this.walletService.loadWallet(),
        this.walletService.getRecentTransactions(5),
        this.walletService.getConsumeAnalysis(),
        this.walletService.getMonthlySummary(6)
      ]);
      
      if (wallet) {
        this.wallet.set(wallet);
        // P2: 檢測到凍結狀態時顯示提示
        if (wallet.status === 'frozen') {
          this.globalError.set('您的錢包已被凍結，請聯繫客服');
        }
      }
      this.recentTransactions.set(transactions);
      if (analysis) this.analysis.set(analysis);
      this.monthlySummary.set(monthly);
      
    } catch (error: any) {
      console.error('Load wallet data error:', error);
      // P2: 區分不同錯誤類型
      if (error.message?.includes('Network') || error.name === 'TypeError') {
        this.globalError.set('網絡請求失敗，請檢查網絡連接');
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        this.globalError.set('登錄已過期，請重新登錄');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      } else {
        this.globalError.set('載入數據失敗，請稍後重試');
      }
    } finally {
      this.loading.set(false);
    }
  }
  
  goBack() {
    this.router.navigate(['/']);
  }
  
  goToRecharge() {
    if (!this.canOperate()) {
      if (this.isFrozen()) {
        this.globalError.set('錢包已凍結，無法進行充值操作');
      } else if (!this.isOnline()) {
        this.globalError.set('網絡連接異常，請檢查網絡後重試');
      }
      return;
    }
    this.isNavigating.set(true);
    this.router.navigate(['/wallet/recharge']).finally(() => {
      this.isNavigating.set(false);
    });
  }
  
  goToWithdraw() {
    if (!this.canOperate()) {
      if (this.isFrozen()) {
        this.globalError.set('錢包已凍結，無法進行提現操作');
      } else if (!this.isOnline()) {
        this.globalError.set('網絡連接異常，請檢查網絡後重試');
      }
      return;
    }
    this.isNavigating.set(true);
    this.router.navigate(['/wallet/withdraw']).finally(() => {
      this.isNavigating.set(false);
    });
  }
  
  // P2: 重試連接
  retryConnection() {
    if (navigator.onLine) {
      this.isOnline.set(true);
      this.globalError.set('');
      this.loadData();
    } else {
      this.globalError.set('網絡仍未連接，請檢查網絡設置');
    }
  }
  
  // P2: 關閉錯誤提示
  dismissError() {
    this.globalError.set('');
  }
  
  showRedeemCode() {
    // P2: 檢查操作權限
    if (!this.canOperate()) {
      if (this.isFrozen()) {
        this.globalError.set('錢包已凍結，無法使用兌換碼');
      } else if (!this.isOnline()) {
        this.globalError.set('網絡連接異常，請檢查網絡後重試');
      }
      return;
    }
    
    this.redeemCode = '';
    this.redeemError.set('');
    this.redeemSuccess.set('');
    this.showRedeemModal.set(true);
  }
  
  closeRedeemModal() {
    if (this.isRedeeming()) return; // 兌換中不允許關閉
    this.showRedeemModal.set(false);
    this.redeemCode = '';
    this.redeemError.set('');
    this.redeemSuccess.set('');
  }
  
  async submitRedeemCode() {
    const code = this.redeemCode.trim().toUpperCase();
    if (!code) {
      this.redeemError.set('請輸入兌換碼');
      return;
    }
    
    this.isRedeeming.set(true);
    this.redeemError.set('');
    this.redeemSuccess.set('');
    
    try {
      const response = await this.apiService.post<any>('/api/wallet/redeem', { code });
      
      if (response.success) {
        const amount = response.data?.amount || 0;
        const bonusAmount = response.data?.bonus_amount || 0;
        const totalAmount = amount + bonusAmount;
        
        this.redeemSuccess.set(
          `🎉 兌換成功！獲得 $${(totalAmount / 100).toFixed(2)}` +
          (bonusAmount > 0 ? ` (含贈送 $${(bonusAmount / 100).toFixed(2)})` : '')
        );
        
        // P2: 樂觀更新餘額（立即反饋）
        this.walletService.optimisticUpdateBalance(amount, bonusAmount);
        
        // P2: 同步更新本地狀態
        const updatedWallet = this.walletService.wallet();
        if (updatedWallet) {
          this.wallet.set(updatedWallet);
        }
        
        // 後台重新載入完整數據（確保數據一致性）
        this.loadData();
        
        // 2秒後自動關閉彈窗
        setTimeout(() => {
          this.closeRedeemModal();
        }, 2000);
      } else {
        // 根據錯誤碼顯示友好提示
        const errorMessages: Record<string, string> = {
          'CODE_NOT_FOUND': '兌換碼不存在',
          'CODE_USED': '此兌換碼已被使用',
          'CODE_EXPIRED': '此兌換碼已過期',
          'CODE_DISABLED': '此兌換碼已被禁用',
          'ALREADY_REDEEMED': '您已使用過此兌換碼',
          'LIMIT_EXCEEDED': '超出兌換次數限制'
        };
        const errorCode = (response as any).code || '';
        this.redeemError.set(errorMessages[errorCode] || response.error || '兌換失敗，請稍後再試');
      }
    } catch (error: any) {
      console.error('Redeem code error:', error);
      this.redeemError.set('網絡錯誤，請稍後再試');
    } finally {
      this.isRedeeming.set(false);
    }
  }
  
  showTransactions() {
    this.router.navigate(['/wallet/transactions']);
  }

  showOrders() {
    this.router.navigate(['/wallet/orders']);
  }

  showAnalytics() {
    this.router.navigate(['/wallet/analytics']);
  }
  
  formatCents(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  formatMonth(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${month}月`;
  }
  
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      membership: '👑',
      ip_proxy: '🌐',
      quota_pack: '📦',
      other: '📋'
    };
    return icons[category] || '📋';
  }
  
  getTypeIcon(type: string): string {
    return this.walletService.getTypeIcon(type);
  }
  
  getTypeName(type: string): string {
    return this.walletService.getTypeName(type);
  }
  
  getBarHeight(amount: number): number {
    // 基於最大值計算高度
    const maxAmount = Math.max(
      ...this.monthlySummary().flatMap(m => [m.income, m.expense])
    );
    if (maxAmount === 0) return 4;
    return Math.max(4, (amount / maxAmount) * 60);
  }
}
