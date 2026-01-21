/**
 * 通用空狀態組件
 * Empty State Component
 * 
 * 用於顯示列表/數據為空時的引導性 UI
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// 預設空狀態類型
export type EmptyStateType = 
  | 'no-data'       // 無數據
  | 'no-results'    // 搜索無結果
  | 'no-accounts'   // 無帳號
  | 'no-contacts'   // 無聯繫人
  | 'no-messages'   // 無消息
  | 'no-groups'     // 無群組
  | 'error'         // 錯誤狀態
  | 'loading'       // 加載中
  | 'success'       // 成功狀態
  | 'custom';       // 自定義

// 預設配置
interface EmptyStateConfig {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: string;
}

const PRESETS: Record<EmptyStateType, EmptyStateConfig> = {
  'no-data': {
    icon: '📭',
    title: '暫無數據',
    description: '這裡還沒有任何數據',
    actionLabel: '刷新',
    actionIcon: '🔄'
  },
  'no-results': {
    icon: '🔍',
    title: '未找到結果',
    description: '嘗試調整搜索條件或篩選器',
    actionLabel: '清除篩選',
    actionIcon: '✖️'
  },
  'no-accounts': {
    icon: '👤',
    title: '還沒有帳號',
    description: '添加 Telegram 帳號開始使用',
    actionLabel: '添加帳號',
    actionIcon: '➕'
  },
  'no-contacts': {
    icon: '📇',
    title: '還沒有聯繫人',
    description: '從群組提取成員或手動添加聯繫人',
    actionLabel: '提取成員',
    actionIcon: '📥'
  },
  'no-messages': {
    icon: '💬',
    title: '還沒有消息',
    description: '開始發送消息與客戶互動',
    actionLabel: '發送消息',
    actionIcon: '✉️'
  },
  'no-groups': {
    icon: '👥',
    title: '還沒有群組',
    description: '搜索並加入相關群組獲取資源',
    actionLabel: '搜索群組',
    actionIcon: '🔎'
  },
  'error': {
    icon: '⚠️',
    title: '出了點問題',
    description: '請稍後重試或聯繫客服',
    actionLabel: '重試',
    actionIcon: '🔄'
  },
  'loading': {
    icon: '⏳',
    title: '加載中...',
    description: '請稍候，正在獲取數據'
  },
  'success': {
    icon: '✅',
    title: '操作成功',
    description: '任務已完成'
  },
  'custom': {
    icon: '📋',
    title: '自定義標題',
    description: '自定義描述'
  }
};

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state flex flex-col items-center justify-center py-12 px-6 text-center"
         [class.animate-fade-in]="animate()">
      
      <!-- 圖標 -->
      <div class="empty-state-icon mb-6 relative">
        <!-- 背景光暈 -->
        <div class="absolute inset-0 rounded-full blur-2xl opacity-30"
             [style.background]="getGlowColor()">
        </div>
        
        <!-- 圖標容器 -->
        <div class="relative w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
             [style.background]="getBackgroundGradient()">
          @if (isLoading()) {
            <div class="animate-spin text-4xl">⏳</div>
          } @else {
            <span [class.animate-bounce]="animated()">{{ getIcon() }}</span>
          }
        </div>
      </div>
      
      <!-- 標題 -->
      <h3 class="text-xl font-bold mb-2"
          [style.color]="titleColor() || 'var(--text-primary)'">
        {{ getTitle() }}
      </h3>
      
      <!-- 描述 -->
      <p class="text-sm max-w-sm mb-6"
         [style.color]="descriptionColor() || 'var(--text-muted)'">
        {{ getDescription() }}
      </p>
      
      <!-- 操作按鈕 -->
      @if (showAction() && getActionLabel()) {
        <button 
          (click)="onAction()"
          [disabled]="actionDisabled()"
          class="px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          [style.background]="getActionBackground()"
          [style.color]="actionTextColor() || 'white'">
          @if (getActionIcon()) {
            <span>{{ getActionIcon() }}</span>
          }
          {{ getActionLabel() }}
        </button>
      }
      
      <!-- 次要操作 -->
      @if (secondaryActionLabel()) {
        <button 
          (click)="onSecondaryAction()"
          class="mt-3 px-4 py-2 text-sm transition-colors hover:underline"
          [style.color]="'var(--text-muted)'">
          {{ secondaryActionLabel() }}
        </button>
      }
      
      <!-- 額外內容插槽 -->
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state {
      min-height: 300px;
    }
    
    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
    
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-bounce {
      animation: gentle-bounce 2s ease-in-out infinite;
    }
    
    @keyframes gentle-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
  `]
})
export class EmptyStateComponent {
  // 預設類型
  type = input<EmptyStateType>('no-data');
  
  // 自定義配置（覆蓋預設）
  icon = input<string>();
  title = input<string>();
  description = input<string>();
  actionLabel = input<string>();
  actionIcon = input<string>();
  
  // 樣式配置
  titleColor = input<string>();
  descriptionColor = input<string>();
  actionBackground = input<string>();
  actionTextColor = input<string>();
  
  // 行為配置
  animate = input(true);
  animated = input(true);      // 圖標動畫
  showAction = input(true);
  actionDisabled = input(false);
  
  // 次要操作
  secondaryActionLabel = input<string>();
  
  // 事件
  action = output<void>();
  secondaryAction = output<void>();
  
  // 計算是否為加載狀態
  isLoading(): boolean {
    return this.type() === 'loading';
  }
  
  // 獲取配置
  private getConfig(): EmptyStateConfig {
    return PRESETS[this.type()] || PRESETS['no-data'];
  }
  
  getIcon(): string {
    return this.icon() || this.getConfig().icon;
  }
  
  getTitle(): string {
    return this.title() || this.getConfig().title;
  }
  
  getDescription(): string {
    return this.description() || this.getConfig().description;
  }
  
  getActionLabel(): string | undefined {
    return this.actionLabel() || this.getConfig().actionLabel;
  }
  
  getActionIcon(): string | undefined {
    return this.actionIcon() || this.getConfig().actionIcon;
  }
  
  // 獲取背景漸變
  getBackgroundGradient(): string {
    const gradients: Partial<Record<EmptyStateType, string>> = {
      'no-data': 'linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(71, 85, 105, 0.3))',
      'no-results': 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.3))',
      'no-accounts': 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.3))',
      'no-contacts': 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3))',
      'no-messages': 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.3))',
      'no-groups': 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.3))',
      'error': 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3))',
      'loading': 'linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(71, 85, 105, 0.3))',
      'success': 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3))'
    };
    return gradients[this.type()] || gradients['no-data']!;
  }
  
  // 獲取光暈顏色
  getGlowColor(): string {
    const colors: Partial<Record<EmptyStateType, string>> = {
      'no-data': 'rgb(100, 116, 139)',
      'no-results': 'rgb(234, 179, 8)',
      'no-accounts': 'rgb(59, 130, 246)',
      'no-contacts': 'rgb(34, 197, 94)',
      'no-messages': 'rgb(168, 85, 247)',
      'no-groups': 'rgb(6, 182, 212)',
      'error': 'rgb(239, 68, 68)',
      'success': 'rgb(34, 197, 94)'
    };
    return colors[this.type()] || colors['no-data']!;
  }
  
  // 獲取按鈕背景
  getActionBackground(): string {
    if (this.actionBackground()) return this.actionBackground()!;
    
    const backgrounds: Partial<Record<EmptyStateType, string>> = {
      'no-data': 'linear-gradient(135deg, #64748b, #475569)',
      'no-results': 'linear-gradient(135deg, #eab308, #ca8a04)',
      'no-accounts': 'linear-gradient(135deg, #3b82f6, #2563eb)',
      'no-contacts': 'linear-gradient(135deg, #22c55e, #16a34a)',
      'no-messages': 'linear-gradient(135deg, #a855f7, #8b5cf6)',
      'no-groups': 'linear-gradient(135deg, #06b6d4, #0891b2)',
      'error': 'linear-gradient(135deg, #ef4444, #dc2626)',
      'success': 'linear-gradient(135deg, #22c55e, #16a34a)'
    };
    return backgrounds[this.type()] || backgrounds['no-data']!;
  }
  
  // 事件處理
  onAction(): void {
    this.action.emit();
  }
  
  onSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}
