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
  FormsModule
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
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/auth/verify-email.component.ts
var _c0 = () => [0, 1, 2, 3, 4, 5];
function VerifyEmailComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1);
    \u0275\u0275element(1, "div", 5);
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "\u6B63\u5728\u9A57\u8B49...");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "\u8ACB\u7A0D\u5019");
    \u0275\u0275elementEnd()();
  }
}
function VerifyEmailComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 2)(1, "div", 6);
    \u0275\u0275text(2, "\u2705");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h2");
    \u0275\u0275text(4, "\u9A57\u8B49\u6210\u529F\uFF01");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p");
    \u0275\u0275text(6, "\u60A8\u7684\u90F5\u7BB1\u5DF2\u6210\u529F\u9A57\u8B49\uFF0C\u73FE\u5728\u53EF\u4EE5\u4F7F\u7528\u6240\u6709\u529F\u80FD\u4E86");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 7);
    \u0275\u0275text(8, "\u958B\u59CB\u4F7F\u7528");
    \u0275\u0275elementEnd()();
  }
}
function VerifyEmailComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 3)(1, "div", 8);
    \u0275\u0275text(2, "\u274C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h2");
    \u0275\u0275text(4, "\u9A57\u8B49\u5931\u6557");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 9)(8, "button", 10);
    \u0275\u0275listener("click", function VerifyEmailComponent_Conditional_3_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.resendEmail());
    });
    \u0275\u0275text(9, "\u91CD\u65B0\u767C\u9001\u9A57\u8B49\u90F5\u4EF6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "a", 11);
    \u0275\u0275text(11, "\u8FD4\u56DE\u767B\u5165");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r1.error());
  }
}
function VerifyEmailComponent_Conditional_4_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 17);
    \u0275\u0275listener("input", function VerifyEmailComponent_Conditional_4_For_7_Template_input_input_0_listener($event) {
      const i_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onCodeInput($event, i_r5));
    })("keydown", function VerifyEmailComponent_Conditional_4_For_7_Template_input_keydown_0_listener($event) {
      const i_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onKeyDown($event, i_r5));
    })("paste", function VerifyEmailComponent_Conditional_4_For_7_Template_input_paste_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onPaste($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const i_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("value", ctx_r1.codeDigits()[i_r5] || "")("disabled", ctx_r1.isLoading());
  }
}
function VerifyEmailComponent_Conditional_4_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 18);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u9A57\u8B49\u4E2D...");
    \u0275\u0275elementEnd();
  }
}
function VerifyEmailComponent_Conditional_4_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u9A57\u8B49 ");
  }
}
function VerifyEmailComponent_Conditional_4_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.resendCooldown(), "s \u5F8C\u91CD\u65B0\u767C\u9001 ");
  }
}
function VerifyEmailComponent_Conditional_4_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u91CD\u65B0\u767C\u9001 ");
  }
}
function VerifyEmailComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "h2");
    \u0275\u0275text(2, "\u9A57\u8B49\u60A8\u7684\u90F5\u7BB1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 12);
    \u0275\u0275repeaterCreate(6, VerifyEmailComponent_Conditional_4_For_7_Template, 1, 2, "input", 13, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 14);
    \u0275\u0275listener("click", function VerifyEmailComponent_Conditional_4_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.verifyByCode());
    });
    \u0275\u0275conditionalCreate(9, VerifyEmailComponent_Conditional_4_Conditional_9_Template, 3, 0)(10, VerifyEmailComponent_Conditional_4_Conditional_10_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "p", 15);
    \u0275\u0275text(12, " \u6C92\u6709\u6536\u5230\u90F5\u4EF6\uFF1F ");
    \u0275\u0275elementStart(13, "button", 16);
    \u0275\u0275listener("click", function VerifyEmailComponent_Conditional_4_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.resendEmail());
    });
    \u0275\u0275conditionalCreate(14, VerifyEmailComponent_Conditional_4_Conditional_14_Template, 1, 1)(15, VerifyEmailComponent_Conditional_4_Conditional_15_Template, 1, 0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u8ACB\u8F38\u5165\u767C\u9001\u5230 ", ctx_r1.email, " \u7684 6 \u4F4D\u9A57\u8B49\u78BC");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(\u0275\u0275pureFunction0(5, _c0));
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.isLoading() || ctx_r1.code.length < 6);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoading() ? 9 : 10);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.resendCooldown() > 0);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.resendCooldown() > 0 ? 14 : 15);
  }
}
var VerifyEmailComponent = class _VerifyEmailComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.i18n = inject(I18nService);
    this.email = "";
    this.code = "";
    this.codeDigits = signal(["", "", "", "", "", ""], ...ngDevMode ? [{ debugName: "codeDigits" }] : []);
    this.verifying = signal(false, ...ngDevMode ? [{ debugName: "verifying" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.success = signal(false, ...ngDevMode ? [{ debugName: "success" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
    this.resendCooldown = signal(0, ...ngDevMode ? [{ debugName: "resendCooldown" }] : []);
  }
  ngOnInit() {
    const token = this.route.snapshot.queryParams["token"];
    this.email = this.route.snapshot.queryParams["email"] || "";
    if (token) {
      this.verifyByToken(token);
    }
  }
  async verifyByToken(token) {
    this.verifying.set(true);
    this.error.set(null);
    try {
      const result = await this.authService.verifyEmail(token);
      if (result.success) {
        this.success.set(true);
      } else {
        this.error.set(result.error || "\u9A57\u8B49\u5931\u6557");
      }
    } catch (e) {
      this.error.set(e.message || "\u9A57\u8B49\u5931\u6557");
    } finally {
      this.verifying.set(false);
    }
  }
  async verifyByCode() {
    if (this.code.length < 6)
      return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.authService.verifyEmailByCode(this.email, this.code);
      if (result.success) {
        this.success.set(true);
      } else {
        this.error.set(result.error || "\u9A57\u8B49\u5931\u6557");
      }
    } catch (e) {
      this.error.set(e.message || "\u9A57\u8B49\u5931\u6557");
    } finally {
      this.isLoading.set(false);
    }
  }
  async resendEmail() {
    if (this.resendCooldown() > 0)
      return;
    try {
      await this.authService.resendVerificationEmail();
      this.resendCooldown.set(60);
      this.cooldownInterval = setInterval(() => {
        const current = this.resendCooldown();
        if (current <= 1) {
          clearInterval(this.cooldownInterval);
          this.resendCooldown.set(0);
        } else {
          this.resendCooldown.set(current - 1);
        }
      }, 1e3);
    } catch (e) {
      this.error.set(e.message || "\u767C\u9001\u5931\u6557");
    }
  }
  onCodeInput(event, index) {
    const input = event.target;
    const value = input.value.replace(/\D/g, "");
    const digits = [...this.codeDigits()];
    digits[index] = value;
    this.codeDigits.set(digits);
    this.code = digits.join("");
    if (value && index < 5) {
      const nextInput = input.parentElement?.children[index + 1];
      nextInput?.focus();
    }
  }
  onKeyDown(event, index) {
    const input = event.target;
    if (event.key === "Backspace" && !input.value && index > 0) {
      const prevInput = input.parentElement?.children[index - 1];
      prevInput?.focus();
    }
  }
  onPaste(event) {
    event.preventDefault();
    const paste = event.clipboardData?.getData("text")?.replace(/\D/g, "").slice(0, 6) || "";
    const digits = paste.split("");
    while (digits.length < 6)
      digits.push("");
    this.codeDigits.set(digits);
    this.code = paste;
  }
  static {
    this.\u0275fac = function VerifyEmailComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _VerifyEmailComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _VerifyEmailComponent, selectors: [["app-verify-email"]], decls: 5, vars: 1, consts: [[1, "verify-email-page"], [1, "verifying-state"], [1, "success-state"], [1, "error-state"], [1, "code-form"], [1, "loading-spinner", "large"], [1, "success-icon"], ["routerLink", "/", 1, "primary-btn"], [1, "error-icon"], [1, "actions"], [1, "secondary-btn", 3, "click"], ["routerLink", "/auth/login", 1, "link"], [1, "code-input-group"], ["type", "text", "maxlength", "1", 1, "code-input", 3, "value", "disabled"], [1, "primary-btn", 3, "click", "disabled"], [1, "resend-text"], [1, "link-btn", 3, "click", "disabled"], ["type", "text", "maxlength", "1", 1, "code-input", 3, "input", "keydown", "paste", "value", "disabled"], [1, "loading-spinner"]], template: function VerifyEmailComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0);
        \u0275\u0275conditionalCreate(1, VerifyEmailComponent_Conditional_1_Template, 6, 0, "div", 1)(2, VerifyEmailComponent_Conditional_2_Template, 9, 0, "div", 2)(3, VerifyEmailComponent_Conditional_3_Template, 12, 1, "div", 3)(4, VerifyEmailComponent_Conditional_4_Template, 16, 6, "div", 4);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.verifying() ? 1 : ctx.success() ? 2 : ctx.error() ? 3 : 4);
      }
    }, dependencies: [CommonModule, FormsModule, RouterModule, RouterLink], styles: ["\n\n.verify-email-page[_ngcontent-%COMP%] {\n  color: var(--text-primary, #fff);\n  text-align: center;\n  padding: 2rem;\n}\n.verifying-state[_ngcontent-%COMP%], \n.success-state[_ngcontent-%COMP%], \n.error-state[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n}\n.success-icon[_ngcontent-%COMP%], \n.error-icon[_ngcontent-%COMP%] {\n  font-size: 4rem;\n  margin-bottom: 1rem;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n.loading-spinner.large[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 48px;\n  border-width: 4px;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.code-form[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin-bottom: 0.5rem;\n}\n.code-form[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.code-input-group[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  justify-content: center;\n  margin-bottom: 2rem;\n}\n.code-input[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 56px;\n  text-align: center;\n  font-size: 1.5rem;\n  font-weight: 600;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 2px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  transition: all 0.2s;\n}\n.code-input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);\n}\n.primary-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 2rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.primary-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.primary-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.secondary-btn[_ngcontent-%COMP%] {\n  padding: 0.75rem 1.5rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.secondary-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-tertiary, #252525);\n}\n.actions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n  margin-top: 1rem;\n}\n.link[_ngcontent-%COMP%], \n.link-btn[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: inherit;\n}\n.link[_ngcontent-%COMP%]:hover, \n.link-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  text-decoration: underline;\n}\n.link-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.resend-text[_ngcontent-%COMP%] {\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n}\n/*# sourceMappingURL=verify-email.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VerifyEmailComponent, [{
    type: Component,
    args: [{ selector: "app-verify-email", standalone: true, imports: [CommonModule, FormsModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="verify-email-page">
      @if (verifying()) {
        <div class="verifying-state">
          <div class="loading-spinner large"></div>
          <h2>\u6B63\u5728\u9A57\u8B49...</h2>
          <p>\u8ACB\u7A0D\u5019</p>
        </div>
      } @else if (success()) {
        <div class="success-state">
          <div class="success-icon">\u2705</div>
          <h2>\u9A57\u8B49\u6210\u529F\uFF01</h2>
          <p>\u60A8\u7684\u90F5\u7BB1\u5DF2\u6210\u529F\u9A57\u8B49\uFF0C\u73FE\u5728\u53EF\u4EE5\u4F7F\u7528\u6240\u6709\u529F\u80FD\u4E86</p>
          <button class="primary-btn" routerLink="/">\u958B\u59CB\u4F7F\u7528</button>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <div class="error-icon">\u274C</div>
          <h2>\u9A57\u8B49\u5931\u6557</h2>
          <p>{{ error() }}</p>
          <div class="actions">
            <button class="secondary-btn" (click)="resendEmail()">\u91CD\u65B0\u767C\u9001\u9A57\u8B49\u90F5\u4EF6</button>
            <a routerLink="/auth/login" class="link">\u8FD4\u56DE\u767B\u5165</a>
          </div>
        </div>
      } @else {
        <div class="code-form">
          <h2>\u9A57\u8B49\u60A8\u7684\u90F5\u7BB1</h2>
          <p>\u8ACB\u8F38\u5165\u767C\u9001\u5230 {{ email }} \u7684 6 \u4F4D\u9A57\u8B49\u78BC</p>
          
          <div class="code-input-group">
            @for (i of [0,1,2,3,4,5]; track i) {
              <input
                type="text"
                maxlength="1"
                class="code-input"
                [value]="codeDigits()[i] || ''"
                (input)="onCodeInput($event, i)"
                (keydown)="onKeyDown($event, i)"
                (paste)="onPaste($event)"
                [disabled]="isLoading()"
              />
            }
          </div>
          
          <button 
            class="primary-btn"
            (click)="verifyByCode()"
            [disabled]="isLoading() || code.length < 6"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              <span>\u9A57\u8B49\u4E2D...</span>
            } @else {
              \u9A57\u8B49
            }
          </button>
          
          <p class="resend-text">
            \u6C92\u6709\u6536\u5230\u90F5\u4EF6\uFF1F
            <button class="link-btn" (click)="resendEmail()" [disabled]="resendCooldown() > 0">
              @if (resendCooldown() > 0) {
                {{ resendCooldown() }}s \u5F8C\u91CD\u65B0\u767C\u9001
              } @else {
                \u91CD\u65B0\u767C\u9001
              }
            </button>
          </p>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;856456a1ad0439a9da0db91ac3d37e3f9796308cc19463fadc803662f6b21683;D:/tgkz2026/src/auth/verify-email.component.ts */\n.verify-email-page {\n  color: var(--text-primary, #fff);\n  text-align: center;\n  padding: 2rem;\n}\n.verifying-state,\n.success-state,\n.error-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n}\n.success-icon,\n.error-icon {\n  font-size: 4rem;\n  margin-bottom: 1rem;\n}\n.loading-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n.loading-spinner.large {\n  width: 48px;\n  height: 48px;\n  border-width: 4px;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.code-form h2 {\n  margin-bottom: 0.5rem;\n}\n.code-form p {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.code-input-group {\n  display: flex;\n  gap: 0.75rem;\n  justify-content: center;\n  margin-bottom: 2rem;\n}\n.code-input {\n  width: 48px;\n  height: 56px;\n  text-align: center;\n  font-size: 1.5rem;\n  font-weight: 600;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 2px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  transition: all 0.2s;\n}\n.code-input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);\n}\n.primary-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 2rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.primary-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.primary-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.secondary-btn {\n  padding: 0.75rem 1.5rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.secondary-btn:hover {\n  background: var(--bg-tertiary, #252525);\n}\n.actions {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n  margin-top: 1rem;\n}\n.link,\n.link-btn {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: inherit;\n}\n.link:hover,\n.link-btn:hover:not(:disabled) {\n  text-decoration: underline;\n}\n.link-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.resend-text {\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n}\n/*# sourceMappingURL=verify-email.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(VerifyEmailComponent, { className: "VerifyEmailComponent", filePath: "src/auth/verify-email.component.ts", lineNumber: 237 });
})();
export {
  VerifyEmailComponent
};
//# sourceMappingURL=chunk-2KN4NZLF.js.map
