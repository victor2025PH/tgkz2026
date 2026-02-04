import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../i18n.service';
import { MembershipLevel } from '../membership.service';

/**
 * 🔧 P1-2: 統一的會員等級徽章組件
 * 
 * 設計原則：
 * 1. 單一數據源 - 從 AuthService 獲取等級
 * 2. 統一樣式 - 所有位置使用相同的顯示邏輯
 * 3. 支持多語言 - 使用 I18nService 翻譯
 * 4. 響應式設計 - 支持不同尺寸
 * 
 * 使用示例：
 * <user-level-badge [level]="'king'" />
 * <user-level-badge [level]="authService.membershipLevel()" size="small" />
 * <user-level-badge [level]="'gold'" [showText]="false" />
 */
@Component({
  selector: 'user-level-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="user-level-badge"
      [class]="badgeClasses()"
      [title]="tooltip()">
      @if (showIcon) {
        <span class="badge-icon" [class.animate-bounce]="level === 'king'" [class.animate-pulse]="level !== 'king' && level !== 'bronze'">
          {{ levelIcon() }}
        </span>
      }
      @if (showText) {
        <span class="badge-text">{{ levelText() }}</span>
      }
    </span>
  `,
  styles: [`
    .user-level-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    /* 尺寸變體 */
    .badge-xs {
      font-size: 10px;
      padding: 1px 4px;
      gap: 2px;
    }
    .badge-sm {
      font-size: 11px;
      padding: 2px 6px;
      gap: 3px;
    }
    .badge-md {
      font-size: 12px;
      padding: 3px 10px;
      gap: 4px;
    }
    .badge-lg {
      font-size: 14px;
      padding: 4px 12px;
      gap: 5px;
    }

    /* 等級顏色 - 青銅戰士 */
    .badge-bronze {
      background: linear-gradient(135deg, #8B6914 0%, #CD853F 100%);
      color: #FFF8DC;
      border: 1px solid rgba(205, 133, 63, 0.5);
    }

    /* 等級顏色 - 白銀精英 */
    .badge-silver {
      background: linear-gradient(135deg, #708090 0%, #C0C0C0 50%, #A8A8A8 100%);
      color: #1a1a2e;
      border: 1px solid rgba(192, 192, 192, 0.5);
      box-shadow: 0 0 8px rgba(192, 192, 192, 0.3);
    }

    /* 等級顏色 - 黃金大師 */
    .badge-gold {
      background: linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #FFA500 100%);
      color: #1a1a2e;
      border: 1px solid rgba(255, 215, 0, 0.5);
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
    }

    /* 等級顏色 - 鑽石王牌 */
    .badge-diamond {
      background: linear-gradient(135deg, #00CED1 0%, #87CEEB 50%, #B9F2FF 100%);
      color: #1a1a2e;
      border: 1px solid rgba(135, 206, 235, 0.5);
      box-shadow: 0 0 12px rgba(0, 206, 209, 0.5);
    }

    /* 等級顏色 - 星耀傳說 */
    .badge-star {
      background: linear-gradient(135deg, #9932CC 0%, #DA70D6 50%, #FF69B4 100%);
      color: #FFFFFF;
      border: 1px solid rgba(218, 112, 214, 0.5);
      box-shadow: 0 0 15px rgba(153, 50, 204, 0.5);
    }

    /* 等級顏色 - 榮耀王者 */
    .badge-king {
      background: linear-gradient(135deg, #FF4500 0%, #FF6347 30%, #FFD700 70%, #FFA500 100%);
      color: #FFFFFF;
      border: 1px solid rgba(255, 215, 0, 0.6);
      box-shadow: 0 0 20px rgba(255, 69, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3);
      animation: king-glow 2s ease-in-out infinite alternate;
    }

    @keyframes king-glow {
      from {
        box-shadow: 0 0 20px rgba(255, 69, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3);
      }
      to {
        box-shadow: 0 0 25px rgba(255, 69, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.5);
      }
    }

    .badge-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .badge-text {
      line-height: 1;
    }

    /* 動畫 */
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    .animate-bounce {
      animation: bounce 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(-10%);
        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
      }
      50% {
        transform: translateY(0);
        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
    }
  `]
})
export class UserLevelBadgeComponent {
  private i18n = inject(I18nService);

  /** 會員等級 */
  @Input() level: MembershipLevel = 'bronze';
  
  /** 尺寸：xs, sm, md, lg */
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
  
  /** 是否顯示圖標 */
  @Input() showIcon = true;
  
  /** 是否顯示文字 */
  @Input() showText = true;

  /** 等級圖標映射 */
  private readonly LEVEL_ICONS: Record<MembershipLevel, string> = {
    bronze: '⚔️',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎',
    star: '🌟',
    king: '👑'
  };

  /** 等級名稱（翻譯鍵） */
  private readonly LEVEL_NAMES: Record<MembershipLevel, string> = {
    bronze: 'membershipLevels.bronze',
    silver: 'membershipLevels.silver',
    gold: 'membershipLevels.gold',
    diamond: 'membershipLevels.diamond',
    star: 'membershipLevels.star',
    king: 'membershipLevels.king'
  };

  /** 計算 CSS 類 */
  badgeClasses = computed(() => {
    return `badge-${this.size} badge-${this.level}`;
  });

  /** 獲取等級圖標 */
  levelIcon = computed(() => {
    return this.LEVEL_ICONS[this.level] || '⚔️';
  });

  /** 獲取等級文字（多語言） */
  levelText = computed(() => {
    const key = this.LEVEL_NAMES[this.level];
    return this.i18n.t(key);
  });

  /** 懸停提示 */
  tooltip = computed(() => {
    return this.levelText();
  });
}

/**
 * 導出等級工具函數，供其他組件使用
 */
export function getLevelIcon(level: MembershipLevel): string {
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

export function getLevelOrder(level: MembershipLevel): number {
  const order: Record<MembershipLevel, number> = {
    bronze: 0,
    silver: 1,
    gold: 2,
    diamond: 3,
    star: 4,
    king: 5
  };
  return order[level] ?? 0;
}

export function isLevelHigherOrEqual(level1: MembershipLevel, level2: MembershipLevel): boolean {
  return getLevelOrder(level1) >= getLevelOrder(level2);
}
