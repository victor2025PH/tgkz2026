/**
 * License Management Service
 * Handles license validation, trial period, and feature restrictions
 */
import { Injectable, signal, computed, WritableSignal } from '@angular/core';

export type LicenseType = 'trial' | 'basic' | 'pro' | 'enterprise';

export interface License {
  type: LicenseType;
  key?: string;
  email?: string;
  expiresAt?: Date;
  maxAccounts: number;
  features: string[];
  activatedAt?: Date;
  machineId?: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
  license?: License;
}

// Feature flags
export interface Features {
  aiAutoReply: boolean;
  multiRole: boolean;
  adBroadcast: boolean;
  analytics: boolean;
  resourceDiscovery: boolean;
  batchOperations: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  unlimitedAccounts: boolean;
  customBranding: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private static readonly STORAGE_KEY = 'tg-matrix-license';
  private static readonly TRIAL_DAYS = 14;
  private static readonly MACHINE_ID_KEY = 'tg-matrix-machine-id';
  
  // License tiers and their features
  private static readonly LICENSE_TIERS: Record<LicenseType, Partial<Features> & { maxAccounts: number }> = {
    trial: {
      maxAccounts: 3,
      aiAutoReply: true,
      multiRole: false,
      adBroadcast: true,
      analytics: true,
      resourceDiscovery: true,
      batchOperations: false,
      apiAccess: false,
      prioritySupport: false,
      unlimitedAccounts: false,
      customBranding: false
    },
    basic: {
      maxAccounts: 5,
      aiAutoReply: true,
      multiRole: false,
      adBroadcast: true,
      analytics: true,
      resourceDiscovery: true,
      batchOperations: true,
      apiAccess: false,
      prioritySupport: false,
      unlimitedAccounts: false,
      customBranding: false
    },
    pro: {
      maxAccounts: 20,
      aiAutoReply: true,
      multiRole: true,
      adBroadcast: true,
      analytics: true,
      resourceDiscovery: true,
      batchOperations: true,
      apiAccess: true,
      prioritySupport: true,
      unlimitedAccounts: false,
      customBranding: false
    },
    enterprise: {
      maxAccounts: 999,
      aiAutoReply: true,
      multiRole: true,
      adBroadcast: true,
      analytics: true,
      resourceDiscovery: true,
      batchOperations: true,
      apiAccess: true,
      prioritySupport: true,
      unlimitedAccounts: true,
      customBranding: true
    }
  };
  
  // Current license state
  private _license: WritableSignal<License | null> = signal(null);
  private _isLoading: WritableSignal<boolean> = signal(true);
  
  // Computed properties
  license = computed(() => this._license());
  isLoading = computed(() => this._isLoading());
  
  isActive = computed(() => {
    const lic = this._license();
    if (!lic) return false;
    if (lic.type === 'trial') {
      return lic.expiresAt ? new Date() < lic.expiresAt : false;
    }
    return lic.expiresAt ? new Date() < lic.expiresAt : true;
  });
  
  daysRemaining = computed(() => {
    const lic = this._license();
    if (!lic || !lic.expiresAt) return 0;
    const diff = lic.expiresAt.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });
  
  features = computed<Features>(() => {
    const lic = this._license();
    const type = lic?.type || 'trial';
    const tier = LicenseService.LICENSE_TIERS[type];
    
    return {
      aiAutoReply: tier.aiAutoReply ?? false,
      multiRole: tier.multiRole ?? false,
      adBroadcast: tier.adBroadcast ?? false,
      analytics: tier.analytics ?? false,
      resourceDiscovery: tier.resourceDiscovery ?? false,
      batchOperations: tier.batchOperations ?? false,
      apiAccess: tier.apiAccess ?? false,
      prioritySupport: tier.prioritySupport ?? false,
      unlimitedAccounts: tier.unlimitedAccounts ?? false,
      customBranding: tier.customBranding ?? false
    };
  });
  
  maxAccounts = computed(() => {
    const lic = this._license();
    const type = lic?.type || 'trial';
    return LicenseService.LICENSE_TIERS[type].maxAccounts;
  });
  
  constructor() {
    this.loadLicense();
  }
  
