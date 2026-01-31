/**
 * 配額守衛
 * 
 * 優化設計：
 * 1. 帳號數量限制檢查
 * 2. API 調用配額檢查
 * 3. 友好的升級提示
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { UsageService } from './usage.service';
import { environment } from '../environments/environment';

/**
 * 帳號數量配額守衛
 * 用於添加帳號前檢查
 */
export const accountQuotaGuard: CanActivateFn = async () => {
  // Electron 模式不限制
  if (environment.apiMode === 'ipc') {
    return true;
  }
  
  const usageService = inject(UsageService);
  const router = inject(Router);
  
  // 刷新配額狀態
  await usageService.fetchQuotaStatus();
  
  if (usageService.checkQuota('accounts')) {
    return true;
  }
  
  // 配額不足，跳轉到升級頁面
  router.navigate(['/upgrade'], {
    queryParams: {
      reason: 'accounts_limit',
      message: '帳號數量已達上限'
    }
  });
  
  return false;
};

/**
 * API 配額守衛
 * 用於高頻 API 操作前檢查
 */
export const apiQuotaGuard: CanActivateFn = async () => {
  if (environment.apiMode === 'ipc') {
    return true;
  }
  
  const usageService = inject(UsageService);
  const router = inject(Router);
  
  await usageService.fetchQuotaStatus();
  
  if (usageService.checkQuota('api_calls')) {
    return true;
  }
  
  router.navigate(['/upgrade'], {
    queryParams: {
      reason: 'api_limit',
      message: 'API 調用已達今日上限'
    }
  });
  
  return false;
};

/**
 * 配額檢查攔截器（用於 HTTP 請求）
 */
export function createQuotaInterceptor() {
  return {
    async intercept(url: string, options: RequestInit): Promise<Response> {
      const response = await fetch(url, options);
      
      // 檢查是否因配額超限被拒絕
      if (response.status === 429) {
        const data = await response.clone().json();
        
        if (data.code === 'QUOTA_EXCEEDED') {
          // 觸發配額超限事件
          window.dispatchEvent(new CustomEvent('quota-exceeded', {
            detail: data.quota
          }));
        }
      }
      
      return response;
    }
  };
}
