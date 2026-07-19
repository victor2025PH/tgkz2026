/**
 * TG-AI智控王 Application Entry Point
 * 應用程式入口點 - Angular 17+ Standalone
 * 
 * 🆕 Phase 20: 配置 Angular Router 和應用啟動
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { appConfig } from './app.config';
import { environment } from './environments/environment';

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

/**
 * 🎯 精簡獲客模式 - 獨立 Bootstrap 根組件開關
 *
 * 預設（未設置任何開關）沿用既有的 AppComponent 作為根組件，行為與改動前
 * 完全一致。僅當 environment.features.leanBootstrapRoot 為 true，或
 * localStorage 裡的 tg_lean_mode 明確為 'true'（與 leanMode 判斷邏輯一致，
 * 見 src/utils/lean-mode.util.ts）時，才會改用輕量的 LeanRootComponent。
 *
 * 之所以在 main.ts 這裡直接讀取判斷（而非 import isLeanModeActive()），是
 * 因為要在最早的啟動時機同步判斷、且避免引入額外模組解析成本；判斷條件已
 * 刻意與 isLeanModeActive() 保持邏輯一致。
 *
 * ⚠️⚠️ 重要且誠實的已知限制（已用真實構建驗證確認，非推測）：
 * 下面兩個分支都改成 `import()` 動態載入，原意是希望 esbuild 能把
 * AppComponent 和 LeanRootComponent 分別拆成獨立的 lazy chunk，讓精簡模式
 * 啟動時真正不下載/不執行 AppComponent 的程式碼。但實測 `ng build` 後檢查
 * 產物發現：AppComponent 專屬的字串（如 localStorage 鍵名 `sidebar_groups`）
 * 仍然出現在 `main-*.js`（eager 主 chunk）裡，主 chunk 體積幾乎沒有縮小
 * （985KB → 983KB）。也就是說，Angular 現行的 esbuild 應用建構器**不會**對
 * main.ts 裡手動寫的 `import()` 做真正的懶加載拆分，它似乎只對 Angular
 * Router 的 `loadComponent`/`loadChildren`（即路由懶加載邊界）才有這種
 * 拆分優化 —— 這一點在 `app.routes.ts` 裡每個 `loadComponent: () => import(...)`
 * 都確實產生了獨立命名的 lazy chunk（如 dashboard-view-component.js），
 * 形成了鮮明對比。
 *
 * 因此，本次改動雖然實現了「執行到哪一支就用哪個根組件」的正確運行時邏輯，
 * 且已通過編譯驗證，但**尚未達成真正的主包體積縮減**這個原始目標。真正的
 * 修復方式應該是：把 AppComponent 的完整殼（側欄/選單）改造成一個透過
 * Router `loadComponent` 掛載的「包裝路由組件」（例如把現有非精簡路由都
 * 巢狀在一個 `AppShellComponent` 之下），讓 bootstrap 根組件永遠是一個
 * 極小的殼（只有 `<router-outlet>`），這樣才能真正借助 Router 既有的懶加載
 * 拆分機制。這是一次會動到整個 `app.routes.ts` 路由巢狀結構的改動，範圍
 * 比本次大，留給下一階段規劃。
 */
function shouldUseLeanBootstrapRoot(): boolean {
  try {
    const ls = localStorage.getItem('tg_lean_mode');
    if (ls === 'true') { return true; }
    if (ls === 'false') { return false; }
  } catch { /* ignore */ }
  return !!(environment as any)?.features?.leanBootstrapRoot;
}

const useLeanRoot = shouldUseLeanBootstrapRoot();

// 🔧 關鍵：兩個分支都必須是動態 import()，否則打包器會把 AppComponent 和
// LeanRootComponent 兩個都塞進同一個 eager 的 main chunk，即使只有其中一個
// 真正會在瀏覽器裡被載入執行 —— 那樣「換根」就只是換了個殼，主包體積完全
// 不會變小，失去這個功能的意義。動態 import() 讓它們各自成為獨立的 lazy
// chunk，執行到哪一支才真正下載那一支，另一支永遠不會被拉取。
const rootComponent = useLeanRoot
  ? () => import('./lean-root.component').then(m => m.LeanRootComponent)
  : () => import('./app.component').then(m => m.AppComponent);

if (useLeanRoot) {
  console.log('[TG-AI智控王] 🎯 精簡獲客模式：使用獨立輕量根組件 (LeanRootComponent)');
}

rootComponent().then(RootComponent => bootstrapApplication(RootComponent, mergedConfig))
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
