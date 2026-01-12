/**
 * Language Switcher Component
 * 語言切換組件
 */
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, SupportedLocale, SUPPORTED_LOCALES } from './i18n.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- 觸發按鈕 -->
      <button (click)="toggleDropdown()"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
              style="background-color: var(--bg-card); border-color: var(--border-default); color: var(--text-secondary);">
        <span class="text-lg">{{ currentLocale().flag }}</span>
        <span class="text-sm">{{ currentLocale().nativeName }}</span>
        <svg class="w-4 h-4 transition-transform" 
             [class.rotate-180]="isOpen()"
             style="color: var(--text-muted);"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      
      <!-- 下拉選單 -->
      @if(isOpen()) {
        <div class="absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden"
             style="background-color: var(--bg-card); border: 1px solid var(--border-default);">
          @for(locale of locales; track locale.code) {
            <button (click)="selectLocale(locale.code)"
                    class="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    [style.background-color]="locale.code === i18n.locale() ? 'var(--primary-bg)' : 'transparent'"
                    style="color: var(--text-primary);">
              <span class="text-xl">{{ locale.flag }}</span>
              <div class="flex-1">
                <div class="font-medium" style="color: var(--text-primary);">{{ locale.nativeName }}</div>
                <div class="text-xs" style="color: var(--text-muted);">{{ locale.name }}</div>
              </div>
              @if(locale.code === i18n.locale()) {
                <svg class="w-5 h-5" style="color: var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              }
            </button>
          }
        </div>
      }
    </div>
    
    <!-- 點擊外部關閉 -->
    @if(isOpen()) {
      <div class="fixed inset-0 z-40" (click)="closeDropdown()"></div>
    }
  `
})
export class LanguageSwitcherComponent {
  i18n = inject(I18nService);
  
  isOpen = signal(false);
  locales = SUPPORTED_LOCALES;
  
  currentLocale = computed(() => this.i18n.currentLocaleInfo());
  
  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }
  
  closeDropdown(): void {
    this.isOpen.set(false);
  }
  
  selectLocale(code: SupportedLocale): void {
    this.i18n.setLocale(code);
    this.closeDropdown();
  }
}

/**
 * Compact Language Switcher (for footer/sidebar)
 * 緊湊型語言切換器
 */
@Component({
  selector: 'app-language-switcher-compact',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1">
      @for(locale of locales; track locale.code) {
        <button (click)="selectLocale(locale.code)"
                [title]="locale.nativeName"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                [style.background-color]="locale.code === i18n.locale() ? 'var(--primary-bg)' : 'transparent'"
                [style.box-shadow]="locale.code === i18n.locale() ? '0 0 0 1px var(--primary)' : 'none'">
          <span class="text-base">{{ locale.flag }}</span>
        </button>
      }
    </div>
  `
})
export class LanguageSwitcherCompactComponent {
  i18n = inject(I18nService);
  locales = SUPPORTED_LOCALES;
  
  selectLocale(code: SupportedLocale): void {
    this.i18n.setLocale(code);
  }
}

/**
 * Translate Pipe
 * 翻譯管道
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false  // 設為 false 以響應語言變化
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);
  
  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

/**
 * Translate Directive
 * 翻譯指令
 */
import { Directive, ElementRef, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[translate]',
  standalone: true
})
export class TranslateDirective implements OnInit, OnChanges {
  private i18n = inject(I18nService);
  private el = inject(ElementRef);
  
  @Input('translate') key = '';
  @Input() translateParams?: Record<string, string | number>;
  
  ngOnInit(): void {
    this.updateText();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['key'] || changes['translateParams']) {
      this.updateText();
    }
  }
  
  private updateText(): void {
    if (this.key) {
      this.el.nativeElement.textContent = this.i18n.t(this.key, this.translateParams);
    }
  }
}
