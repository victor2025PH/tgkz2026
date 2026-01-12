/**
 * 登入頁面組件
 * 支持帳號密碼登入、卡密激活、邀請碼註冊、Telegram/Google 授權登入
 */

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';
import { DeviceService } from './device.service';
import { I18nService } from './i18n.service';

type LoginMode = 'login' | 'activate' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <!-- 背景裝飾 -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
        <div class="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
      </div>
      
      <!-- 登入卡片 -->
      <div class="login-card">
        <!-- Logo 和標題 -->
        <div class="text-center mb-6">
          <div class="logo-container">
            <div class="logo-glow"></div>
            <div class="logo-inner">
              <!-- 新 LOGO: AI 智控王 - 融合 Telegram 紙飛機 + AI 大腦 + 皇冠 -->
              <svg viewBox="0 0 64 64" class="w-12 h-12" fill="none">
                <!-- 底部光環 -->
                <circle cx="32" cy="32" r="28" fill="url(#logoGrad1)" opacity="0.3"/>
                
                <!-- 中心六邊形 (代表 AI 網絡) -->
                <path d="M32 8L52 20V44L32 56L12 44V20L32 8Z" fill="url(#logoGrad2)" stroke="url(#logoGrad3)" stroke-width="1.5"/>
                
                <!-- 紙飛機 (Telegram 元素) -->
                <path d="M22 28L40 22L34 36L28 32L22 28Z" fill="white" opacity="0.95"/>
                <path d="M28 32L34 36L32 42L28 32Z" fill="white" opacity="0.8"/>
                
                <!-- AI 神經連接線 -->
                <circle cx="20" cy="24" r="2" fill="#22d3ee"/>
                <circle cx="44" cy="24" r="2" fill="#22d3ee"/>
                <circle cx="20" cy="40" r="2" fill="#a78bfa"/>
                <circle cx="44" cy="40" r="2" fill="#a78bfa"/>
                <line x1="20" y1="24" x2="32" y2="32" stroke="#22d3ee" stroke-width="0.5" opacity="0.6"/>
                <line x1="44" y1="24" x2="32" y2="32" stroke="#22d3ee" stroke-width="0.5" opacity="0.6"/>
                <line x1="20" y1="40" x2="32" y2="32" stroke="#a78bfa" stroke-width="0.5" opacity="0.6"/>
                <line x1="44" y1="40" x2="32" y2="32" stroke="#a78bfa" stroke-width="0.5" opacity="0.6"/>
                
                <!-- 頂部皇冠 (智控王) -->
                <path d="M24 12L28 8L32 11L36 8L40 12L38 16H26L24 12Z" fill="url(#crownGrad)" stroke="#fbbf24" stroke-width="0.5"/>
                <circle cx="28" cy="10" r="1" fill="#fef3c7"/>
                <circle cx="32" cy="8" r="1.2" fill="#fef3c7"/>
                <circle cx="36" cy="10" r="1" fill="#fef3c7"/>
                
                <!-- 漸變定義 -->
                <defs>
                  <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#06b6d4"/>
                    <stop offset="100%" stop-color="#8b5cf6"/>
                  </linearGradient>
                  <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0891b2" stop-opacity="0.9"/>
                    <stop offset="50%" stop-color="#0e7490" stop-opacity="0.95"/>
                    <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.9"/>
                  </linearGradient>
                  <linearGradient id="logoGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#22d3ee"/>
                    <stop offset="100%" stop-color="#a78bfa"/>
                  </linearGradient>
                  <linearGradient id="crownGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#f59e0b"/>
                    <stop offset="100%" stop-color="#fbbf24"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mt-4">TG-AI智控王</h1>
          <p class="text-slate-400 mt-1">AI 驅動的 Telegram 智能營銷系統</p>
        </div>
        
        <!-- 第三方快捷登入 -->
        <div class="oauth-section">
          <p class="text-center text-sm text-slate-500 mb-4">快捷登入</p>
          <div class="oauth-buttons">
            <!-- Telegram 登入 -->
            <button 
              (click)="onTelegramLogin()"
              [disabled]="isOAuthLoading()"
              class="oauth-btn telegram-btn">
              <div class="oauth-icon telegram-icon">
                <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span class="oauth-text">Telegram 登入</span>
              @if (telegramLoading()) {
                <span class="oauth-loading">⟳</span>
              }
            </button>
            
            <!-- Google 登入 -->
            <button 
              (click)="onGoogleLogin()"
              [disabled]="isOAuthLoading()"
              class="oauth-btn google-btn">
              <div class="oauth-icon google-icon">
                <svg viewBox="0 0 24 24" class="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span class="oauth-text">Google 登入</span>
              @if (googleLoading()) {
                <span class="oauth-loading">⟳</span>
              }
            </button>
          </div>
        </div>
        
        <!-- 分隔線 -->
        <div class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">或使用帳號登入</span>
          <span class="divider-line"></span>
        </div>
        
        <!-- 模式切換標籤 -->
        <div class="flex rounded-lg bg-slate-800/50 p-1 mb-5">
          <button 
            (click)="mode.set('login')"
            [class.active]="mode() === 'login'"
            class="mode-tab">
            🔑 登入
          </button>
          <button 
            (click)="mode.set('activate')"
            [class.active]="mode() === 'activate'"
            class="mode-tab">
            🎫 卡密激活
          </button>
          <button 
            (click)="mode.set('register')"
            [class.active]="mode() === 'register'"
            class="mode-tab">
            📝 邀請註冊
          </button>
        </div>
        
        <!-- 錯誤提示 -->
        @if (errorMessage()) {
          <div class="error-message">
            <span class="mr-2">⚠️</span>
            {{ errorMessage() }}
          </div>
        }
        
        <!-- 成功提示 -->
        @if (successMessage()) {
          <div class="success-message">
            <span class="mr-2">✅</span>
            {{ successMessage() }}
          </div>
        }
        
        <!-- 帳號密碼登入表單 -->
        @if (mode() === 'login') {
          <form (ngSubmit)="onLogin()" class="space-y-4">
            <div class="form-group">
              <label class="form-label">用戶名</label>
              <input 
                type="text" 
                [(ngModel)]="loginForm.username" 
                name="username"
                class="form-input"
                placeholder="請輸入用戶名"
                required>
            </div>
            
            <div class="form-group">
              <label class="form-label">密碼</label>
              <div class="relative">
                <input 
                  [type]="showPassword() ? 'text' : 'password'" 
                  [(ngModel)]="loginForm.password" 
                  name="password"
                  class="form-input pr-10"
                  placeholder="請輸入密碼"
                  required>
                <button 
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="rememberMe" name="remember" class="accent-cyan-500">
                <span class="text-slate-400">記住我</span>
              </label>
              <a href="javascript:void(0)" class="text-cyan-400 hover:text-cyan-300">
                忘記密碼？
              </a>
            </div>
            
            <button 
              type="submit" 
              [disabled]="isLoading()"
              class="submit-button">
              @if (isLoading()) {
                <span class="animate-spin mr-2">⏳</span> 登入中...
              } @else {
                🚀 登入
              }
            </button>
          </form>
        }
        
        <!-- 卡密激活表單 -->
        @if (mode() === 'activate') {
          <form (ngSubmit)="onActivate()" class="space-y-4">
            <div class="form-group">
              <label class="form-label">卡密</label>
              <input 
                type="text" 
                [(ngModel)]="activateForm.licenseKey" 
                name="licenseKey"
                class="form-input font-mono"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required>
              <p class="text-xs text-slate-500 mt-1">輸入購買的卡密進行激活</p>
            </div>
            
            <div class="form-group">
              <label class="form-label">設置用戶名</label>
              <input 
                type="text" 
                [(ngModel)]="activateForm.username" 
                name="username"
                class="form-input"
                placeholder="請設置用戶名"
                required>
            </div>
            
            <div class="form-group">
              <label class="form-label">設置密碼</label>
              <input 
                type="password" 
                [(ngModel)]="activateForm.password" 
                name="password"
                class="form-input"
                placeholder="請設置密碼（至少 6 位）"
                minlength="6"
                required>
            </div>
            
            <div class="form-group">
              <label class="form-label">確認密碼</label>
              <input 
                type="password" 
                [(ngModel)]="activateForm.confirmPassword" 
                name="confirmPassword"
                class="form-input"
                placeholder="請再次輸入密碼"
                required>
            </div>
            
            <button 
              type="submit" 
              [disabled]="isLoading()"
              class="submit-button bg-gradient-to-r from-green-500 to-emerald-600">
              @if (isLoading()) {
                <span class="animate-spin mr-2">⏳</span> 激活中...
              } @else {
                🎫 激活卡密
              }
            </button>
          </form>
        }
        
        <!-- 邀請碼註冊表單 -->
        @if (mode() === 'register') {
          <form (ngSubmit)="onRegister()" class="space-y-4">
            <div class="form-group">
              <label class="form-label">邀請碼</label>
              <input 
                type="text" 
                [(ngModel)]="registerForm.inviteCode" 
                name="inviteCode"
                class="form-input font-mono"
                placeholder="INVITE-XXXXXX"
                required>
              <p class="text-xs text-slate-500 mt-1">由好友分享的邀請碼</p>
            </div>
            
            <div class="form-group">
              <label class="form-label">用戶名</label>
              <input 
                type="text" 
                [(ngModel)]="registerForm.username" 
                name="username"
                class="form-input"
                placeholder="請設置用戶名"
                required>
            </div>
            
            <div class="form-group">
              <label class="form-label">郵箱（選填）</label>
              <input 
                type="email" 
                [(ngModel)]="registerForm.email" 
                name="email"
                class="form-input"
                placeholder="用於找回密碼">
            </div>
            
            <div class="form-group">
              <label class="form-label">密碼</label>
              <input 
                type="password" 
                [(ngModel)]="registerForm.password" 
                name="password"
                class="form-input"
                placeholder="請設置密碼（至少 6 位）"
                minlength="6"
                required>
            </div>
            
            <button 
              type="submit" 
              [disabled]="isLoading()"
              class="submit-button bg-gradient-to-r from-purple-500 to-pink-600">
              @if (isLoading()) {
                <span class="animate-spin mr-2">⏳</span> 註冊中...
              } @else {
                📝 註冊帳號
              }
            </button>
          </form>
        }
        
        <!-- 已綁定帳號快捷登入 -->
        @if (linkedAccounts().length > 0) {
          <div class="linked-accounts-section">
            <p class="text-center text-xs text-slate-500 mb-3">已綁定帳號</p>
            <div class="linked-accounts">
              @for (account of linkedAccounts(); track account.id) {
                <button 
                  (click)="onQuickLogin(account)"
                  class="linked-account-btn"
                  [class.telegram]="account.provider === 'telegram'"
                  [class.google]="account.provider === 'google'">
                  <div class="linked-avatar">
                    @if (account.avatar) {
                      <img [src]="account.avatar" alt="" class="w-full h-full rounded-full">
                    } @else {
                      <span>{{ account.name.charAt(0).toUpperCase() }}</span>
                    }
                  </div>
                  <div class="linked-info">
                    <span class="linked-name">{{ account.name }}</span>
                    <span class="linked-provider">
                      @if (account.provider === 'telegram') { 📱 Telegram }
                      @else if (account.provider === 'google') { 📧 Google }
                    </span>
                  </div>
                </button>
              }
            </div>
          </div>
        }
        
        <!-- 設備信息 -->
        <div class="mt-5 pt-4 border-t border-slate-700/50 text-center">
          <p class="text-xs text-slate-500">
            設備碼: <span class="font-mono text-slate-400">{{ deviceCode() }}</span>
          </p>
          <p class="text-xs text-slate-600 mt-1">
            {{ deviceName() }}
          </p>
        </div>
        
        <!-- 版權信息 -->
        <div class="mt-3 text-center text-xs text-slate-600">
          <p>© 2026 TG-AI智控王. All rights reserved.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      position: relative;
      padding: 1rem;
    }
    
    .login-card {
      width: 100%;
      max-width: 420px;
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(20px);
      border-radius: 1.5rem;
      padding: 2rem;
      border: 1px solid rgba(148, 163, 184, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: relative;
      z-index: 10;
    }
    
    /* Logo 樣式 */
    .logo-container {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto;
    }
    
    .logo-glow {
      position: absolute;
      inset: -10px;
      background: linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6);
      border-radius: 1.5rem;
      opacity: 0.5;
      filter: blur(15px);
      animation: logoGlow 3s ease-in-out infinite;
    }
    
    @keyframes logoGlow {
      0%, 100% { opacity: 0.3; transform: scale(0.95); }
      50% { opacity: 0.6; transform: scale(1.05); }
    }
    
    .logo-inner {
      position: relative;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-radius: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px -10px rgba(6, 182, 212, 0.5);
    }
    
    /* OAuth 區域 */
    .oauth-section {
      margin-bottom: 1.25rem;
    }
    
    .oauth-buttons {
      display: flex;
      gap: 0.75rem;
    }
    
    .oauth-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    
    .oauth-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .telegram-btn {
      background: linear-gradient(135deg, #0088cc, #229ED9);
      border: 1px solid rgba(34, 158, 217, 0.3);
      color: white;
    }
    
    .telegram-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(0, 136, 204, 0.5);
    }
    
    .google-btn {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #333;
    }
    
    .google-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.2);
    }
    
    .oauth-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .oauth-text {
      font-weight: 500;
    }
    
    .oauth-loading {
      animation: spin 1s linear infinite;
      margin-left: 0.25rem;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* 分隔線 */
    .divider {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    
    .divider-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.3), transparent);
    }
    
    .divider-text {
      font-size: 0.75rem;
      color: #64748b;
      white-space: nowrap;
    }
    
    /* 模式標籤 */
    .mode-tab {
      flex: 1;
      padding: 0.5rem 0.5rem;
      font-size: 0.8rem;
      color: #94a3b8;
      border-radius: 0.5rem;
      transition: all 0.2s;
    }
    
    .mode-tab:hover {
      color: #e2e8f0;
    }
    
    .mode-tab.active {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: white;
      font-weight: 500;
    }
    
    /* 表單樣式 */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #e2e8f0;
    }
    
    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.75rem;
      color: white;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #06b6d4;
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
    }
    
    .form-input::placeholder {
      color: #64748b;
    }
    
    .submit-button {
      width: 100%;
      padding: 0.875rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.75rem;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .submit-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px -10px rgba(6, 182, 212, 0.5);
    }
    
    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .error-message {
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.75rem;
      color: #fca5a5;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
    }
    
    .success-message {
      padding: 0.75rem 1rem;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 0.75rem;
      color: #86efac;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
    }
    
    /* 已綁定帳號區域 */
    .linked-accounts-section {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }
    
    .linked-accounts {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .linked-account-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .linked-account-btn:hover {
      background: rgba(15, 23, 42, 0.8);
      border-color: rgba(148, 163, 184, 0.3);
    }
    
    .linked-account-btn.telegram:hover {
      border-color: rgba(0, 136, 204, 0.5);
    }
    
    .linked-account-btn.google:hover {
      border-color: rgba(234, 67, 53, 0.5);
    }
    
    .linked-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: white;
      font-size: 0.875rem;
      overflow: hidden;
    }
    
    .linked-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    
    .linked-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #e2e8f0;
    }
    
    .linked-provider {
      font-size: 0.75rem;
      color: #64748b;
    }
  `]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private deviceService = inject(DeviceService);
  private i18n = inject(I18nService);
  
  // 狀態
  mode = signal<LoginMode>('login');
  showPassword = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  rememberMe = false;
  
  // OAuth 狀態
  telegramLoading = signal(false);
  googleLoading = signal(false);
  
  // 計算屬性
  isLoading = computed(() => this.authService.isLoading());
  isOAuthLoading = computed(() => this.telegramLoading() || this.googleLoading());
  deviceCode = computed(() => this.deviceService.getShortDeviceId());
  deviceName = computed(() => this.deviceService.getDeviceName());
  
  // 已綁定帳號
  linkedAccounts = signal<LinkedAccount[]>([]);
  
  // 表單數據
  loginForm = {
    username: '',
    password: ''
  };
  
  activateForm = {
    licenseKey: '',
    username: '',
    password: '',
    confirmPassword: ''
  };
  
  registerForm = {
    inviteCode: '',
    username: '',
    email: '',
    password: ''
  };
  
  ngOnInit(): void {
    // 檢查 URL 參數中的邀請碼
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    if (inviteCode) {
      this.registerForm.inviteCode = inviteCode;
      this.mode.set('register');
    }
    
    // 載入已綁定帳號
    this.loadLinkedAccounts();
    
    // 處理 OAuth 回調
    this.handleOAuthCallback();
  }
  
  /**
   * 載入已綁定帳號
   */
  private loadLinkedAccounts(): void {
    try {
      const saved = localStorage.getItem('tgm_linked_accounts');
      if (saved) {
        this.linkedAccounts.set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('載入已綁定帳號失敗:', e);
    }
  }
  
  /**
   * 處理 OAuth 回調
   */
  private handleOAuthCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('oauth_token');
    const provider = urlParams.get('provider');
    
    if (oauthToken && provider) {
      this.processOAuthToken(provider, oauthToken);
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
  
  /**
   * Telegram 登入
   */
  async onTelegramLogin(): Promise<void> {
    this.clearMessages();
    this.telegramLoading.set(true);
    
    try {
      // 開發模式：模擬 Telegram 登入
      if (this.isDevMode()) {
        await this.simulateTelegramLogin();
        return;
      }
      
      // 生產模式：跳轉到 Telegram OAuth
      const deviceCode = await this.deviceService.getDeviceCode();
      const callbackUrl = encodeURIComponent(window.location.origin + '?provider=telegram');
      const authUrl = `/api/oauth/telegram/authorize?device=${deviceCode}&callback=${callbackUrl}`;
      
      // 打開 Telegram 授權窗口
      window.location.href = authUrl;
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Telegram 登入失敗');
      this.telegramLoading.set(false);
    }
  }
  
  /**
   * Google 登入
   */
  async onGoogleLogin(): Promise<void> {
    this.clearMessages();
    this.googleLoading.set(true);
    
    try {
      // 開發模式：模擬 Google 登入
      if (this.isDevMode()) {
        await this.simulateGoogleLogin();
        return;
      }
      
      // 生產模式：跳轉到 Google OAuth
      const deviceCode = await this.deviceService.getDeviceCode();
      const callbackUrl = encodeURIComponent(window.location.origin + '?provider=google');
      const authUrl = `/api/oauth/google/authorize?device=${deviceCode}&callback=${callbackUrl}`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Google 登入失敗');
      this.googleLoading.set(false);
    }
  }
  
  /**
   * 快捷登入（使用已綁定帳號）
   */
  async onQuickLogin(account: LinkedAccount): Promise<void> {
    this.clearMessages();
    
    try {
      const deviceCode = await this.deviceService.getDeviceCode();
      
      // 開發模式：直接登入
      if (this.isDevMode()) {
        const result = await this.authService.login(account.name, 'oauth_' + account.id);
        if (result.success) {
          this.successMessage.set(`歡迎回來，${account.name}！`);
        } else {
          this.errorMessage.set('快捷登入失敗，請嘗試重新授權');
        }
        return;
      }
      
      // 生產模式：驗證已綁定帳號
      const response = await fetch('/api/oauth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          provider: account.provider,
          deviceCode
        })
      });
      
      const result = await response.json();
      if (result.success) {
        this.successMessage.set(`歡迎回來，${account.name}！`);
      } else {
        this.errorMessage.set(result.message || '快捷登入失敗');
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || '快捷登入失敗');
    }
  }
  
  /**
   * 模擬 Telegram 登入（開發模式）
   */
  private async simulateTelegramLogin(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 模擬 Telegram 用戶數據
    const telegramUser = {
      id: 'tg_' + Math.random().toString(36).substr(2, 9),
      name: 'TG User ' + Math.floor(Math.random() * 1000),
      avatar: null,
      provider: 'telegram' as const
    };
    
    // 保存到已綁定帳號
    this.saveLinkedAccount(telegramUser);
    
    // 執行登入
    const result = await this.authService.login(telegramUser.name, 'oauth_' + telegramUser.id);
    
    this.telegramLoading.set(false);
    
    if (result.success) {
      this.successMessage.set('Telegram 登入成功！');
    } else {
      this.errorMessage.set(result.message);
    }
  }
  
  /**
   * 模擬 Google 登入（開發模式）
   */
  private async simulateGoogleLogin(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 模擬 Google 用戶數據
    const googleUser = {
      id: 'google_' + Math.random().toString(36).substr(2, 9),
      name: 'user' + Math.floor(Math.random() * 1000) + '@gmail.com',
      avatar: null,
      provider: 'google' as const
    };
    
    // 保存到已綁定帳號
    this.saveLinkedAccount(googleUser);
    
    // 執行登入
    const result = await this.authService.login(googleUser.name.split('@')[0], 'oauth_' + googleUser.id);
    
    this.googleLoading.set(false);
    
    if (result.success) {
      this.successMessage.set('Google 登入成功！');
    } else {
      this.errorMessage.set(result.message);
    }
  }
  
  /**
   * 處理 OAuth Token
   */
  private async processOAuthToken(provider: string, token: string): Promise<void> {
    try {
      const response = await fetch('/api/oauth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, token })
      });
      
      const result = await response.json();
      if (result.success && result.user) {
        this.saveLinkedAccount({
          id: result.user.id,
          name: result.user.name,
          avatar: result.user.avatar,
          provider: provider as 'telegram' | 'google'
        });
        
        this.successMessage.set(`${provider === 'telegram' ? 'Telegram' : 'Google'} 綁定成功！`);
      }
    } catch (error) {
      console.error('OAuth 驗證失敗:', error);
    }
  }
  
  /**
   * 保存已綁定帳號
   */
  private saveLinkedAccount(account: LinkedAccount): void {
    const accounts = this.linkedAccounts();
    
    // 檢查是否已存在
    const existingIndex = accounts.findIndex(a => a.provider === account.provider && a.id === account.id);
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    
    this.linkedAccounts.set([...accounts]);
    localStorage.setItem('tgm_linked_accounts', JSON.stringify(accounts));
  }
  
  /**
   * 開發模式檢測
   */
  private isDevMode(): boolean {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1');
  }
  
  /**
   * 帳號密碼登入
   */
  async onLogin(): Promise<void> {
    this.clearMessages();
    
    if (!this.loginForm.username || !this.loginForm.password) {
      this.errorMessage.set('請輸入用戶名和密碼');
      return;
    }
    
    const result = await this.authService.login(
      this.loginForm.username,
      this.loginForm.password
    );
    
    if (result.success) {
      this.successMessage.set('登入成功，正在跳轉...');
    } else {
      this.errorMessage.set(result.message);
    }
  }
  
  /**
   * 卡密激活
   */
  async onActivate(): Promise<void> {
    this.clearMessages();
    
    if (!this.activateForm.licenseKey) {
      this.errorMessage.set('請輸入卡密');
      return;
    }
    
    if (!this.activateForm.username) {
      this.errorMessage.set('請設置用戶名');
      return;
    }
    
    if (this.activateForm.password.length < 6) {
      this.errorMessage.set('密碼至少需要 6 位');
      return;
    }
    
    if (this.activateForm.password !== this.activateForm.confirmPassword) {
      this.errorMessage.set('兩次輸入的密碼不一致');
      return;
    }
    
    const result = await this.authService.activateLicense(
      this.activateForm.licenseKey,
      this.activateForm.username,
      this.activateForm.password
    );
    
    if (result.success) {
      this.successMessage.set('激活成功，正在跳轉...');
    } else {
      this.errorMessage.set(result.message);
    }
  }
  
  /**
   * 邀請碼註冊
   */
  async onRegister(): Promise<void> {
    this.clearMessages();
    
    if (!this.registerForm.inviteCode) {
      this.errorMessage.set('請輸入邀請碼');
      return;
    }
    
    if (!this.registerForm.username) {
      this.errorMessage.set('請設置用戶名');
      return;
    }
    
    if (this.registerForm.password.length < 6) {
      this.errorMessage.set('密碼至少需要 6 位');
      return;
    }
    
    const result = await this.authService.registerWithInvite(
      this.registerForm.inviteCode,
      this.registerForm.username,
      this.registerForm.password,
      this.registerForm.email || undefined
    );
    
    if (result.success) {
      this.successMessage.set('註冊成功，正在跳轉...');
    } else {
      this.errorMessage.set(result.message);
    }
  }
  
  /**
   * 清除消息
   */
  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}

// 已綁定帳號接口
interface LinkedAccount {
  id: string;
  name: string;
  avatar: string | null;
  provider: 'telegram' | 'google';
}