  /**
   * Load license from storage
   */
  private loadLicense(): void {
    try {
      const stored = localStorage.getItem(LicenseService.STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : undefined;
        parsed.activatedAt = parsed.activatedAt ? new Date(parsed.activatedAt) : undefined;
        this._license.set(parsed);
      } else {
        // First time - start trial
        this.startTrial();
      }
    } catch (e) {
      console.error('Failed to load license:', e);
      this.startTrial();
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Start a new trial period
   */
  startTrial(): void {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + LicenseService.TRIAL_DAYS);
    
    const trial: License = {
      type: 'trial',
      expiresAt: trialEnd,
      maxAccounts: LicenseService.LICENSE_TIERS.trial.maxAccounts,
      features: ['aiAutoReply', 'adBroadcast', 'analytics', 'resourceDiscovery'],
      activatedAt: new Date(),
      machineId: this.getMachineId()
    };
    
    this.saveLicense(trial);
  }
  
  /**
   * Activate a license key
   */
  async activateLicense(key: string, email: string): Promise<LicenseValidationResult> {
    // Validate key format (example: TGMX-XXXX-XXXX-XXXX)
    const keyRegex = /^TGM[XBPE]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyRegex.test(key.toUpperCase())) {
      return {
        valid: false,
        message: '許可證密鑰格式不正確'
      };
    }
    
    // Determine license type from key prefix
    const prefix = key.substring(0, 4).toUpperCase();
    let licenseType: LicenseType = 'basic';
    
    switch (prefix) {
      case 'TGMB': licenseType = 'basic'; break;
      case 'TGMP': licenseType = 'pro'; break;
      case 'TGME': licenseType = 'enterprise'; break;
      default: licenseType = 'basic';
    }
    
    // In production, this would validate against a license server
    // For now, we'll do local validation
    
    // Calculate expiration (1 year from activation)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    
    const tier = LicenseService.LICENSE_TIERS[licenseType];
    
    const license: License = {
      type: licenseType,
      key: key.toUpperCase(),
      email: email,
      expiresAt: expiresAt,
      maxAccounts: tier.maxAccounts,
      features: Object.keys(tier).filter(k => k !== 'maxAccounts' && tier[k as keyof typeof tier] === true),
      activatedAt: new Date(),
      machineId: this.getMachineId()
    };
    
    this.saveLicense(license);
    
    return {
      valid: true,
      message: `${this.getLicenseTypeName(licenseType)} 許可證激活成功！`,
      license
    };
  }
  
  /**
   * Deactivate current license
   */
  deactivateLicense(): void {
    localStorage.removeItem(LicenseService.STORAGE_KEY);
    this.startTrial();
  }
  
  /**
   * Save license to storage
   */
  private saveLicense(license: License): void {
    this._license.set(license);
    localStorage.setItem(LicenseService.STORAGE_KEY, JSON.stringify(license));
  }
  
  /**
   * Get or generate machine ID
   */
  private getMachineId(): string {
    let machineId = localStorage.getItem(LicenseService.MACHINE_ID_KEY);
    
    if (!machineId) {
      // Generate a unique machine ID
      machineId = 'mid-' + this.generateUUID();
      localStorage.setItem(LicenseService.MACHINE_ID_KEY, machineId);
    }
    
    return machineId;
  }
  
  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Get human-readable license type name
   */
  getLicenseTypeName(type: LicenseType): string {
    const names: Record<LicenseType, string> = {
      trial: '試用版',
      basic: '基礎版',
      pro: '專業版',
      enterprise: '企業版'
    };
    return names[type];
  }
  
  /**
   * Check if a feature is available
   */
  hasFeature(feature: keyof Features): boolean {
    if (!this.isActive()) return false;
    return this.features()[feature];
  }
  
  /**
   * Check if can add more accounts
   */
  canAddAccount(currentCount: number): boolean {
    if (!this.isActive()) return false;
    return currentCount < this.maxAccounts();
  }
  
  /**
   * Get upgrade info
   */
  getUpgradeInfo(): { current: LicenseType; next: LicenseType | null; benefits: string[] } {
    const current = this._license()?.type || 'trial';
    
    const upgradeMap: Record<LicenseType, LicenseType | null> = {
      trial: 'basic',
      basic: 'pro',
      pro: 'enterprise',
      enterprise: null
    };
    
    const next = upgradeMap[current];
    const benefits: string[] = [];
    
    if (next) {
      const currentTier = LicenseService.LICENSE_TIERS[current];
      const nextTier = LicenseService.LICENSE_TIERS[next];
      
      if (nextTier.maxAccounts > currentTier.maxAccounts) {
        benefits.push(`支持 ${nextTier.maxAccounts} 個賬戶`);
      }
      if (nextTier.multiRole && !currentTier.multiRole) {
        benefits.push('多角色協作');
      }
      if (nextTier.batchOperations && !currentTier.batchOperations) {
        benefits.push('批量操作');
      }
      if (nextTier.apiAccess && !currentTier.apiAccess) {
        benefits.push('API 訪問');
      }
      if (nextTier.prioritySupport && !currentTier.prioritySupport) {
        benefits.push('優先技術支持');
      }
    }
    
    return { current, next, benefits };
  }
}
