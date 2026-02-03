/**
 * 兌換碼彈窗組件
 * Redeem Code Dialog
 */

import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-redeem-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>🎁 兌換碼</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>
        
        <div class="dialog-body">
          <!-- 輸入框 -->
          <div class="input-group">
            <input 
              type="text" 
              class="code-input"
              [(ngModel)]="code"
              [class.success]="result()?.success"
              [class.error]="result()?.success === false"
              placeholder="請輸入兌換碼"
              maxlength="20"
              (keyup.enter)="redeem()"
            />
          </div>
          
          <!-- 結果提示 -->
          <div class="result" *ngIf="result()">
            <div class="result-icon" [class.success]="result()?.success" [class.error]="!result()?.success">
              {{ result()?.success ? '✓' : '✕' }}
            </div>
            <div class="result-text">
              <div class="message">{{ result()?.message }}</div>
              <div class="detail" *ngIf="result()?.success && result()?.data">
                已到賬 {{ formatAmount(result()?.data?.total || 0) }}
              </div>
            </div>
          </div>
          
          <!-- 說明 -->
          <div class="tips" *ngIf="!result()">
            <div class="tip-item">輸入兌換碼，點擊兌換按鈕</div>
            <div class="tip-item">兌換成功後將自動到賬</div>
            <div class="tip-item">每個兌換碼只能使用一次</div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button 
            class="redeem-btn"
            [disabled]="!code || loading()"
            (click)="redeem()"
          >
            {{ loading() ? '兌換中...' : '立即兌換' }}
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
      max-width: 380px;
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
      font-weight: 600;
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

    .input-group {
      margin-bottom: 20px;
    }

    .code-input {
      width: 100%;
      padding: 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 18px;
      font-family: monospace;
      text-align: center;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .code-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
      font-size: 14px;
      letter-spacing: 0;
    }

    .code-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .code-input.success {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
    }

    .code-input.error {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .result {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .result-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
    }

    .result-icon.success {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .result-icon.error {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .result-text {
      flex: 1;
    }

    .result-text .message {
      font-size: 15px;
      font-weight: 500;
    }

    .result-text .detail {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 4px;
    }

    .tips {
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .tip-item {
      font-size: 13px;
      opacity: 0.6;
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
    }

    .tip-item::before {
      content: '•';
      position: absolute;
      left: 6px;
      color: #667eea;
    }

    .dialog-footer {
      padding: 16px 20px 24px;
    }

    .redeem-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    .redeem-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class RedeemDialogComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() redeemed = new EventEmitter<any>();
  
  code = '';
  loading = signal(false);
  result = signal<any>(null);
  
  constructor(private api: ApiService) {}
  
  async redeem() {
    if (!this.code || this.loading()) return;
    
    this.loading.set(true);
    this.result.set(null);
    
    try {
      const response = await this.api.post<any>('/api/wallet/redeem', {
        code: this.code.trim().toUpperCase()
      });
      
      this.result.set(response);
      
      if (response?.success) {
        this.redeemed.emit(response.data);
      }
      
    } catch (error: any) {
      this.result.set({
        success: false,
        message: error?.error || '兌換失敗，請檢查兌換碼是否正確'
      });
    } finally {
      this.loading.set(false);
    }
  }
  
  formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }
  
  close() {
    this.closed.emit();
  }
}
