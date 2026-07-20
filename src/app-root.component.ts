/**
 * TG-AI智控王 Bootstrap 根組件
 *
 * 🎯 真正的 bundle 拆分方案（取代上一輪 main.ts 手動切換根組件的做法）
 *
 * 背景：上一輪嘗試讓 main.ts 依據 leanMode 動態 import() 切換
 * AppComponent / LeanRootComponent 作為 bootstrap 根組件，實測發現 Angular
 * 現行的 esbuild 應用建構器**不會**對 main.ts 裡手動寫的 import() 做真正的
 * 懶加載拆分 —— AppComponent 的程式碼依然被打進主 chunk，未達成縮小主包
 * 體積的目標（已用真實 `ng build` 驗證並記錄在案）。
 *
 * 研究 Angular 官方推薦模式後確認：真正的懶加載拆分只發生在 Angular Router
 * 的 `loadComponent`/`loadChildren` 邊界。因此正確做法是：
 * 1. bootstrap 根組件永遠保持這個極簡殼（不做任何條件判斷、不切換）。
 * 2. 把原本作為 bootstrap 根組件的 AppComponent，改為透過路由
 *    `loadComponent` 懶加載掛載的「應用殼」路由組件（見 app.routes.ts），
 *    包裝除 /lean/* 與 /auth/* 之外的所有既有路由。
 * 3. AppComponent 本身完全不需要修改：它的模板已經有
 *    `<router-outlet>`（用於承載子路由），直接符合作為路由懶加載組件的
 *    要求，只是「被誰引用、何時載入」變了，內部邏輯一行都沒動。
 *
 * 這樣才能真正借助 Angular Router 既有的、已驗證有效的懶加載拆分機制
 * （如 dashboard-view-component.js、accounts-view-component.js 等各自獨立
 * chunk），讓 AppComponent 的程式碼只在真正需要它的路由才下載執行。
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  // 🔧 必須是 'app-root'，與 index.html 裡 <app-root> 掛載點一致，
  // 否則 bootstrapApplication 找不到掛載元素會啟動失敗
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppRootComponent {}
