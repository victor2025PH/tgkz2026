/**
 * 🐝 蜂群效應服務
 * Swarm Marketing Service
 * 
 * 管理多角色協作的蜂群模式：
 * - 啟用/禁用群組的蜂群模式
 * - 監控蜂群運行狀態
 * - TTS 語音服務控制
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// 蜂群群組狀態
export interface SwarmGroupState {
  groupId: string;
  groupTitle?: string;
  isActive: boolean;
  lastSpeaker?: string;
  lastSpeakTime?: number;
  contextLength?: number;
  voiceEnabled: boolean;
  cooldownSeconds?: number;
  globalCooldown?: number;
}

// 蜂群響應記錄
export interface SwarmResponseLog {
  id: string;
  timestamp: number;
  groupId: string;
  roleName: string;
  roleType: string;
  responseType: 'text' | 'voice';
  contentPreview: string;
  matchInfo: {
    type: string;
    keywords?: string[];
  };
}

// TTS 服務狀態
export interface TTSStatus {
  endpoint: string;
  connected: boolean;
  lastCheck: number;
  cacheFiles: number;
  cacheSizeMB: number;
}

@Injectable({
  providedIn: 'root'
})
export class SwarmService {
  private ipc = inject(ElectronIpcService);
  
  // 蜂群狀態
  private _enabled = signal(false);
  private _activeGroups = signal<SwarmGroupState[]>([]);
  private _responseLogs = signal<SwarmResponseLog[]>([]);
  private _ttsStatus = signal<TTSStatus | null>(null);
  
  // 統計
  private _stats = signal({
    todayMessages: 0,
    byRole: {} as Record<string, number>,
    activeGroups: 0
  });
  
  // 計算屬性
  enabled = computed(() => this._enabled());
  activeGroups = computed(() => this._activeGroups());
  activeGroupCount = computed(() => this._activeGroups().length);
  responseLogs = computed(() => this._responseLogs());
  ttsStatus = computed(() => this._ttsStatus());
  stats = computed(() => this._stats());
  ttsConnected = computed(() => this._ttsStatus()?.connected ?? false);
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // 蜂群啟用事件
    this.ipc.on('swarm-enabled', (data: any) => {
      if (data.success) {
        this.refreshStatus();
      }
    });
    
    // 蜂群禁用事件
    this.ipc.on('swarm-disabled', (data: any) => {
      if (data.success) {
        this.refreshStatus();
      }
    });
    
    // 蜂群狀態更新
    this.ipc.on('swarm-status', (data: any) => {
      if (data.success) {
        this._enabled.set(data.enabled);
        this._activeGroups.set(data.groups || []);
      }
    });
    
    // 蜂群統計更新
    this.ipc.on('swarm-stats', (data: any) => {
      if (data.success) {
        this._stats.set({
          todayMessages: data.todayMessages || 0,
          byRole: data.byRole || {},
          activeGroups: data.activeGroups || 0
        });
      }
    });
    
    // 蜂群響應事件
    this.ipc.on('swarm-response-sent', (data: any) => {
      const log: SwarmResponseLog = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        groupId: data.groupId,
        roleName: data.roleName,
        roleType: data.roleType,
        responseType: data.responseType,
        contentPreview: data.contentPreview,
        matchInfo: data.matchInfo
      };
      
      this._responseLogs.update(logs => [log, ...logs.slice(0, 99)]);
      
      // 更新統計
      this.refreshStats();
    });
    
    // TTS 連接狀態
    this.ipc.on('tts-connection', (data: any) => {
      if (data.success) {
        this._ttsStatus.set({
          endpoint: data.endpoint,
          connected: data.connected,
          lastCheck: data.lastCheck,
          cacheFiles: data.cacheFiles,
          cacheSizeMB: data.cacheSizeMB
        });
      }
    });
  }
  
  // ========== 蜂群控制 ==========
  
  /**
   * 為群組啟用蜂群模式
   */
  enableSwarmForGroup(groupId: string, config?: {
    cooldownSeconds?: number;
    globalCooldown?: number;
    voiceEnabled?: boolean;
  }) {
    this.ipc.send('swarm-enable-group', {
      groupId,
      config: config || {}
    });
  }
  
  /**
   * 禁用群組的蜂群模式
   */
  disableSwarmForGroup(groupId: string) {
    this.ipc.send('swarm-disable-group', { groupId });
  }
  
  /**
   * 批量啟用蜂群模式
   */
  enableSwarmForGroups(groupIds: string[], config?: {
    cooldownSeconds?: number;
    globalCooldown?: number;
    voiceEnabled?: boolean;
  }) {
    groupIds.forEach(groupId => {
      this.enableSwarmForGroup(groupId, config);
    });
  }
  
  /**
   * 禁用所有群組的蜂群模式
   */
  disableAllSwarm() {
    this._activeGroups().forEach(group => {
      this.disableSwarmForGroup(group.groupId);
    });
  }
  
  /**
   * 刷新蜂群狀態
   */
  refreshStatus() {
    this.ipc.send('swarm-get-status', {});
  }
  
  /**
   * 刷新蜂群統計
   */
  refreshStats() {
    this.ipc.send('swarm-get-stats', {});
  }
  
  /**
   * 測試蜂群響應
   */
  testSwarmResponse(groupId: string, message: {
    text: string;
    userId?: string;
    username?: string;
  }, keywords?: string[]) {
    this.ipc.send('swarm-test-response', {
      groupId,
      message,
      keywords
    });
  }
  
  // ========== TTS 控制 ==========
  
  /**
   * 檢查 TTS 服務連接
   * @param endpoint 可選，TTS 端點地址。如果不提供，從 localStorage 讀取
   */
  checkTTSConnection(endpoint?: string) {
    // 如果沒有傳入端點，從 localStorage 讀取
    const ttsEndpoint = endpoint || localStorage.getItem('tts_endpoint') || '';
    this.ipc.send('tts-check-connection', { endpoint: ttsEndpoint });
  }
  
  /**
   * 更新 TTS 端點地址
   */
  updateTTSEndpoint(endpoint: string) {
    localStorage.setItem('tts_endpoint', endpoint);
    this.ipc.send('update-tts-endpoint', { endpoint });
  }
  
  /**
   * 生成語音
   */
  generateVoice(text: string, roleId?: string, roleVoice?: string): Promise<string | null> {
    return new Promise((resolve) => {
      const handler = (data: any) => {
        this.ipc.removeListener('tts-voice-generated', handler);
        if (data.success) {
          resolve(data.voiceFile);
        } else {
          resolve(null);
        }
      };
      
      this.ipc.on('tts-voice-generated', handler);
      this.ipc.send('tts-generate-voice', { text, roleId, roleVoice });
      
      // 超時處理
      setTimeout(() => {
        this.ipc.removeListener('tts-voice-generated', handler);
        resolve(null);
      }, 60000);
    });
  }
  
  /**
   * 設置角色語音配置
   */
  setVoiceConfig(roleId: string, config: {
    refAudioPath?: string;
    promptText?: string;
    speed?: number;
  }) {
    this.ipc.send('tts-set-voice-config', {
      roleId,
      config: {
        ref_audio_path: config.refAudioPath,
        prompt_text: config.promptText,
        speed: config.speed
      }
    });
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 檢查群組是否啟用蜂群模式
   */
  isGroupEnabled(groupId: string): boolean {
    return this._activeGroups().some(g => g.groupId === groupId && g.isActive);
  }
  
  /**
   * 獲取群組的蜂群狀態
   */
  getGroupState(groupId: string): SwarmGroupState | undefined {
    return this._activeGroups().find(g => g.groupId === groupId);
  }
  
  /**
   * 清除響應日誌
   */
  clearLogs() {
    this._responseLogs.set([]);
  }
  
  /**
   * 獲取角色統計
   */
  getRoleStats(): { role: string; count: number }[] {
    const byRole = this._stats().byRole;
    return Object.entries(byRole)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }
}
