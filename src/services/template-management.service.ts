/**
 * Template Management Service
 * 消息模板管理服務
 * 
 * 🆕 Phase 18: 從 app.component.ts 提取
 * 
 * 管理聊天模板、消息範本的創建、編輯、刪除等功能
 */

import { Injectable, signal, inject, computed } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// 類型定義
export interface MessageTemplate {
  id: number;
  name: string;
  prompt: string;
  content?: string;
  active: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewTemplateForm {
  name: string;
  prompt: string;
}

export interface TemplateVariable {
  name: string;
  placeholder: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class TemplateManagementService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  
  // 狀態
  readonly messageTemplates = signal<MessageTemplate[]>([]);
  readonly selectedTemplate = signal<MessageTemplate | null>(null);
  
  // 表單狀態
  readonly showTemplateCreator = signal(false);
  readonly newTemplate = signal<NewTemplateForm>({ name: '', prompt: '' });
  
  // 計算屬性
  readonly activeTemplates = computed(() => 
    this.messageTemplates().filter(t => t.active)
  );
  
  readonly templateCount = computed(() => this.messageTemplates().length);
  
  // 可用變量列表
  readonly availableVariables: TemplateVariable[] = [
    { name: 'name', placeholder: '{name}', description: '用戶名稱' },
    { name: 'username', placeholder: '{username}', description: '用戶 @username' },
    { name: 'group_name', placeholder: '{group_name}', description: '群組名稱' },
    { name: 'keyword', placeholder: '{keyword}', description: '觸發關鍵詞' },
    { name: 'date', placeholder: '{date}', description: '當前日期' },
    { name: 'time', placeholder: '{time}', description: '當前時間' }
  ];
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ==================== 加載方法 ====================
  
  loadTemplates(): void {
    this.ipcService.send('get-templates', {});
  }
  
  // ==================== 模板操作 ====================
  
  addTemplate(): void {
    const form = this.newTemplate();
    if (form.name.trim() && form.prompt.trim()) {
      this.ipcService.send('add-template', { 
        name: form.name, 
        prompt: form.prompt 
      });
      this.newTemplate.set({ name: '', prompt: '' });
      this.toastService.success('模板添加成功');
    } else {
      this.toastService.error('请填写模板名称和消息内容');
    }
  }
  
  addTemplateQuick(name: string, prompt: string): void {
    if (name?.trim() && prompt?.trim()) {
      // Check if template with same name already exists
      const exists = this.messageTemplates().some(t => t.name === name.trim());
      if (exists) {
        this.toastService.warning('模板名稱已存在，無法創建重複模板', 3000);
        return;
      }
      this.ipcService.send('add-template', { 
        name: name.trim(), 
        prompt: prompt.trim() 
      });
      this.newTemplate.set({ name: '', prompt: '' });
      this.toastService.success('模板添加成功');
      // 自動關閉創建面板（如果已有模板）
      if (this.messageTemplates().length > 0) {
        this.showTemplateCreator.set(false);
      }
    } else {
      this.toastService.error('请填写模板名称和消息内容');
    }
  }
  
  toggleTemplateStatus(templateId: number): void {
    this.ipcService.send('toggle-template-status', { id: templateId });
  }
  
  removeTemplate(templateId: number, campaigns: any[] = []): void {
    const template = this.messageTemplates().find(t => t.id === templateId);
    if (!template) return;
    
    // 檢查是否有活動正在使用此模板
    const usingCampaigns = campaigns.filter(c => 
      c.actions?.some((a: any) => a.templateId === templateId)
    );
    
    if (usingCampaigns.length > 0) {
      const campaignNames = usingCampaigns.map(c => c.name).join(', ');
      if (!confirm(`模板 "${template.name}" 正在被以下活動使用：${campaignNames}\n\n刪除模板後，這些活動將無法正常工作。\n\n確定要刪除嗎？`)) {
        return;
      }
    } else {
      if (!confirm(`確定要刪除模板 "${template.name}" 嗎？此操作不可撤銷。`)) {
        return;
      }
    }
    
    this.ipcService.send('remove-template', { id: templateId });
    this.toastService.success('模板已刪除');
  }
  
  selectTemplate(template: MessageTemplate): void {
    this.selectedTemplate.set(template);
  }
  
  clearSelection(): void {
    this.selectedTemplate.set(null);
  }
  
  // ==================== 表單操作 ====================
  
  updateTemplateName(value: string): void {
    this.newTemplate.update(t => ({ ...t, name: value }));
  }
  
  updateTemplatePrompt(value: string): void {
    this.newTemplate.update(t => ({ ...t, prompt: value }));
  }
  
  insertTemplateVariable(textarea: HTMLTextAreaElement, variable: string): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);
    textarea.value = newText;
    this.updateTemplatePrompt(newText);
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }
  
  openTemplateCreator(): void {
    this.showTemplateCreator.set(true);
    this.newTemplate.set({ name: '', prompt: '' });
  }
  
  closeTemplateCreator(): void {
    this.showTemplateCreator.set(false);
  }
  
  // ==================== 輔助方法 ====================
  
  getTemplateName(id?: number): string {
    if (!id) return 'N/A';
    return this.messageTemplates().find(t => t.id === id)?.name || 'Unknown Template';
  }
  
  getTemplateById(id: number): MessageTemplate | undefined {
    return this.messageTemplates().find(t => t.id === id);
  }
  
  // ==================== IPC 事件處理 ====================
  
  private setupIpcListeners(): void {
    this.ipcService.on('templates-result', (data: any) => this.handleTemplates(data));
    this.ipcService.on('template-added', (data: any) => this.handleTemplateAdded(data));
    this.ipcService.on('template-removed', (data: any) => this.handleTemplateRemoved(data));
    this.ipcService.on('template-status-toggled', (data: any) => this.handleTemplateStatusToggled(data));
  }
  
  private handleTemplates(data: any): void {
    if (data.success || data.templates) {
      this.messageTemplates.set(data.templates || []);
    }
  }
  
  private handleTemplateAdded(data: any): void {
    if (data.success) {
      this.loadTemplates();
    } else {
      this.toastService.error(`添加失敗: ${data.error}`);
    }
  }
  
  private handleTemplateRemoved(data: any): void {
    if (data.success) {
      this.loadTemplates();
    }
  }
  
  private handleTemplateStatusToggled(data: any): void {
    if (data.success) {
      this.loadTemplates();
    }
  }
}
