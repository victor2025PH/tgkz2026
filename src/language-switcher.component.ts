/**
 * Language Switcher Component
 * 語言切換器組件 - 緊湊版
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, SupportedLocale, SUPPORTED_LOCALES } from './i18n.service';

@Component({
  selector: 'app-language-switcher-compact',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <div class="current-language" (click)="toggleDropdown()">
        <span class="flag">{{ i18n.currentLocaleInfo().flag }}</span>
        <span class="lang-name">{{ i18n.currentLocaleInfo().nativeName }}</span>
        <span class="arrow" [class.open]="isOpen">▼</span>
      </div>
      
      @if (isOpen) {
        <div class="dropdown">
          @for (locale of locales; track locale.code) {
            <div 
              class="option"
              [class.active]="locale.code === i18n.locale()"
              (click)="selectLocale(locale.code)">
              <span class="flag">{{ locale.flag }}</span>
              <span class="name">{{ locale.nativeName }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .language-switcher {
      position: relative;
      display: inline-block;
    }
    
    .current-language {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--card-bg, #1e1e2e);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .current-language:hover {
      background: var(--hover-bg, #2a2a3a);
    }
    
    .flag {
      font-size: 18px;
    }
    
    .lang-name {
      font-size: 14px;
      color: var(--text-color, #fff);
    }
    
    .arrow {
      font-size: 10px;
      color: var(--text-muted, #888);
      transition: transform 0.2s ease;
    }
    
    .arrow.open {
      transform: rotate(180deg);
    }
    
    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--card-bg, #1e1e2e);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      overflow: hidden;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .option:hover {
      background: var(--hover-bg, #2a2a3a);
    }
    
    .option.active {
      background: var(--primary-color, #7c3aed);
    }
    
    .option .name {
      font-size: 14px;
      color: var(--text-color, #fff);
    }
  `]
})
export class LanguageSwitcherCompactComponent {
  readonly i18n = inject(I18nService);
  readonly locales = SUPPORTED_LOCALES;
  
  isOpen = false;
  
  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }
  
  selectLocale(code: SupportedLocale): void {
    this.i18n.setLocale(code);
    this.isOpen = false;
  }
}
