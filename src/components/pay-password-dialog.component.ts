/**
 * 支付密碼設置彈窗
 * Pay Password Dialog
 */

import { Component, EventEmitter, Input, Output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

type DialogMode = 'set' | 'verify' | 'change' | 'remove';

@Component({
  selector: 'app-pay-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ getTitle() }}</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>
        
        <div class="dialog-body">
          <!-- 設置密碼 -->
          <ng-container *ngIf="mode === 'set'">
            <p class="description">請設置6位數字支付密碼</p>
            <div class="password-input-group">
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="password"
                maxlength="6"
                placeholder="輸入支付密碼"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </div>
            <div class="password-input-group">
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="confirmPassword"
                maxlength="6"
                placeholder="確認支付密碼"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </div>
          </ng-container>
          
          <!-- 驗證密碼 -->
          <ng-container *ngIf="mode === 'verify'">
            <p class="description">請輸入支付密碼</p>
            <div class="password-input-group">
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="password"
                maxlength="6"
                placeholder="輸入支付密碼"
                inputmode="numeric"
                pattern="[0-9]*"
                (keyup.enter)="submit()"
              />
            </div>
          </ng-container>
          
          <!-- 修改密碼 -->
          <ng-container *ngIf="mode === 'change'">
            <div class="password-input-group">
              <label>舊密碼</label>
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="oldPassword"
                maxlength="6"
                placeholder="輸入舊密碼"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </div>
            <div class="password-input-group">
              <label>新密碼</label>
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="password"
                maxlength="6"
                placeholder="輸入新密碼"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </div>
            <div class="password-input-group">
              <label>確認新密碼</label>
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="confirmPassword"
                maxlength="6"
                placeholder="確認新密碼"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </div>
          </ng-container>
          
          <!-- 移除密碼 -->
          <ng-container *ngIf="mode === 'remove'">
            <p class="description warning">⚠️ 移除支付密碼後，大額消費將無需驗證</p>
            <div class="password-input-group">
              <input 
                type="password" 
                class="password-input"
                [(ngModel)]="password"
                maxlength="6"
                placeholder="輸入支付密碼確認"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </div>
          </ng-container>
          
          <!-- 錯誤提示 -->
          <div class="error-msg" *ngIf="error()">{{ error() }}</div>
        </div>
        
        <div class="dialog-footer">
          <button 
            class="cancel-btn"
            (click)="close()"
          >
            取消
          </button>
          <button 
            class="submit-btn"
            [class.danger]="mode === 'remove'"
            [disabled]="!canSubmit() || loading()"
            (click)="submit()"
          >
            {{ loading() ? '處理中...' : getSubmitText() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .dialog {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 20px;
      width: 100%;
      max-width: 360px;
      overflow: hidden;
      color: #fff;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }

    .dialog-body {
      padding: 24px 20px;
    }

    .description {
      text-align: center;
      font-size: 14px;
      opacity: 0.8;
      margin: 0 0 20px 0;
    }

    .description.warning {
      color: #f59e0b;
      opacity: 1;
    }

    .password-input-group {
      margin-bottom: 16px;
    }

    .password-input-group label {
      display: block;
      font-size: 13px;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .password-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 20px;
      text-align: center;
      letter-spacing: 8px;
    }

    .password-input::placeholder {
      font-size: 14px;
      letter-spacing: 0;
    }

    .password-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .error-msg {
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #ef4444;
      font-size: 13px;
      text-align: center;
    }

    .dialog-footer {
      display: flex;
      gap: 12px;
      padding: 16px 20px 24px;
    }

    .cancel-btn, .submit-btn {
      flex: 1;
      padding: 14px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }

    .cancel-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
    }

    .submit-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: #fff;
    }

    .submit-btn.danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class PayPasswordDialogComponent implements OnInit {
  @Input() mode: DialogMode = 'set';
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<boolean>();
  
  password = '';
  confirmPassword = '';
  oldPassword = '';
  
  loading = signal(false);
  error = signal('');
  
  constructor(private api: ApiService) {}
  
  ngOnInit() {
    this.error.set('');
  }
  
  getTitle(): string {
    const titles: Record<DialogMode, string> = {
      set: '設置支付密碼',
      verify: '驗證支付密碼',
      change: '修改支付密碼',
      remove: '移除支付密碼'
    };
    return titles[this.mode];
  }
  
  getSubmitText(): string {
    const texts: Record<DialogMode, string> = {
      set: '設置',
      verify: '確認',
      change: '修改',
      remove: '移除'
    };
    return texts[this.mode];
  }
  
  canSubmit(): boolean {
    if (this.mode === 'set') {
      return this.password.length === 6 && this.confirmPassword.length === 6;
    } else if (this.mode === 'change') {
      return this.oldPassword.length === 6 && 
             this.password.length === 6 && 
             this.confirmPassword.length === 6;
    } else {
      return this.password.length === 6;
    }
  }
  
  async submit() {
    if (!this.canSubmit() || this.loading()) return;
    
    this.error.set('');
    
    // 驗證
    if (this.mode === 'set' || this.mode === 'change') {
      if (this.password !== this.confirmPassword) {
        this.error.set('兩次輸入的密碼不一致');
        return;
      }
      if (!/^\d{6}$/.test(this.password)) {
        this.error.set('密碼必須為6位數字');
        return;
      }
    }
    
    this.loading.set(true);
    
    try {
      let response: any;
      
      if (this.mode === 'set') {
        response = await this.api.post('/api/wallet/pay-password/set', {
          password: this.password
        });
      } else if (this.mode === 'verify') {
        response = await this.api.post('/api/wallet/pay-password/verify', {
          password: this.password
        });
      } else if (this.mode === 'change') {
        response = await this.api.post('/api/wallet/pay-password/change', {
          old_password: this.oldPassword,
          new_password: this.password
        });
      } else if (this.mode === 'remove') {
        response = await this.api.post('/api/wallet/pay-password/remove', {
          password: this.password
        });
      }
      
      if (response?.success) {
        this.completed.emit(true);
      } else {
        this.error.set(response?.error || '操作失敗');
      }
      
    } catch (error: any) {
      this.error.set(error?.error || '操作失敗');
    } finally {
      this.loading.set(false);
    }
  }
  
  close() {
    this.closed.emit();
  }
}
