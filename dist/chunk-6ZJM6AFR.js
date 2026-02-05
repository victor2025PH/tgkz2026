import {
  AuthService
} from "./chunk-FIY3KE23.js";
import "./chunk-LRT2RG6V.js";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterModule
} from "./chunk-T45T4QAG.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  DefaultValueAccessor,
  FormsModule,
  MinLengthValidator,
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
import "./chunk-VXLC6YHT.js";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
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
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/auth/reset-password.component.ts
function ResetPasswordComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1)(1, "div", 3);
    \u0275\u0275text(2, "\u2705");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h2");
    \u0275\u0275text(4, "\u5BC6\u78BC\u91CD\u7F6E\u6210\u529F\uFF01");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p");
    \u0275\u0275text(6, "\u60A8\u7684\u5BC6\u78BC\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u4F7F\u7528\u65B0\u5BC6\u78BC\u767B\u5165");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 4);
    \u0275\u0275text(8, "\u524D\u5F80\u767B\u5165");
    \u0275\u0275elementEnd()();
  }
}
function ResetPasswordComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 2)(1, "div", 5);
    \u0275\u0275text(2, "\u274C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h2");
    \u0275\u0275text(4, "\u93C8\u63A5\u7121\u6548\u6216\u5DF2\u904E\u671F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p");
    \u0275\u0275text(6, "\u8ACB\u91CD\u65B0\u8ACB\u6C42\u5BC6\u78BC\u91CD\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 6);
    \u0275\u0275text(8, "\u91CD\u65B0\u8ACB\u6C42");
    \u0275\u0275elementEnd()();
  }
}
function ResetPasswordComponent_Conditional_3_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 9)(1, "span", 26);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.error());
  }
}
function ResetPasswordComponent_Conditional_3_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 22);
    \u0275\u0275text(1, "\u5BC6\u78BC\u4E0D\u5339\u914D");
    \u0275\u0275elementEnd();
  }
}
function ResetPasswordComponent_Conditional_3_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 27);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u91CD\u7F6E\u4E2D...");
    \u0275\u0275elementEnd();
  }
}
function ResetPasswordComponent_Conditional_3_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u91CD\u7F6E\u5BC6\u78BC");
    \u0275\u0275elementEnd();
  }
}
function ResetPasswordComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "h2", 7);
    \u0275\u0275text(1, "\u8A2D\u7F6E\u65B0\u5BC6\u78BC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "p", 8);
    \u0275\u0275text(3, "\u8ACB\u8F38\u5165\u60A8\u7684\u65B0\u5BC6\u78BC");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ResetPasswordComponent_Conditional_3_Conditional_4_Template, 5, 1, "div", 9);
    \u0275\u0275elementStart(5, "form", 10);
    \u0275\u0275listener("ngSubmit", function ResetPasswordComponent_Conditional_3_Template_form_ngSubmit_5_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onSubmit());
    });
    \u0275\u0275elementStart(6, "div", 11)(7, "label", 12);
    \u0275\u0275text(8, "\u65B0\u5BC6\u78BC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 13)(10, "span", 14);
    \u0275\u0275text(11, "\u{1F512}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 15);
    \u0275\u0275twoWayListener("ngModelChange", function ResetPasswordComponent_Conditional_3_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.password, $event) || (ctx_r1.password = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 16);
    \u0275\u0275listener("click", function ResetPasswordComponent_Conditional_3_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showPassword.set(!ctx_r1.showPassword()));
    });
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 17);
    \u0275\u0275element(16, "div", 18);
    \u0275\u0275elementStart(17, "span", 19);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(19, "div", 11)(20, "label", 20);
    \u0275\u0275text(21, "\u78BA\u8A8D\u5BC6\u78BC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 13)(23, "span", 14);
    \u0275\u0275text(24, "\u{1F512}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "input", 21);
    \u0275\u0275twoWayListener("ngModelChange", function ResetPasswordComponent_Conditional_3_Template_input_ngModelChange_25_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.confirmPassword, $event) || (ctx_r1.confirmPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "button", 16);
    \u0275\u0275listener("click", function ResetPasswordComponent_Conditional_3_Template_button_click_26_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showConfirmPassword.set(!ctx_r1.showConfirmPassword()));
    });
    \u0275\u0275text(27);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(28, ResetPasswordComponent_Conditional_3_Conditional_28_Template, 2, 0, "span", 22);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "button", 23);
    \u0275\u0275conditionalCreate(30, ResetPasswordComponent_Conditional_3_Conditional_30_Template, 3, 0)(31, ResetPasswordComponent_Conditional_3_Conditional_31_Template, 2, 0, "span");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "p", 24)(33, "a", 25);
    \u0275\u0275text(34, "\u2190 \u8FD4\u56DE\u767B\u5165");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.error() ? 4 : -1);
    \u0275\u0275advance(8);
    \u0275\u0275property("type", ctx_r1.showPassword() ? "text" : "password");
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.password);
    \u0275\u0275property("disabled", ctx_r1.isLoading());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.showPassword() ? "\u{1F648}" : "\u{1F441}\uFE0F", " ");
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.passwordStrength());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.passwordStrengthText());
    \u0275\u0275advance(7);
    \u0275\u0275property("type", ctx_r1.showConfirmPassword() ? "text" : "password");
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.confirmPassword);
    \u0275\u0275property("disabled", ctx_r1.isLoading());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.showConfirmPassword() ? "\u{1F648}" : "\u{1F441}\uFE0F", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.confirmPassword && ctx_r1.password !== ctx_r1.confirmPassword ? 28 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.isLoading() || !ctx_r1.isFormValid());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoading() ? 30 : 31);
  }
}
var ResetPasswordComponent = class _ResetPasswordComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.i18n = inject(I18nService);
    this.token = "";
    this.password = "";
    this.confirmPassword = "";
    this.showPassword = signal(false, ...ngDevMode ? [{ debugName: "showPassword" }] : []);
    this.showConfirmPassword = signal(false, ...ngDevMode ? [{ debugName: "showConfirmPassword" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.success = signal(false, ...ngDevMode ? [{ debugName: "success" }] : []);
    this.invalidToken = signal(false, ...ngDevMode ? [{ debugName: "invalidToken" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
  }
  ngOnInit() {
    this.token = this.route.snapshot.queryParams["token"] || "";
    if (!this.token) {
      this.invalidToken.set(true);
    }
  }
  passwordStrength() {
    if (!this.password)
      return "";
    if (this.password.length < 8)
      return "weak";
    let score = 0;
    if (this.password.length >= 8)
      score++;
    if (this.password.length >= 12)
      score++;
    if (/[a-z]/.test(this.password) && /[A-Z]/.test(this.password))
      score++;
    if (/\d/.test(this.password))
      score++;
    if (/[^a-zA-Z0-9]/.test(this.password))
      score++;
    if (score >= 4)
      return "strong";
    if (score >= 2)
      return "medium";
    return "weak";
  }
  passwordStrengthText() {
    const strength = this.passwordStrength();
    switch (strength) {
      case "weak":
        return "\u5F31";
      case "medium":
        return "\u4E2D";
      case "strong":
        return "\u5F37";
      default:
        return "";
    }
  }
  isFormValid() {
    return this.password.length >= 8 && this.password === this.confirmPassword;
  }
  async onSubmit() {
    if (!this.isFormValid())
      return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.authService.resetPassword(this.token, this.password);
      if (result.success) {
        this.success.set(true);
      } else {
        if (result.error?.includes("\u904E\u671F") || result.error?.includes("\u7121\u6548")) {
          this.invalidToken.set(true);
        } else {
          this.error.set(result.error || "\u91CD\u7F6E\u5931\u6557");
        }
      }
    } catch (e) {
      this.error.set(e.message || "\u91CD\u7F6E\u5931\u6557");
    } finally {
      this.isLoading.set(false);
    }
  }
  static {
    this.\u0275fac = function ResetPasswordComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ResetPasswordComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ResetPasswordComponent, selectors: [["app-reset-password"]], decls: 4, vars: 1, consts: [[1, "reset-password-page"], [1, "success-state"], [1, "error-state"], [1, "success-icon"], ["routerLink", "/auth/login", 1, "primary-btn"], [1, "error-icon"], ["routerLink", "/auth/forgot-password", 1, "primary-btn"], [1, "page-title"], [1, "page-subtitle"], [1, "error-alert"], [1, "reset-form", 3, "ngSubmit"], [1, "form-group"], ["for", "password"], [1, "input-wrapper"], [1, "input-icon"], ["id", "password", "name", "password", "placeholder", "\u8ACB\u8F38\u5165\u65B0\u5BC6\u78BC\uFF08\u81F3\u5C118\u500B\u5B57\u7B26\uFF09", "required", "", "minlength", "8", "autocomplete", "new-password", 3, "ngModelChange", "type", "ngModel", "disabled"], ["type", "button", 1, "toggle-password", 3, "click"], [1, "password-strength"], [1, "strength-bar"], [1, "strength-text"], ["for", "confirmPassword"], ["id", "confirmPassword", "name", "confirmPassword", "placeholder", "\u8ACB\u518D\u6B21\u8F38\u5165\u65B0\u5BC6\u78BC", "required", "", "autocomplete", "new-password", 3, "ngModelChange", "type", "ngModel", "disabled"], [1, "error-text"], ["type", "submit", 1, "submit-btn", 3, "disabled"], [1, "back-link"], ["routerLink", "/auth/login"], [1, "error-icon-small"], [1, "loading-spinner"]], template: function ResetPasswordComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0);
        \u0275\u0275conditionalCreate(1, ResetPasswordComponent_Conditional_1_Template, 9, 0, "div", 1)(2, ResetPasswordComponent_Conditional_2_Template, 9, 0, "div", 2)(3, ResetPasswordComponent_Conditional_3_Template, 35, 15);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.success() ? 1 : ctx.invalidToken() ? 2 : 3);
      }
    }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, DefaultValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, MinLengthValidator, NgModel, NgForm, RouterModule, RouterLink], styles: ['\n\n.reset-password-page[_ngcontent-%COMP%] {\n  color: var(--text-primary, #fff);\n}\n.success-state[_ngcontent-%COMP%], \n.error-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem 0;\n}\n.success-icon[_ngcontent-%COMP%], \n.error-icon[_ngcontent-%COMP%] {\n  font-size: 4rem;\n  margin-bottom: 1rem;\n}\n.page-title[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n}\n.reset-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.875rem 3rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.toggle-password[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.toggle-password[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.password-strength[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-top: 0.25rem;\n}\n.strength-bar[_ngcontent-%COMP%] {\n  flex: 1;\n  height: 4px;\n  background: var(--bg-tertiary, #252525);\n  border-radius: 2px;\n  position: relative;\n  overflow: hidden;\n}\n.strength-bar[_ngcontent-%COMP%]::before {\n  content: "";\n  position: absolute;\n  left: 0;\n  top: 0;\n  height: 100%;\n  border-radius: 2px;\n  transition: all 0.3s;\n}\n.strength-bar.weak[_ngcontent-%COMP%]::before {\n  width: 33%;\n  background: #ef4444;\n}\n.strength-bar.medium[_ngcontent-%COMP%]::before {\n  width: 66%;\n  background: #f59e0b;\n}\n.strength-bar.strong[_ngcontent-%COMP%]::before {\n  width: 100%;\n  background: #22c55e;\n}\n.strength-text[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #666);\n}\n.error-text[_ngcontent-%COMP%] {\n  color: #f87171;\n  font-size: 0.75rem;\n}\n.submit-btn[_ngcontent-%COMP%], \n.primary-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn[_ngcontent-%COMP%]:hover:not(:disabled), \n.primary-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.back-link[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-top: 1.5rem;\n}\n.back-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n}\n.back-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=reset-password.component.css.map */'], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ResetPasswordComponent, [{
    type: Component,
    args: [{ selector: "app-reset-password", standalone: true, imports: [CommonModule, FormsModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="reset-password-page">
      @if (success()) {
        <div class="success-state">
          <div class="success-icon">\u2705</div>
          <h2>\u5BC6\u78BC\u91CD\u7F6E\u6210\u529F\uFF01</h2>
          <p>\u60A8\u7684\u5BC6\u78BC\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u4F7F\u7528\u65B0\u5BC6\u78BC\u767B\u5165</p>
          <button class="primary-btn" routerLink="/auth/login">\u524D\u5F80\u767B\u5165</button>
        </div>
      } @else if (invalidToken()) {
        <div class="error-state">
          <div class="error-icon">\u274C</div>
          <h2>\u93C8\u63A5\u7121\u6548\u6216\u5DF2\u904E\u671F</h2>
          <p>\u8ACB\u91CD\u65B0\u8ACB\u6C42\u5BC6\u78BC\u91CD\u7F6E</p>
          <button class="primary-btn" routerLink="/auth/forgot-password">\u91CD\u65B0\u8ACB\u6C42</button>
        </div>
      } @else {
        <h2 class="page-title">\u8A2D\u7F6E\u65B0\u5BC6\u78BC</h2>
        <p class="page-subtitle">\u8ACB\u8F38\u5165\u60A8\u7684\u65B0\u5BC6\u78BC</p>
        
        @if (error()) {
          <div class="error-alert">
            <span class="error-icon-small">\u26A0\uFE0F</span>
            <span>{{ error() }}</span>
          </div>
        }
        
        <form class="reset-form" (ngSubmit)="onSubmit()">
          <!-- \u65B0\u5BC6\u78BC -->
          <div class="form-group">
            <label for="password">\u65B0\u5BC6\u78BC</label>
            <div class="input-wrapper">
              <span class="input-icon">\u{1F512}</span>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                [(ngModel)]="password"
                name="password"
                placeholder="\u8ACB\u8F38\u5165\u65B0\u5BC6\u78BC\uFF08\u81F3\u5C118\u500B\u5B57\u7B26\uFF09"
                required
                minlength="8"
                autocomplete="new-password"
                [disabled]="isLoading()"
              />
              <button 
                type="button" 
                class="toggle-password"
                (click)="showPassword.set(!showPassword())"
              >
                {{ showPassword() ? '\u{1F648}' : '\u{1F441}\uFE0F' }}
              </button>
            </div>
            
            <!-- \u5BC6\u78BC\u5F37\u5EA6\u6307\u793A\u5668 -->
            <div class="password-strength">
              <div class="strength-bar" [class]="passwordStrength()"></div>
              <span class="strength-text">{{ passwordStrengthText() }}</span>
            </div>
          </div>
          
          <!-- \u78BA\u8A8D\u5BC6\u78BC -->
          <div class="form-group">
            <label for="confirmPassword">\u78BA\u8A8D\u5BC6\u78BC</label>
            <div class="input-wrapper">
              <span class="input-icon">\u{1F512}</span>
              <input
                [type]="showConfirmPassword() ? 'text' : 'password'"
                id="confirmPassword"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                placeholder="\u8ACB\u518D\u6B21\u8F38\u5165\u65B0\u5BC6\u78BC"
                required
                autocomplete="new-password"
                [disabled]="isLoading()"
              />
              <button 
                type="button" 
                class="toggle-password"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
              >
                {{ showConfirmPassword() ? '\u{1F648}' : '\u{1F441}\uFE0F' }}
              </button>
            </div>
            @if (confirmPassword && password !== confirmPassword) {
              <span class="error-text">\u5BC6\u78BC\u4E0D\u5339\u914D</span>
            }
          </div>
          
          <button 
            type="submit" 
            class="submit-btn"
            [disabled]="isLoading() || !isFormValid()"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              <span>\u91CD\u7F6E\u4E2D...</span>
            } @else {
              <span>\u91CD\u7F6E\u5BC6\u78BC</span>
            }
          </button>
        </form>
        
        <p class="back-link">
          <a routerLink="/auth/login">\u2190 \u8FD4\u56DE\u767B\u5165</a>
        </p>
      }
    </div>
  `, styles: ['/* angular:styles/component:css;5f5bf0abff84f8ac2638f010188954a8879ee134a08af29a9de8739f343959d2;D:/tgkz2026/src/auth/reset-password.component.ts */\n.reset-password-page {\n  color: var(--text-primary, #fff);\n}\n.success-state,\n.error-state {\n  text-align: center;\n  padding: 2rem 0;\n}\n.success-icon,\n.error-icon {\n  font-size: 4rem;\n  margin-bottom: 1rem;\n}\n.page-title {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n}\n.reset-form {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper input {\n  width: 100%;\n  padding: 0.875rem 3rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.toggle-password {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.toggle-password:hover {\n  opacity: 1;\n}\n.password-strength {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-top: 0.25rem;\n}\n.strength-bar {\n  flex: 1;\n  height: 4px;\n  background: var(--bg-tertiary, #252525);\n  border-radius: 2px;\n  position: relative;\n  overflow: hidden;\n}\n.strength-bar::before {\n  content: "";\n  position: absolute;\n  left: 0;\n  top: 0;\n  height: 100%;\n  border-radius: 2px;\n  transition: all 0.3s;\n}\n.strength-bar.weak::before {\n  width: 33%;\n  background: #ef4444;\n}\n.strength-bar.medium::before {\n  width: 66%;\n  background: #f59e0b;\n}\n.strength-bar.strong::before {\n  width: 100%;\n  background: #22c55e;\n}\n.strength-text {\n  font-size: 0.75rem;\n  color: var(--text-muted, #666);\n}\n.error-text {\n  color: #f87171;\n  font-size: 0.75rem;\n}\n.submit-btn,\n.primary-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn:hover:not(:disabled),\n.primary-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.back-link {\n  text-align: center;\n  margin-top: 1.5rem;\n}\n.back-link a {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n}\n.back-link a:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=reset-password.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ResetPasswordComponent, { className: "ResetPasswordComponent", filePath: "src/auth/reset-password.component.ts", lineNumber: 333 });
})();
export {
  ResetPasswordComponent
};
//# sourceMappingURL=chunk-6ZJM6AFR.js.map
