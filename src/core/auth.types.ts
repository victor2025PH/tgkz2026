/**
 * 認證模塊共享類型定義
 * 
 * 🆕 統一所有認證相關的接口和類型
 * 解決老版和新版服務類型不一致的問題
 */

import { MembershipLevel } from '../membership.service';

// ==================== 用戶模型 ====================

/**
 * 統一用戶接口
 * 兼容老版（membershipLevel）和新版（subscription_tier）格式
 */
export interface User {
  id: string | number;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatar_url?: string;
  display_name?: string;
  role?: string;
  
  // 會員信息（老版格式）
  membershipLevel?: MembershipLevel;
  membershipExpires?: string;
  
  // 訂閱信息（新版格式）
  subscription_tier?: string;
  max_accounts?: number;
  
  // 邀請信息
  inviteCode?: string;
  invite_code?: string;
  invitedCount?: number;
  invited_count?: number;
  
  // 時間戳
  createdAt?: string;
  created_at?: string;
  lastLogin?: string;
  last_login_at?: string;
  
  // 狀態
  status?: 'active' | 'suspended' | 'banned';
  is_active?: boolean;
  is_verified?: boolean;
  two_factor_enabled?: boolean;
}

// ==================== 設備管理 ====================

/**
 * 設備信息
 */
export interface DeviceInfo {
  id: number | string;
  deviceCode: string;
  device_code?: string;
  deviceName: string;
  device_name?: string;
  boundAt: string;
  bound_at?: string;
  lastSeen: string;
  last_seen?: string;
  isCurrent: boolean;
  is_current?: boolean;
  status: 'active' | 'inactive';
}

// ==================== 使用統計 ====================

/**
 * 使用統計
 */
export interface UsageStats {
  aiCalls: { used: number; limit: number };
  messagesSent: { used: number; limit: number };
  accounts: { used: number; limit: number };
  storage: { used: number; limit: number }; // MB
}

// ==================== 認證請求/響應 ====================

/**
 * 登入請求
 */
export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  remember?: boolean;
  device_name?: string;
  deviceCode?: string;
}

/**
 * 登入響應
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  expiresAt?: string;
}

/**
 * 註冊請求
 */
export interface RegisterRequest {
  email?: string;
  username?: string;
  password: string;
  display_name?: string;
  inviteCode?: string;
  deviceCode?: string;
}

/**
 * 卡密激活請求
 */
export interface ActivateRequest {
  licenseKey: string;
  username?: string;
  password?: string;
  email?: string;
  deviceCode?: string;
}

// ==================== 會員等級工具函數 ====================

/**
 * 訂閱層級到會員等級的映射
 */
export function tierToMembershipLevel(tier: string): MembershipLevel {
  const tierMap: Record<string, MembershipLevel> = {
    'free': 'bronze',
    'basic': 'silver',
    'pro': 'gold',
    'enterprise': 'diamond',
    // 直接映射
    'bronze': 'bronze',
    'silver': 'silver',
    'gold': 'gold',
    'diamond': 'diamond',
    'star': 'star',
    'king': 'king'
  };
  return tierMap[tier] || 'bronze';
}

/**
 * 會員等級到訂閱層級的映射
 */
export function membershipLevelToTier(level: MembershipLevel): string {
  const levelMap: Record<MembershipLevel, string> = {
    'bronze': 'free',
    'silver': 'basic',
    'gold': 'pro',
    'diamond': 'enterprise',
    'star': 'enterprise',
    'king': 'enterprise'
  };
  return levelMap[level] || 'free';
}

/**
 * 獲取會員等級名稱
 */
export function getMembershipLevelName(level: MembershipLevel): string {
  const names: Record<MembershipLevel, string> = {
    bronze: '青銅戰士',
    silver: '白銀精英',
    gold: '黃金大師',
    diamond: '鑽石王牌',
    star: '星耀傳說',
    king: '榮耀王者'
  };
  return names[level] || '青銅戰士';
}

/**
 * 獲取會員等級圖標
 */
export function getMembershipLevelIcon(level: MembershipLevel): string {
  const icons: Record<MembershipLevel, string> = {
    bronze: '⚔️',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎',
    star: '🌟',
    king: '👑'
  };
  return icons[level] || '⚔️';
}

/**
 * 標準化用戶對象（兼容新舊格式）
 */
export function normalizeUser(rawUser: any): User {
  return {
    id: rawUser.id || 0,
    username: rawUser.username || rawUser.display_name || 'User',
    email: rawUser.email || undefined,
    phone: rawUser.phone || undefined,
    avatar: rawUser.avatar_url || rawUser.avatar || undefined,
    display_name: rawUser.display_name || rawUser.username,
    role: rawUser.role,
    
    // 會員信息
    membershipLevel: tierToMembershipLevel(rawUser.subscription_tier || rawUser.membershipLevel || 'free'),
    membershipExpires: rawUser.membershipExpires || rawUser.subscription_expires,
    subscription_tier: rawUser.subscription_tier,
    max_accounts: rawUser.max_accounts,
    
    // 邀請信息
    inviteCode: rawUser.inviteCode || rawUser.invite_code || '',
    invitedCount: rawUser.invitedCount || rawUser.invited_count || 0,
    
    // 時間戳
    createdAt: rawUser.createdAt || rawUser.created_at,
    lastLogin: rawUser.lastLogin || rawUser.last_login_at,
    
    // 狀態
    status: rawUser.status || (rawUser.is_active ? 'active' : 'suspended'),
    is_active: rawUser.is_active,
    is_verified: rawUser.is_verified,
    two_factor_enabled: rawUser.two_factor_enabled
  };
}
