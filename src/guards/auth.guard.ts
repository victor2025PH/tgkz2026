/**
 * TG-AI智控王 路由守衛
 * Route Guards - 權限與會員等級檢查
 * 
 * 🆕 Phase 21: 實現 Angular Router 守衛
 */

import { inject } from '@angular/core';
import { 
  CanActivateFn, 
  Router, 
  ActivatedRouteSnapshot,
  RouterStateSnapshot 
} from '@angular/router';
import { MembershipService } from '../membership.service';
import { ToastService } from '../toast.service';
import { AuthService } from '../core/auth.service';
import { AuthEventsService } from '../core/auth-events.service';
import { environment } from '../environments/environment';
import { isElectronRuntime } from '../utils/runtime-env.util';

/**
 * 🔧 輔助函數：本地解析 JWT Payload，檢查是否已過期
 */
function isTokenAlive(token: string | null): boolean {
  if (!token || token.length < 20) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(atob(base64));
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;
    return true;
  } catch { return false; }
}

/**
 * 會員功能權限映射
 * 定義每個路由需要的功能權限和會員等級
 */
export interface RoutePermission {
  requiredFeature?: string;
  membershipLevel?: 'free' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'star' | 'king';
  membershipMessage?: string;
}

/**
 * 路由權限配置
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // 核心功能 - 無限制
  'dashboard': {},
  'accounts': {},
  'settings': {},
  
  // 營銷功能 - 基礎會員
  'leads': {
    requiredFeature: 'leadManagement',
    membershipLevel: 'bronze',
    membershipMessage: '潛在客戶管理需要青銅會員或以上等級'
  },
  'automation': {
    requiredFeature: 'automation',
    membershipLevel: 'silver',
    membershipMessage: '自動化中心需要白銀會員或以上等級'
  },
  'resource-discovery': {
    requiredFeature: 'resourceDiscovery',
    membershipLevel: 'bronze',
    membershipMessage: '資源發現需要青銅會員或以上等級'
  },
  'search-discovery': {
    requiredFeature: 'resourceDiscovery',
    membershipLevel: 'bronze',
    membershipMessage: '搜索發現需要青銅會員或以上等級'
  },
  
  // AI 功能 - 高級會員
  'ai-center': {
    requiredFeature: 'aiCenter',
    membershipLevel: 'gold',
    membershipMessage: 'AI 中心需要黃金會員或以上等級'
  },
  'multi-role': {
    requiredFeature: 'multiRole',
    membershipLevel: 'diamond',
    membershipMessage: '多角色協作需要鑽石會員或以上等級'
  },
  
  // 數據分析 - 高級會員
  'analytics': {
    requiredFeature: 'dataInsightsBasic',
    membershipLevel: 'gold',
    membershipMessage: '數據分析需要黃金會員或以上等級'
  },
  
  // 系統功能 - 無限制
  'monitoring': {}
};

/**
 * 會員等級優先級
 */
const MEMBERSHIP_PRIORITY: Record<string, number> = {
  'free': 0,
  'bronze': 1,
  'silver': 2,
  'gold': 3,
  'diamond': 4,
  'star': 5,
  'king': 6
};

/**
 * 檢查會員等級是否滿足要求
 */
function checkMembershipLevel(
  currentLevel: string, 
  requiredLevel: string
): boolean {
  const current = MEMBERSHIP_PRIORITY[currentLevel] ?? 0;
  const required = MEMBERSHIP_PRIORITY[requiredLevel] ?? 0;
  return current >= required;
}

/**
 * 會員權限守衛
 * 檢查用戶是否有權限訪問特定路由
 * 
 * 🆕 全功能開放模式：SKIP_LOGIN = true 時，所有功能均可訪問
 */
export const membershipGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const membershipService = inject(MembershipService);
  const toastService = inject(ToastService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const authEvents = inject(AuthEventsService);

  // 🔧 FIX: 先檢查認證狀態 —— JWT 過期檢測；Electron 偵測用統一工具（含 window.require fallback，與 main 側 inline 寫法等價）
  const isElectron = isElectronRuntime();
  if (!(environment.apiMode === 'ipc' && isElectron)) {
    const token = authService.accessToken();
    const localToken = localStorage.getItem('tgm_access_token');
    const refreshToken = localStorage.getItem('tgm_refresh_token');
    
    const accessAlive = isTokenAlive(token) || isTokenAlive(localToken);
    const refreshAlive = isTokenAlive(refreshToken);
    
    if (!accessAlive && !refreshAlive) {
      console.warn('[MembershipGuard] All tokens expired, clearing and redirecting to login');
      authEvents.clearAllAuthStorage();
      router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }

  // ========== 全功能開放模式 ==========
  // 當 membership.level 為 'king' 時，直接放行所有路由
  const currentLevel = membershipService.level();
  if (currentLevel === 'king') {
    return true;
  }
  // ====================================
  
  // 從路由路徑獲取權限配置
  const path = route.routeConfig?.path || '';
  const permission = ROUTE_PERMISSIONS[path];
  
  // 無權限要求，直接通過
  if (!permission || (!permission.requiredFeature && !permission.membershipLevel)) {
    return true;
  }
  
  // 檢查功能權限
  if (permission.requiredFeature) {
    const hasFeature = membershipService.hasFeature(permission.requiredFeature as any);
    if (!hasFeature) {
      toastService.warning(permission.membershipMessage || '您的會員等級不足以使用此功能');
      router.navigate(['/dashboard']);
      return false;
    }
  }
  
  // 檢查會員等級
  if (permission.membershipLevel) {
    const memberLevel = membershipService.membership()?.level || 'free';
    if (!checkMembershipLevel(memberLevel, permission.membershipLevel)) {
      toastService.warning(permission.membershipMessage || '您的會員等級不足以使用此功能');
      router.navigate(['/dashboard']);
      return false;
    }
  }
  
  return true;
};

/**
 * 帳號連接守衛
 * 檢查是否有已連接的帳號
 */
export const accountConnectedGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const toastService = inject(ToastService);
  const router = inject(Router);
  
  // 從 route data 獲取配置
  const requireConnected = route.data?.['requireConnectedAccount'] ?? false;
  
  if (!requireConnected) {
    return true;
  }
  
  // 這裡需要注入 AccountManagementService 來檢查
  // 暫時返回 true，後續整合
  return true;
};

/**
 * 組合守衛 - 同時檢查會員和帳號
 */
export const combinedGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  // 先檢查會員權限
  const membershipResult = membershipGuard(route, state);
  if (membershipResult === false) {
    return false;
  }
  
  // 再檢查帳號連接
  return accountConnectedGuard(route, state);
};
