import {
  AuthService
} from "./chunk-AHTF6AO6.js";
import "./chunk-LRT2RG6V.js";
import {
  Router,
  RouterLink,
  RouterModule
} from "./chunk-T45T4QAG.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  CheckboxControlValueAccessor,
  CheckboxRequiredValidator,
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
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/auth/register.component.ts
var _c0 = () => [1, 2, 3, 4];
function RegisterComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3)(1, "span", 27);
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
function RegisterComponent_Conditional_30_For_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 31);
  }
  if (rf & 2) {
    const i_r2 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("active", ctx_r0.passwordStrength() >= i_r2)("weak", ctx_r0.passwordStrength() === 1)("fair", ctx_r0.passwordStrength() === 2)("good", ctx_r0.passwordStrength() === 3)("strong", ctx_r0.passwordStrength() === 4);
  }
}
function RegisterComponent_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 15)(1, "div", 28);
    \u0275\u0275repeaterCreate(2, RegisterComponent_Conditional_30_For_3_Template, 1, 10, "div", 29, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 30);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275repeater(\u0275\u0275pureFunction0(3, _c0));
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r0.strengthClass());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.passwordStrengthText(), " ");
  }
}
function RegisterComponent_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 18);
    \u0275\u0275text(1, "\u274C");
    \u0275\u0275elementEnd();
  }
}
function RegisterComponent_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 19);
    \u0275\u0275text(1, "\u2705");
    \u0275\u0275elementEnd();
  }
}
function RegisterComponent_Conditional_50_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 32);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.registering"));
  }
}
function RegisterComponent_Conditional_51_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.t("auth.register"));
  }
}
var RegisterComponent = class _RegisterComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.i18n = inject(I18nService);
    this.username = "";
    this.email = "";
    this.password = "";
    this.confirmPassword = "";
    this.agreeTerms = false;
    this.showPassword = signal(false, ...ngDevMode ? [{ debugName: "showPassword" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
    this.passwordStrength = signal(0, ...ngDevMode ? [{ debugName: "passwordStrength" }] : []);
    this.passwordStrengthText = computed(() => {
      const strength = this.passwordStrength();
      const texts = ["", this.t("auth.weak"), this.t("auth.fair"), this.t("auth.good"), this.t("auth.strong")];
      return texts[strength] || "";
    }, ...ngDevMode ? [{ debugName: "passwordStrengthText" }] : []);
    this.strengthClass = computed(() => {
      const classes = ["", "weak", "fair", "good", "strong"];
      return classes[this.passwordStrength()] || "";
    }, ...ngDevMode ? [{ debugName: "strengthClass" }] : []);
  }
  // 計算屬性 - 使用 getter 而非 computed，因為依賴的是普通屬性
  get canSubmit() {
    return !!(this.email && this.password && this.password === this.confirmPassword && this.agreeTerms && this.passwordStrength() >= 2 && !this.isLoading());
  }
  t(key) {
    return this.i18n.t(key);
  }
  checkPasswordStrength() {
    let strength = 0;
    const pwd = this.password;
    if (pwd.length >= 6)
      strength++;
    if (pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd))
      strength++;
    if (/\d/.test(pwd))
      strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd))
      strength++;
    this.passwordStrength.set(strength);
  }
  async onSubmit() {
    if (!this.canSubmit)
      return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.authService.register({
        email: this.email,
        password: this.password,
        username: this.username || void 0,
        display_name: this.username || void 0
      });
      if (result.success) {
        this.router.navigate(["/"]);
      } else {
        this.error.set(result.error || this.t("auth.registerFailed"));
      }
    } catch (e) {
      this.error.set(e.message || this.t("auth.registerFailed"));
    } finally {
      this.isLoading.set(false);
    }
  }
  static {
    this.\u0275fac = function RegisterComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _RegisterComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RegisterComponent, selectors: [["app-register"]], decls: 56, vars: 34, consts: [[1, "register-page"], [1, "page-title"], [1, "page-subtitle"], [1, "error-alert"], [1, "register-form", 3, "ngSubmit"], [1, "form-group"], ["for", "username"], [1, "input-wrapper"], [1, "input-icon"], ["type", "text", "id", "username", "name", "username", "autocomplete", "username", 3, "ngModelChange", "ngModel", "placeholder", "disabled"], ["for", "email"], ["type", "email", "id", "email", "name", "email", "required", "", "autocomplete", "email", 3, "ngModelChange", "ngModel", "placeholder", "disabled"], ["for", "password"], ["id", "password", "name", "password", "required", "", "autocomplete", "new-password", 3, "ngModelChange", "input", "type", "ngModel", "placeholder", "disabled"], ["type", "button", 1, "toggle-password", 3, "click"], [1, "password-strength"], ["for", "confirmPassword"], ["id", "confirmPassword", "name", "confirmPassword", "required", "", "autocomplete", "new-password", 3, "ngModelChange", "type", "ngModel", "placeholder", "disabled"], [1, "input-error"], [1, "input-success"], [1, "checkbox-label", "terms"], ["type", "checkbox", "name", "agreeTerms", "required", "", 3, "ngModelChange", "ngModel"], ["href", "/terms", "target", "_blank"], ["href", "/privacy", "target", "_blank"], ["type", "submit", 1, "submit-btn", 3, "disabled"], [1, "login-link"], ["routerLink", "/auth/login"], [1, "error-icon"], [1, "strength-bars"], [1, "strength-bar", 3, "active", "weak", "fair", "good", "strong"], [1, "strength-text"], [1, "strength-bar"], [1, "loading-spinner"]], template: function RegisterComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h2", 1);
        \u0275\u0275text(2);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "p", 2);
        \u0275\u0275text(4);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(5, RegisterComponent_Conditional_5_Template, 5, 1, "div", 3);
        \u0275\u0275elementStart(6, "form", 4);
        \u0275\u0275listener("ngSubmit", function RegisterComponent_Template_form_ngSubmit_6_listener() {
          return ctx.onSubmit();
        });
        \u0275\u0275elementStart(7, "div", 5)(8, "label", 6);
        \u0275\u0275text(9);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "div", 7)(11, "span", 8);
        \u0275\u0275text(12, "\u{1F464}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "input", 9);
        \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_13_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.username, $event) || (ctx.username = $event);
          return $event;
        });
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(14, "div", 5)(15, "label", 10);
        \u0275\u0275text(16);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(17, "div", 7)(18, "span", 8);
        \u0275\u0275text(19, "\u{1F4E7}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "input", 11);
        \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_20_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
          return $event;
        });
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(21, "div", 5)(22, "label", 12);
        \u0275\u0275text(23);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(24, "div", 7)(25, "span", 8);
        \u0275\u0275text(26, "\u{1F512}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "input", 13);
        \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_27_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
          return $event;
        });
        \u0275\u0275listener("input", function RegisterComponent_Template_input_input_27_listener() {
          return ctx.checkPasswordStrength();
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "button", 14);
        \u0275\u0275listener("click", function RegisterComponent_Template_button_click_28_listener() {
          return ctx.showPassword.set(!ctx.showPassword());
        });
        \u0275\u0275text(29);
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(30, RegisterComponent_Conditional_30_Template, 6, 4, "div", 15);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "div", 5)(32, "label", 16);
        \u0275\u0275text(33);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "div", 7)(35, "span", 8);
        \u0275\u0275text(36, "\u{1F512}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "input", 17);
        \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_37_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.confirmPassword, $event) || (ctx.confirmPassword = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(38, RegisterComponent_Conditional_38_Template, 2, 0, "span", 18);
        \u0275\u0275conditionalCreate(39, RegisterComponent_Conditional_39_Template, 2, 0, "span", 19);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(40, "label", 20)(41, "input", 21);
        \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_41_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.agreeTerms, $event) || (ctx.agreeTerms = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "span");
        \u0275\u0275text(43);
        \u0275\u0275elementStart(44, "a", 22);
        \u0275\u0275text(45);
        \u0275\u0275elementEnd();
        \u0275\u0275text(46);
        \u0275\u0275elementStart(47, "a", 23);
        \u0275\u0275text(48);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(49, "button", 24);
        \u0275\u0275conditionalCreate(50, RegisterComponent_Conditional_50_Template, 3, 1)(51, RegisterComponent_Conditional_51_Template, 2, 1, "span");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(52, "p", 25);
        \u0275\u0275text(53);
        \u0275\u0275elementStart(54, "a", 26);
        \u0275\u0275text(55);
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.createAccount"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.registerSubtitle"));
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.error() ? 5 : -1);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.username"));
        \u0275\u0275advance(4);
        \u0275\u0275twoWayProperty("ngModel", ctx.username);
        \u0275\u0275property("placeholder", ctx.t("auth.usernamePlaceholder"))("disabled", ctx.isLoading());
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1("", ctx.t("auth.email"), " *");
        \u0275\u0275advance(4);
        \u0275\u0275twoWayProperty("ngModel", ctx.email);
        \u0275\u0275property("placeholder", ctx.t("auth.emailPlaceholder"))("disabled", ctx.isLoading());
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1("", ctx.t("auth.password"), " *");
        \u0275\u0275advance(4);
        \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
        \u0275\u0275twoWayProperty("ngModel", ctx.password);
        \u0275\u0275property("placeholder", ctx.t("auth.passwordPlaceholder"))("disabled", ctx.isLoading());
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.showPassword() ? "\u{1F648}" : "\u{1F441}\uFE0F", " ");
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.password ? 30 : -1);
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1("", ctx.t("auth.confirmPassword"), " *");
        \u0275\u0275advance(4);
        \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
        \u0275\u0275twoWayProperty("ngModel", ctx.confirmPassword);
        \u0275\u0275property("placeholder", ctx.t("auth.confirmPasswordPlaceholder"))("disabled", ctx.isLoading());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.confirmPassword && ctx.password !== ctx.confirmPassword ? 38 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.confirmPassword && ctx.password === ctx.confirmPassword ? 39 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275twoWayProperty("ngModel", ctx.agreeTerms);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.t("auth.agreeToTerms"), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.termsOfService"));
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.t("auth.and"), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.privacyPolicy"));
        \u0275\u0275advance();
        \u0275\u0275property("disabled", !ctx.canSubmit);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isLoading() ? 50 : 51);
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1(" ", ctx.t("auth.haveAccount"), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.loginNow"));
      }
    }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, DefaultValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, CheckboxRequiredValidator, NgModel, NgForm, RouterModule, RouterLink], styles: ["\n\n.register-page[_ngcontent-%COMP%] {\n  color: var(--text-primary, #fff);\n}\n.page-title[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n  font-size: 0.875rem;\n}\n.register-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: var(--text-muted, #666);\n}\n.toggle-password[_ngcontent-%COMP%], \n.input-error[_ngcontent-%COMP%], \n.input-success[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n}\n.toggle-password[_ngcontent-%COMP%] {\n  opacity: 0.5;\n  transition: opacity 0.2s;\n}\n.toggle-password[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.password-strength[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-top: 0.5rem;\n}\n.strength-bars[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 4px;\n}\n.strength-bar[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 4px;\n  background: var(--bg-tertiary, #333);\n  border-radius: 2px;\n  transition: all 0.3s ease;\n}\n.strength-bar.active.weak[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.strength-bar.active.fair[_ngcontent-%COMP%] {\n  background: #f59e0b;\n}\n.strength-bar.active.good[_ngcontent-%COMP%] {\n  background: #10b981;\n}\n.strength-bar.active.strong[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.strength-text[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n}\n.strength-text.weak[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.strength-text.fair[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.strength-text.good[_ngcontent-%COMP%] {\n  color: #10b981;\n}\n.strength-text.strong[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.checkbox-label.terms[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.5rem;\n  cursor: pointer;\n  color: var(--text-secondary, #aaa);\n  font-size: 0.875rem;\n  line-height: 1.4;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  margin-top: 2px;\n  accent-color: var(--primary, #3b82f6);\n}\n.checkbox-label[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n}\n.checkbox-label[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.submit-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.login-link[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n}\n.login-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  font-weight: 500;\n}\n.login-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=register.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RegisterComponent, [{
    type: Component,
    args: [{ selector: "app-register", standalone: true, imports: [CommonModule, FormsModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="register-page">
      <h2 class="page-title">{{ t('auth.createAccount') }}</h2>
      <p class="page-subtitle">{{ t('auth.registerSubtitle') }}</p>
      
      <!-- \u932F\u8AA4\u63D0\u793A -->
      @if (error()) {
        <div class="error-alert">
          <span class="error-icon">\u26A0\uFE0F</span>
          <span>{{ error() }}</span>
        </div>
      }
      
      <form class="register-form" (ngSubmit)="onSubmit()">
        <!-- \u7528\u6236\u540D -->
        <div class="form-group">
          <label for="username">{{ t('auth.username') }}</label>
          <div class="input-wrapper">
            <span class="input-icon">\u{1F464}</span>
            <input
              type="text"
              id="username"
              [(ngModel)]="username"
              name="username"
              [placeholder]="t('auth.usernamePlaceholder')"
              autocomplete="username"
              [disabled]="isLoading()"
            />
          </div>
        </div>
        
        <!-- \u90F5\u7BB1 -->
        <div class="form-group">
          <label for="email">{{ t('auth.email') }} *</label>
          <div class="input-wrapper">
            <span class="input-icon">\u{1F4E7}</span>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              [placeholder]="t('auth.emailPlaceholder')"
              required
              autocomplete="email"
              [disabled]="isLoading()"
            />
          </div>
        </div>
        
        <!-- \u5BC6\u78BC -->
        <div class="form-group">
          <label for="password">{{ t('auth.password') }} *</label>
          <div class="input-wrapper">
            <span class="input-icon">\u{1F512}</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              id="password"
              [(ngModel)]="password"
              name="password"
              [placeholder]="t('auth.passwordPlaceholder')"
              required
              autocomplete="new-password"
              [disabled]="isLoading()"
              (input)="checkPasswordStrength()"
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
          @if (password) {
            <div class="password-strength">
              <div class="strength-bars">
                @for (i of [1, 2, 3, 4]; track i) {
                  <div 
                    class="strength-bar" 
                    [class.active]="passwordStrength() >= i"
                    [class.weak]="passwordStrength() === 1"
                    [class.fair]="passwordStrength() === 2"
                    [class.good]="passwordStrength() === 3"
                    [class.strong]="passwordStrength() === 4"
                  ></div>
                }
              </div>
              <span class="strength-text" [class]="strengthClass()">
                {{ passwordStrengthText() }}
              </span>
            </div>
          }
        </div>
        
        <!-- \u78BA\u8A8D\u5BC6\u78BC -->
        <div class="form-group">
          <label for="confirmPassword">{{ t('auth.confirmPassword') }} *</label>
          <div class="input-wrapper">
            <span class="input-icon">\u{1F512}</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              id="confirmPassword"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              [placeholder]="t('auth.confirmPasswordPlaceholder')"
              required
              autocomplete="new-password"
              [disabled]="isLoading()"
            />
            @if (confirmPassword && password !== confirmPassword) {
              <span class="input-error">\u274C</span>
            }
            @if (confirmPassword && password === confirmPassword) {
              <span class="input-success">\u2705</span>
            }
          </div>
        </div>
        
        <!-- \u670D\u52D9\u689D\u6B3E -->
        <label class="checkbox-label terms">
          <input 
            type="checkbox" 
            [(ngModel)]="agreeTerms" 
            name="agreeTerms"
            required
          />
          <span>
            {{ t('auth.agreeToTerms') }}
            <a href="/terms" target="_blank">{{ t('auth.termsOfService') }}</a>
            {{ t('auth.and') }}
            <a href="/privacy" target="_blank">{{ t('auth.privacyPolicy') }}</a>
          </span>
        </label>
        
        <!-- \u8A3B\u518A\u6309\u9215 -->
        <button 
          type="submit" 
          class="submit-btn"
          [disabled]="!canSubmit"
        >
          @if (isLoading()) {
            <span class="loading-spinner"></span>
            <span>{{ t('auth.registering') }}</span>
          } @else {
            <span>{{ t('auth.register') }}</span>
          }
        </button>
      </form>
      
      <!-- \u767B\u5165\u5165\u53E3 -->
      <p class="login-link">
        {{ t('auth.haveAccount') }}
        <a routerLink="/auth/login">{{ t('auth.loginNow') }}</a>
      </p>
    </div>
  `, styles: ["/* angular:styles/component:css;36b2eb7736a541504c652f81e230f1c4d475838442d076a77fe53b524062901d;D:/tgkz2026/src/auth/register.component.ts */\n.register-page {\n  color: var(--text-primary, #fff);\n}\n.page-title {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n  font-size: 0.875rem;\n}\n.register-form {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper input {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.input-wrapper input::placeholder {\n  color: var(--text-muted, #666);\n}\n.toggle-password,\n.input-error,\n.input-success {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n}\n.toggle-password {\n  opacity: 0.5;\n  transition: opacity 0.2s;\n}\n.toggle-password:hover {\n  opacity: 1;\n}\n.password-strength {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-top: 0.5rem;\n}\n.strength-bars {\n  display: flex;\n  gap: 4px;\n}\n.strength-bar {\n  width: 40px;\n  height: 4px;\n  background: var(--bg-tertiary, #333);\n  border-radius: 2px;\n  transition: all 0.3s ease;\n}\n.strength-bar.active.weak {\n  background: #ef4444;\n}\n.strength-bar.active.fair {\n  background: #f59e0b;\n}\n.strength-bar.active.good {\n  background: #10b981;\n}\n.strength-bar.active.strong {\n  background: #22c55e;\n}\n.strength-text {\n  font-size: 0.75rem;\n}\n.strength-text.weak {\n  color: #ef4444;\n}\n.strength-text.fair {\n  color: #f59e0b;\n}\n.strength-text.good {\n  color: #10b981;\n}\n.strength-text.strong {\n  color: #22c55e;\n}\n.checkbox-label.terms {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.5rem;\n  cursor: pointer;\n  color: var(--text-secondary, #aaa);\n  font-size: 0.875rem;\n  line-height: 1.4;\n}\n.checkbox-label input[type=checkbox] {\n  width: 16px;\n  height: 16px;\n  margin-top: 2px;\n  accent-color: var(--primary, #3b82f6);\n}\n.checkbox-label a {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n}\n.checkbox-label a:hover {\n  text-decoration: underline;\n}\n.submit-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.login-link {\n  text-align: center;\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n}\n.login-link a {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  font-weight: 500;\n}\n.login-link a:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=register.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RegisterComponent, { className: "RegisterComponent", filePath: "src/auth/register.component.ts", lineNumber: 402 });
})();
export {
  RegisterComponent
};
//# sourceMappingURL=chunk-4CPJ7AOE.js.map
