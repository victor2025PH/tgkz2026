import {
  RouterModule,
  RouterOutlet
} from "./chunk-T45T4QAG.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/auth/auth-layout.component.ts
var AuthLayoutComponent = class _AuthLayoutComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.currentLocale = this.i18n.locale;
  }
  t(key, params) {
    return this.i18n.t(key, params);
  }
  setLocale(locale) {
    this.i18n.setLocale(locale);
  }
  static {
    this.\u0275fac = function AuthLayoutComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AuthLayoutComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AuthLayoutComponent, selectors: [["app-auth-layout"]], decls: 50, vars: 14, consts: [[1, "auth-container"], [1, "lang-switcher"], [1, "lang-btn", 3, "click"], [1, "auth-brand"], [1, "brand-content"], [1, "logo"], [1, "logo-icon"], [1, "logo-text"], [1, "brand-title"], [1, "brand-desc"], [1, "features"], [1, "feature-item"], [1, "feature-icon"], [1, "feature-text"], [1, "brand-footer"], [1, "auth-form-area"], [1, "form-container"]], template: function AuthLayoutComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "button", 2);
        \u0275\u0275listener("click", function AuthLayoutComponent_Template_button_click_2_listener() {
          return ctx.setLocale("zh-TW");
        });
        \u0275\u0275text(3, "\u7E41");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "button", 2);
        \u0275\u0275listener("click", function AuthLayoutComponent_Template_button_click_4_listener() {
          return ctx.setLocale("zh-CN");
        });
        \u0275\u0275text(5, "\u7B80");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "button", 2);
        \u0275\u0275listener("click", function AuthLayoutComponent_Template_button_click_6_listener() {
          return ctx.setLocale("en");
        });
        \u0275\u0275text(7, "EN");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(8, "div", 3)(9, "div", 4)(10, "div", 5)(11, "span", 6);
        \u0275\u0275text(12, "\u{1F4F1}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "span", 7);
        \u0275\u0275text(14, "TG-Matrix");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(15, "h1", 8);
        \u0275\u0275text(16);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(17, "p", 9);
        \u0275\u0275text(18);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "div", 10)(20, "div", 11)(21, "span", 12);
        \u0275\u0275text(22, "\u{1F916}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(23, "div", 13)(24, "strong");
        \u0275\u0275text(25);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "span");
        \u0275\u0275text(27);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(28, "div", 11)(29, "span", 12);
        \u0275\u0275text(30, "\u{1F4CA}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "div", 13)(32, "strong");
        \u0275\u0275text(33);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "span");
        \u0275\u0275text(35);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(36, "div", 11)(37, "span", 12);
        \u0275\u0275text(38, "\u{1F512}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(39, "div", 13)(40, "strong");
        \u0275\u0275text(41);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "span");
        \u0275\u0275text(43);
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(44, "div", 14)(45, "p");
        \u0275\u0275text(46, "\xA9 2026 TG-Matrix. All rights reserved.");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(47, "div", 15)(48, "div", 16);
        \u0275\u0275element(49, "router-outlet");
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(2);
        \u0275\u0275classProp("active", ctx.currentLocale() === "zh-TW");
        \u0275\u0275advance(2);
        \u0275\u0275classProp("active", ctx.currentLocale() === "zh-CN");
        \u0275\u0275advance(2);
        \u0275\u0275classProp("active", ctx.currentLocale() === "en");
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.t("brand.title"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.t("brand.description"), " ");
        \u0275\u0275advance(7);
        \u0275\u0275textInterpolate(ctx.t("brand.feature1Title"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("brand.feature1Desc"));
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.t("brand.feature2Title"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("brand.feature2Desc"));
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.t("brand.feature3Title"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("brand.feature3Desc"));
      }
    }, dependencies: [CommonModule, RouterModule, RouterOutlet], styles: ["\n\n.auth-container[_ngcontent-%COMP%] {\n  display: flex;\n  min-height: 100vh;\n  background: var(--bg-primary, #0f0f0f);\n}\n.auth-brand[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  padding: 3rem;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  color: white;\n}\n@media (max-width: 768px) {\n  .auth-brand[_ngcontent-%COMP%] {\n    display: none;\n  }\n}\n.brand-content[_ngcontent-%COMP%] {\n  max-width: 480px;\n}\n.logo[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-bottom: 2rem;\n}\n.logo-icon[_ngcontent-%COMP%] {\n  font-size: 2.5rem;\n}\n.logo-text[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  background:\n    linear-gradient(\n      90deg,\n      #00d4ff,\n      #7c3aed);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n.brand-title[_ngcontent-%COMP%] {\n  font-size: 2.5rem;\n  font-weight: 700;\n  margin-bottom: 1rem;\n  line-height: 1.2;\n}\n.brand-desc[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  color: rgba(255, 255, 255, 0.7);\n  margin-bottom: 3rem;\n}\n.features[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.feature-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 1rem;\n  padding: 1rem;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 12px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  transition: all 0.3s ease;\n}\n.feature-item[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n  transform: translateX(8px);\n}\n.feature-icon[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n}\n.feature-text[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.feature-text[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  font-size: 1rem;\n}\n.feature-text[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: rgba(255, 255, 255, 0.6);\n}\n.brand-footer[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.5);\n  font-size: 0.875rem;\n}\n.auth-form-area[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 2rem;\n  background: var(--bg-primary, #0f0f0f);\n}\n.form-container[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 420px;\n}\n.lang-switcher[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 1rem;\n  right: 1rem;\n  display: flex;\n  gap: 0.25rem;\n  background: rgba(30, 41, 59, 0.8);\n  padding: 0.25rem;\n  border-radius: 8px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  z-index: 100;\n}\n.lang-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  border: none;\n  background: transparent;\n  color: rgba(255, 255, 255, 0.6);\n  cursor: pointer;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: all 0.2s ease;\n}\n.lang-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n  color: white;\n}\n.lang-btn.active[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0891b2,\n      #7c3aed);\n  color: white;\n}\n/*# sourceMappingURL=auth-layout.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuthLayoutComponent, [{
    type: Component,
    args: [{ selector: "app-auth-layout", standalone: true, imports: [CommonModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="auth-container">
      <!-- \u{1F195} \u8A9E\u8A00\u5207\u63DB\u5668 -->
      <div class="lang-switcher">
        <button 
          class="lang-btn" 
          [class.active]="currentLocale() === 'zh-TW'"
          (click)="setLocale('zh-TW')"
        >\u7E41</button>
        <button 
          class="lang-btn" 
          [class.active]="currentLocale() === 'zh-CN'"
          (click)="setLocale('zh-CN')"
        >\u7B80</button>
        <button 
          class="lang-btn" 
          [class.active]="currentLocale() === 'en'"
          (click)="setLocale('en')"
        >EN</button>
      </div>
      
      <!-- \u5DE6\u5074\u54C1\u724C\u5340\u57DF -->
      <div class="auth-brand">
        <div class="brand-content">
          <div class="logo">
            <span class="logo-icon">\u{1F4F1}</span>
            <span class="logo-text">TG-Matrix</span>
          </div>
          <h1 class="brand-title">{{ t('brand.title') }}</h1>
          <p class="brand-desc">
            {{ t('brand.description') }}
          </p>
          
          <div class="features">
            <div class="feature-item">
              <span class="feature-icon">\u{1F916}</span>
              <div class="feature-text">
                <strong>{{ t('brand.feature1Title') }}</strong>
                <span>{{ t('brand.feature1Desc') }}</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">\u{1F4CA}</span>
              <div class="feature-text">
                <strong>{{ t('brand.feature2Title') }}</strong>
                <span>{{ t('brand.feature2Desc') }}</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">\u{1F512}</span>
              <div class="feature-text">
                <strong>{{ t('brand.feature3Title') }}</strong>
                <span>{{ t('brand.feature3Desc') }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="brand-footer">
          <p>&copy; 2026 TG-Matrix. All rights reserved.</p>
        </div>
      </div>
      
      <!-- \u53F3\u5074\u8868\u55AE\u5340\u57DF -->
      <div class="auth-form-area">
        <div class="form-container">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;8b53365b99dc3031807efc9558b108406e9cb452a20ce3f7440f9b03459a0f72;D:/tgkz2026/src/auth/auth-layout.component.ts */\n.auth-container {\n  display: flex;\n  min-height: 100vh;\n  background: var(--bg-primary, #0f0f0f);\n}\n.auth-brand {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n  padding: 3rem;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  color: white;\n}\n@media (max-width: 768px) {\n  .auth-brand {\n    display: none;\n  }\n}\n.brand-content {\n  max-width: 480px;\n}\n.logo {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-bottom: 2rem;\n}\n.logo-icon {\n  font-size: 2.5rem;\n}\n.logo-text {\n  font-size: 1.75rem;\n  font-weight: 700;\n  background:\n    linear-gradient(\n      90deg,\n      #00d4ff,\n      #7c3aed);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n}\n.brand-title {\n  font-size: 2.5rem;\n  font-weight: 700;\n  margin-bottom: 1rem;\n  line-height: 1.2;\n}\n.brand-desc {\n  font-size: 1.125rem;\n  color: rgba(255, 255, 255, 0.7);\n  margin-bottom: 3rem;\n}\n.features {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.feature-item {\n  display: flex;\n  align-items: flex-start;\n  gap: 1rem;\n  padding: 1rem;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 12px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  transition: all 0.3s ease;\n}\n.feature-item:hover {\n  background: rgba(255, 255, 255, 0.1);\n  transform: translateX(8px);\n}\n.feature-icon {\n  font-size: 1.5rem;\n}\n.feature-text {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.feature-text strong {\n  font-size: 1rem;\n}\n.feature-text span {\n  font-size: 0.875rem;\n  color: rgba(255, 255, 255, 0.6);\n}\n.brand-footer {\n  color: rgba(255, 255, 255, 0.5);\n  font-size: 0.875rem;\n}\n.auth-form-area {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 2rem;\n  background: var(--bg-primary, #0f0f0f);\n}\n.form-container {\n  width: 100%;\n  max-width: 420px;\n}\n.lang-switcher {\n  position: absolute;\n  top: 1rem;\n  right: 1rem;\n  display: flex;\n  gap: 0.25rem;\n  background: rgba(30, 41, 59, 0.8);\n  padding: 0.25rem;\n  border-radius: 8px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  z-index: 100;\n}\n.lang-btn {\n  padding: 0.375rem 0.75rem;\n  border: none;\n  background: transparent;\n  color: rgba(255, 255, 255, 0.6);\n  cursor: pointer;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: all 0.2s ease;\n}\n.lang-btn:hover {\n  background: rgba(255, 255, 255, 0.1);\n  color: white;\n}\n.lang-btn.active {\n  background:\n    linear-gradient(\n      135deg,\n      #0891b2,\n      #7c3aed);\n  color: white;\n}\n/*# sourceMappingURL=auth-layout.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AuthLayoutComponent, { className: "AuthLayoutComponent", filePath: "src/auth/auth-layout.component.ts", lineNumber: 248 });
})();
export {
  AuthLayoutComponent
};
//# sourceMappingURL=chunk-TK2PTE5P.js.map
