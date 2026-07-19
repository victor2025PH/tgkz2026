/**
 * TG-AI智控王 Application Entry Point
 * 應用程式入口點 - Angular 17+ Standalone
 * 
 * 🆕 Phase 20: 配置 Angular Router 和應用啟動
 *
 * 🎯 精簡獲客模式的 bundle 拆分機制說明：
 * bootstrap 根組件永遠是極簡的 AppRootComponent（僅 `<router-outlet>`），
 * 不做任何條件切換。真正的「精簡模式不載入巨型 AppComponent」是透過
 * `app.routes.ts` 裡的路由懶加載邊界達成的（AppComponent 現在是一個透過
 * `loadComponent` 掛載的「應用殼」路由組件，只包裝非 /lean/* 的路由）。
 *
 * ✅ 已用真實 `ng build` + esbuild metafile 分析驗證確認生效：
 * Initial（首屏必載）總體積從 1.76MB 降到 461.62KB（-74%），app-component
 * chunk（888.98KB）現在正確列在 Lazy chunk files（只有導航到需要它的路由
 * 才會下載），/lean/* 路由完全不會載入它。
 *
 * 🔍 這個方案能生效的關鍵前提（追查過程中發現並修復的根因問題）：
 * `angular.json` 的 `browser` 入口原本錯誤指向專案根目錄一個叫 `index.tsx`
 * 的遺留檔案（早期與其他模板合併時留下的重複 bootstrap 入口），裡面直接
 * `import { AppComponent } from './src/app.component'` 做靜態導入，且用了
 * 一套跟 `app.config.ts` 不同、更精簡的 provider 清單（缺少認證/離線攔截器、
 * 全局錯誤處理器、智能預加載策略）。這個檔案讓 esbuild 永遠把 AppComponent
 * 靜態打進主 chunk，不管 `app.routes.ts` 裡怎麼寫 `loadComponent` 都沒用 ——
 * 這也是為什麼先前嘗試在 main.ts 手動切換根組件時，主包體積量測不到變化。
 * 已修正 `angular.json` 的 `browser` 指向這個檔案（`src/main.ts`），並刪除
 * `index.tsx`（連同 `tsconfig.json`/`package.json`/`electron-builder.yml`
 * 裡對它的引用一併清理），現在整個應用只有這一個真正生效的入口。
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppRootComponent } from './app-root.component';
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

bootstrapApplication(AppRootComponent, mergedConfig)
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
