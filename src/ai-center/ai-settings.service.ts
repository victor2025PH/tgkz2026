/**
 * AI Settings REST Service
 * 
 * P0-2: 前端 AI 設置持久化服務
 * 
 * 職責：
 * - 通過 REST API 與後端通信，實現 AI 設置的 CRUD
 * - 提供模型列表、AI 設置、模型用途的讀寫
 * - 維護「未保存」/「保存中」/「已保存」狀態
 * - 支持批量保存 + 防抖策略
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from '../core/api.service';
import { ToastService } from '../toast.service';

// 保存狀態枚舉
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

// AI 模型接口（REST 格式）
export interface AiModelRest {
  id: number | string;
  provider: string;
  modelName: string;
  displayName: string;
  apiKey: string;
  apiKeyMasked?: string;
  apiEndpoint: string;
  isLocal: boolean;
  isDefault: boolean;
  priority: number;
  isConnected: boolean;
  lastTestedAt?: string;
  config?: Record<string, any>;
}

// AI 設置鍵值
export interface AiSettingsMap {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AiSettingsService {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  // ========== 狀態信號 ==========
  
  /** 模型列表保存狀態 */
  private _modelSaveState = signal<SaveState>('idle');
  modelSaveState = this._modelSaveState.asReadonly();

  /** AI 設置保存狀態 */
  private _settingsSaveState = signal<SaveState>('idle');
  settingsSaveState = this._settingsSaveState.asReadonly();

  /** 最後保存時間戳 */
  private _lastSavedAt = signal<number>(0);
  lastSavedAt = this._lastSavedAt.asReadonly();

  /** 是否有未保存的更改 */
  isDirty = computed(() => 
    this._modelSaveState() === 'dirty' || this._settingsSaveState() === 'dirty'
  );

  /** 是否正在保存 */
  isSaving = computed(() => 
    this._modelSaveState() === 'saving' || this._settingsSaveState() === 'saving'
  );

  /** 最近保存成功 */
  justSaved = computed(() => 
    this._modelSaveState() === 'saved' || this._settingsSaveState() === 'saved'
  );

  // 防抖計時器
  private settingsSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // ========== 模型 CRUD ==========

  /** 獲取用戶的 AI 模型列表 */
  async getModels(): Promise<AiModelRest[]> {
    const res = await this.api.get<AiModelRest[]>('/api/v1/ai/models', { cache: false });
    if (res.success && res.data) {
      return res.data;
    }
    console.warn('[AiSettings] getModels failed:', res.error);
    return [];
  }

  /** 獲取模型列表及後端「已配置」狀態（模型 is_connected 或 ai_settings 有 local_ai_endpoint） */
  async getModelsWithMeta(): Promise<{ models: AiModelRest[]; aiConfigured?: boolean }> {
    const res = await this.api.get<AiModelRest[]>('/api/v1/ai/models', { cache: false });
    const models = res.success && res.data ? res.data : [];
    const aiConfigured = (res as { aiConfigured?: boolean }).aiConfigured;
    return { models, aiConfigured };
  }

  /** 添加新模型 */
  async addModel(model: Partial<AiModelRest>): Promise<{ success: boolean; error?: string }> {
    this._modelSaveState.set('saving');
    const res = await this.api.post('/api/v1/ai/models', {
      provider: model.provider,
      modelName: model.modelName,
      displayName: model.displayName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: model.isLocal ? 1 : 0,
      isDefault: model.isDefault ? 1 : 0,
      priority: model.priority || 0,
    });
    if (res.success) {
      this._modelSaveState.set('saved');
      this._lastSavedAt.set(Date.now());
      this.autoResetSaved('_modelSaveState');
      return { success: true };
    }
    this._modelSaveState.set('error');
    return { success: false, error: res.error };
  }

  /** 更新現有模型 */
  async updateModel(id: number | string, updates: Partial<AiModelRest>): Promise<{ success: boolean; error?: string }> {
    this._modelSaveState.set('saving');
    const body: any = {};
    if (updates.provider !== undefined) body.provider = updates.provider;
    if (updates.modelName !== undefined) body.modelName = updates.modelName;
    if (updates.displayName !== undefined) body.displayName = updates.displayName;
    if (updates.apiKey !== undefined) body.apiKey = updates.apiKey;
    if (updates.apiEndpoint !== undefined) body.apiEndpoint = updates.apiEndpoint;
    if (updates.isLocal !== undefined) body.isLocal = updates.isLocal ? 1 : 0;
    if (updates.isDefault !== undefined) body.isDefault = updates.isDefault ? 1 : 0;
    if (updates.priority !== undefined) body.priority = updates.priority;

    const res = await this.api.put(`/api/v1/ai/models/${id}`, body);
    if (res.success) {
      this._modelSaveState.set('saved');
      this._lastSavedAt.set(Date.now());
      this.autoResetSaved('_modelSaveState');
      return { success: true };
    }
    this._modelSaveState.set('error');
    return { success: false, error: res.error };
  }

  /** 刪除模型 */
  async deleteModel(id: number | string): Promise<{ success: boolean; error?: string }> {
    const res = await this.api.delete(`/api/v1/ai/models/${id}`);
    if (res.success) {
      this.toast.success('模型已刪除');
      return { success: true };
    }
    return { success: false, error: res.error };
  }

  /** 測試模型連接（REST API，後端自動從 DB 補全模型信息） */
  async testModel(id: number | string): Promise<{
    success: boolean;
    isConnected?: boolean;
    latencyMs?: number;
    responsePreview?: string;
    availableModels?: string[];
    modelName?: string;
    error?: string;
  }> {
    const res = await this.api.post<any>(`/api/v1/ai/models/${id}/test`, {});
    if (res.success && res.data) {
      return {
        success: true,
        isConnected: res.data.isConnected,
        latencyMs: res.data.latencyMs,
        responsePreview: res.data.responsePreview,
        availableModels: res.data.availableModels,
        modelName: res.data.modelName,
        error: res.data.error,  // 測試可能成功但連接失敗，error 裡有原因
      };
    }
    return { success: false, error: res.error };
  }

  // ========== AI 設置（通用鍵值對） ==========

  /** 獲取所有 AI 設置 */
  async getSettings(): Promise<AiSettingsMap> {
    const res = await this.api.get<AiSettingsMap>('/api/v1/ai/settings', { cache: false });
    if (res.success && res.data) {
      return res.data;
    }
    return {};
  }

  /** 批量保存 AI 設置（合並到後端，不覆蓋未傳的鍵） */
  async saveSettings(settings: AiSettingsMap): Promise<boolean> {
    this._settingsSaveState.set('saving');
    const res = await this.api.put('/api/v1/ai/settings', { settings });
    if (res.success) {
      this._settingsSaveState.set('saved');
      this._lastSavedAt.set(Date.now());
      this.autoResetSaved('_settingsSaveState');
      return true;
    }
    this._settingsSaveState.set('error');
    this.toast.error('保存設置失敗: ' + (res.error || '未知錯誤'));
    return false;
  }

  /** 防抖保存設置（300ms 延遲） */
  saveSettingsDebounced(settings: AiSettingsMap): void {
    this._settingsSaveState.set('dirty');
    if (this.settingsSaveTimer) clearTimeout(this.settingsSaveTimer);
    this.settingsSaveTimer = setTimeout(() => {
      this.saveSettings(settings);
    }, 300);
  }

  /** 標記有未保存更改 */
  markDirty(target: 'model' | 'settings' = 'settings'): void {
    if (target === 'model') {
      this._modelSaveState.set('dirty');
    } else {
      this._settingsSaveState.set('dirty');
    }
  }

  /** 重置狀態 */
  resetState(): void {
    this._modelSaveState.set('idle');
    this._settingsSaveState.set('idle');
  }

  // ========== 便捷方法：組合保存 ==========

  /** 一鍵保存全部（模型用途 + 通用設置） */
  async saveAll(settings: AiSettingsMap): Promise<boolean> {
    this._settingsSaveState.set('saving');
    const ok = await this.saveSettings(settings);
    if (ok) {
      this.toast.success('所有設置已保存');
    }
    return ok;
  }

  // ========== 內部方法 ==========

  /** 保存成功後 3 秒自動重置為 idle */
  private autoResetSaved(stateField: '_modelSaveState' | '_settingsSaveState'): void {
    setTimeout(() => {
      if (this[stateField]() === 'saved') {
        this[stateField].set('idle');
      }
    }, 3000);
  }
}
