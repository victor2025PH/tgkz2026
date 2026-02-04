import {
  AuthService
} from "./chunk-SW4QBT65.js";
import "./chunk-LRT2RG6V.js";
import {
  RouterLink,
  RouterModule
} from "./chunk-T45T4QAG.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  RequiredValidator,
  ɵNgNoValidate
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/auth/forgot-password.component.ts
function ForgotPasswordComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3)(1, "span", 8);
    \u0275\u0275text(2, "\u2705");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4, "\u91CD\u7F6E\u93C8\u63A5\u5DF2\u767C\u9001\u5230\u60A8\u7684\u90F5\u7BB1\uFF0C\u8ACB\u67E5\u6536");
    \u0275\u0275elementEnd()();
  }
}
function ForgotPasswordComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4)(1, "span", 9);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.error());
  }
}
function ForgotPasswordComponent_Conditional_7_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 17);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u767C\u9001\u4E2D...");
    \u0275\u0275elementEnd();
  }
}
function ForgotPasswordComponent_Conditional_7_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u767C\u9001\u91CD\u7F6E\u93C8\u63A5");
    \u0275\u0275elementEnd();
  }
}
function ForgotPasswordComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "form", 10);
    \u0275\u0275listener("ngSubmit", function ForgotPasswordComponent_Conditional_7_Template_form_ngSubmit_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.onSubmit());
    });
    \u0275\u0275elementStart(1, "div", 11)(2, "label", 12);
    \u0275\u0275text(3, "\u96FB\u5B50\u90F5\u4EF6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 13)(5, "span", 14);
    \u0275\u0275text(6, "\u{1F4E7}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "input", 15);
    \u0275\u0275twoWayListener("ngModelChange", function ForgotPasswordComponent_Conditional_7_Template_input_ngModelChange_7_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.email, $event) || (ctx_r0.email = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(8, "button", 16);
    \u0275\u0275conditionalCreate(9, ForgotPasswordComponent_Conditional_7_Conditional_9_Template, 3, 0)(10, ForgotPasswordComponent_Conditional_7_Conditional_10_Template, 2, 0, "span");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.email);
    \u0275\u0275property("disabled", ctx_r0.isLoading());
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.isLoading() || !ctx_r0.email);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isLoading() ? 9 : 10);
  }
}
var ForgotPasswordComponent = class _ForgotPasswordComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.authService = inject(AuthService);
    this.email = "";
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
    this.success = signal(false, ...ngDevMode ? [{ debugName: "success" }] : []);
  }
  async onSubmit() {
    if (!this.email)
      return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.authService.forgotPassword(this.email);
      if (result.success) {
        this.success.set(true);
      } else {
        this.error.set(result.error || "\u767C\u9001\u5931\u6557");
      }
    } catch (e) {
      this.error.set(e.message || "\u767C\u9001\u5931\u6557");
    } finally {
      this.isLoading.set(false);
    }
  }
  static {
    this.\u0275fac = function ForgotPasswordComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ForgotPasswordComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ForgotPasswordComponent, selectors: [["app-forgot-password"]], decls: 11, vars: 3, consts: [[1, "forgot-password-page"], [1, "page-title"], [1, "page-subtitle"], [1, "success-alert"], [1, "error-alert"], [1, "forgot-form"], [1, "back-link"], ["routerLink", "/auth/login"], [1, "success-icon"], [1, "error-icon"], [1, "forgot-form", 3, "ngSubmit"], [1, "form-group"], ["for", "email"], [1, "input-wrapper"], [1, "input-icon"], ["type", "email", "id", "email", "name", "email", "placeholder", "\u8ACB\u8F38\u5165\u96FB\u5B50\u90F5\u4EF6", "required", "", "autocomplete", "email", 3, "ngModelChange", "ngModel", "disabled"], ["type", "submit", 1, "submit-btn", 3, "disabled"], [1, "loading-spinner"]], template: function ForgotPasswordComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h2", 1);
        \u0275\u0275text(2, "\u91CD\u7F6E\u5BC6\u78BC");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "p", 2);
        \u0275\u0275text(4, "\u8F38\u5165\u60A8\u7684\u96FB\u5B50\u90F5\u4EF6\uFF0C\u6211\u5011\u5C07\u767C\u9001\u91CD\u7F6E\u93C8\u63A5");
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(5, ForgotPasswordComponent_Conditional_5_Template, 5, 0, "div", 3);
        \u0275\u0275conditionalCreate(6, ForgotPasswordComponent_Conditional_6_Template, 5, 1, "div", 4);
        \u0275\u0275conditionalCreate(7, ForgotPasswordComponent_Conditional_7_Template, 11, 4, "form", 5);
        \u0275\u0275elementStart(8, "p", 6)(9, "a", 7);
        \u0275\u0275text(10, "\u2190 \u8FD4\u56DE\u767B\u5165");
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(5);
        \u0275\u0275conditional(ctx.success() ? 5 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.error() ? 6 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(!ctx.success() ? 7 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, DefaultValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterModule, RouterLink], styles: ["\n\n.forgot-password-page[_ngcontent-%COMP%] {\n  color: var(--text-primary, #fff);\n}\n.page-title[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.success-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: rgba(34, 197, 94, 0.1);\n  border: 1px solid rgba(34, 197, 94, 0.3);\n  border-radius: 8px;\n  color: #4ade80;\n  margin-bottom: 1.5rem;\n}\n.error-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n}\n.forgot-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.submit-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.submit-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.back-link[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-top: 1.5rem;\n}\n.back-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n}\n.back-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=forgot-password.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ForgotPasswordComponent, [{
    type: Component,
    args: [{ selector: "app-forgot-password", standalone: true, imports: [CommonModule, FormsModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="forgot-password-page">
      <h2 class="page-title">\u91CD\u7F6E\u5BC6\u78BC</h2>
      <p class="page-subtitle">\u8F38\u5165\u60A8\u7684\u96FB\u5B50\u90F5\u4EF6\uFF0C\u6211\u5011\u5C07\u767C\u9001\u91CD\u7F6E\u93C8\u63A5</p>
      
      @if (success()) {
        <div class="success-alert">
          <span class="success-icon">\u2705</span>
          <span>\u91CD\u7F6E\u93C8\u63A5\u5DF2\u767C\u9001\u5230\u60A8\u7684\u90F5\u7BB1\uFF0C\u8ACB\u67E5\u6536</span>
        </div>
      }
      
      @if (error()) {
        <div class="error-alert">
          <span class="error-icon">\u26A0\uFE0F</span>
          <span>{{ error() }}</span>
        </div>
      }
      
      @if (!success()) {
        <form class="forgot-form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">\u96FB\u5B50\u90F5\u4EF6</label>
            <div class="input-wrapper">
              <span class="input-icon">\u{1F4E7}</span>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                placeholder="\u8ACB\u8F38\u5165\u96FB\u5B50\u90F5\u4EF6"
                required
                autocomplete="email"
                [disabled]="isLoading()"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            class="submit-btn"
            [disabled]="isLoading() || !email"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              <span>\u767C\u9001\u4E2D...</span>
            } @else {
              <span>\u767C\u9001\u91CD\u7F6E\u93C8\u63A5</span>
            }
          </button>
        </form>
      }
      
      <p class="back-link">
        <a routerLink="/auth/login">\u2190 \u8FD4\u56DE\u767B\u5165</a>
      </p>
    </div>
  `, styles: ["/* angular:styles/component:css;9c5fb890b3ec95f692d032b64db65c6b0b50a4eac62dcbf1390af7220a874737;D:/tgkz2026/src/auth/forgot-password.component.ts */\n.forgot-password-page {\n  color: var(--text-primary, #fff);\n}\n.page-title {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.success-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: rgba(34, 197, 94, 0.1);\n  border: 1px solid rgba(34, 197, 94, 0.3);\n  border-radius: 8px;\n  color: #4ade80;\n  margin-bottom: 1.5rem;\n}\n.error-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n}\n.forgot-form {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper input {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.submit-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.submit-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.back-link {\n  text-align: center;\n  margin-top: 1.5rem;\n}\n.back-link a {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n}\n.back-link a:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=forgot-password.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ForgotPasswordComponent, { className: "ForgotPasswordComponent", filePath: "src/auth/forgot-password.component.ts", lineNumber: 217 });
})();
export {
  ForgotPasswordComponent
};
//# sourceMappingURL=chunk-D3VNM57D.js.map
