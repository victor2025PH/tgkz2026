import {
  AuthService
} from "./chunk-LSAEK5E6.js";
import {
  ActivatedRoute,
  Router
} from "./chunk-T45T4QAG.js";
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
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵgetCurrentView,
  ɵɵnextContext,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-K4KD4A2Z.js";

// src/auth/telegram-callback.component.ts
function TelegramCallbackComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 1);
    \u0275\u0275domElement(1, "div", 3);
    \u0275\u0275domElementStart(2, "p");
    \u0275\u0275text(3, "\u6B63\u5728\u8655\u7406 Telegram \u767B\u5165...");
    \u0275\u0275domElementEnd()();
  }
}
function TelegramCallbackComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 2)(1, "span", 4);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "h3");
    \u0275\u0275text(4, "\u767B\u5165\u5931\u6557");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "button", 5);
    \u0275\u0275domListener("click", function TelegramCallbackComponent_Conditional_2_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.goToLogin());
    });
    \u0275\u0275text(8, "\u8FD4\u56DE\u767B\u5165");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r1.error());
  }
}
var TelegramCallbackComponent = class _TelegramCallbackComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.isLoading = signal(true, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
  }
  async ngOnInit() {
    try {
      let authData = null;
      const hash = window.location.hash;
      if (hash && hash.includes("tgAuthResult=")) {
        const match = hash.match(/tgAuthResult=([^&]+)/);
        if (match && match[1]) {
          try {
            const decoded = atob(match[1]);
            authData = JSON.parse(decoded);
            console.log("Telegram auth data from tgAuthResult:", authData);
          } catch (e) {
            console.error("Failed to parse tgAuthResult:", e);
          }
        }
      }
      if (!authData) {
        const params = this.route.snapshot.queryParams;
        if (params["id"] && params["hash"]) {
          authData = {
            id: params["id"],
            first_name: params["first_name"],
            last_name: params["last_name"],
            username: params["username"],
            photo_url: params["photo_url"],
            auth_date: params["auth_date"],
            hash: params["hash"]
          };
        }
      }
      if (!authData) {
        const fragment = this.route.snapshot.fragment;
        if (fragment && fragment.includes("id=")) {
          const fragmentParams = new URLSearchParams(fragment);
          authData = {
            id: fragmentParams.get("id"),
            first_name: fragmentParams.get("first_name"),
            last_name: fragmentParams.get("last_name"),
            username: fragmentParams.get("username"),
            photo_url: fragmentParams.get("photo_url"),
            auth_date: fragmentParams.get("auth_date"),
            hash: fragmentParams.get("hash")
          };
        }
      }
      if (!authData || !authData.id) {
        throw new Error("\u7F3A\u5C11 Telegram \u8A8D\u8B49\u6578\u64DA");
      }
      await this.processTelegramAuth(authData);
    } catch (e) {
      console.error("Telegram callback error:", e);
      this.error.set(e.message || "Telegram \u767B\u5165\u5931\u6557");
    } finally {
      this.isLoading.set(false);
    }
  }
  async processTelegramAuth(authData) {
    if (!authData.id || !authData.hash) {
      throw new Error("\u7121\u6548\u7684 Telegram \u8A8D\u8B49\u6578\u64DA");
    }
    const result = await this.authService.telegramLogin(authData);
    if (result.success) {
      const returnUrl = sessionStorage.getItem("auth_return_url") || "/";
      sessionStorage.removeItem("auth_return_url");
      if (window.opener) {
        window.opener.postMessage({
          type: "telegram_auth",
          auth: authData
        }, window.location.origin);
        window.close();
      } else {
        this.router.navigateByUrl(returnUrl);
      }
    } else {
      throw new Error(result.error || "Telegram \u767B\u5165\u5931\u6557");
    }
  }
  goToLogin() {
    this.router.navigate(["/auth/login"]);
  }
  static {
    this.\u0275fac = function TelegramCallbackComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _TelegramCallbackComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _TelegramCallbackComponent, selectors: [["app-telegram-callback"]], decls: 3, vars: 1, consts: [[1, "callback-page"], [1, "loading"], [1, "error"], [1, "spinner"], [1, "error-icon"], [1, "back-btn", 3, "click"]], template: function TelegramCallbackComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0);
        \u0275\u0275conditionalCreate(1, TelegramCallbackComponent_Conditional_1_Template, 4, 0, "div", 1)(2, TelegramCallbackComponent_Conditional_2_Template, 9, 1, "div", 2);
        \u0275\u0275domElementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isLoading() ? 1 : ctx.error() ? 2 : -1);
      }
    }, dependencies: [CommonModule], styles: ["\n\n.callback-page[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: var(--bg-primary, #0a0a0a);\n  color: var(--text-primary, #fff);\n}\n.loading[_ngcontent-%COMP%] {\n  text-align: center;\n}\n.spinner[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 48px;\n  border: 3px solid rgba(255, 255, 255, 0.1);\n  border-top-color: var(--primary, #3b82f6);\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n  margin: 0 auto 1rem;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.error[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  max-width: 400px;\n}\n.error-icon[_ngcontent-%COMP%] {\n  font-size: 3rem;\n  display: block;\n  margin-bottom: 1rem;\n}\n.error[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin-bottom: 0.5rem;\n  color: #f87171;\n}\n.error[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.back-btn[_ngcontent-%COMP%] {\n  padding: 0.75rem 1.5rem;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  cursor: pointer;\n  transition: opacity 0.2s;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  opacity: 0.9;\n}\n/*# sourceMappingURL=telegram-callback.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TelegramCallbackComponent, [{
    type: Component,
    args: [{ selector: "app-telegram-callback", standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="callback-page">
      @if (isLoading()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>\u6B63\u5728\u8655\u7406 Telegram \u767B\u5165...</p>
        </div>
      } @else if (error()) {
        <div class="error">
          <span class="error-icon">\u26A0\uFE0F</span>
          <h3>\u767B\u5165\u5931\u6557</h3>
          <p>{{ error() }}</p>
          <button class="back-btn" (click)="goToLogin()">\u8FD4\u56DE\u767B\u5165</button>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;5602993ca791717b7d05690a2d65b52bb5d0b930bd6e17854ac9257ea43131fd;D:/tgkz2026/src/auth/telegram-callback.component.ts */\n.callback-page {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: var(--bg-primary, #0a0a0a);\n  color: var(--text-primary, #fff);\n}\n.loading {\n  text-align: center;\n}\n.spinner {\n  width: 48px;\n  height: 48px;\n  border: 3px solid rgba(255, 255, 255, 0.1);\n  border-top-color: var(--primary, #3b82f6);\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n  margin: 0 auto 1rem;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.error {\n  text-align: center;\n  padding: 2rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  max-width: 400px;\n}\n.error-icon {\n  font-size: 3rem;\n  display: block;\n  margin-bottom: 1rem;\n}\n.error h3 {\n  margin-bottom: 0.5rem;\n  color: #f87171;\n}\n.error p {\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.back-btn {\n  padding: 0.75rem 1.5rem;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  cursor: pointer;\n  transition: opacity 0.2s;\n}\n.back-btn:hover {\n  opacity: 0.9;\n}\n/*# sourceMappingURL=telegram-callback.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(TelegramCallbackComponent, { className: "TelegramCallbackComponent", filePath: "src/auth/telegram-callback.component.ts", lineNumber: 102 });
})();
export {
  TelegramCallbackComponent
};
//# sourceMappingURL=chunk-TZCFC6F5.js.map
