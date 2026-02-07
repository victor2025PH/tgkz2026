/**
 * 🔧 P8-2: i18n 翻譯管道
 * 
 * 使用方式：
 *   {{ 'menu.dashboard' | i18n }}
 *   {{ 'common.items' | i18n:{ count: 5 } }}
 * 
 * 特性：
 * - impure pipe：語言切換後自動重新計算
 * - 開發模式下記錄缺失的翻譯 key
 * - 支持參數插值
 */

import { Pipe, PipeTransform, inject, isDevMode } from '@angular/core';
import { I18nService } from '../i18n.service';

// 🔧 缺失 key 收集器（開發模式）
const missingKeys = new Set<string>();
let missingKeyTimer: ReturnType<typeof setTimeout> | null = null;

function reportMissingKey(key: string): void {
  if (!isDevMode()) return;
  if (missingKeys.has(key)) return;
  
  missingKeys.add(key);
  
  // 批量報告，避免控制台刷屏
  if (missingKeyTimer) clearTimeout(missingKeyTimer);
  missingKeyTimer = setTimeout(() => {
    if (missingKeys.size > 0) {
      console.warn(
        `[i18n] ${missingKeys.size} missing translation key(s):`,
        Array.from(missingKeys).sort().join(', ')
      );
    }
    missingKeyTimer = null;
  }, 2000);
}

@Pipe({
  name: 'i18n',
  standalone: true,
  pure: false  // 語言切換時需要重新計算
})
export class I18nPipe implements PipeTransform {
  private i18n = inject(I18nService);
  
  transform(key: string, params?: Record<string, string | number>): string {
    if (!key) return '';
    
    const result = this.i18n.t(key, params);
    
    // 如果返回值就是 key 本身，說明缺失翻譯
    if (result === key && isDevMode()) {
      reportMissingKey(key);
    }
    
    return result;
  }
}
