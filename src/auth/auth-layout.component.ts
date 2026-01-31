/**
 * 認證頁面佈局
 * 
 * 優化設計：
 * 1. 統一的認證頁面外觀
 * 2. 響應式設計
 * 3. 品牌展示區域
 * 4. 動畫效果
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <!-- 左側品牌區域 -->
      <div class="auth-brand">
        <div class="brand-content">
          <div class="logo">
            <span class="logo-icon">📱</span>
            <span class="logo-text">TG-Matrix</span>
          </div>
          <h1 class="brand-title">智能 Telegram 營銷平台</h1>
          <p class="brand-desc">
            自動化群組管理、AI 智能對話、多帳號協作
          </p>
          
          <div class="features">
            <div class="feature-item">
              <span class="feature-icon">🤖</span>
              <div class="feature-text">
                <strong>AI 驅動</strong>
                <span>智能對話引擎，自動回覆更自然</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <div class="feature-text">
                <strong>數據分析</strong>
                <span>深度洞察用戶行為和轉化率</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔒</span>
              <div class="feature-text">
                <strong>安全可靠</strong>
                <span>端到端加密，保護您的數據</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="brand-footer">
          <p>&copy; 2026 TG-Matrix. All rights reserved.</p>
        </div>
      </div>
      
      <!-- 右側表單區域 -->
      <div class="auth-form-area">
        <div class="form-container">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      min-height: 100vh;
      background: var(--bg-primary, #0f0f0f);
    }
    
    /* 左側品牌區域 */
    .auth-brand {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 3rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;
      
      @media (max-width: 768px) {
        display: none;
      }
    }
    
    .brand-content {
      max-width: 480px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    
    .logo-icon {
      font-size: 2.5rem;
    }
    
    .logo-text {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .brand-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    
    .brand-desc {
      font-size: 1.125rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 3rem;
    }
    
    .features {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    
    .feature-item:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateX(8px);
    }
    
    .feature-icon {
      font-size: 1.5rem;
    }
    
    .feature-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .feature-text strong {
      font-size: 1rem;
    }
    
    .feature-text span {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
    }
    
    .brand-footer {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.875rem;
    }
    
    /* 右側表單區域 */
    .auth-form-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--bg-primary, #0f0f0f);
    }
    
    .form-container {
      width: 100%;
      max-width: 420px;
    }
  `]
})
export class AuthLayoutComponent {}
