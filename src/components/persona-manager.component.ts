/**
 * AI 人設管理組件（管理彈窗 + 編輯器彈窗）
 * 從 account-card-list.component 拆出：選擇/創建/編輯/刪除人設。
 * 數據一律走 PersonaService；「使用」動作只上拋 personaId，
 * 寫入帳號還是編輯表單由調用方決定（取代原先的方法猴子補丁）。
 */
import { Component, ChangeDetectionStrategy, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast.service';
import { PersonaService, AIPersona } from '../services/persona.service';

@Component({
  selector: 'app-persona-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <div class="modal-overlay" (click)="closed.emit()"></div>
      <div class="modal-container persona-manager-modal">
        <div class="modal-header">
          <h3>🤖 AI 人設管理</h3>
          <button (click)="closed.emit()" class="close-btn">×</button>
        </div>

        <div class="modal-content">
          <div class="persona-tabs">
            <button
              [class.active]="personaTab() === 'templates'"
              (click)="personaTab.set('templates')">
              📋 模板庫
            </button>
            <button
              [class.active]="personaTab() === 'custom'"
              (click)="personaTab.set('custom')">
              ✏️ 自定義
            </button>
          </div>

          @if (personaTab() === 'templates') {
            <div class="persona-grid">
              @for (persona of personaService.personas(); track persona.id) {
                @if (!persona.isCustom) {
                  <div
                    class="persona-card"
                    [class.selected]="selectedPersonaId() === persona.id"
                    (click)="selectedPersonaId.set(persona.id)">
                    <div class="persona-icon">{{ persona.icon }}</div>
                    <div class="persona-info">
                      <div class="persona-name">{{ persona.name }}</div>
                      <div class="persona-desc">{{ persona.description }}</div>
                    </div>
                    <div class="persona-meta">
                      <span class="meta-tag">創意: {{ persona.creativity }}%</span>
                      <span class="meta-tag">{{ getToneName(persona.tone) }}</span>
                    </div>
                  </div>
                }
              }
            </div>
          }

          @if (personaTab() === 'custom') {
            <div class="custom-persona-section">
              <button (click)="startNewPersona()" class="btn-new-persona">
                ➕ 创建新人設
              </button>

              <div class="custom-persona-list">
                @for (persona of personaService.customPersonas(); track persona.id) {
                  <div
                    class="persona-card horizontal"
                    [class.selected]="selectedPersonaId() === persona.id"
                    (click)="selectedPersonaId.set(persona.id)">
                    <div class="persona-icon">{{ persona.icon }}</div>
                    <div class="persona-info">
                      <div class="persona-name">{{ persona.name }}</div>
                      <div class="persona-desc">{{ persona.description }}</div>
                    </div>
                    <div class="persona-actions">
                      <button (click)="editPersona(persona); $event.stopPropagation()" class="icon-btn">✏️</button>
                      <button (click)="deletePersona(persona.id); $event.stopPropagation()" class="icon-btn danger">🗑️</button>
                    </div>
                  </div>
                }
                @if (personaService.customPersonas().length === 0) {
                  <div class="empty-note">暂无自定義人設，点击上方按鈕创建</div>
                }
              </div>
            </div>
          }
        </div>

        <div class="modal-footer">
          <button (click)="closed.emit()" class="btn-cancel">取消</button>
          @if (selectedPersonaId()) {
            <button (click)="applied.emit(selectedPersonaId()!)" class="btn-save">
              ✓ 使用「{{ personaService.getById(selectedPersonaId()!)?.name }}」
            </button>
          }
        </div>
      </div>
    }

    <!-- 人設编辑弹窗 -->
    @if (showPersonaEditor()) {
      <div class="modal-overlay" (click)="closePersonaEditor()"></div>
      <div class="modal-container persona-editor-modal">
        <div class="modal-header">
          <h3>{{ editingPersona()?.id ? '✏️ 编辑人設' : '➕ 创建人設' }}</h3>
          <button (click)="closePersonaEditor()" class="close-btn">×</button>
        </div>

        <div class="modal-content">
          <div class="persona-form">
            <div class="form-row">
              <div class="form-group" style="flex: 0 0 80px">
                <label>图标</label>
                <input type="text" [(ngModel)]="personaForm.icon" class="icon-input" maxlength="2">
              </div>
              <div class="form-group flex-2">
                <label>人設名稱</label>
                <input type="text" [(ngModel)]="personaForm.name" placeholder="例如：专业銷售">
              </div>
            </div>

            <div class="form-group">
              <label>简短描述</label>
              <input type="text" [(ngModel)]="personaForm.description" placeholder="一句話描述这个人設的特點">
            </div>

            <div class="form-group">
              <label>系統提示詞 (System Prompt)</label>
              <textarea
                [(ngModel)]="personaForm.systemPrompt"
                placeholder="描述 AI 的角色、性格、目標和行為準則..."
                rows="6"></textarea>
              <p class="form-hint">這是 AI 的「性格说明书」，决定了 AI 如何回应用戶</p>
            </div>

            <div class="form-group">
              <label>開場白（可選）</label>
              <input type="text" [(ngModel)]="personaForm.greeting" placeholder="AI 主動發起对话時的第一句話">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>創造力 {{ personaForm.creativity }}%</label>
                <input type="range" [(ngModel)]="personaForm.creativity" min="0" max="100" step="5">
                <p class="form-hint">越高越有創意，越低越穩定</p>
              </div>
              <div class="form-group">
                <label>回复長度</label>
                <select [(ngModel)]="personaForm.responseLength">
                  <option value="short">简短</option>
                  <option value="medium">適中</option>
                  <option value="long">详细</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>語氣风格</label>
                <select [(ngModel)]="personaForm.tone">
                  <option value="formal">正式</option>
                  <option value="professional">专业</option>
                  <option value="friendly">友善</option>
                  <option value="casual">輕鬆</option>
                </select>
              </div>
              <div class="form-group">
                <label>语言</label>
                <select [(ngModel)]="personaForm.language">
                  <option value="zh-TW">繁体中文</option>
                  <option value="zh-CN">簡體中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="personaForm.enableEmoji">
                  <span>使用表情符号</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>屏蔽关鍵詞（一行一個）</label>
              <textarea
                [(ngModel)]="personaForm.blockKeywordsText"
                placeholder="包含這些关鍵詞的消息不自动回复"
                rows="3"></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closePersonaEditor()" class="btn-cancel">取消</button>
          <button (click)="savePersona()" class="btn-save" [disabled]="!personaForm.name || !personaForm.systemPrompt">
            💾 保存人設
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      backdrop-filter: blur(4px);
    }
    .modal-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 560px;
      max-width: 95vw;
      max-height: 90vh;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 1rem;
      z-index: 101;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-default);
    }
    .modal-header h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 1.125rem;
    }
    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-default);
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
    }
    .btn-cancel {
      padding: 0.625rem 1.25rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      border-radius: 0.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel:hover {
      background: var(--bg-secondary);
    }
    .btn-save {
      padding: 0.625rem 1.25rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-save:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }
    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .persona-manager-modal {
      width: 720px;
      max-height: 85vh;
    }
    .persona-editor-modal {
      width: 600px;
      max-height: 90vh;
    }
    .persona-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-default);
    }
    .persona-tabs button {
      padding: 0.5rem 1rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      border-radius: 0.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .persona-tabs button:hover {
      border-color: var(--primary);
    }
    .persona-tabs button.active {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
      border-color: var(--primary);
      color: var(--primary);
    }
    .persona-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      max-height: 400px;
      overflow-y: auto;
    }
    .persona-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--bg-tertiary);
      border: 2px solid transparent;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .persona-card:hover {
      border-color: var(--border-default);
    }
    .persona-card.selected {
      border-color: var(--primary);
      background: rgba(6, 182, 212, 0.1);
    }
    .persona-card.horizontal {
      flex-direction: row;
      align-items: center;
    }
    .persona-icon {
      font-size: 2rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-card);
      border-radius: 0.5rem;
    }
    .persona-info {
      flex: 1;
    }
    .persona-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    .persona-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }
    .persona-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .meta-tag {
      padding: 0.125rem 0.375rem;
      background: var(--bg-card);
      border-radius: 0.25rem;
      font-size: 0.625rem;
      color: var(--text-secondary);
    }
    .persona-actions {
      display: flex;
      gap: 0.25rem;
    }
    .icon-btn {
      padding: 0.375rem 0.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: 0.25rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .icon-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .icon-btn.danger:hover {
      border-color: #ef4444;
      color: #ef4444;
    }
    .custom-persona-section {
      padding: 1rem 1.5rem;
    }
    .btn-new-persona {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
      border: 1px dashed var(--primary);
      border-radius: 0.5rem;
      color: var(--primary);
      cursor: pointer;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .btn-new-persona:hover {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3));
    }
    .custom-persona-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
    }
    .empty-note {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }
    .persona-form {
      padding: 1rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .icon-input {
      text-align: center;
      font-size: 1.5rem !important;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    .form-group input[type="text"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-default);
      border-radius: 0.5rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .form-group {
      flex: 1;
    }
    .form-row .form-group.flex-2 { flex: 2; }
    .form-hint {
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .checkbox-label {
      display: flex !important;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }
  `]
})
export class PersonaManagerComponent {
  personaService = inject(PersonaService);
  private toast = inject(ToastService);

  /** 是否顯示管理彈窗（父組件控制） */
  visible = input<boolean>(false);
  /** 打開時預選的人設 ID（如帳號已有人設） */
  initialPersonaId = input<string | null>(null);

  closed = output<void>();
  /** 用戶點「使用」：上拋 personaId，寫入目標由父組件決定 */
  applied = output<string>();

  personaTab = signal<'templates' | 'custom'>('templates');
  selectedPersonaId = signal<string | null>(null);
  showPersonaEditor = signal(false);
  editingPersona = signal<AIPersona | null>(null);
  personaForm = this.getDefaultPersonaForm();

  constructor() {
    this.personaService.load();
    // 每次打開時同步預選項並重置 tab
    effect(() => {
      if (this.visible()) {
        this.selectedPersonaId.set(this.initialPersonaId());
        this.personaTab.set('templates');
      }
    });
  }

  getToneName(tone: string): string {
    const toneMap: Record<string, string> = {
      formal: '正式',
      professional: '专业',
      friendly: '友善',
      casual: '輕鬆'
    };
    return toneMap[tone] || tone;
  }

  private getDefaultPersonaForm() {
    return {
      id: '',
      name: '',
      icon: '🤖',
      description: '',
      systemPrompt: '',
      greeting: '',
      creativity: 50,
      responseLength: 'medium' as 'short' | 'medium' | 'long',
      tone: 'friendly' as 'formal' | 'casual' | 'friendly' | 'professional',
      language: 'zh-TW',
      enableEmoji: true,
      blockKeywordsText: ''
    };
  }

  startNewPersona(): void {
    this.personaForm = this.getDefaultPersonaForm();
    this.editingPersona.set(null);
    this.showPersonaEditor.set(true);
  }

  editPersona(persona: AIPersona): void {
    this.personaForm = {
      id: persona.id,
      name: persona.name,
      icon: persona.icon,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      greeting: persona.greeting || '',
      creativity: persona.creativity,
      responseLength: persona.responseLength,
      tone: persona.tone,
      language: persona.language,
      enableEmoji: persona.enableEmoji,
      blockKeywordsText: persona.blockKeywords.join('\n')
    };
    this.editingPersona.set(persona);
    this.showPersonaEditor.set(true);
  }

  closePersonaEditor(): void {
    this.showPersonaEditor.set(false);
    this.editingPersona.set(null);
    this.personaForm = this.getDefaultPersonaForm();
  }

  savePersona(): void {
    const isEdit = !!this.editingPersona();
    this.personaService.upsert({
      id: this.personaForm.id || 'custom_' + Date.now(),
      name: this.personaForm.name,
      icon: this.personaForm.icon || '🤖',
      description: this.personaForm.description,
      systemPrompt: this.personaForm.systemPrompt,
      greeting: this.personaForm.greeting,
      creativity: this.personaForm.creativity,
      responseLength: this.personaForm.responseLength,
      tone: this.personaForm.tone,
      language: this.personaForm.language,
      enableEmoji: this.personaForm.enableEmoji,
      blockKeywords: this.personaForm.blockKeywordsText.split('\n').filter(k => k.trim()),
      isCustom: true
    });
    this.toast.success(isEdit ? '人設已更新' : '人設已创建');
    this.closePersonaEditor();
  }

  deletePersona(personaId: string): void {
    if (confirm('确定要删除这个人設嗎？')) {
      this.personaService.delete(personaId);
      if (this.selectedPersonaId() === personaId) {
        this.selectedPersonaId.set(null);
      }
      this.toast.success('人設已删除');
    }
  }
}
