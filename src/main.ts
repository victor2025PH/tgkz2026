/**
 * TG-AI智控王 Application Entry Point
 * 應用程式入口點 - Angular 17+ Standalone
 * 
 * 🆕 Phase 20: 配置 Angular Router 和應用啟動
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

/**
 * 啟動 Angular 應用
 * 合併 appConfig 和額外的動畫 provider
 */
const mergedConfig = {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideAnimations(),  // 確保動畫模組被正確載入
  ]
};

bootstrapApplication(AppComponent, mergedConfig)
  .then(() => {
    console.log('[TG-AI智控王] Application started successfully');
    
    // 🆕 P0: 觸發 angular-ready 事件（備份機制）
    // AppComponent.ngOnInit 也會觸發，這裡作為雙重保障
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('angular-ready'));
      console.log('[TG-AI智控王] angular-ready event dispatched from main.ts');
    }, 50);
    
    // 移除載入指示器（如果有）
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  })
  .catch((err) => {
    console.error('[TG-AI智控王] Application failed to start:', err);
    
    // 顯示錯誤信息
    const root = document.getElementById('app-root') || document.body;
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #0f172a;
        color: #f1f5f9;
        font-family: system-ui, sans-serif;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
        <h1 style="font-size: 24px; margin-bottom: 8px;">應用啟動失敗</h1>
        <p style="color: #94a3b8; margin-bottom: 16px;">請檢查控制台以獲取詳細信息</p>
        <button onclick="location.reload()" style="
          padding: 12px 24px;
          background: linear-gradient(135deg, #0891b2, #7c3aed);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          cursor: pointer;
        ">
          重新載入
        </button>
        <pre style="
          margin-top: 24px;
          padding: 16px;
          background: #1e293b;
          border-radius: 8px;
          max-width: 600px;
          overflow: auto;
          font-size: 12px;
          color: #f87171;
        ">${err?.message || err}</pre>
      </div>
    `;
  });
