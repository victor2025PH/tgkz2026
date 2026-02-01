import {
  AuthService
} from "./chunk-7DUCTZ33.js";
import "./chunk-6TNMQ6CH.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
} from "./chunk-G42HF5FJ.js";
import {
  I18nService
} from "./chunk-NBYDSPUQ.js";
import {
  CommonModule
} from "./chunk-7CO55ZOM.js";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
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
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-Y4VZODST.js";

// src/views/user-settings-view.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function UserSettingsViewComponent_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 7);
    \u0275\u0275listener("click", function UserSettingsViewComponent_For_7_Template_button_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.activeTab.set(tab_r2.id));
    });
    \u0275\u0275elementStart(1, "span", 8);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 9);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.activeTab() === tab_r2.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(tab_r2.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.t(tab_r2.label));
  }
}
function UserSettingsViewComponent_Conditional_9_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 17);
  }
}
function UserSettingsViewComponent_Conditional_9_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 18);
    \u0275\u0275text(1, "\u2705 \u5DF2\u4FDD\u5B58");
    \u0275\u0275elementEnd();
  }
}
function UserSettingsViewComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6)(1, "h2");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 10)(4, "label");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275element(6, "input", 11);
    \u0275\u0275elementStart(7, "span", 12);
    \u0275\u0275text(8, "\u90F5\u7BB1\u7121\u6CD5\u66F4\u6539");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 10)(10, "label");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 13);
    \u0275\u0275twoWayListener("ngModelChange", function UserSettingsViewComponent_Conditional_9_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.profileForm.username, $event) || (ctx_r2.profileForm.username = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 10)(14, "label");
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "input", 14);
    \u0275\u0275twoWayListener("ngModelChange", function UserSettingsViewComponent_Conditional_9_Template_input_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.profileForm.display_name, $event) || (ctx_r2.profileForm.display_name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 10)(18, "label");
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "input", 15);
    \u0275\u0275twoWayListener("ngModelChange", function UserSettingsViewComponent_Conditional_9_Template_input_ngModelChange_20_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.profileForm.avatar_url, $event) || (ctx_r2.profileForm.avatar_url = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "button", 16);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_9_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.saveProfile());
    });
    \u0275\u0275conditionalCreate(22, UserSettingsViewComponent_Conditional_9_Conditional_22_Template, 1, 0, "span", 17);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(24, UserSettingsViewComponent_Conditional_9_Conditional_24_Template, 2, 0, "span", 18);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_3_0;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.t("userSettings.profile"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.email"));
    \u0275\u0275advance();
    \u0275\u0275property("value", ((tmp_3_0 = ctx_r2.user()) == null ? null : tmp_3_0.email) || "");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.username"));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.profileForm.username);
    \u0275\u0275property("placeholder", ctx_r2.t("auth.usernamePlaceholder"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.t("userSettings.displayName"));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.profileForm.display_name);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.t("userSettings.avatarUrl"));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.profileForm.avatar_url);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.isSaving());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isSaving() ? 22 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.t("userSettings.updateProfile"), " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.saveSuccess() ? 24 : -1);
  }
}
function UserSettingsViewComponent_Conditional_10_Conditional_11_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 26);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r2.passwordError());
  }
}
function UserSettingsViewComponent_Conditional_10_Conditional_11_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 17);
  }
}
function UserSettingsViewComponent_Conditional_10_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 22)(1, "div", 10)(2, "label");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 24);
    \u0275\u0275twoWayListener("ngModelChange", function UserSettingsViewComponent_Conditional_10_Conditional_11_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r2.passwordForm.currentPassword, $event) || (ctx_r2.passwordForm.currentPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 10)(6, "label");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function UserSettingsViewComponent_Conditional_10_Conditional_11_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r2.passwordForm.newPassword, $event) || (ctx_r2.passwordForm.newPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 10)(10, "label");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function UserSettingsViewComponent_Conditional_10_Conditional_11_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r2.passwordForm.confirmPassword, $event) || (ctx_r2.passwordForm.confirmPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(13, UserSettingsViewComponent_Conditional_10_Conditional_11_Conditional_13_Template, 2, 1, "div", 26);
    \u0275\u0275elementStart(14, "button", 16);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_10_Conditional_11_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.changePassword());
    });
    \u0275\u0275conditionalCreate(15, UserSettingsViewComponent_Conditional_10_Conditional_11_Conditional_15_Template, 1, 0, "span", 17);
    \u0275\u0275text(16, " \u78BA\u8A8D\u4FEE\u6539 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.currentPassword"));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.passwordForm.currentPassword);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.newPassword"));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.passwordForm.newPassword);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.confirmNewPassword"));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.passwordForm.confirmPassword);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.passwordError() ? 13 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.isChangingPassword());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isChangingPassword() ? 15 : -1);
  }
}
function UserSettingsViewComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6)(1, "h2");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 19)(4, "div", 20)(5, "h3");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p");
    \u0275\u0275text(8, "\u5B9A\u671F\u66F4\u63DB\u5BC6\u78BC\u4EE5\u4FDD\u8B77\u5E33\u6236\u5B89\u5168");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "button", 21);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_10_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showPasswordForm.set(!ctx_r2.showPasswordForm()));
    });
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(11, UserSettingsViewComponent_Conditional_10_Conditional_11_Template, 17, 9, "div", 22);
    \u0275\u0275elementStart(12, "div", 19)(13, "div", 20)(14, "h3");
    \u0275\u0275text(15, "\u5169\u6B65\u9A57\u8B49");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "p");
    \u0275\u0275text(17, "\u589E\u52A0\u5E33\u6236\u5B89\u5168\u6027");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "span", 23);
    \u0275\u0275text(19, "\u5373\u5C07\u63A8\u51FA");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.t("userSettings.security"));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.changePassword"));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r2.showPasswordForm() ? "\u53D6\u6D88" : "\u4FEE\u6539", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.showPasswordForm() ? 11 : -1);
  }
}
function UserSettingsViewComponent_Conditional_11_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28);
    \u0275\u0275text(1, "\u8F09\u5165\u4E2D...");
    \u0275\u0275elementEnd();
  }
}
function UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 36);
    \u0275\u0275text(1, "\u7576\u524D\u8A2D\u5099");
    \u0275\u0275elementEnd();
  }
}
function UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 38);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Conditional_9_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const session_r8 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.revokeSession(session_r8.id));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.t("userSettings.revokeSession"), " ");
  }
}
function UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 33);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 34)(4, "strong");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 35);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(8, UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Conditional_8_Template, 2, 0, "span", 36);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(9, UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Conditional_9_Template, 2, 1, "button", 37);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const session_r8 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("current", session_r8.is_current);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.getDeviceIcon(session_r8.device_type), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(session_r8.device_name || "\u672A\u77E5\u8A2D\u5099");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", session_r8.ip_address, " \xB7 \u6700\u5F8C\u6D3B\u52D5: ", ctx_r2.formatDate(session_r8.last_activity_at), " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(session_r8.is_current ? 8 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!session_r8.is_current ? 9 : -1);
  }
}
function UserSettingsViewComponent_Conditional_11_Conditional_6_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 39);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_11_Conditional_6_Conditional_3_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.revokeAllSessions());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.t("userSettings.revokeAllSessions"), " ");
  }
}
function UserSettingsViewComponent_Conditional_11_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275repeaterCreate(1, UserSettingsViewComponent_Conditional_11_Conditional_6_For_2_Template, 10, 8, "div", 30, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, UserSettingsViewComponent_Conditional_11_Conditional_6_Conditional_3_Template, 2, 1, "button", 31);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.sessions());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.sessions().length > 1 ? 3 : -1);
  }
}
function UserSettingsViewComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 6)(1, "h2");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 27);
    \u0275\u0275text(4, "\u7BA1\u7406\u60A8\u5728\u5404\u8A2D\u5099\u4E0A\u7684\u767B\u5165\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(5, UserSettingsViewComponent_Conditional_11_Conditional_5_Template, 2, 0, "div", 28)(6, UserSettingsViewComponent_Conditional_11_Conditional_6_Template, 4, 1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.t("auth.sessions"));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r2.isLoadingSessions() ? 5 : 6);
  }
}
function UserSettingsViewComponent_Conditional_12_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 41)(1, "div", 43)(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "code");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 44);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "button", 38);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_12_For_7_Template_button_click_8_listener() {
      const key_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.deleteApiKey(key_r12.id));
    });
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const key_r12 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(key_r12.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", key_r12.prefix, "...****");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", ctx_r2.t("userSettings.lastUsed"), ": ", key_r12.last_used_at ? ctx_r2.formatDate(key_r12.last_used_at) : ctx_r2.t("userSettings.neverUsed"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.t("userSettings.deleteApiKey"), " ");
  }
}
function UserSettingsViewComponent_Conditional_12_ForEmpty_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 42);
    \u0275\u0275text(1, "\u66AB\u7121 API \u91D1\u9470");
    \u0275\u0275elementEnd();
  }
}
function UserSettingsViewComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6)(1, "h2");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 27);
    \u0275\u0275text(4, "\u7528\u65BC\u7A0B\u5E8F\u5316\u8A2A\u554F TG-Matrix API");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 40);
    \u0275\u0275repeaterCreate(6, UserSettingsViewComponent_Conditional_12_For_7_Template, 10, 5, "div", 41, _forTrack0, false, UserSettingsViewComponent_Conditional_12_ForEmpty_8_Template, 2, 0, "p", 42);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 21);
    \u0275\u0275listener("click", function UserSettingsViewComponent_Conditional_12_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.createApiKey());
    });
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.t("userSettings.apiKeys"));
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r2.apiKeys());
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" + ", ctx_r2.t("userSettings.createApiKey"), " ");
  }
}
var UserSettingsViewComponent = class _UserSettingsViewComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.i18n = inject(I18nService);
    this.tabs = [
      { id: "profile", icon: "\u{1F464}", label: "userSettings.profile" },
      { id: "security", icon: "\u{1F512}", label: "userSettings.security" },
      { id: "sessions", icon: "\u{1F4F1}", label: "auth.sessions" },
      { id: "apiKeys", icon: "\u{1F511}", label: "userSettings.apiKeys" }
    ];
    this.activeTab = signal("profile", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.user = this.authService.user;
    this.profileForm = {
      username: "",
      display_name: "",
      avatar_url: ""
    };
    this.isSaving = signal(false, ...ngDevMode ? [{ debugName: "isSaving" }] : []);
    this.saveSuccess = signal(false, ...ngDevMode ? [{ debugName: "saveSuccess" }] : []);
    this.showPasswordForm = signal(false, ...ngDevMode ? [{ debugName: "showPasswordForm" }] : []);
    this.passwordForm = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    };
    this.isChangingPassword = signal(false, ...ngDevMode ? [{ debugName: "isChangingPassword" }] : []);
    this.passwordError = signal(null, ...ngDevMode ? [{ debugName: "passwordError" }] : []);
    this.sessions = signal([], ...ngDevMode ? [{ debugName: "sessions" }] : []);
    this.isLoadingSessions = signal(false, ...ngDevMode ? [{ debugName: "isLoadingSessions" }] : []);
    this.apiKeys = signal([], ...ngDevMode ? [{ debugName: "apiKeys" }] : []);
  }
  t(key) {
    return this.i18n.t(key);
  }
  ngOnInit() {
    const user = this.user();
    if (user) {
      this.profileForm = {
        username: user.username || "",
        display_name: user.display_name || "",
        avatar_url: user.avatar_url || ""
      };
    }
    this.loadSessions();
  }
  async saveProfile() {
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    try {
      const result = await this.authService.updateProfile(this.profileForm);
      if (result.success) {
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3e3);
      }
    } finally {
      this.isSaving.set(false);
    }
  }
  async changePassword() {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError.set("\u65B0\u5BC6\u78BC\u4E0D\u5339\u914D");
      return;
    }
    this.isChangingPassword.set(true);
    this.passwordError.set(null);
    try {
      const result = await this.authService.changePassword(this.passwordForm.currentPassword, this.passwordForm.newPassword);
      if (result.success) {
        this.showPasswordForm.set(false);
        this.passwordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
      } else {
        this.passwordError.set(result.error || "\u4FEE\u6539\u5931\u6557");
      }
    } finally {
      this.isChangingPassword.set(false);
    }
  }
  async loadSessions() {
    this.isLoadingSessions.set(true);
    try {
      const sessions = await this.authService.getSessions();
      this.sessions.set(sessions);
    } finally {
      this.isLoadingSessions.set(false);
    }
  }
  async revokeSession(sessionId) {
    const success = await this.authService.revokeSession(sessionId);
    if (success) {
      this.sessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
    }
  }
  /**
   * 🆕 Phase 4: 登出除當前設備外的所有設備
   */
  async revokeAllSessions() {
    if (!confirm("\u78BA\u5B9A\u8981\u767B\u51FA\u6240\u6709\u5176\u4ED6\u8A2D\u5099\u55CE\uFF1F\u9019\u5C07\u8981\u6C42\u5728\u9019\u4E9B\u8A2D\u5099\u4E0A\u91CD\u65B0\u767B\u5165\u3002")) {
      return;
    }
    const count = await this.authService.revokeAllOtherSessions();
    if (count > 0) {
      await this.loadSessions();
      alert(`\u5DF2\u6210\u529F\u767B\u51FA ${count} \u500B\u8A2D\u5099`);
    }
  }
  createApiKey() {
  }
  deleteApiKey(keyId) {
  }
  getDeviceIcon(deviceType) {
    const icons = {
      "desktop": "\u{1F4BB}",
      "web": "\u{1F310}",
      "mobile": "\u{1F4F1}",
      "tablet": "\u{1F4F1}"
    };
    return icons[deviceType] || "\u{1F4BB}";
  }
  formatDate(date) {
    if (!date)
      return "\u672A\u77E5";
    return new Date(date).toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  static {
    this.\u0275fac = function UserSettingsViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UserSettingsViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _UserSettingsViewComponent, selectors: [["app-user-settings-view"]], decls: 13, vars: 5, consts: [[1, "user-settings-page"], [1, "page-header"], [1, "settings-container"], [1, "settings-nav"], [1, "nav-item", 3, "active"], [1, "settings-content"], [1, "settings-section"], [1, "nav-item", 3, "click"], [1, "nav-icon"], [1, "nav-label"], [1, "form-group"], ["type", "email", "disabled", "", 1, "input-disabled", 3, "value"], [1, "hint"], ["type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "text", "placeholder", "\u60A8\u7684\u986F\u793A\u540D\u7A31", 3, "ngModelChange", "ngModel"], ["type", "url", "placeholder", "https://...", 3, "ngModelChange", "ngModel"], [1, "btn-primary", 3, "click", "disabled"], [1, "loading-spinner"], [1, "success-message"], [1, "security-item"], [1, "item-info"], [1, "btn-secondary", 3, "click"], [1, "password-form"], [1, "badge"], ["type", "password", "autocomplete", "current-password", 3, "ngModelChange", "ngModel"], ["type", "password", "autocomplete", "new-password", 3, "ngModelChange", "ngModel"], [1, "error-message"], [1, "section-desc"], [1, "loading-state"], [1, "sessions-list"], [1, "session-item", 3, "current"], [1, "btn-danger"], [1, "session-item"], [1, "session-icon"], [1, "session-info"], [1, "session-meta"], [1, "current-badge"], [1, "btn-danger-small"], [1, "btn-danger-small", 3, "click"], [1, "btn-danger", 3, "click"], [1, "api-keys-list"], [1, "api-key-item"], [1, "empty-state"], [1, "key-info"], [1, "key-meta"]], template: function UserSettingsViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1");
        \u0275\u0275text(3);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(4, "div", 2)(5, "nav", 3);
        \u0275\u0275repeaterCreate(6, UserSettingsViewComponent_For_7_Template, 5, 4, "button", 4, _forTrack0);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "div", 5);
        \u0275\u0275conditionalCreate(9, UserSettingsViewComponent_Conditional_9_Template, 25, 14, "div", 6);
        \u0275\u0275conditionalCreate(10, UserSettingsViewComponent_Conditional_10_Template, 20, 4, "div", 6);
        \u0275\u0275conditionalCreate(11, UserSettingsViewComponent_Conditional_11_Template, 7, 2, "div", 6);
        \u0275\u0275conditionalCreate(12, UserSettingsViewComponent_Conditional_12_Template, 11, 3, "div", 6);
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate(ctx.t("userSettings.title"));
        \u0275\u0275advance(3);
        \u0275\u0275repeater(ctx.tabs);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.activeTab() === "profile" ? 9 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeTab() === "security" ? 10 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeTab() === "sessions" ? 11 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeTab() === "apiKeys" ? 12 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel], styles: ["\n\n.user-settings-page[_ngcontent-%COMP%] {\n  padding: 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.5rem;\n}\n.settings-container[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 2rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.settings-nav[_ngcontent-%COMP%] {\n  width: 240px;\n  padding: 1rem;\n  background: var(--bg-tertiary, #151515);\n  border-right: 1px solid var(--border-color, #333);\n}\n.nav-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  width: 100%;\n  padding: 0.75rem 1rem;\n  background: transparent;\n  border: none;\n  border-radius: 8px;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  text-align: left;\n}\n.nav-item[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.05);\n  color: var(--text-primary, #fff);\n}\n.nav-item.active[_ngcontent-%COMP%] {\n  background: var(--primary, #3b82f6);\n  color: white;\n}\n.nav-icon[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n}\n.settings-content[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 2rem;\n}\n.settings-section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin-bottom: 0.5rem;\n}\n.section-desc[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1.25rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n  margin-bottom: 0.5rem;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 400px;\n  padding: 0.75rem 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n}\n.input-disabled[_ngcontent-%COMP%] {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.hint[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 0.75rem;\n  color: var(--text-muted, #666);\n  margin-top: 0.25rem;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1.5rem;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 0.875rem;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--primary-hover, #2563eb);\n}\n.btn-primary[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  border-radius: 6px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.btn-secondary[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.05);\n  border-color: var(--border-hover, #444);\n}\n.btn-danger-small[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  background: transparent;\n  border: 1px solid rgba(239, 68, 68, 0.5);\n  border-radius: 6px;\n  color: #f87171;\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.btn-danger-small[_ngcontent-%COMP%]:hover {\n  background: rgba(239, 68, 68, 0.1);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  padding: 0.75rem 1.5rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  font-size: 0.875rem;\n  cursor: pointer;\n  margin-top: 1rem;\n}\n.btn-danger[_ngcontent-%COMP%]:hover {\n  background: rgba(239, 68, 68, 0.2);\n}\n.security-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  margin-bottom: 1rem;\n}\n.item-info[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  margin-bottom: 0.25rem;\n}\n.item-info[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.password-form[_ngcontent-%COMP%] {\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  margin-bottom: 1rem;\n}\n.sessions-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  margin-bottom: 1rem;\n}\n.session-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  border: 1px solid transparent;\n}\n.session-item.current[_ngcontent-%COMP%] {\n  border-color: var(--primary, #3b82f6);\n}\n.session-icon[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n}\n.session-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.session-info[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 0.875rem;\n}\n.session-meta[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.current-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  background: var(--primary, #3b82f6);\n  border-radius: 4px;\n  font-size: 0.625rem;\n  color: white;\n  margin-left: 0.5rem;\n}\n.api-keys-list[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.api-key-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  margin-bottom: 0.75rem;\n}\n.key-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.key-info[_ngcontent-%COMP%]   code[_ngcontent-%COMP%] {\n  font-family: monospace;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n}\n.key-meta[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #666);\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  color: var(--text-secondary, #888);\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.success-message[_ngcontent-%COMP%] {\n  margin-left: 1rem;\n  color: #4ade80;\n  font-size: 0.875rem;\n}\n.error-message[_ngcontent-%COMP%] {\n  padding: 0.5rem;\n  background: rgba(239, 68, 68, 0.1);\n  border-radius: 4px;\n  color: #f87171;\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.badge[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.75rem;\n  background: var(--bg-tertiary, #252525);\n  border-radius: 4px;\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.loading-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  color: var(--text-secondary, #888);\n}\n@media (max-width: 768px) {\n  .settings-container[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n  .settings-nav[_ngcontent-%COMP%] {\n    width: 100%;\n    flex-direction: row;\n    overflow-x: auto;\n    border-right: none;\n    border-bottom: 1px solid var(--border-color, #333);\n  }\n}\n/*# sourceMappingURL=user-settings-view.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UserSettingsViewComponent, [{
    type: Component,
    args: [{ selector: "app-user-settings-view", standalone: true, imports: [CommonModule, FormsModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="user-settings-page">
      <header class="page-header">
        <h1>{{ t('userSettings.title') }}</h1>
      </header>
      
      <div class="settings-container">
        <!-- \u5074\u908A\u6A19\u7C64 -->
        <nav class="settings-nav">
          @for (tab of tabs; track tab.id) {
            <button 
              class="nav-item" 
              [class.active]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >
              <span class="nav-icon">{{ tab.icon }}</span>
              <span class="nav-label">{{ t(tab.label) }}</span>
            </button>
          }
        </nav>
        
        <!-- \u5167\u5BB9\u5340\u57DF -->
        <div class="settings-content">
          <!-- \u500B\u4EBA\u8CC7\u6599 -->
          @if (activeTab() === 'profile') {
            <div class="settings-section">
              <h2>{{ t('userSettings.profile') }}</h2>
              
              <div class="form-group">
                <label>{{ t('auth.email') }}</label>
                <input 
                  type="email" 
                  [value]="user()?.email || ''" 
                  disabled 
                  class="input-disabled"
                />
                <span class="hint">\u90F5\u7BB1\u7121\u6CD5\u66F4\u6539</span>
              </div>
              
              <div class="form-group">
                <label>{{ t('auth.username') }}</label>
                <input 
                  type="text" 
                  [(ngModel)]="profileForm.username"
                  [placeholder]="t('auth.usernamePlaceholder')"
                />
              </div>
              
              <div class="form-group">
                <label>{{ t('userSettings.displayName') }}</label>
                <input 
                  type="text" 
                  [(ngModel)]="profileForm.display_name"
                  placeholder="\u60A8\u7684\u986F\u793A\u540D\u7A31"
                />
              </div>
              
              <div class="form-group">
                <label>{{ t('userSettings.avatarUrl') }}</label>
                <input 
                  type="url" 
                  [(ngModel)]="profileForm.avatar_url"
                  placeholder="https://..."
                />
              </div>
              
              <button 
                class="btn-primary" 
                (click)="saveProfile()"
                [disabled]="isSaving()"
              >
                @if (isSaving()) {
                  <span class="loading-spinner"></span>
                }
                {{ t('userSettings.updateProfile') }}
              </button>
              
              @if (saveSuccess()) {
                <span class="success-message">\u2705 \u5DF2\u4FDD\u5B58</span>
              }
            </div>
          }
          
          <!-- \u5B89\u5168\u8A2D\u7F6E -->
          @if (activeTab() === 'security') {
            <div class="settings-section">
              <h2>{{ t('userSettings.security') }}</h2>
              
              <div class="security-item">
                <div class="item-info">
                  <h3>{{ t('auth.changePassword') }}</h3>
                  <p>\u5B9A\u671F\u66F4\u63DB\u5BC6\u78BC\u4EE5\u4FDD\u8B77\u5E33\u6236\u5B89\u5168</p>
                </div>
                <button 
                  class="btn-secondary"
                  (click)="showPasswordForm.set(!showPasswordForm())"
                >
                  {{ showPasswordForm() ? '\u53D6\u6D88' : '\u4FEE\u6539' }}
                </button>
              </div>
              
              @if (showPasswordForm()) {
                <div class="password-form">
                  <div class="form-group">
                    <label>{{ t('auth.currentPassword') }}</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordForm.currentPassword"
                      autocomplete="current-password"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label>{{ t('auth.newPassword') }}</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordForm.newPassword"
                      autocomplete="new-password"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label>{{ t('auth.confirmNewPassword') }}</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordForm.confirmPassword"
                      autocomplete="new-password"
                    />
                  </div>
                  
                  @if (passwordError()) {
                    <div class="error-message">{{ passwordError() }}</div>
                  }
                  
                  <button 
                    class="btn-primary"
                    (click)="changePassword()"
                    [disabled]="isChangingPassword()"
                  >
                    @if (isChangingPassword()) {
                      <span class="loading-spinner"></span>
                    }
                    \u78BA\u8A8D\u4FEE\u6539
                  </button>
                </div>
              }
              
              <div class="security-item">
                <div class="item-info">
                  <h3>\u5169\u6B65\u9A57\u8B49</h3>
                  <p>\u589E\u52A0\u5E33\u6236\u5B89\u5168\u6027</p>
                </div>
                <span class="badge">\u5373\u5C07\u63A8\u51FA</span>
              </div>
            </div>
          }
          
          <!-- \u767B\u5165\u8A2D\u5099 -->
          @if (activeTab() === 'sessions') {
            <div class="settings-section">
              <h2>{{ t('auth.sessions') }}</h2>
              <p class="section-desc">\u7BA1\u7406\u60A8\u5728\u5404\u8A2D\u5099\u4E0A\u7684\u767B\u5165\u72C0\u614B</p>
              
              @if (isLoadingSessions()) {
                <div class="loading-state">\u8F09\u5165\u4E2D...</div>
              } @else {
                <div class="sessions-list">
                  @for (session of sessions(); track session.id) {
                    <div class="session-item" [class.current]="session.is_current">
                      <div class="session-icon">
                        {{ getDeviceIcon(session.device_type) }}
                      </div>
                      <div class="session-info">
                        <strong>{{ session.device_name || '\u672A\u77E5\u8A2D\u5099' }}</strong>
                        <span class="session-meta">
                          {{ session.ip_address }} \xB7 
                          \u6700\u5F8C\u6D3B\u52D5: {{ formatDate(session.last_activity_at) }}
                        </span>
                        @if (session.is_current) {
                          <span class="current-badge">\u7576\u524D\u8A2D\u5099</span>
                        }
                      </div>
                      @if (!session.is_current) {
                        <button 
                          class="btn-danger-small"
                          (click)="revokeSession(session.id)"
                        >
                          {{ t('userSettings.revokeSession') }}
                        </button>
                      }
                    </div>
                  }
                </div>
                
                @if (sessions().length > 1) {
                  <button 
                    class="btn-danger"
                    (click)="revokeAllSessions()"
                  >
                    {{ t('userSettings.revokeAllSessions') }}
                  </button>
                }
              }
            </div>
          }
          
          <!-- API \u91D1\u9470 -->
          @if (activeTab() === 'apiKeys') {
            <div class="settings-section">
              <h2>{{ t('userSettings.apiKeys') }}</h2>
              <p class="section-desc">\u7528\u65BC\u7A0B\u5E8F\u5316\u8A2A\u554F TG-Matrix API</p>
              
              <div class="api-keys-list">
                @for (key of apiKeys(); track key.id) {
                  <div class="api-key-item">
                    <div class="key-info">
                      <strong>{{ key.name }}</strong>
                      <code>{{ key.prefix }}...****</code>
                      <span class="key-meta">
                        {{ t('userSettings.lastUsed') }}: 
                        {{ key.last_used_at ? formatDate(key.last_used_at) : t('userSettings.neverUsed') }}
                      </span>
                    </div>
                    <button 
                      class="btn-danger-small"
                      (click)="deleteApiKey(key.id)"
                    >
                      {{ t('userSettings.deleteApiKey') }}
                    </button>
                  </div>
                } @empty {
                  <p class="empty-state">\u66AB\u7121 API \u91D1\u9470</p>
                }
              </div>
              
              <button class="btn-secondary" (click)="createApiKey()">
                + {{ t('userSettings.createApiKey') }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;1d9d4ded62eb29b6689ccc66b4819216d2e3241c077209b93eb5efc972fecf9a;D:/tgkz2026/src/views/user-settings-view.component.ts */\n.user-settings-page {\n  padding: 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.page-header h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.5rem;\n}\n.settings-container {\n  display: flex;\n  gap: 2rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.settings-nav {\n  width: 240px;\n  padding: 1rem;\n  background: var(--bg-tertiary, #151515);\n  border-right: 1px solid var(--border-color, #333);\n}\n.nav-item {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  width: 100%;\n  padding: 0.75rem 1rem;\n  background: transparent;\n  border: none;\n  border-radius: 8px;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  text-align: left;\n}\n.nav-item:hover {\n  background: rgba(255, 255, 255, 0.05);\n  color: var(--text-primary, #fff);\n}\n.nav-item.active {\n  background: var(--primary, #3b82f6);\n  color: white;\n}\n.nav-icon {\n  font-size: 1.25rem;\n}\n.settings-content {\n  flex: 1;\n  padding: 2rem;\n}\n.settings-section h2 {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin-bottom: 0.5rem;\n}\n.section-desc {\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.form-group {\n  margin-bottom: 1.25rem;\n}\n.form-group label {\n  display: block;\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n  margin-bottom: 0.5rem;\n}\n.form-group input {\n  width: 100%;\n  max-width: 400px;\n  padding: 0.75rem 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n}\n.form-group input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n}\n.input-disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.hint {\n  display: block;\n  font-size: 0.75rem;\n  color: var(--text-muted, #666);\n  margin-top: 0.25rem;\n}\n.btn-primary {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1.5rem;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 0.875rem;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--primary-hover, #2563eb);\n}\n.btn-primary:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.btn-secondary {\n  padding: 0.5rem 1rem;\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  border-radius: 6px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.btn-secondary:hover {\n  background: rgba(255, 255, 255, 0.05);\n  border-color: var(--border-hover, #444);\n}\n.btn-danger-small {\n  padding: 0.375rem 0.75rem;\n  background: transparent;\n  border: 1px solid rgba(239, 68, 68, 0.5);\n  border-radius: 6px;\n  color: #f87171;\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.btn-danger-small:hover {\n  background: rgba(239, 68, 68, 0.1);\n}\n.btn-danger {\n  padding: 0.75rem 1.5rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  font-size: 0.875rem;\n  cursor: pointer;\n  margin-top: 1rem;\n}\n.btn-danger:hover {\n  background: rgba(239, 68, 68, 0.2);\n}\n.security-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  margin-bottom: 1rem;\n}\n.item-info h3 {\n  font-size: 0.875rem;\n  font-weight: 500;\n  margin-bottom: 0.25rem;\n}\n.item-info p {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.password-form {\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  margin-bottom: 1rem;\n}\n.sessions-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  margin-bottom: 1rem;\n}\n.session-item {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  border: 1px solid transparent;\n}\n.session-item.current {\n  border-color: var(--primary, #3b82f6);\n}\n.session-icon {\n  font-size: 1.5rem;\n}\n.session-info {\n  flex: 1;\n}\n.session-info strong {\n  display: block;\n  font-size: 0.875rem;\n}\n.session-meta {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.current-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  background: var(--primary, #3b82f6);\n  border-radius: 4px;\n  font-size: 0.625rem;\n  color: white;\n  margin-left: 0.5rem;\n}\n.api-keys-list {\n  margin-bottom: 1rem;\n}\n.api-key-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem;\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 8px;\n  margin-bottom: 0.75rem;\n}\n.key-info {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.key-info code {\n  font-family: monospace;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n}\n.key-meta {\n  font-size: 0.75rem;\n  color: var(--text-muted, #666);\n}\n.empty-state {\n  text-align: center;\n  padding: 2rem;\n  color: var(--text-secondary, #888);\n}\n.loading-spinner {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.success-message {\n  margin-left: 1rem;\n  color: #4ade80;\n  font-size: 0.875rem;\n}\n.error-message {\n  padding: 0.5rem;\n  background: rgba(239, 68, 68, 0.1);\n  border-radius: 4px;\n  color: #f87171;\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.badge {\n  padding: 0.25rem 0.75rem;\n  background: var(--bg-tertiary, #252525);\n  border-radius: 4px;\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.loading-state {\n  text-align: center;\n  padding: 2rem;\n  color: var(--text-secondary, #888);\n}\n@media (max-width: 768px) {\n  .settings-container {\n    flex-direction: column;\n  }\n  .settings-nav {\n    width: 100%;\n    flex-direction: row;\n    overflow-x: auto;\n    border-right: none;\n    border-bottom: 1px solid var(--border-color, #333);\n  }\n}\n/*# sourceMappingURL=user-settings-view.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(UserSettingsViewComponent, { className: "UserSettingsViewComponent", filePath: "src/views/user-settings-view.component.ts", lineNumber: 630 });
})();
export {
  UserSettingsViewComponent
};
//# sourceMappingURL=chunk-TURMDXVG.js.map
