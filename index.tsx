/**
 * TG-AI智控王 Application Entry Point
 * 應用程式入口點 - Angular 17+ Standalone
 */

// 🔧 P0: 早期調試日誌
console.log('[Bootstrap] index.tsx loaded, starting Angular bootstrap...');

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

console.log('[Bootstrap] Angular imports completed');

import { AppComponent } from './src/app.component';

console.log('[Bootstrap] AppComponent imported, calling bootstrapApplication...');

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideAnimations(),
  ],
}).then(() => {
  console.log('[TG-AI智控王] Application started successfully');
  
  // 觸發 angular-ready 事件，通知加載畫面 Angular 已就緒
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('angular-ready'));
    console.log('[TG-AI智控王] angular-ready event dispatched');
  }, 50);
}).catch(err => {
  console.error('[TG-AI智控王] Application failed to start:', err);
  
  // 顯示錯誤信息
  const loading = document.getElementById('app-loading');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const status = document.getElementById('loading-status');
  const progress = document.getElementById('loading-progress') as HTMLElement;
  
  if (status) status.textContent = '載入失敗';
  if (progress) {
    progress.style.background = '#ef4444';
    progress.style.width = '100%';
  }
  if (errorContainer) errorContainer.style.display = 'block';
  if (errorMessage) errorMessage.textContent = '錯誤: ' + (err?.message || err);
});
