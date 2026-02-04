import {
  DialogService
} from "./chunk-P5NRPJO6.js";
import {
  AccountManagementService
} from "./chunk-5TVIREIP.js";
import {
  NavBridgeService
} from "./chunk-6KLKCFSW.js";
import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  MaxLengthValidator,
  MaxValidator,
  MinValidator,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  RangeValueAccessor,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule,
  NgIf
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-ORLIRJMO.js";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵNgOnChangesFeature,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/account-card-list.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function AccountCardListComponent_For_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 13);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const group_r1 = ctx.$implicit;
    \u0275\u0275property("value", group_r1.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u{1F4C1} ", group_r1.name);
  }
}
function AccountCardListComponent_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 16);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.tagFilter.length);
  }
}
function AccountCardListComponent_Conditional_29_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 51)(1, "input", 35);
    \u0275\u0275listener("change", function AccountCardListComponent_Conditional_29_For_7_Template_input_change_1_listener() {
      const tag_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleTagFilterItem(tag_r5.id));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(2, "span", 52);
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tag_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("--tag-color", tag_r5.color);
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.tagFilter.includes(tag_r5.id));
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", tag_r5.color);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(tag_r5.name);
  }
}
function AccountCardListComponent_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 17)(1, "div", 47)(2, "span");
    \u0275\u0275text(3, "\u9009\u62E9\u6807\u7B7E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 48);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_29_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearTagFilter());
    });
    \u0275\u0275text(5, "\u6E05\u9664");
    \u0275\u0275elementEnd()();
    \u0275\u0275repeaterCreate(6, AccountCardListComponent_Conditional_29_For_7_Template, 5, 6, "label", 49, _forTrack0);
    \u0275\u0275elementStart(8, "button", 50);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_29_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openTagManager());
    });
    \u0275\u0275text(9, "\u2699\uFE0F \u7BA1\u7406\u6807\u7B7E");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275repeater(ctx_r1.availableTags());
  }
}
function AccountCardListComponent_Conditional_76_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 43)(1, "span", 53);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 54);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_76_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.batchLogin());
    });
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 55);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_76_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.batchLogout());
    });
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 56);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_76_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openBatchEditModal());
    });
    \u0275\u0275text(8, " \u2699\uFE0F \u6279\u91CF\u8BBE\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 57);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_76_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.batchSync());
    });
    \u0275\u0275text(10, " \u{1F504} \u6279\u91CF\u540C\u6B65 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 58);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_76_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmBatchDelete());
    });
    \u0275\u0275text(12, " \u{1F5D1}\uFE0F \u6279\u91CF\u5220\u9664 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 59);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_76_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearSelection());
    });
    \u0275\u0275text(14, " \u2715 \u53D6\u6D88\u9009\u62E9 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u5DF2\u9078 ", ctx_r1.selectedIds.size, " \u500B");
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.batchLoggingIn());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.batchLoggingIn() ? "\u23F3" : "\u25B6\uFE0F", " \u6279\u91CF\u767B\u5165 ");
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.batchLoggingOut());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.batchLoggingOut() ? "\u23F3" : "\u23F9\uFE0F", " \u6279\u91CF\u9000\u51FA ");
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", ctx_r1.batchSyncing());
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 64)(1, "img", 96);
    \u0275\u0275listener("error", function AccountCardListComponent_Conditional_77_For_2_Conditional_4_Template_img_error_1_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.onAvatarError($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 97);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const account_r8 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("src", ctx_r1.getAvatarUrl(account_r8.avatarPath), \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getAvatarLetter(account_r8));
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 65);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r8 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.getAvatarLetter(account_r8));
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 75);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(account_r8.nickname);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 78);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate("@" + account_r8.username);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_25_For_2_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 100);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tag_r10 = ctx;
    \u0275\u0275styleProp("background", tag_r10.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tag_r10.name);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_25_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, AccountCardListComponent_Conditional_77_For_2_Conditional_25_For_2_Conditional_0_Template, 2, 3, "span", 99);
  }
  if (rf & 2) {
    let tmp_22_0;
    const tagId_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275conditional((tmp_22_0 = ctx_r1.getTagById(tagId_r11)) ? 0 : -1, tmp_22_0);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_25_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 98);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r8 = \u0275\u0275nextContext(2).$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("+", account_r8.tags.length - 3);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 79);
    \u0275\u0275repeaterCreate(1, AccountCardListComponent_Conditional_77_For_2_Conditional_25_For_2_Template, 1, 1, null, null, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275conditionalCreate(3, AccountCardListComponent_Conditional_77_For_2_Conditional_25_Conditional_3_Template, 2, 1, "span", 98);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275repeater(account_r8.tags.slice(0, 3));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(account_r8.tags.length > 3 ? 3 : -1);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u6B63\u5728\u9023\u63A5... ");
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u7B49\u5F85\u9A57\u8B49\u78BC ");
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u7B49\u5F852FA\u5BC6\u78BC ");
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    let tmp_13_0;
    const account_r8 = \u0275\u0275nextContext(2).$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", ((tmp_13_0 = ctx_r1.getLoginProgress(account_r8.id)) == null ? null : tmp_13_0.step) || "\u8655\u7406\u4E2D...", " ");
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 87);
    \u0275\u0275element(1, "div", 101);
    \u0275\u0275elementStart(2, "span", 102);
    \u0275\u0275conditionalCreate(3, AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_3_Template, 1, 0)(4, AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_4_Template, 1, 0)(5, AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_5_Template, 1, 0)(6, AccountCardListComponent_Conditional_77_For_2_Conditional_36_Case_6_Template, 1, 1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_12_0;
    const account_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275conditional((tmp_12_0 = account_r8.status) === "Logging in..." ? 3 : tmp_12_0 === "Waiting Code" ? 4 : tmp_12_0 === "Waiting 2FA" ? 5 : 6);
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 103);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Conditional_38_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r12);
      const account_r8 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onLogin(account_r8));
    });
    \u0275\u0275elementStart(1, "span", 93);
    \u0275\u0275text(2, "\u25B6\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 94);
    \u0275\u0275text(4, "\u767B\u5165");
    \u0275\u0275elementEnd()();
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 90)(1, "span", 104);
    \u0275\u0275text(2, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 94);
    \u0275\u0275text(4, "\u767B\u5165\u4E2D");
    \u0275\u0275elementEnd()();
  }
}
function AccountCardListComponent_Conditional_77_For_2_Conditional_40_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 105);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Conditional_40_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const account_r8 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onLogout(account_r8));
    });
    \u0275\u0275elementStart(1, "span", 93);
    \u0275\u0275text(2, "\u23F9\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 94);
    \u0275\u0275text(4, "\u9000\u51FA");
    \u0275\u0275elementEnd()();
  }
}
function AccountCardListComponent_Conditional_77_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 61);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Template_div_click_0_listener() {
      const account_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectAccount(account_r8));
    });
    \u0275\u0275elementStart(1, "div", 62);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "input", 35);
    \u0275\u0275listener("change", function AccountCardListComponent_Conditional_77_For_2_Template_input_change_2_listener() {
      const account_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleSelect(account_r8.id));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "div", 63);
    \u0275\u0275conditionalCreate(4, AccountCardListComponent_Conditional_77_For_2_Conditional_4_Template, 4, 2, "div", 64)(5, AccountCardListComponent_Conditional_77_For_2_Conditional_5_Template, 2, 1, "div", 65);
    \u0275\u0275elementStart(6, "div", 66)(7, "div", 67);
    \u0275\u0275element(8, "span", 68);
    \u0275\u0275elementStart(9, "span", 69);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 70);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Template_div_click_11_listener($event) {
      const account_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openRoleSelector(account_r8, $event));
    });
    \u0275\u0275elementStart(12, "span", 71);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 72);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 73);
    \u0275\u0275text(17, "\u25BC");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(18, "div", 74);
    \u0275\u0275conditionalCreate(19, AccountCardListComponent_Conditional_77_For_2_Conditional_19_Template, 2, 1, "div", 75);
    \u0275\u0275elementStart(20, "div", 76);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 77);
    \u0275\u0275text(23);
    \u0275\u0275conditionalCreate(24, AccountCardListComponent_Conditional_77_For_2_Conditional_24_Template, 2, 1, "span", 78);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(25, AccountCardListComponent_Conditional_77_For_2_Conditional_25_Template, 4, 1, "div", 79);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 80)(27, "span", 81);
    \u0275\u0275text(28);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "span", 82);
    \u0275\u0275text(30);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(31, "div", 83)(32, "div", 84);
    \u0275\u0275element(33, "div", 85);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "span", 86);
    \u0275\u0275text(35);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(36, AccountCardListComponent_Conditional_77_For_2_Conditional_36_Template, 7, 1, "div", 87);
    \u0275\u0275elementStart(37, "div", 88);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Template_div_click_37_listener($event) {
      \u0275\u0275restoreView(_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275conditionalCreate(38, AccountCardListComponent_Conditional_77_For_2_Conditional_38_Template, 5, 0, "button", 89);
    \u0275\u0275conditionalCreate(39, AccountCardListComponent_Conditional_77_For_2_Conditional_39_Template, 5, 0, "button", 90);
    \u0275\u0275conditionalCreate(40, AccountCardListComponent_Conditional_77_For_2_Conditional_40_Template, 5, 0, "button", 91);
    \u0275\u0275elementStart(41, "button", 92);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Template_button_click_41_listener($event) {
      const account_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.openEditModal(account_r8);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(42, "span", 93);
    \u0275\u0275text(43, "\u2699\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(44, "span", 94);
    \u0275\u0275text(45, "\u8BBE\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(46, "button", 95);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_77_For_2_Template_button_click_46_listener() {
      const account_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onRemove(account_r8));
    });
    \u0275\u0275elementStart(47, "span", 93);
    \u0275\u0275text(48, "\u{1F5D1}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "span", 94);
    \u0275\u0275text(50, "\u5220\u9664");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const account_r8 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("online", account_r8.status === "Online")("offline", account_r8.status === "Offline")("banned", account_r8.status === "Banned")("warming", account_r8.status === "Warming Up")("logging-in", ctx_r1.isLoggingIn(account_r8.id) || account_r8.status === "Logging in..." || account_r8.status === "Waiting Code" || account_r8.status === "Waiting 2FA")("selected", ctx_r1.selectedIds.has(account_r8.id));
    \u0275\u0275advance(2);
    \u0275\u0275property("checked", ctx_r1.selectedIds.has(account_r8.id));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isValidAvatarPath(account_r8.avatarPath) ? 4 : 5);
    \u0275\u0275advance(4);
    \u0275\u0275classMap(ctx_r1.getStatusClass(account_r8.status));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getStatusText(account_r8.status));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getRoleIcon(account_r8.role));
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r1.getRoleColor(account_r8.role));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.getRoleName(account_r8.role));
    \u0275\u0275advance(4);
    \u0275\u0275conditional(account_r8.nickname ? 19 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(account_r8.phone);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", account_r8.firstName || "", " ", account_r8.lastName || "", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(account_r8.username ? 24 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(account_r8.tags && account_r8.tags.length > 0 ? 25 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getDeviceIcon(account_r8.platform));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(account_r8.deviceModel || "Unknown Device");
    \u0275\u0275advance(3);
    \u0275\u0275styleProp("width", account_r8.healthScore || 100, "%");
    \u0275\u0275classProp("good", (account_r8.healthScore || 100) >= 80)("warning", (account_r8.healthScore || 100) >= 50 && (account_r8.healthScore || 100) < 80)("danger", (account_r8.healthScore || 100) < 50);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", account_r8.healthScore || 100, "%");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoggingIn(account_r8.id) || account_r8.status === "Logging in..." || account_r8.status === "Waiting Code" || account_r8.status === "Waiting 2FA" ? 36 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.canLogin(account_r8) && !ctx_r1.isLoggingIn(account_r8.id) ? 38 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoggingIn(account_r8.id) || account_r8.status === "Logging in..." || account_r8.status === "Waiting Code" || account_r8.status === "Waiting 2FA" ? 39 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(account_r8.status === "Online" ? 40 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275property("disabled", ctx_r1.isLoggingIn(account_r8.id));
  }
}
function AccountCardListComponent_Conditional_77_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44);
    \u0275\u0275repeaterCreate(1, AccountCardListComponent_Conditional_77_For_2_Template, 51, 43, "div", 60, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.filteredAccounts);
  }
}
function AccountCardListComponent_Conditional_78_For_24_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 122);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Conditional_23_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r17);
      const account_r16 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onLogin(account_r16));
    });
    \u0275\u0275text(1, "\u25B6\uFE0F");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_78_For_24_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 123);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Conditional_24_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r18);
      const account_r16 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onLogout(account_r16));
    });
    \u0275\u0275text(1, "\u23F9\uFE0F");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_78_For_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr", 109);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Template_tr_click_0_listener() {
      const account_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectAccount(account_r16));
    });
    \u0275\u0275elementStart(1, "td", 109);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Template_td_click_1_listener($event) {
      \u0275\u0275restoreView(_r15);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "input", 35);
    \u0275\u0275listener("change", function AccountCardListComponent_Conditional_78_For_24_Template_input_change_2_listener() {
      const account_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleSelect(account_r16.id));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275element(4, "span", 110);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 111);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 112)(8, "span", 113);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Template_span_click_8_listener($event) {
      const account_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openRoleSelector(account_r16, $event));
    });
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "td");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "td", 114);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "td")(15, "div", 115)(16, "div", 116);
    \u0275\u0275element(17, "div", 85);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span");
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(20, "td");
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "td", 117);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Template_td_click_22_listener($event) {
      \u0275\u0275restoreView(_r15);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275conditionalCreate(23, AccountCardListComponent_Conditional_78_For_24_Conditional_23_Template, 2, 0, "button", 118);
    \u0275\u0275conditionalCreate(24, AccountCardListComponent_Conditional_78_For_24_Conditional_24_Template, 2, 0, "button", 119);
    \u0275\u0275elementStart(25, "button", 120);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Template_button_click_25_listener($event) {
      const account_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.openEditModal(account_r16);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(26, "\u2699\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "button", 121);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_78_For_24_Template_button_click_27_listener() {
      const account_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onRemove(account_r16));
    });
    \u0275\u0275text(28, "\u{1F5D1}\uFE0F");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const account_r16 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("selected", ctx_r1.selectedIds.has(account_r16.id));
    \u0275\u0275advance(2);
    \u0275\u0275property("checked", ctx_r1.selectedIds.has(account_r16.id));
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.getStatusClass(account_r16.status));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(account_r16.phone);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", ctx_r1.getRoleColor(account_r16.role) + "20")("color", ctx_r1.getRoleColor(account_r16.role))("border-color", ctx_r1.getRoleColor(account_r16.role) + "40");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r1.getRoleIcon(account_r16.role), " ", ctx_r1.getRoleName(account_r16.role), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((account_r16.firstName || "") + " " + (account_r16.lastName || ""));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(account_r16.deviceModel || "-");
    \u0275\u0275advance(4);
    \u0275\u0275styleProp("width", account_r16.healthScore || 100, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", account_r16.healthScore || 100, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", account_r16.dailySendCount || 0, "/", account_r16.dailySendLimit || 50);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.canLogin(account_r16) ? 23 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(account_r16.status === "Online" ? 24 : -1);
  }
}
function AccountCardListComponent_Conditional_78_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 45)(1, "table", 106)(2, "thead")(3, "tr")(4, "th")(5, "input", 107);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_78_Template_input_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.selectAll, $event) || (ctx_r1.selectAll = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("change", function AccountCardListComponent_Conditional_78_Template_input_change_5_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleSelectAll());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "\u72B6\u6001");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "\u624B\u6A5F\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "\u89D2\u8272");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "\u8BBE\u5907");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th");
    \u0275\u0275text(17, "\u5065\u5EB7\u5EA6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "th");
    \u0275\u0275text(19, "\u4ECA\u65E5\u53D1\u9001");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "th");
    \u0275\u0275text(21, "\u64CD\u4F5C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(22, "tbody");
    \u0275\u0275repeaterCreate(23, AccountCardListComponent_Conditional_78_For_24_Template, 29, 23, "tr", 108, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.selectAll);
    \u0275\u0275advance(18);
    \u0275\u0275repeater(ctx_r1.filteredAccounts);
  }
}
function AccountCardListComponent_Conditional_79_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 46)(1, "div", 124);
    \u0275\u0275text(2, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h3");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 125);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_79_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.addAccount.emit());
    });
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.t("accounts.noAccountsYet"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.t("accounts.clickToAddFirst"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" \u2795 ", ctx_r1.t("accounts.addAccount"), " ");
  }
}
function AccountCardListComponent_Conditional_80_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46)(1, "div", 124);
    \u0275\u0275text(2, "\u{1F50D}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h3");
    \u0275\u0275text(4, "\u6C92\u6709\u627E\u5230\u5339\u914D\u7684\u8D26\u6237");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p");
    \u0275\u0275text(6, "\u8ACB\u5617\u8A66\u8ABF\u6574\u641C\u7D22\u689D\u4EF6\u6216\u7BE9\u9078\u5668");
    \u0275\u0275elementEnd()();
  }
}
function AccountCardListComponent_Conditional_81_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 132)(1, "img", 163);
    \u0275\u0275listener("error", function AccountCardListComponent_Conditional_81_Conditional_9_Template_img_error_1_listener($event) {
      \u0275\u0275restoreView(_r21);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onAvatarError($event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 164);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("src", ctx_r1.getAvatarUrl(ctx_r1.selectedAccount().avatarPath), \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.getAvatarLetter(ctx_r1.selectedAccount()), " ");
  }
}
function AccountCardListComponent_Conditional_81_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 133);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getAvatarLetter(ctx_r1.selectedAccount()), " ");
  }
}
function AccountCardListComponent_Conditional_81_div_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 165);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.selectedAccount().nickname, " ");
  }
}
function AccountCardListComponent_Conditional_81_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 137);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate("@" + ctx_r1.selectedAccount().username);
  }
}
function AccountCardListComponent_Conditional_81_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 142);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().bio);
  }
}
function AccountCardListComponent_Conditional_81_Conditional_61_For_1_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 100);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tag_r22 = ctx;
    \u0275\u0275styleProp("background", tag_r22.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tag_r22.name);
  }
}
function AccountCardListComponent_Conditional_81_Conditional_61_For_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, AccountCardListComponent_Conditional_81_Conditional_61_For_1_Conditional_0_Template, 2, 3, "span", 99);
  }
  if (rf & 2) {
    let tmp_12_0;
    const tagId_r23 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275conditional((tmp_12_0 = ctx_r1.getTagById(tagId_r23)) ? 0 : -1, tmp_12_0);
  }
}
function AccountCardListComponent_Conditional_81_Conditional_61_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, AccountCardListComponent_Conditional_81_Conditional_61_For_1_Template, 1, 1, null, null, \u0275\u0275repeaterTrackByIdentity);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275repeater(ctx_r1.selectedAccount().tags);
  }
}
function AccountCardListComponent_Conditional_81_Conditional_62_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 153);
    \u0275\u0275text(1, "\u7121\u6807\u7B7E");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_81_Conditional_106_Case_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u6B63\u5728\u9023\u63A5 Telegram \u670D\u52D9\u5668... ");
  }
}
function AccountCardListComponent_Conditional_81_Conditional_106_Case_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u7B49\u5F85\u8F38\u5165\u9A57\u8B49\u78BC... ");
  }
}
function AccountCardListComponent_Conditional_81_Conditional_106_Case_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u7B49\u5F85\u8F38\u5165\u5169\u6B65\u9A5F\u9A57\u8B49\u5BC6\u78BC... ");
  }
}
function AccountCardListComponent_Conditional_81_Conditional_106_Case_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    let tmp_3_0;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275textInterpolate1(" ", ((tmp_3_0 = ctx_r1.getLoginProgress(ctx_r1.selectedAccount().id)) == null ? null : tmp_3_0.step) || "\u8655\u7406\u4E2D...", " ");
  }
}
function AccountCardListComponent_Conditional_81_Conditional_106_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 155);
    \u0275\u0275element(1, "div", 101);
    \u0275\u0275elementStart(2, "span", 166);
    \u0275\u0275conditionalCreate(3, AccountCardListComponent_Conditional_81_Conditional_106_Case_3_Template, 1, 0)(4, AccountCardListComponent_Conditional_81_Conditional_106_Case_4_Template, 1, 0)(5, AccountCardListComponent_Conditional_81_Conditional_106_Case_5_Template, 1, 0)(6, AccountCardListComponent_Conditional_81_Conditional_106_Case_6_Template, 1, 1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275conditional((tmp_2_0 = ctx_r1.selectedAccount().status) === "Logging in..." ? 3 : tmp_2_0 === "Waiting Code" ? 4 : tmp_2_0 === "Waiting 2FA" ? 5 : 6);
  }
}
function AccountCardListComponent_Conditional_81_Conditional_108_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 167);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Conditional_108_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onLogin(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(1, "\u25B6\uFE0F \u767B\u5165");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_81_Conditional_109_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 158);
    \u0275\u0275text(1, "\u23F3 \u767B\u5165\u4E2D...");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_81_Conditional_110_Template(rf, ctx) {
  if (rf & 1) {
    const _r25 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 168);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Conditional_110_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r25);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onLogout(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(1, "\u23F9\uFE0F \u9000\u51FA");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_81_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 126);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 127)(2, "div", 128)(3, "h3");
    \u0275\u0275text(4, "\u8D26\u6237\u8BE6\u60C5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 130)(8, "div", 131);
    \u0275\u0275conditionalCreate(9, AccountCardListComponent_Conditional_81_Conditional_9_Template, 4, 2, "div", 132)(10, AccountCardListComponent_Conditional_81_Conditional_10_Template, 2, 1, "div", 133);
    \u0275\u0275template(11, AccountCardListComponent_Conditional_81_div_11_Template, 2, 1, "div", 134);
    \u0275\u0275elementStart(12, "div", 135);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 136);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(16, AccountCardListComponent_Conditional_81_Conditional_16_Template, 2, 1, "div", 137);
    \u0275\u0275elementStart(17, "div", 138);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_div_click_17_listener($event) {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openRoleSelector(ctx_r1.selectedAccount(), $event));
    });
    \u0275\u0275elementStart(18, "span", 139);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "span", 140);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "span", 141);
    \u0275\u0275text(23, "\u9EDE\u64CA\u66F4\u6539");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(24, AccountCardListComponent_Conditional_81_Conditional_24_Template, 2, 1, "div", 142);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "div", 131)(26, "h4");
    \u0275\u0275text(27, "\u{1F4CA} \u72B6\u6001\u4FE1\u606F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 143)(29, "div", 144)(30, "span", 145);
    \u0275\u0275text(31, "\u767B\u5165\u72B6\u6001");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "span", 146);
    \u0275\u0275text(33);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 144)(35, "span", 145);
    \u0275\u0275text(36, "\u5065\u5EB7\u5206\u6570");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "span", 147);
    \u0275\u0275text(38);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(39, "div", 144)(40, "span", 145);
    \u0275\u0275text(41, "\u4ECA\u65E5\u53D1\u9001");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "span", 147);
    \u0275\u0275text(43);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(44, "div", 144)(45, "span", 145);
    \u0275\u0275text(46, "\u89D2\u8272");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "div", 148);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_div_click_47_listener($event) {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openRoleSelector(ctx_r1.selectedAccount(), $event));
    });
    \u0275\u0275elementStart(48, "span", 149);
    \u0275\u0275text(49);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(50, "span", 150);
    \u0275\u0275text(51, "\u270F\uFE0F");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(52, "div", 144)(53, "span", 145);
    \u0275\u0275text(54, "\u5206\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "span", 147);
    \u0275\u0275text(56);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(57, "div", 151)(58, "span", 145);
    \u0275\u0275text(59, "\u6807\u7B7E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "div", 152);
    \u0275\u0275conditionalCreate(61, AccountCardListComponent_Conditional_81_Conditional_61_Template, 2, 0)(62, AccountCardListComponent_Conditional_81_Conditional_62_Template, 2, 0, "span", 153);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(63, "div", 131)(64, "h4");
    \u0275\u0275text(65, "\u{1F527} \u8BBE\u5907\u4FE1\u606F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(66, "div", 143)(67, "div", 144)(68, "span", 145);
    \u0275\u0275text(69, "\u8BBE\u5907\u578B\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(70, "span", 147);
    \u0275\u0275text(71);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(72, "div", 144)(73, "span", 145);
    \u0275\u0275text(74, "\u7CFB\u7D71\u7248\u672C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(75, "span", 147);
    \u0275\u0275text(76);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(77, "div", 144)(78, "span", 145);
    \u0275\u0275text(79, "\u5E73\u53F0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(80, "span", 147);
    \u0275\u0275text(81);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(82, "div", 144)(83, "span", 145);
    \u0275\u0275text(84, "API ID");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(85, "span", 147);
    \u0275\u0275text(86);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(87, "div", 131)(88, "h4");
    \u0275\u0275text(89, "\u{1F310} \u4EE3\u7406\u8BBE\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(90, "div", 143)(91, "div", 154)(92, "span", 145);
    \u0275\u0275text(93, "\u4EE3\u7406\u5730\u5740");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(94, "span", 147);
    \u0275\u0275text(95);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(96, "div", 144)(97, "span", 145);
    \u0275\u0275text(98, "\u4EE3\u7406\u7C7B\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(99, "span", 147);
    \u0275\u0275text(100);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(101, "div", 144)(102, "span", 145);
    \u0275\u0275text(103, "\u4EE3\u7406\u56FD\u5BB6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(104, "span", 147);
    \u0275\u0275text(105);
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275conditionalCreate(106, AccountCardListComponent_Conditional_81_Conditional_106_Template, 7, 1, "div", 155);
    \u0275\u0275elementStart(107, "div", 156);
    \u0275\u0275conditionalCreate(108, AccountCardListComponent_Conditional_81_Conditional_108_Template, 2, 0, "button", 157);
    \u0275\u0275conditionalCreate(109, AccountCardListComponent_Conditional_81_Conditional_109_Template, 2, 0, "button", 158);
    \u0275\u0275conditionalCreate(110, AccountCardListComponent_Conditional_81_Conditional_110_Template, 2, 0, "button", 159);
    \u0275\u0275elementStart(111, "button", 160);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_111_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.syncAccountInfo(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(112);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(113, "button", 161);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_113_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openAccountTagEditor(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(114, "\u{1F3F7}\uFE0F \u6807\u7B7E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(115, "button", 161);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_115_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openPersonaManager(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(116, "\u{1F916} \u4EBA\u8A2D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(117, "button", 161);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_117_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onExport(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(118, "\u{1F4E4} \u5C0E\u51FA");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(119, "button", 161);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_119_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openEditModal(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(120, "\u270F\uFE0F \u7F16\u8F91");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(121, "button", 162);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_81_Template_button_click_121_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onRemove(ctx_r1.selectedAccount()));
    });
    \u0275\u0275text(122, "\u{1F5D1}\uFE0F \u5220\u9664");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275classProp("open", ctx_r1.selectedAccount());
    \u0275\u0275advance(8);
    \u0275\u0275conditional(ctx_r1.isValidAvatarPath(ctx_r1.selectedAccount().avatarPath) ? 9 : 10);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", ctx_r1.selectedAccount().nickname);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", ctx_r1.selectedAccount().firstName || "", " ", ctx_r1.selectedAccount().lastName || "", " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().phone);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.selectedAccount().username ? 16 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", ctx_r1.getRoleColor(ctx_r1.selectedAccount().role) + "20")("color", ctx_r1.getRoleColor(ctx_r1.selectedAccount().role));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getRoleIcon(ctx_r1.selectedAccount().role), " ");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r1.getRoleColor(ctx_r1.selectedAccount().role));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getRoleName(ctx_r1.selectedAccount().role), " ");
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.selectedAccount().bio ? 24 : -1);
    \u0275\u0275advance(8);
    \u0275\u0275classMap(ctx_r1.getStatusClass(ctx_r1.selectedAccount().status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getStatusText(ctx_r1.selectedAccount().status), " ");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r1.selectedAccount().healthScore || 100, "/100");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate2("", ctx_r1.selectedAccount().dailySendCount || 0, "/", ctx_r1.selectedAccount().dailySendLimit || 50);
    \u0275\u0275advance(5);
    \u0275\u0275styleProp("background", ctx_r1.getRoleColor(ctx_r1.selectedAccount().role) + "20")("color", ctx_r1.getRoleColor(ctx_r1.selectedAccount().role));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r1.getRoleIcon(ctx_r1.selectedAccount().role), " ", ctx_r1.getRoleName(ctx_r1.selectedAccount().role), " ");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().group || "\u672A\u5206\u7D44");
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.selectedAccount().tags && ctx_r1.selectedAccount().tags.length > 0 ? 61 : 62);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().deviceModel || "-");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().systemVersion || "-");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().platform || "-");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().apiId || "-");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().proxy || "\u76F4\u9023\uFF08\u7121\u4EE3\u7406\uFF09");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().proxyType || "-");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().proxyCountry || "-");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoggingIn(ctx_r1.selectedAccount().id) || ctx_r1.selectedAccount().status === "Logging in..." || ctx_r1.selectedAccount().status === "Waiting Code" || ctx_r1.selectedAccount().status === "Waiting 2FA" ? 106 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.canLogin(ctx_r1.selectedAccount()) && !ctx_r1.isLoggingIn(ctx_r1.selectedAccount().id) ? 108 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoggingIn(ctx_r1.selectedAccount().id) || ctx_r1.selectedAccount().status === "Logging in..." || ctx_r1.selectedAccount().status === "Waiting Code" || ctx_r1.selectedAccount().status === "Waiting 2FA" ? 109 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.selectedAccount().status === "Online" ? 110 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.syncing());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.syncing() ? "\u23F3" : "\u{1F504}", " \u540C\u6B65 ");
    \u0275\u0275advance(9);
    \u0275\u0275property("disabled", ctx_r1.isLoggingIn(ctx_r1.selectedAccount().id));
  }
}
function AccountCardListComponent_Conditional_82_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r27 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 175)(1, "div", 179)(2, "label");
    \u0275\u0275text(3, "\u6635\u79F0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 180);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.nickname, $event) || (ctx_r1.editForm.nickname = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 179)(6, "label");
    \u0275\u0275text(7, "\u5907\u6CE8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "textarea", 181);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_textarea_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.notes, $event) || (ctx_r1.editForm.notes = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 182)(10, "div", 179)(11, "label");
    \u0275\u0275text(12, "API ID");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 183);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_input_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.apiId, $event) || (ctx_r1.editForm.apiId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 179)(15, "label");
    \u0275\u0275text(16, "API Hash");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 183);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.apiHash, $event) || (ctx_r1.editForm.apiHash = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "p", 184);
    \u0275\u0275text(19, "API \u51ED\u8BC1\u7528\u4E8E\u8FDE\u63A5 Telegram\uFF0C\u53EF\u4ECE ");
    \u0275\u0275elementStart(20, "a", 185);
    \u0275\u0275text(21, "my.telegram.org");
    \u0275\u0275elementEnd();
    \u0275\u0275text(22, " \u83B7\u53D6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 182)(24, "div", 179)(25, "label");
    \u0275\u0275text(26, "\u6BCF\u65E5\u53D1\u9001\u4E0A\u9650");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "input", 186);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_input_ngModelChange_27_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.dailySendLimit, $event) || (ctx_r1.editForm.dailySendLimit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "div", 179)(29, "label");
    \u0275\u0275text(30, "\u7FA4\u7D44\u5206\u985E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "input", 187);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_input_ngModelChange_31_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.group, $event) || (ctx_r1.editForm.group = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(32, "div", 179)(33, "label", 36)(34, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_17_Template_input_ngModelChange_34_listener($event) {
      \u0275\u0275restoreView(_r27);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.enableWarmup, $event) || (ctx_r1.editForm.enableWarmup = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "span");
    \u0275\u0275text(36, "\u542F\u7528\u9810\u71B1\u6A21\u5F0F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(37, "p", 184);
    \u0275\u0275text(38, "\u9810\u71B1\u6A21\u5F0F\u6703\u9010\u6B65\u589E\u52A0\u6BCF\u65E5\u53D1\u9001\u91CF\uFF0C\u964D\u4F4E\u5C01\u865F\u98A8\u96AA");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.nickname);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.notes);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.apiId);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.apiHash);
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.dailySendLimit);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.group);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.enableWarmup);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_18_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 13);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const type_r29 = ctx.$implicit;
    \u0275\u0275property("value", type_r29.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(type_r29.name);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Conditional_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 207);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275classProp("success", ctx_r1.proxyTestResult().success)("error", !ctx_r1.proxyTestResult().success);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.proxyTestResult().message, " ");
  }
}
function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r30 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 182)(1, "div", 190)(2, "label");
    \u0275\u0275text(3, "\u4EE3\u7406\u5730\u5740");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 191);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyHost, $event) || (ctx_r1.editForm.proxyHost = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 192)(6, "label");
    \u0275\u0275text(7, "\u7AEF\u53E3");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 193);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyPort, $event) || (ctx_r1.editForm.proxyPort = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 182)(10, "div", 179)(11, "label");
    \u0275\u0275text(12, "\u7528\u6236\u540D\uFF08\u53EF\u9078\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 194);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_input_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyUsername, $event) || (ctx_r1.editForm.proxyUsername = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 179)(15, "label");
    \u0275\u0275text(16, "\u5BC6\u78BC\uFF08\u53EF\u9078\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 195);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyPassword, $event) || (ctx_r1.editForm.proxyPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 179)(19, "label");
    \u0275\u0275text(20, "\u4EE3\u7406\u56FD\u5BB6/\u5730\u5340");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_select_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyCountry, $event) || (ctx_r1.editForm.proxyCountry = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(22, "option", 196);
    \u0275\u0275text(23, "\u9009\u62E9\u56FD\u5BB6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "option", 197);
    \u0275\u0275text(25, "\u{1F1FA}\u{1F1F8} \u7F8E\u570B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "option", 198);
    \u0275\u0275text(27, "\u{1F1EF}\u{1F1F5} \u65E5\u672C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "option", 199);
    \u0275\u0275text(29, "\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "option", 200);
    \u0275\u0275text(31, "\u{1F1ED}\u{1F1F0} \u9999\u6E2F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "option", 201);
    \u0275\u0275text(33, "\u{1F1F9}\u{1F1FC} \u53F0\u7063");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "option", 202);
    \u0275\u0275text(35, "\u{1F1F0}\u{1F1F7} \u97D3\u570B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(36, "option", 203);
    \u0275\u0275text(37, "\u{1F1E9}\u{1F1EA} \u5FB7\u570B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "option", 204);
    \u0275\u0275text(39, "\u{1F1EC}\u{1F1E7} \u82F1\u570B");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(40, "button", 205);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_button_click_40_listener() {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.testProxy());
    });
    \u0275\u0275text(41);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(42, AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Conditional_42_Template, 2, 5, "div", 206);
    \u0275\u0275elementStart(43, "div", 179)(44, "label", 36)(45, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template_input_ngModelChange_45_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyRotationEnabled, $event) || (ctx_r1.editForm.proxyRotationEnabled = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(46, "span");
    \u0275\u0275text(47, "\u542F\u7528\u667A\u80FD\u4EE3\u7406\u8F2A\u63DB");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(48, "p", 184);
    \u0275\u0275text(49, "\u81EA\u52A8\u5207\u63DB\u4EE3\u7406\u4EE5\u907F\u514D IP \u88AB\u5C01");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyHost);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyPort);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyUsername);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyPassword);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyCountry);
    \u0275\u0275advance(19);
    \u0275\u0275property("disabled", ctx_r1.testingProxy());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.testingProxy() ? "\u6D4B\u8BD5\u4E2D..." : "\u{1F50D} \u6D4B\u8BD5\u4EE3\u7406\u8FDE\u63A5", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.proxyTestResult() ? 42 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyRotationEnabled);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r28 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 175)(1, "div", 179)(2, "label");
    \u0275\u0275text(3, "\u4EE3\u7406\u7C7B\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Template_select_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.proxyType, $event) || (ctx_r1.editForm.proxyType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_18_Template_select_ngModelChange_4_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onProxyTypeChange());
    });
    \u0275\u0275repeaterCreate(5, AccountCardListComponent_Conditional_82_Conditional_18_For_6_Template, 2, 2, "option", 13, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(7, AccountCardListComponent_Conditional_82_Conditional_18_Conditional_7_Template, 50, 9);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.proxyType);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.proxyTypes);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.editForm.proxyType && ctx_r1.editForm.proxyType !== "none" ? 7 : -1);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_19_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r32 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 212);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Conditional_19_For_6_Template_div_click_0_listener() {
      const role_r33 = \u0275\u0275restoreView(_r32).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectRole(role_r33.id));
    });
    \u0275\u0275elementStart(1, "div", 72);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 213);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const role_r33 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("selected", ctx_r1.editForm.role === role_r33.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(role_r33.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(role_r33.description);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r31 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 175)(1, "div", 179)(2, "label");
    \u0275\u0275text(3, "\u9009\u62E9\u89D2\u8272\u6A21\u677F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 208);
    \u0275\u0275repeaterCreate(5, AccountCardListComponent_Conditional_82_Conditional_19_For_6_Template, 5, 4, "div", 209, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 179)(8, "label");
    \u0275\u0275text(9, "\u81EA\u5B9A\u7FA9\u89D2\u8272\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "input", 210);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_19_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.customRoleName, $event) || (ctx_r1.editForm.customRoleName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 179)(12, "label");
    \u0275\u0275text(13, "\u89D2\u8272\u4EBA\u8A2D\u63CF\u8FF0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "textarea", 211);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_19_Template_textarea_ngModelChange_14_listener($event) {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.roleDescription, $event) || (ctx_r1.editForm.roleDescription = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r1.roleTemplates);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.customRoleName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.roleDescription);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 227);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 228);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const persona_r36 = ctx;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(persona_r36.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(persona_r36.name);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 216);
    \u0275\u0275text(1, "\u70B9\u51FB\u9009\u62E9\u4EBA\u8A2D");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r35 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 179)(1, "label");
    \u0275\u0275text(2, "AI \u4EBA\u8A2D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 214)(4, "div", 215);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_div_click_4_listener() {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openPersonaManagerFromEdit());
    });
    \u0275\u0275conditionalCreate(5, AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Conditional_5_Template, 4, 2)(6, AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Conditional_6_Template, 2, 0, "span", 216);
    \u0275\u0275elementStart(7, "span", 217);
    \u0275\u0275text(8, "\u25BC");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "button", 218);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.openPersonaManagerFromEdit());
    });
    \u0275\u0275text(10, " \u{1F916} \u4EBA\u8A2D\u5EAB ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "p", 184);
    \u0275\u0275text(12, "\u4EBA\u8A2D\u51B3\u5B9A\u4E86 AI \u7684\u6027\u683C\u548C\u56DE\u590D\u98CE\u683C");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 179)(14, "label");
    \u0275\u0275text(15, "AI \u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_select_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.aiModel, $event) || (ctx_r1.editForm.aiModel = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(17, "option", 219);
    \u0275\u0275text(18, "GPT-4 Turbo\uFF08\u63A8\u85A6\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "option", 220);
    \u0275\u0275text(20, "GPT-3.5 Turbo\uFF08\u5FEB\u901F\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "option", 221);
    \u0275\u0275text(22, "Claude 3 Sonnet");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "option", 222);
    \u0275\u0275text(24, "\u672C\u5730 Ollama");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(25, "div", 182)(26, "div", 179)(27, "label");
    \u0275\u0275text(28);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "input", 223);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_input_ngModelChange_29_listener($event) {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.aiCreativity, $event) || (ctx_r1.editForm.aiCreativity = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 179)(31, "label");
    \u0275\u0275text(32, "\u56DE\u590D\u9577\u5EA6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_select_ngModelChange_33_listener($event) {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.aiResponseLength, $event) || (ctx_r1.editForm.aiResponseLength = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(34, "option", 224);
    \u0275\u0275text(35, "\u7B80\u77ED");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(36, "option", 224);
    \u0275\u0275text(37, "\u9069\u4E2D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "option", 224);
    \u0275\u0275text(39, "\u8BE6\u7EC6");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(40, "div", 179)(41, "label", 36)(42, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_input_ngModelChange_42_listener($event) {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.aiAutoReply, $event) || (ctx_r1.editForm.aiAutoReply = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "span");
    \u0275\u0275text(44, "\u81EA\u52A8\u53D1\u9001\u56DE\u590D\uFF08\u7121\u9700\u78BA\u8A8D\uFF09");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(45, "p", 225);
    \u0275\u0275text(46, "\u26A0\uFE0F \u542F\u7528\u5F8C AI \u6703\u81EA\u52A8\u53D1\u9001\u56DE\u590D\uFF0C\u8ACB\u78BA\u4FDD\u5DF2\u8BBE\u7F6E\u597D\u4EBA\u8A2D");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(47, "div", 179)(48, "label");
    \u0275\u0275text(49, "\u7981\u6B62\u56DE\u590D\u5173\u9375\u8A5E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(50, "input", 226);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template_input_ngModelChange_50_listener($event) {
      \u0275\u0275restoreView(_r35);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.aiBlockKeywords, $event) || (ctx_r1.editForm.aiBlockKeywords = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "p", 184);
    \u0275\u0275text(52, "\u5305\u542B\u9019\u4E9B\u5173\u9375\u8A5E\u7684\u6D88\u606F\u6703\u6A19\u8A18\u70BA\u5F85\u4EBA\u5DE5\u8655\u7406");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_3_0;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(5);
    \u0275\u0275conditional((tmp_3_0 = ctx_r1.editForm.aiPersonality && ctx_r1.getPersonaById(ctx_r1.editForm.aiPersonality)) ? 5 : 6, tmp_3_0);
    \u0275\u0275advance(11);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.aiModel);
    \u0275\u0275advance(12);
    \u0275\u0275textInterpolate1("\u5275\u9020\u529B ", ctx_r1.editForm.aiCreativity, "%");
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.aiCreativity);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.aiResponseLength);
    \u0275\u0275advance();
    \u0275\u0275property("ngValue", 0);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngValue", 50);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngValue", 100);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.aiAutoReply);
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.aiBlockKeywords);
  }
}
function AccountCardListComponent_Conditional_82_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r34 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 175)(1, "div", 179)(2, "label", 36)(3, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_82_Conditional_20_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r34);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editForm.aiEnabled, $event) || (ctx_r1.editForm.aiEnabled = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "\u542F\u7528 AI \u81EA\u52A8\u56DE\u590D");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(6, AccountCardListComponent_Conditional_82_Conditional_20_Conditional_6_Template, 53, 10);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editForm.aiEnabled);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.editForm.aiEnabled ? 6 : -1);
  }
}
function AccountCardListComponent_Conditional_82_Template(rf, ctx) {
  if (rf & 1) {
    const _r26 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeEditModal());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 170)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4, "\u270F\uFE0F \u7F16\u8F91\u8D26\u53F7");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeEditModal());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 173)(9, "button", 174);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.editTab.set("basic"));
    });
    \u0275\u0275text(10, " \u{1F4CB} \u57FA\u672C\u8BBE\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 174);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.editTab.set("proxy"));
    });
    \u0275\u0275text(12, " \u{1F310} \u4EE3\u7406\u8BBE\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 174);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.editTab.set("role"));
    });
    \u0275\u0275text(14, " \u{1F3AD} \u89D2\u8272\u8BBE\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "button", 174);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_15_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.editTab.set("ai"));
    });
    \u0275\u0275text(16, " \u{1F916} AI \u8BBE\u7F6E ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(17, AccountCardListComponent_Conditional_82_Conditional_17_Template, 39, 7, "div", 175);
    \u0275\u0275conditionalCreate(18, AccountCardListComponent_Conditional_82_Conditional_18_Template, 8, 2, "div", 175);
    \u0275\u0275conditionalCreate(19, AccountCardListComponent_Conditional_82_Conditional_19_Template, 15, 2, "div", 175);
    \u0275\u0275conditionalCreate(20, AccountCardListComponent_Conditional_82_Conditional_20_Template, 7, 2, "div", 175);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 176)(22, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_22_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeEditModal());
    });
    \u0275\u0275text(23, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "button", 178);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_82_Template_button_click_24_listener() {
      \u0275\u0275restoreView(_r26);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveEdit());
    });
    \u0275\u0275text(25);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275classProp("active", ctx_r1.editTab() === "basic");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.editTab() === "proxy");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.editTab() === "role");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.editTab() === "ai");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.editTab() === "basic" ? 17 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.editTab() === "proxy" ? 18 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.editTab() === "role" ? 19 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.editTab() === "ai" ? 20 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.saving() ? "\u4FDD\u5B58\u4E2D..." : "\u{1F4BE} \u4FDD\u5B58\u8BBE\u7F6E", " ");
  }
}
function AccountCardListComponent_Conditional_83_Conditional_15_For_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 13);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const type_r39 = ctx.$implicit;
    \u0275\u0275property("value", type_r39.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(type_r39.name);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r38 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 233)(1, "div", 182)(2, "div", 179)(3, "label");
    \u0275\u0275text(4, "\u4EE3\u7406\u7C7B\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_15_Template_select_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r38);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.proxyType, $event) || (ctx_r1.batchForm.proxyType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(6, AccountCardListComponent_Conditional_83_Conditional_15_For_7_Template, 2, 2, "option", 13, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 190)(9, "label");
    \u0275\u0275text(10, "\u4EE3\u7406\u5730\u5740");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 234);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_15_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r38);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.proxyHost, $event) || (ctx_r1.batchForm.proxyHost = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 179)(13, "label");
    \u0275\u0275text(14, "\u7AEF\u53E3");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "input", 193);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_15_Template_input_ngModelChange_15_listener($event) {
      \u0275\u0275restoreView(_r38);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.proxyPort, $event) || (ctx_r1.batchForm.proxyPort = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "div", 182)(17, "div", 179)(18, "label");
    \u0275\u0275text(19, "\u7528\u6236\u540D\uFF08\u53EF\u9078\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "input", 235);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_15_Template_input_ngModelChange_20_listener($event) {
      \u0275\u0275restoreView(_r38);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.proxyUsername, $event) || (ctx_r1.batchForm.proxyUsername = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div", 179)(22, "label");
    \u0275\u0275text(23, "\u5BC6\u78BC\uFF08\u53EF\u9078\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "input", 236);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_15_Template_input_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r38);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.proxyPassword, $event) || (ctx_r1.batchForm.proxyPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 179)(26, "label");
    \u0275\u0275text(27, "\u56FD\u5BB6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_15_Template_select_ngModelChange_28_listener($event) {
      \u0275\u0275restoreView(_r38);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.proxyCountry, $event) || (ctx_r1.batchForm.proxyCountry = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(29, "option", 196);
    \u0275\u0275text(30, "\u9009\u62E9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "option", 197);
    \u0275\u0275text(32, "\u{1F1FA}\u{1F1F8} \u7F8E\u570B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "option", 198);
    \u0275\u0275text(34, "\u{1F1EF}\u{1F1F5} \u65E5\u672C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "option", 199);
    \u0275\u0275text(36, "\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "option", 200);
    \u0275\u0275text(38, "\u{1F1ED}\u{1F1F0} \u9999\u6E2F");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.proxyType);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.proxyTypes);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.proxyHost);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.proxyPort);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.proxyUsername);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.proxyPassword);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.proxyCountry);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_21_For_3_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 245);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const role_r41 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275styleProp("color", role_r41.color);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_21_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r40 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 239);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_83_Conditional_21_For_3_Template_div_click_0_listener() {
      const role_r41 = \u0275\u0275restoreView(_r40).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.batchForm.role = role_r41.id);
    });
    \u0275\u0275elementStart(1, "span", 240);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 241)(4, "div", 242);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 243);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(8, AccountCardListComponent_Conditional_83_Conditional_21_For_3_Conditional_8_Template, 2, 2, "span", 244);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const role_r41 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275styleProp("border-color", ctx_r1.batchForm.role === role_r41.id ? role_r41.color : "transparent");
    \u0275\u0275classProp("selected", ctx_r1.batchForm.role === role_r41.id);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", role_r41.color + "20")("color", role_r41.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(role_r41.icon);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", role_r41.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(role_r41.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(role_r41.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.batchForm.role === role_r41.id ? 8 : -1);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 233)(1, "div", 237);
    \u0275\u0275repeaterCreate(2, AccountCardListComponent_Conditional_83_Conditional_21_For_3_Template, 9, 14, "div", 238, _forTrack0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.assignableRoles);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r42 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 233)(1, "div", 182)(2, "div", 179)(3, "label", 36)(4, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_27_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r42);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.aiEnabled, $event) || (ctx_r1.batchForm.aiEnabled = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span");
    \u0275\u0275text(6, "\u542F\u7528 AI \u81EA\u52A8\u56DE\u590D");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(7, "div", 179)(8, "label");
    \u0275\u0275text(9, "AI \u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_27_Template_select_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r42);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.aiModel, $event) || (ctx_r1.batchForm.aiModel = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(11, "option", 219);
    \u0275\u0275text(12, "GPT-4 Turbo");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "option", 220);
    \u0275\u0275text(14, "GPT-3.5 Turbo");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "option", 221);
    \u0275\u0275text(16, "Claude 3");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "option", 222);
    \u0275\u0275text(18, "\u672C\u5730 Ollama");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.aiEnabled);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.aiModel);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r43 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 233)(1, "div", 182)(2, "div", 179)(3, "label");
    \u0275\u0275text(4, "\u6BCF\u65E5\u53D1\u9001\u4E0A\u9650");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "input", 186);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_33_Template_input_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r43);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.dailySendLimit, $event) || (ctx_r1.batchForm.dailySendLimit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 179)(7, "label", 36)(8, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_33_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r43);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.enableWarmup, $event) || (ctx_r1.batchForm.enableWarmup = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span");
    \u0275\u0275text(10, "\u542F\u7528\u9810\u71B1\u6A21\u5F0F");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.dailySendLimit);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.enableWarmup);
  }
}
function AccountCardListComponent_Conditional_83_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    const _r44 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 233)(1, "div", 179)(2, "label");
    \u0275\u0275text(3, "\u5206\u914D\u5230\u7FA4\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 246);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Conditional_39_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r44);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.group, $event) || (ctx_r1.batchForm.group = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.group);
  }
}
function AccountCardListComponent_Conditional_83_Template(rf, ctx) {
  if (rf & 1) {
    const _r37 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_83_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeBatchEditModal());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 229)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_83_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeBatchEditModal());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 230);
    \u0275\u0275text(9, " \u26A0\uFE0F \u4EE5\u4E0B\u52FE\u9009\u7684\u8BBE\u7F6E\u5C06\u5E94\u7528\u5230\u6240\u6709\u9078\u4E2D\u7684\u8D26\u53F7 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 231)(11, "label", 232)(12, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.enableProxy, $event) || (ctx_r1.batchForm.enableProxy = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span");
    \u0275\u0275text(14, "\u{1F310} \u4EE3\u7406\u8BBE\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(15, AccountCardListComponent_Conditional_83_Conditional_15_Template, 39, 6, "div", 233);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 231)(17, "label", 232)(18, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Template_input_ngModelChange_18_listener($event) {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.enableRole, $event) || (ctx_r1.batchForm.enableRole = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "span");
    \u0275\u0275text(20, "\u{1F3AD} \u5E33\u865F\u89D2\u8272\u8A2D\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(21, AccountCardListComponent_Conditional_83_Conditional_21_Template, 4, 0, "div", 233);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 231)(23, "label", 232)(24, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Template_input_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.enableAI, $event) || (ctx_r1.batchForm.enableAI = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "span");
    \u0275\u0275text(26, "\u{1F916} AI \u8BBE\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(27, AccountCardListComponent_Conditional_83_Conditional_27_Template, 19, 2, "div", 233);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 231)(29, "label", 232)(30, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Template_input_ngModelChange_30_listener($event) {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.enableLimit, $event) || (ctx_r1.batchForm.enableLimit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "span");
    \u0275\u0275text(32, "\u{1F4CA} \u53D1\u9001\u9650\u5236");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(33, AccountCardListComponent_Conditional_83_Conditional_33_Template, 11, 2, "div", 233);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 231)(35, "label", 232)(36, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_83_Template_input_ngModelChange_36_listener($event) {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.batchForm.enableGroup, $event) || (ctx_r1.batchForm.enableGroup = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "span");
    \u0275\u0275text(38, "\u{1F4C1} \u5206\u7D44\u8BBE\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(39, AccountCardListComponent_Conditional_83_Conditional_39_Template, 5, 1, "div", 233);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(40, "div", 176)(41, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_83_Template_button_click_41_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeBatchEditModal());
    });
    \u0275\u0275text(42, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "button", 178);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_83_Template_button_click_43_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.applyBatchEdit());
    });
    \u0275\u0275text(44);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u2699\uFE0F \u6279\u91CF\u8BBE\u7F6E - \u5DF2\u9078 ", ctx_r1.selectedIds.size, " \u500B\u8D26\u53F7");
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.enableProxy);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.batchForm.enableProxy ? 15 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.enableRole);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.batchForm.enableRole ? 21 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.enableAI);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.batchForm.enableAI ? 27 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.enableLimit);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.batchForm.enableLimit ? 33 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.batchForm.enableGroup);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.batchForm.enableGroup ? 39 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.batchSaving());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.batchSaving() ? "\u5E94\u7528\u4E2D..." : "\u2713 \u5E94\u7528\u5230 " + ctx_r1.selectedIds.size + " \u500B\u8D26\u53F7", " ");
  }
}
function AccountCardListComponent_Conditional_84_For_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r46 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 253)(1, "span", 255);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 256);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_84_For_15_Template_input_ngModelChange_3_listener($event) {
      const tag_r47 = \u0275\u0275restoreView(_r46).$implicit;
      \u0275\u0275twoWayBindingSet(tag_r47.name, $event) || (tag_r47.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 257);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_84_For_15_Template_input_ngModelChange_4_listener($event) {
      const tag_r47 = \u0275\u0275restoreView(_r46).$implicit;
      \u0275\u0275twoWayBindingSet(tag_r47.color, $event) || (tag_r47.color = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 258);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_84_For_15_Template_button_click_5_listener() {
      const tag_r47 = \u0275\u0275restoreView(_r46).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.deleteTag(tag_r47.id));
    });
    \u0275\u0275text(6, "\u{1F5D1}\uFE0F");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tag_r47 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", tag_r47.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tag_r47.name);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", tag_r47.name);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", tag_r47.color);
  }
}
function AccountCardListComponent_Conditional_84_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275text(1, "\u6682\u65E0\u6807\u7B7E\uFF0C\u8ACB\u6DFB\u52A0");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_84_Template(rf, ctx) {
  if (rf & 1) {
    const _r45 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_84_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeTagManager());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 247)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4, "\u{1F3F7}\uFE0F \u6807\u7B7E\u7BA1\u7406");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_84_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeTagManager());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 248)(9, "input", 249);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_84_Template_input_ngModelChange_9_listener($event) {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.newTagName, $event) || (ctx_r1.newTagName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "input", 250);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_84_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.newTagColor, $event) || (ctx_r1.newTagColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 251);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_84_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.addTag());
    });
    \u0275\u0275text(12, "\u2795 \u6DFB\u52A0");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 252);
    \u0275\u0275repeaterCreate(14, AccountCardListComponent_Conditional_84_For_15_Template, 7, 5, "div", 253, _forTrack0);
    \u0275\u0275conditionalCreate(16, AccountCardListComponent_Conditional_84_Conditional_16_Template, 2, 0, "div", 46);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 176)(18, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_84_Template_button_click_18_listener() {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeTagManager());
    });
    \u0275\u0275text(19, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "button", 254);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_84_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r45);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveTags());
    });
    \u0275\u0275text(21, "\u{1F4BE} \u4FDD\u5B58\u6807\u7B7E");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newTagName);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newTagColor);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r1.newTagName.trim());
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.availableTags());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.availableTags().length === 0 ? 16 : -1);
  }
}
function AccountCardListComponent_Conditional_85_For_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r49 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 263);
    \u0275\u0275element(1, "div", 264);
    \u0275\u0275elementStart(2, "div", 265)(3, "input", 266);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_85_For_15_Template_input_ngModelChange_3_listener($event) {
      const group_r50 = \u0275\u0275restoreView(_r49).$implicit;
      \u0275\u0275twoWayBindingSet(group_r50.name, $event) || (group_r50.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 267);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "input", 257);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_85_For_15_Template_input_ngModelChange_6_listener($event) {
      const group_r50 = \u0275\u0275restoreView(_r49).$implicit;
      \u0275\u0275twoWayBindingSet(group_r50.color, $event) || (group_r50.color = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 258);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_85_For_15_Template_button_click_7_listener() {
      const group_r50 = \u0275\u0275restoreView(_r49).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.deleteGroup(group_r50.id));
    });
    \u0275\u0275text(8, "\u{1F5D1}\uFE0F");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const group_r50 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", group_r50.color || "#6b7280");
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", group_r50.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r1.getGroupAccountCount(group_r50.id), " \u500B\u8D26\u53F7");
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", group_r50.color);
  }
}
function AccountCardListComponent_Conditional_85_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275text(1, "\u6682\u65E0\u5206\u7D44\uFF0C\u8ACB\u6DFB\u52A0");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    const _r48 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_85_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeGroupManager());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 259)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4, "\u{1F4C1} \u5206\u7D44\u7BA1\u7406");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_85_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeGroupManager());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 260)(9, "input", 261);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_85_Template_input_ngModelChange_9_listener($event) {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.newGroupName, $event) || (ctx_r1.newGroupName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "input", 250);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_85_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.newGroupColor, $event) || (ctx_r1.newGroupColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 251);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_85_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.addGroup());
    });
    \u0275\u0275text(12, "\u2795 \u6DFB\u52A0");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 262);
    \u0275\u0275repeaterCreate(14, AccountCardListComponent_Conditional_85_For_15_Template, 9, 5, "div", 263, _forTrack0);
    \u0275\u0275conditionalCreate(16, AccountCardListComponent_Conditional_85_Conditional_16_Template, 2, 0, "div", 46);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 176)(18, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_85_Template_button_click_18_listener() {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeGroupManager());
    });
    \u0275\u0275text(19, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "button", 254);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_85_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r48);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveGroups());
    });
    \u0275\u0275text(21, "\u{1F4BE} \u4FDD\u5B58\u5206\u7D44");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newGroupName);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newGroupColor);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r1.newGroupName.trim());
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.groups());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.groups().length === 0 ? 16 : -1);
  }
}
function AccountCardListComponent_Conditional_86_For_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r52 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 278)(1, "input", 35);
    \u0275\u0275listener("change", function AccountCardListComponent_Conditional_86_For_10_Template_input_change_1_listener() {
      const tag_r53 = \u0275\u0275restoreView(_r52).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleAccountTag(tag_r53.id));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 279);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tag_r53 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("selected", ctx_r1.accountTagsSelection.has(tag_r53.id));
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.accountTagsSelection.has(tag_r53.id));
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", tag_r53.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tag_r53.name);
  }
}
function AccountCardListComponent_Conditional_86_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275text(1, " \u6682\u65E0\u6807\u7B7E\uFF0C\u8BF7\u5148\u521B\u5EFA\u6807\u7B7E ");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_86_Template(rf, ctx) {
  if (rf & 1) {
    const _r51 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_86_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAccountTagEditor());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 268)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_86_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAccountTagEditor());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 269);
    \u0275\u0275repeaterCreate(9, AccountCardListComponent_Conditional_86_For_10_Template, 4, 6, "label", 270, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(11, AccountCardListComponent_Conditional_86_Conditional_11_Template, 2, 0, "div", 46);
    \u0275\u0275elementStart(12, "div", 271)(13, "div", 272)(14, "input", 273);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_86_Template_input_ngModelChange_14_listener($event) {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.newTagName, $event) || (ctx_r1.newTagName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "input", 274);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_86_Template_input_ngModelChange_15_listener($event) {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.newTagColor, $event) || (ctx_r1.newTagColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 275);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_86_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.quickAddTag());
    });
    \u0275\u0275text(17, "\u2795 \u6DFB\u52A0");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(18, "div", 176)(19, "button", 276);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_86_Template_button_click_19_listener() {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openTagManagerFromEditor());
    });
    \u0275\u0275text(20, "\u2699\uFE0F \u7BA1\u7406\u6807\u7B7E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 277)(22, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_86_Template_button_click_22_listener() {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAccountTagEditor());
    });
    \u0275\u0275text(23, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "button", 254);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_86_Template_button_click_24_listener() {
      \u0275\u0275restoreView(_r51);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveAccountTags());
    });
    \u0275\u0275text(25, "\u{1F4BE} \u4FDD\u5B58");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u{1F3F7}\uFE0F \u7F16\u8F91\u6807\u7B7E - ", (tmp_1_0 = ctx_r1.editingTagAccount()) == null ? null : tmp_1_0.phone);
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r1.availableTags());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.availableTags().length === 0 ? 11 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newTagName);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newTagColor);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r1.newTagName.trim());
  }
}
function AccountCardListComponent_Conditional_87_Conditional_13_For_2_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r55 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 286);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Conditional_13_For_2_Conditional_0_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r55);
      const persona_r56 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectPersona(persona_r56));
    });
    \u0275\u0275elementStart(1, "div", 287);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 288)(4, "div", 289);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 290);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 291)(9, "span", 292);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 292);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const persona_r56 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("selected", ctx_r1.selectedPersonaId() === persona_r56.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(persona_r56.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(persona_r56.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(persona_r56.description);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u5275\u610F: ", persona_r56.creativity, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getToneName(persona_r56.tone));
  }
}
function AccountCardListComponent_Conditional_87_Conditional_13_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, AccountCardListComponent_Conditional_87_Conditional_13_For_2_Conditional_0_Template, 13, 7, "div", 285);
  }
  if (rf & 2) {
    const persona_r56 = ctx.$implicit;
    \u0275\u0275conditional(!persona_r56.isCustom ? 0 : -1);
  }
}
function AccountCardListComponent_Conditional_87_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 282);
    \u0275\u0275repeaterCreate(1, AccountCardListComponent_Conditional_87_Conditional_13_For_2_Template, 1, 1, null, null, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.availablePersonas());
  }
}
function AccountCardListComponent_Conditional_87_Conditional_14_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r58 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 296);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Conditional_14_For_5_Template_div_click_0_listener() {
      const persona_r59 = \u0275\u0275restoreView(_r58).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectPersona(persona_r59));
    });
    \u0275\u0275elementStart(1, "div", 287);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 288)(4, "div", 289);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 290);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 297)(9, "button", 298);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Conditional_14_For_5_Template_button_click_9_listener($event) {
      const persona_r59 = \u0275\u0275restoreView(_r58).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      ctx_r1.editPersona(persona_r59);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(10, "\u270F\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 299);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Conditional_14_For_5_Template_button_click_11_listener($event) {
      const persona_r59 = \u0275\u0275restoreView(_r58).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      ctx_r1.deletePersona(persona_r59.id);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(12, "\u{1F5D1}\uFE0F");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const persona_r59 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("selected", ctx_r1.selectedPersonaId() === persona_r59.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(persona_r59.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(persona_r59.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(persona_r59.description);
  }
}
function AccountCardListComponent_Conditional_87_Conditional_14_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275text(1, "\u6682\u65E0\u81EA\u5B9A\u7FA9\u4EBA\u8A2D\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u9215\u521B\u5EFA");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_87_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r57 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 283)(1, "button", 293);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Conditional_14_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r57);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.startNewPersona());
    });
    \u0275\u0275text(2, " \u2795 \u521B\u5EFA\u65B0\u4EBA\u8A2D ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 294);
    \u0275\u0275repeaterCreate(4, AccountCardListComponent_Conditional_87_Conditional_14_For_5_Template, 13, 5, "div", 295, _forTrack0);
    \u0275\u0275conditionalCreate(6, AccountCardListComponent_Conditional_87_Conditional_14_Conditional_6_Template, 2, 0, "div", 46);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r1.getCustomPersonas());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.getCustomPersonas().length === 0 ? 6 : -1);
  }
}
function AccountCardListComponent_Conditional_87_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r60 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 254);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Conditional_18_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r60);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.applySelectedPersona());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u2713 \u4F7F\u7528\u300C", (tmp_2_0 = ctx_r1.getPersonaById(ctx_r1.selectedPersonaId())) == null ? null : tmp_2_0.name, "\u300D ");
  }
}
function AccountCardListComponent_Conditional_87_Template(rf, ctx) {
  if (rf & 1) {
    const _r54 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r54);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closePersonaManager());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 280)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4, "\u{1F916} AI \u4EBA\u8A2D\u7BA1\u7406");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r54);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closePersonaManager());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 281)(9, "button", 109);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r54);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.personaTab.set("templates"));
    });
    \u0275\u0275text(10, " \u{1F4CB} \u6A21\u677F\u5EAB ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 109);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r54);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.personaTab.set("custom"));
    });
    \u0275\u0275text(12, " \u270F\uFE0F \u81EA\u5B9A\u7FA9 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(13, AccountCardListComponent_Conditional_87_Conditional_13_Template, 3, 0, "div", 282);
    \u0275\u0275conditionalCreate(14, AccountCardListComponent_Conditional_87_Conditional_14_Template, 7, 1, "div", 283);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 176)(16, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_87_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r54);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closePersonaManager());
    });
    \u0275\u0275text(17, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(18, AccountCardListComponent_Conditional_87_Conditional_18_Template, 2, 1, "button", 284);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275classProp("active", ctx_r1.personaTab() === "templates");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.personaTab() === "custom");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.personaTab() === "templates" ? 13 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.personaTab() === "custom" ? 14 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.selectedPersonaId() ? 18 : -1);
  }
}
function AccountCardListComponent_Conditional_88_Template(rf, ctx) {
  if (rf & 1) {
    const _r61 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 169);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_88_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closePersonaEditor());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 300)(2, "div", 171)(3, "h3");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_88_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closePersonaEditor());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 172)(8, "div", 301)(9, "div", 182)(10, "div", 302)(11, "label");
    \u0275\u0275text(12, "\u56FE\u6807");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 303);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_input_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.icon, $event) || (ctx_r1.personaForm.icon = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 190)(15, "label");
    \u0275\u0275text(16, "\u4EBA\u8A2D\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 304);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.name, $event) || (ctx_r1.personaForm.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 179)(19, "label");
    \u0275\u0275text(20, "\u7B80\u77ED\u63CF\u8FF0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "input", 305);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_input_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.description, $event) || (ctx_r1.personaForm.description = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 179)(23, "label");
    \u0275\u0275text(24, "\u7CFB\u7D71\u63D0\u793A\u8A5E (System Prompt)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "textarea", 306);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_textarea_ngModelChange_25_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.systemPrompt, $event) || (ctx_r1.personaForm.systemPrompt = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "p", 184);
    \u0275\u0275text(27, "\u9019\u662F AI \u7684\u300C\u6027\u683C\u8BF4\u660E\u4E66\u300D\uFF0C\u51B3\u5B9A\u4E86 AI \u5982\u4F55\u56DE\u5E94\u7528\u6236");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "div", 179)(29, "label");
    \u0275\u0275text(30, "\u958B\u5834\u767D\uFF08\u53EF\u9078\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "input", 307);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_input_ngModelChange_31_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.greeting, $event) || (ctx_r1.personaForm.greeting = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "div", 182)(33, "div", 179)(34, "label");
    \u0275\u0275text(35);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(36, "input", 223);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_input_ngModelChange_36_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.creativity, $event) || (ctx_r1.personaForm.creativity = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "p", 184);
    \u0275\u0275text(38, "\u8D8A\u9AD8\u8D8A\u6709\u5275\u610F\uFF0C\u8D8A\u4F4E\u8D8A\u7A69\u5B9A");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(39, "div", 179)(40, "label");
    \u0275\u0275text(41, "\u56DE\u590D\u9577\u5EA6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_select_ngModelChange_42_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.responseLength, $event) || (ctx_r1.personaForm.responseLength = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(43, "option", 308);
    \u0275\u0275text(44, "\u7B80\u77ED");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "option", 309);
    \u0275\u0275text(46, "\u9069\u4E2D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "option", 310);
    \u0275\u0275text(48, "\u8BE6\u7EC6");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(49, "div", 182)(50, "div", 179)(51, "label");
    \u0275\u0275text(52, "\u8A9E\u6C23\u98CE\u683C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_select_ngModelChange_53_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.tone, $event) || (ctx_r1.personaForm.tone = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(54, "option", 311);
    \u0275\u0275text(55, "\u6B63\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(56, "option", 312);
    \u0275\u0275text(57, "\u4E13\u4E1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "option", 313);
    \u0275\u0275text(59, "\u53CB\u5584");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "option", 314);
    \u0275\u0275text(61, "\u8F15\u9B06");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(62, "div", 179)(63, "label");
    \u0275\u0275text(64, "\u8BED\u8A00");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(65, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_select_ngModelChange_65_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.language, $event) || (ctx_r1.personaForm.language = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(66, "option", 315);
    \u0275\u0275text(67, "\u7E41\u4F53\u4E2D\u6587");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(68, "option", 316);
    \u0275\u0275text(69, "\u7C21\u9AD4\u4E2D\u6587");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(70, "option", 317);
    \u0275\u0275text(71, "English");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(72, "option", 318);
    \u0275\u0275text(73, "\u65E5\u672C\u8A9E");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(74, "div", 179)(75, "label", 36)(76, "input", 188);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_input_ngModelChange_76_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.enableEmoji, $event) || (ctx_r1.personaForm.enableEmoji = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(77, "span");
    \u0275\u0275text(78, "\u4F7F\u7528\u8868\u60C5\u7B26\u53F7");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(79, "div", 179)(80, "label");
    \u0275\u0275text(81, "\u5C4F\u853D\u5173\u9375\u8A5E\uFF08\u4E00\u884C\u4E00\u500B\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(82, "textarea", 319);
    \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Conditional_88_Template_textarea_ngModelChange_82_listener($event) {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.personaForm.blockKeywordsText, $event) || (ctx_r1.personaForm.blockKeywordsText = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(83, "div", 176)(84, "button", 177);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_88_Template_button_click_84_listener() {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closePersonaEditor());
    });
    \u0275\u0275text(85, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(86, "button", 178);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_88_Template_button_click_86_listener() {
      \u0275\u0275restoreView(_r61);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.savePersona());
    });
    \u0275\u0275text(87, " \u{1F4BE} \u4FDD\u5B58\u4EBA\u8A2D ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(((tmp_1_0 = ctx_r1.editingPersona()) == null ? null : tmp_1_0.id) ? "\u270F\uFE0F \u7F16\u8F91\u4EBA\u8A2D" : "\u2795 \u521B\u5EFA\u4EBA\u8A2D");
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.icon);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.name);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.description);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.systemPrompt);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.greeting);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u5275\u9020\u529B ", ctx_r1.personaForm.creativity, "%");
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.creativity);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.responseLength);
    \u0275\u0275advance(11);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.tone);
    \u0275\u0275advance(12);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.language);
    \u0275\u0275advance(11);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.enableEmoji);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.personaForm.blockKeywordsText);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", !ctx_r1.personaForm.name || !ctx_r1.personaForm.systemPrompt);
  }
}
function AccountCardListComponent_Conditional_89_For_9_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 334);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function AccountCardListComponent_Conditional_89_For_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r63 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 329);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_89_For_9_Template_div_click_0_listener() {
      const role_r64 = \u0275\u0275restoreView(_r63).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.changeAccountRole(role_r64.id));
    });
    \u0275\u0275elementStart(1, "span", 330);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 331)(4, "span", 332);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 333);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(8, AccountCardListComponent_Conditional_89_For_9_Conditional_8_Template, 2, 0, "span", 334);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_11_0;
    let tmp_17_0;
    const role_r64 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("active", ((tmp_11_0 = ctx_r1.roleSelectorAccount()) == null ? null : tmp_11_0.role) === role_r64.id);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", role_r64.color + "20")("color", role_r64.color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(role_r64.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(role_r64.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(role_r64.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(((tmp_17_0 = ctx_r1.roleSelectorAccount()) == null ? null : tmp_17_0.role) === role_r64.id ? 8 : -1);
  }
}
function AccountCardListComponent_Conditional_89_Template(rf, ctx) {
  if (rf & 1) {
    const _r62 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 320);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_89_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r62);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeRoleSelector());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 321)(2, "div", 322)(3, "span", 323);
    \u0275\u0275text(4, "\u9078\u64C7\u89D2\u8272");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 324);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 325);
    \u0275\u0275repeaterCreate(8, AccountCardListComponent_Conditional_89_For_9_Template, 9, 10, "div", 326, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 327)(11, "button", 328);
    \u0275\u0275listener("click", function AccountCardListComponent_Conditional_89_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r62);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeRoleSelector());
    });
    \u0275\u0275text(12, "\u53D6\u6D88");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_3_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("top", ctx_r1.roleSelectorPosition().top, "px")("left", ctx_r1.roleSelectorPosition().left, "px");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate((tmp_3_0 = ctx_r1.roleSelectorAccount()) == null ? null : tmp_3_0.phone);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.assignableRoles);
  }
}
var ACCOUNT_ROLES = [
  {
    id: "Listener",
    name: "\u76E3\u63A7\u865F",
    icon: "\u{1F441}\uFE0F",
    color: "#22c55e",
    description: "\u76E3\u63A7\u7FA4\u7D44\u6D88\u606F\uFF0C\u6355\u7372\u6F5B\u5728\u5BA2\u6236",
    features: ["\u7FA4\u7D44\u76E3\u63A7", "\u95DC\u9375\u8A5E\u5339\u914D", "Lead \u6355\u7372"],
    priority: 1
  },
  {
    id: "Sender",
    name: "\u767C\u9001\u865F",
    icon: "\u{1F4E4}",
    color: "#3b82f6",
    description: "\u767C\u9001\u6D88\u606F\u7D66\u6F5B\u5728\u5BA2\u6236",
    features: ["\u6D88\u606F\u767C\u9001", "\u81EA\u52D5\u56DE\u8986", "\u5EE3\u544A\u7FA4\u767C", "\u79C1\u804A\u8DDF\u9032"],
    priority: 2
  },
  {
    id: "Explorer",
    name: "\u63A2\u7D22\u865F",
    icon: "\u{1F50D}",
    color: "#f59e0b",
    description: "\u767C\u73FE\u65B0\u8CC7\u6E90\uFF0C\u52A0\u5165\u7FA4\u7D44",
    features: ["\u8CC7\u6E90\u641C\u7D22", "\u7FA4\u7D44\u52A0\u5165", "\u6210\u54E1\u63D0\u53D6", "\u93C8\u63A5\u5206\u6790"],
    priority: 3
  },
  {
    id: "AI",
    name: "AI\u865F",
    icon: "\u{1F916}",
    color: "#8b5cf6",
    description: "AI \u81EA\u52D5\u804A\u5929\u548C\u667A\u80FD\u56DE\u8986",
    features: ["AI \u81EA\u52D5\u804A\u5929", "\u667A\u80FD\u56DE\u8986", "\u610F\u5716\u5206\u6790"],
    priority: 4
  },
  {
    id: "Backup",
    name: "\u5099\u7528\u865F",
    icon: "\u26A1",
    color: "#06b6d4",
    description: "\u8CA0\u8F09\u5747\u8861\u548C\u6545\u969C\u5099\u63F4",
    features: ["\u8CA0\u8F09\u5747\u8861", "\u6545\u969C\u5099\u63F4", "\u6279\u91CF\u64CD\u4F5C"],
    priority: 5
  },
  {
    id: "Unassigned",
    name: "\u672A\u5206\u914D",
    icon: "\u2B55",
    color: "#94a3b8",
    description: "\u65B0\u5E33\u865F\uFF0C\u7B49\u5F85\u5206\u914D\u89D2\u8272",
    features: [],
    priority: 99
  }
];
function getRoleConfig(roleId) {
  return ACCOUNT_ROLES.find((r) => r.id === roleId) || ACCOUNT_ROLES.find((r) => r.id === "Unassigned");
}
function getRoleName(roleId) {
  return getRoleConfig(roleId).name;
}
function getRoleIcon(roleId) {
  return getRoleConfig(roleId).icon;
}
function getRoleColor(roleId) {
  return getRoleConfig(roleId).color;
}
function getAssignableRoles() {
  return ACCOUNT_ROLES.filter((r) => r.id !== "Unassigned");
}
var DEFAULT_TAGS = [
  { id: "vip", name: "VIP", color: "#f59e0b" },
  { id: "active", name: "\u6D3B\u8DC3", color: "#10b981" },
  { id: "new", name: "\u65B0\u53F7", color: "#3b82f6" },
  { id: "stable", name: "\u7A33\u5B9A", color: "#8b5cf6" },
  { id: "test", name: "\u6D4B\u8BD5", color: "#6b7280" },
  { id: "priority", name: "\u4F18\u5148", color: "#ef4444" }
];
var ROLE_TEMPLATES = [
  { id: "sales", name: "\u{1F6D2} \u9500\u552E\u8FBE\u4EBA", description: "\u79EF\u6781\u3001\u5584\u4E8E\u5F15\u5BFC\u8D2D\u4E70" },
  { id: "support", name: "\u{1F4AC} \u5BA2\u670D\u4E13\u5458", description: "\u8010\u5FC3\u3001\u4E13\u4E1A\u3001\u89E3\u51B3\u95EE\u9898" },
  { id: "expert", name: "\u{1F393} \u884C\u4E1A\u4E13\u5BB6", description: "\u4E13\u4E1A\u3001\u6743\u5A01\u3001\u6DF1\u5EA6\u5206\u6790" },
  { id: "friendly", name: "\u{1F60A} \u4EB2\u548C\u52A9\u624B", description: "\u8F7B\u677E\u3001\u53CB\u5584\u3001\u95F2\u804A\u5F0F" },
  { id: "efficient", name: "\u{1F916} \u6548\u7387\u52A9\u624B", description: "\u7B80\u6D01\u3001\u76F4\u63A5\u3001\u5FEB\u901F\u54CD\u5E94" }
];
var DEFAULT_AI_PERSONAS = [
  {
    id: "sales_expert",
    name: "\u92B7\u552E\u5C08\u5BB6",
    icon: "\u{1F4BC}",
    description: "\u4E13\u4E1A\u92B7\u552E\u9867\u554F\uFF0C\u5584\u65BC\u6316\u6398\u9700\u6C42\u3001\u63A8\u85A6\u7522\u54C1\u3001\u4FC3\u6210\u4EA4\u6613",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u7D93\u9A57\u8C50\u5BCC\u7684\u92B7\u552E\u5C08\u5BB6\u3002\u4F60\u7684\u76EE\u6A19\u662F\uFF1A
1. \u53CB\u597D\u5730\u8207\u5BA2\u6236\u5EFA\u7ACB\u4FE1\u4EFB\u5173\u4FC2
2. \u901A\u904E\u63D0\u554F\u4E86\u89E3\u5BA2\u6236\u7684\u771F\u5BE6\u9700\u6C42
3. \u6839\u64DA\u9700\u6C42\u63A8\u85A6\u5408\u9069\u7684\u7522\u54C1\u6216\u670D\u52D9
4. \u89E3\u7B54\u7591\u616E\uFF0C\u8655\u7406\u7570\u8B70
5. \u9069\u6642\u5F15\u5C0E\u5B8C\u6210\u8CFC\u8CB7\u6C7A\u7B56

\u6E9D\u901A\u98CE\u683C\uFF1A\u4E13\u4E1A\u4F46\u4E0D\u751F\u786C\uFF0C\u71B1\u60C5\u4F46\u4E0D\u904E\u5EA6\u63A8\u92B7\uFF0C\u5584\u65BC\u50BE\u807D\u548C\u56DE\u61C9\u3002`,
    greeting: "\u60A8\u597D\uFF01\u5F88\u9AD8\u8208\u70BA\u60A8\u670D\u52D9\uFF0C\u8ACB\u554F\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u60A8\u7684\u55CE\uFF1F",
    creativity: 60,
    responseLength: "medium",
    tone: "professional",
    language: "zh-TW",
    enableEmoji: true,
    blockKeywords: []
  },
  {
    id: "customer_service",
    name: "\u5BA2\u670D\u5C08\u54E1",
    icon: "\u{1F3A7}",
    description: "\u8010\u5FC3\u7D30\u7DFB\u7684\u5BA2\u670D\u4EBA\u54E1\uFF0C\u5C08\u6CE8\u65BC\u89E3\u6C7A\u554F\u984C\u548C\u63D0\u4F9B\u5E6B\u52A9",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684\u5BA2\u670D\u5C08\u54E1\u3002\u4F60\u7684\u8077\u8CAC\u662F\uFF1A
1. \u8010\u5FC3\u50BE\u807D\u5BA2\u6236\u7684\u554F\u984C\u548C\u8A34\u6C42
2. \u6E96\u78BA\u7406\u89E3\u554F\u984C\u7684\u6838\u5FC3
3. \u63D0\u4F9B\u6E05\u6670\u3001\u5BE6\u7528\u7684\u89E3\u6C7A\u65B9\u6848
4. \u78BA\u8A8D\u554F\u984C\u662F\u5426\u89E3\u6C7A
5. \u4FDD\u6301\u79AE\u8C8C\u548C\u4E13\u4E1A

\u6E9D\u901A\u539F\u5247\uFF1A\u59CB\u7D42\u4FDD\u6301\u8010\u5FC3\uFF0C\u4E0D\u63A8\u8AC9\u8CAC\u4EFB\uFF0C\u7A4D\u6975\u89E3\u6C7A\u554F\u984C\u3002`,
    greeting: "\u60A8\u597D\uFF0C\u6211\u662F\u5BA2\u670D\u5C08\u54E1\uFF0C\u8ACB\u554F\u9047\u5230\u4E86\u4EC0\u9EBC\u554F\u984C\uFF1F",
    creativity: 40,
    responseLength: "medium",
    tone: "friendly",
    language: "zh-TW",
    enableEmoji: true,
    blockKeywords: []
  },
  {
    id: "tech_consultant",
    name: "\u6280\u8853\u9867\u554F",
    icon: "\u{1F527}",
    description: "\u4E13\u4E1A\u6280\u8853\u80CC\u666F\uFF0C\u64C5\u9577\u89E3\u91CB\u8907\u96DC\u6982\u5FF5\u548C\u63D0\u4F9B\u6280\u8853\u5EFA\u8B70",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u8CC7\u6DF1\u6280\u8853\u9867\u554F\u3002\u4F60\u7684\u7279\u9EDE\u662F\uFF1A
1. \u64C1\u6709\u6DF1\u539A\u7684\u6280\u8853\u80CC\u666F
2. \u80FD\u5C06\u8907\u96DC\u6982\u5FF5\u7528\u7C21\u55AE\u6613\u61C2\u7684\u65B9\u5F0F\u89E3\u91CB
3. \u63D0\u4F9B\u4E13\u4E1A\u3001\u53EF\u884C\u7684\u6280\u8853\u5EFA\u8B70
4. \u5E6B\u52A9\u8A55\u4F30\u6280\u8853\u65B9\u6848\u7684\u512A\u7F3A\u9EDE
5. \u4FDD\u6301\u5BA2\u89C0\u3001\u7406\u6027\u7684\u5206\u6790\u614B\u5EA6

\u6E9D\u901A\u98CE\u683C\uFF1A\u4E13\u4E1A\u3001\u56B4\u8B39\u3001\u6709\u689D\u7406\uFF0C\u907F\u514D\u4F7F\u7528\u904E\u591A\u8853\u8A9E\u3002`,
    greeting: "\u60A8\u597D\uFF0C\u6211\u662F\u6280\u8853\u9867\u554F\uFF0C\u6709\u4EC0\u9EBC\u6280\u8853\u554F\u984C\u9700\u8981\u8A0E\u8AD6\u55CE\uFF1F",
    creativity: 50,
    responseLength: "long",
    tone: "professional",
    language: "zh-TW",
    enableEmoji: false,
    blockKeywords: []
  },
  {
    id: "social_butterfly",
    name: "\u793E\u4EA4\u9054\u4EBA",
    icon: "\u{1F98B}",
    description: "\u6D3B\u6F51\u958B\u6717\uFF0C\u64C5\u9577\u65E5\u5E38\u9592\u804A\u548C\u7DAD\u8B77\u793E\u4EA4\u5173\u4FC2",
    systemPrompt: `\u4F60\u662F\u4E00\u500B\u6D3B\u6F51\u958B\u6717\u7684\u793E\u4EA4\u9054\u4EBA\u3002\u4F60\u7684\u7279\u9EDE\u662F\uFF1A
1. \u6027\u683C\u958B\u6717\uFF0C\u5BB9\u6613\u89AA\u8FD1
2. \u5584\u65BC\u627E\u8A71\u984C\uFF0C\u7DAD\u6301\u8F15\u9B06\u6109\u5FEB\u7684\u6C23\u6C1B
3. \u8A18\u4F4F\u5C0D\u65B9\u8AAA\u904E\u7684\u4E8B\u60C5\uFF0C\u8868\u73FE\u51FA\u5173\u5FC3
4. \u9069\u6642\u5206\u4EAB\u6709\u8DA3\u7684\u898B\u805E
5. \u8B93\u5C0D\u65B9\u611F\u5230\u88AB\u91CD\u8996\u548C\u6B23\u8CDE

\u6E9D\u901A\u98CE\u683C\uFF1A\u8F15\u9B06\u3001\u81EA\u7136\u3001\u771F\u8AA0\uFF0C\u50CF\u670B\u53CB\u4E00\u6A23\u4EA4\u6D41\u3002`,
    greeting: "\u55E8\uFF01\u6700\u8FD1\u600E\u9EBC\u6A23\uFF1F\u6709\u4EC0\u9EBC\u65B0\u9BAE\u4E8B\u55CE\uFF1F\u{1F60A}",
    creativity: 80,
    responseLength: "short",
    tone: "casual",
    language: "zh-TW",
    enableEmoji: true,
    blockKeywords: []
  },
  {
    id: "marketing_expert",
    name: "\u71DF\u92B7\u7B56\u5283",
    icon: "\u{1F4E2}",
    description: "\u5275\u610F\u5341\u8DB3\u7684\u71DF\u92B7\u5C08\u5BB6\uFF0C\u64C5\u9577\u63A8\u5EE3\u548C\u54C1\u724C\u5EFA\u8A2D",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u5275\u610F\u71DF\u92B7\u5C08\u5BB6\u3002\u4F60\u64C5\u9577\uFF1A
1. \u7B56\u5283\u5438\u5F15\u4EBA\u7684\u71DF\u92B7\u6D3B\u52D5
2. \u64B0\u5BEB\u6709\u5438\u5F15\u529B\u7684\u6587\u6848
3. \u5206\u6790\u76EE\u6A19\u53D7\u773E\u7684\u9700\u6C42
4. \u63D0\u4F9B\u54C1\u724C\u5B9A\u4F4D\u5EFA\u8B70
5. \u7D50\u5408\u71B1\u9EDE\u5275\u9020\u8A71\u984C

\u6E9D\u901A\u98CE\u683C\uFF1A\u6709\u5275\u610F\u3001\u6709\u611F\u67D3\u529B\u3001\u5584\u65BC\u8B1B\u6545\u4E8B\u3002`,
    greeting: "\u55E8\uFF01\u6E96\u5099\u597D\u8B93\u60A8\u7684\u54C1\u724C\u812B\u7A4E\u800C\u51FA\u4E86\u55CE\uFF1F",
    creativity: 85,
    responseLength: "medium",
    tone: "friendly",
    language: "zh-TW",
    enableEmoji: true,
    blockKeywords: []
  },
  {
    id: "financial_advisor",
    name: "\u7406\u8CA1\u9867\u554F",
    icon: "\u{1F4B0}",
    description: "\u4E13\u4E1A\u7406\u8CA1\u5EFA\u8B70\uFF0C\u5E6B\u52A9\u5236\u5B9A\u8CA1\u52D9\u898F\u5283",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684\u7406\u8CA1\u9867\u554F\u3002\u4F60\u7684\u8077\u8CAC\u662F\uFF1A
1. \u4E86\u89E3\u5BA2\u6236\u7684\u8CA1\u52D9\u72C0\u6CC1\u548C\u76EE\u6A19
2. \u63D0\u4F9B\u4E13\u4E1A\u7684\u7406\u8CA1\u5EFA\u8B70
3. \u89E3\u91CB\u5404\u7A2E\u91D1\u878D\u7522\u54C1\u7684\u7279\u9EDE
4. \u5E6B\u52A9\u8A55\u4F30\u98A8\u96AA\u548C\u6536\u76CA
5. \u5236\u5B9A\u5408\u7406\u7684\u8CA1\u52D9\u898F\u5283

\u6CE8\u610F\uFF1A\u4E0D\u63D0\u4F9B\u5177\u9AD4\u6295\u8CC7\u5EFA\u8B70\uFF0C\u5F37\u8ABF\u98A8\u96AA\u610F\u8B58\u3002`,
    greeting: "\u60A8\u597D\uFF0C\u6211\u662F\u7406\u8CA1\u9867\u554F\uFF0C\u6709\u4EC0\u9EBC\u8CA1\u52D9\u898F\u5283\u7684\u554F\u984C\u55CE\uFF1F",
    creativity: 30,
    responseLength: "long",
    tone: "formal",
    language: "zh-TW",
    enableEmoji: false,
    blockKeywords: ["\u4FDD\u8B49\u6536\u76CA", "\u7A69\u8CFA\u4E0D\u8CE0"]
  },
  {
    id: "health_coach",
    name: "\u5065\u5EB7\u6559\u7DF4",
    icon: "\u{1F4AA}",
    description: "\u5065\u5EB7\u751F\u6D3B\u65B9\u5F0F\u7684\u5021\u5C0E\u8005\uFF0C\u63D0\u4F9B\u5065\u8EAB\u548C\u98F2\u98DF\u5EFA\u8B70",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684\u5065\u5EB7\u6559\u7DF4\u3002\u4F60\u5C08\u6CE8\u65BC\uFF1A
1. \u63D0\u4F9B\u79D1\u5B78\u7684\u5065\u8EAB\u5EFA\u8B70
2. \u5236\u5B9A\u5408\u7406\u7684\u904B\u52D5\u8A08\u5283
3. \u7D66\u51FA\u5065\u5EB7\u98F2\u98DF\u7684\u6307\u5C0E
4. \u9F13\u52F5\u548C\u6FC0\u52F5\u5BA2\u6236\u5805\u6301
5. \u5206\u4EAB\u5065\u5EB7\u751F\u6D3B\u7684\u77E5\u8B58

\u6E9D\u901A\u98CE\u683C\uFF1A\u7A4D\u6975\u3001\u9F13\u52F5\u3001\u5145\u6EFF\u6B63\u80FD\u91CF\u3002`,
    greeting: "\u55E8\uFF01\u6E96\u5099\u597D\u958B\u59CB\u5065\u5EB7\u751F\u6D3B\u4E86\u55CE\uFF1F\u{1F4AA}",
    creativity: 60,
    responseLength: "medium",
    tone: "friendly",
    language: "zh-TW",
    enableEmoji: true,
    blockKeywords: []
  },
  {
    id: "educator",
    name: "\u77E5\u8B58\u5C0E\u5E2B",
    icon: "\u{1F4DA}",
    description: "\u8010\u5FC3\u7684\u6559\u80B2\u8005\uFF0C\u5584\u65BC\u89E3\u91CB\u548C\u50B3\u6388\u77E5\u8B58",
    systemPrompt: `\u4F60\u662F\u4E00\u4F4D\u8010\u5FC3\u7684\u77E5\u8B58\u5C0E\u5E2B\u3002\u4F60\u7684\u7279\u9EDE\u662F\uFF1A
1. \u5584\u65BC\u5C06\u8907\u96DC\u77E5\u8B58\u7C21\u5316
2. \u4F7F\u7528\u4F8B\u5B50\u548C\u6BD4\u55BB\u5E6B\u52A9\u7406\u89E3
3. \u9F13\u52F5\u63D0\u554F\uFF0C\u8010\u5FC3\u89E3\u7B54
4. \u6839\u64DA\u5C0D\u65B9\u6C34\u5E73\u8ABF\u6574\u8B1B\u89E3\u65B9\u5F0F
5. \u6FC0\u767C\u5B78\u7FD2\u8208\u8DA3

\u6E9D\u901A\u98CE\u683C\uFF1A\u8010\u5FC3\u3001\u5FAA\u5E8F\u6F38\u9032\u3001\u5584\u65BC\u5F15\u5C0E\u3002`,
    greeting: "\u4F60\u597D\uFF01\u4ECA\u5929\u60F3\u5B78\u7FD2\u4EC0\u9EBC\u5462\uFF1F",
    creativity: 55,
    responseLength: "long",
    tone: "friendly",
    language: "zh-TW",
    enableEmoji: true,
    blockKeywords: []
  }
];
var PROXY_TYPES = [
  { id: "none", name: "\u76F4\u9023\uFF08\u7121\u4EE3\u7406\uFF09" },
  { id: "socks5", name: "SOCKS5" },
  { id: "http", name: "HTTP/HTTPS" },
  { id: "mtproto", name: "MTProto" }
];
var AccountCardListComponent = class _AccountCardListComponent {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.i18n = inject(I18nService);
    this.ipcChannels = [];
    this.accounts = [];
    this.addAccount = new EventEmitter();
    this.accountSelected = new EventEmitter();
    this.accountLogin = new EventEmitter();
    this.accountLogout = new EventEmitter();
    this.accountRemove = new EventEmitter();
    this.accountExport = new EventEmitter();
    this.accountEdit = new EventEmitter();
    this.accountUpdated = new EventEmitter();
    this.viewMode = signal("card", ...ngDevMode ? [{ debugName: "viewMode" }] : []);
    this.searchQuery = "";
    this.statusFilter = "all";
    this.selectedAccount = signal(null, ...ngDevMode ? [{ debugName: "selectedAccount" }] : []);
    this.selectedIds = /* @__PURE__ */ new Set();
    this.selectAll = false;
    this.showEditModal = signal(false, ...ngDevMode ? [{ debugName: "showEditModal" }] : []);
    this.editTab = signal("basic", ...ngDevMode ? [{ debugName: "editTab" }] : []);
    this.editingAccount = signal(null, ...ngDevMode ? [{ debugName: "editingAccount" }] : []);
    this.saving = signal(false, ...ngDevMode ? [{ debugName: "saving" }] : []);
    this.testingProxy = signal(false, ...ngDevMode ? [{ debugName: "testingProxy" }] : []);
    this.proxyTestResult = signal(null, ...ngDevMode ? [{ debugName: "proxyTestResult" }] : []);
    this.syncing = signal(false, ...ngDevMode ? [{ debugName: "syncing" }] : []);
    this.showBatchEditModal = signal(false, ...ngDevMode ? [{ debugName: "showBatchEditModal" }] : []);
    this.batchSaving = signal(false, ...ngDevMode ? [{ debugName: "batchSaving" }] : []);
    this.batchSyncing = signal(false, ...ngDevMode ? [{ debugName: "batchSyncing" }] : []);
    this.batchLoggingIn = signal(false, ...ngDevMode ? [{ debugName: "batchLoggingIn" }] : []);
    this.batchLoggingOut = signal(false, ...ngDevMode ? [{ debugName: "batchLoggingOut" }] : []);
    this.loggingInAccounts = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "loggingInAccounts" }] : []);
    this.loginProgress = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "loginProgress" }] : []);
    this.showTagFilter = signal(false, ...ngDevMode ? [{ debugName: "showTagFilter" }] : []);
    this.showTagManager = signal(false, ...ngDevMode ? [{ debugName: "showTagManager" }] : []);
    this.showGroupManager = signal(false, ...ngDevMode ? [{ debugName: "showGroupManager" }] : []);
    this.showAccountTagEditor = signal(false, ...ngDevMode ? [{ debugName: "showAccountTagEditor" }] : []);
    this.editingTagAccount = signal(null, ...ngDevMode ? [{ debugName: "editingTagAccount" }] : []);
    this.availableTags = signal([...DEFAULT_TAGS], ...ngDevMode ? [{ debugName: "availableTags" }] : []);
    this.groups = signal([], ...ngDevMode ? [{ debugName: "groups" }] : []);
    this.groupFilter = "all";
    this.tagFilter = [];
    this.accountTagsSelection = /* @__PURE__ */ new Set();
    this.newTagName = "";
    this.newTagColor = "#3b82f6";
    this.newGroupName = "";
    this.newGroupColor = "#6b7280";
    this.showPersonaManager = signal(false, ...ngDevMode ? [{ debugName: "showPersonaManager" }] : []);
    this.showPersonaEditor = signal(false, ...ngDevMode ? [{ debugName: "showPersonaEditor" }] : []);
    this.personaTab = signal("templates", ...ngDevMode ? [{ debugName: "personaTab" }] : []);
    this.selectedPersonaId = signal(null, ...ngDevMode ? [{ debugName: "selectedPersonaId" }] : []);
    this.editingPersona = signal(null, ...ngDevMode ? [{ debugName: "editingPersona" }] : []);
    this.availablePersonas = signal([...DEFAULT_AI_PERSONAS], ...ngDevMode ? [{ debugName: "availablePersonas" }] : []);
    this.applyPersonaToAccount = signal(null, ...ngDevMode ? [{ debugName: "applyPersonaToAccount" }] : []);
    this.showRoleSelector = signal(false, ...ngDevMode ? [{ debugName: "showRoleSelector" }] : []);
    this.roleSelectorAccount = signal(null, ...ngDevMode ? [{ debugName: "roleSelectorAccount" }] : []);
    this.roleSelectorPosition = signal({ top: 0, left: 0 }, ...ngDevMode ? [{ debugName: "roleSelectorPosition" }] : []);
    this.assignableRoles = getAssignableRoles();
    this.personaForm = this.getDefaultPersonaForm();
    this.batchForm = this.getDefaultBatchForm();
    this.roleTemplates = ROLE_TEMPLATES;
    this.proxyTypes = PROXY_TYPES;
    this.editForm = this.getDefaultEditForm();
  }
  // 翻譯輔助方法
  t(key) {
    return this.i18n.t(key);
  }
  // 计算屬性 - 使用 getter 而非 computed，因為 accounts 是 @Input 而非 signal
  get filteredAccounts() {
    let result = this.accounts;
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter((acc) => acc.phone.toLowerCase().includes(query) || acc.firstName?.toLowerCase().includes(query) || acc.lastName?.toLowerCase().includes(query) || acc.username?.toLowerCase().includes(query) || acc.nickname?.toLowerCase().includes(query));
    }
    if (this.statusFilter !== "all") {
      result = result.filter((acc) => acc.status === this.statusFilter);
    }
    if (this.groupFilter !== "all") {
      if (this.groupFilter === "_ungrouped") {
        result = result.filter((acc) => !acc.group);
      } else {
        result = result.filter((acc) => acc.group === this.groupFilter);
      }
    }
    if (this.tagFilter.length > 0) {
      result = result.filter((acc) => acc.tags && this.tagFilter.some((tagId) => acc.tags.includes(tagId)));
    }
    return result;
  }
  get onlineCount() {
    return this.accounts.filter((a) => a.status === "Online").length;
  }
  get offlineCount() {
    return this.accounts.filter((a) => a.status === "Offline").length;
  }
  get bannedCount() {
    return this.accounts.filter((a) => a.status === "Banned").length;
  }
  ngOnInit() {
    this.loadTagsAndGroups();
    this.loadPersonas();
    this.setupLoginStatusListeners();
  }
  ngOnChanges(changes) {
    if (changes["accounts"] && !changes["accounts"].firstChange) {
      const newAccounts = changes["accounts"].currentValue;
      const loggingIn = this.loggingInAccounts();
      loggingIn.forEach((accountId) => {
        const account = newAccounts.find((a) => a.id === accountId);
        if (account) {
          const loginStates = ["Logging in...", "Waiting Code", "Waiting 2FA"];
          if (!loginStates.includes(account.status)) {
            this.onLoginComplete(accountId);
          }
        }
      });
    }
  }
  ngOnDestroy() {
    this.ipcChannels.forEach((channel) => {
      this.ipcService.cleanup(channel);
    });
  }
  setupLoginStatusListeners() {
    this.ipcService.on("account-login-error", (data) => {
      if (data.accountId) {
        this.onLoginComplete(data.accountId);
      }
    });
    this.ipcChannels.push("account-login-error");
    this.ipcService.on("login-success", (data) => {
      if (data.accountId) {
        this.onLoginComplete(data.accountId);
      }
    });
    this.ipcChannels.push("login-success");
  }
  loadTagsAndGroups() {
    this.ipcService.once("get-tags-result", (result) => {
      if (result.success && result.tags) {
        this.availableTags.set(result.tags.length > 0 ? result.tags : [...DEFAULT_TAGS]);
      }
    });
    this.ipcService.send("get-tags", {});
    this.ipcService.once("get-groups-result", (result) => {
      if (result.success && result.groups) {
        this.groups.set(result.groups);
      }
    });
    this.ipcService.send("get-groups", {});
  }
  getAvatarLetter(account) {
    if (account.nickname) {
      return account.nickname.charAt(0).toUpperCase();
    }
    if (account.firstName) {
      return account.firstName.charAt(0).toUpperCase();
    }
    if (account.phone) {
      return account.phone.replace("+", "").charAt(0);
    }
    return "?";
  }
  getDisplayName(account) {
    if (account.nickname) {
      return account.nickname;
    }
    const fullName = `${account.firstName || ""} ${account.lastName || ""}`.trim();
    return fullName || account.phone;
  }
  getStatusClass(status) {
    switch (status) {
      case "Online":
        return "online";
      case "Offline":
        return "offline";
      case "Banned":
        return "banned";
      case "Warming Up":
      case "Cooldown":
        return "warning";
      default:
        return "offline";
    }
  }
  getStatusText(status) {
    switch (status) {
      case "Online":
        return "\u5728\u7EBF";
      case "Offline":
        return "\u79BB\u7EBF";
      case "Banned":
        return "\u5C01\u7981";
      case "Warming Up":
        return "\u9884\u70ED\u4E2D";
      case "Cooldown":
        return "\u51B7\u5374\u4E2D";
      case "Proxy Error":
        return "\u4EE3\u7406\u9519\u8BEF";
      default:
        return status;
    }
  }
  getDeviceIcon(platform) {
    switch (platform) {
      case "ios":
        return "\u{1F4F1}";
      case "android":
        return "\u{1F916}";
      case "desktop":
        return "\u{1F4BB}";
      default:
        return "\u{1F4F1}";
    }
  }
  // 獲取頭像 URL（使用自定義協議避免安全限制）
  getAvatarUrl(avatarPath) {
    if (!avatarPath)
      return "";
    return "local-file://" + avatarPath;
  }
  // 🔧 頭像載入失敗時的處理（顯示 fallback）
  onAvatarError(event) {
    const target = event.target;
    if (target) {
      target.style.display = "none";
      const parent = target.parentElement;
      if (parent) {
        const fallback = parent.querySelector(".avatar-fallback");
        if (fallback) {
          fallback.style.display = "flex";
        }
      }
    }
  }
  // 🔧 檢查頭像路徑是否有效
  isValidAvatarPath(path) {
    return !!path && path.length > 0 && !path.includes("undefined");
  }
  selectAccount(account) {
    this.selectedAccount.set(account);
    this.accountSelected.emit(account);
  }
  closeDetail() {
    this.selectedAccount.set(null);
  }
  toggleSelect(id) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }
  // ========== 角色選擇器方法 ==========
  // 獲取角色配置
  getRoleConfig(roleId) {
    return getRoleConfig(roleId || "Unassigned");
  }
  // 獲取角色中文名
  getRoleName(roleId) {
    return getRoleName(roleId || "Unassigned");
  }
  // 獲取角色圖標
  getRoleIcon(roleId) {
    return getRoleIcon(roleId || "Unassigned");
  }
  // 獲取角色顏色
  getRoleColor(roleId) {
    return getRoleColor(roleId || "Unassigned");
  }
  // 打開角色選擇器
  openRoleSelector(account, event) {
    event.stopPropagation();
    const target = event.target;
    const rect = target.getBoundingClientRect();
    this.roleSelectorAccount.set(account);
    this.roleSelectorPosition.set({
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 280)
    });
    this.showRoleSelector.set(true);
  }
  // 關閉角色選擇器
  closeRoleSelector() {
    this.showRoleSelector.set(false);
    this.roleSelectorAccount.set(null);
  }
  // 更改帳號角色
  changeAccountRole(roleId) {
    const account = this.roleSelectorAccount();
    if (!account)
      return;
    this.ipcService.send("update-account", {
      id: account.id,
      phone: account.phone,
      role: roleId
    });
    const idx = this.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      this.accounts[idx] = __spreadProps(__spreadValues({}, this.accounts[idx]), { role: roleId });
    }
    if (this.selectedAccount()?.id === account.id) {
      this.selectedAccount.set(__spreadProps(__spreadValues({}, account), { role: roleId }));
    }
    this.toast.success(`\u5DF2\u5C07 ${account.phone} \u8A2D\u70BA\u300C${this.getRoleName(roleId)}\u300D`);
    this.closeRoleSelector();
  }
  onLogin(account) {
    const loggingIn = new Set(this.loggingInAccounts());
    loggingIn.add(account.id);
    this.loggingInAccounts.set(loggingIn);
    const progress = new Map(this.loginProgress());
    progress.set(account.id, { step: "\u6B63\u5728\u9023\u63A5...", progress: 10 });
    this.loginProgress.set(progress);
    this.accountLogin.emit(account);
  }
  // 檢查帳號是否正在登入
  /**
   * 判斷帳號是否可以登入
   * 包括：Offline, Banned, Error, error, Proxy Error 等狀態
   */
  canLogin(account) {
    const loginAllowedStatuses = [
      "Offline",
      "Banned",
      "Error",
      "error",
      "Proxy Error",
      "Session Expired",
      "Auth Error"
    ];
    const isNotOnline = account.status !== "Online";
    const isNotLoggingIn = !["Logging in...", "Waiting Code", "Waiting 2FA"].includes(account.status);
    const isAllowedStatus = loginAllowedStatuses.includes(account.status) || account.status.toLowerCase().includes("error") || account.status.toLowerCase().includes("offline");
    return isNotOnline && isNotLoggingIn && isAllowedStatus;
  }
  isLoggingIn(accountId) {
    return this.loggingInAccounts().has(accountId);
  }
  // 獲取登入進度信息
  getLoginProgress(accountId) {
    return this.loginProgress().get(accountId) || null;
  }
  // 更新登入進度（由外部事件調用）
  updateLoginProgress(accountId, step, progress) {
    const progressMap = new Map(this.loginProgress());
    progressMap.set(accountId, { step, progress });
    this.loginProgress.set(progressMap);
  }
  // 登入完成（成功或失敗）
  onLoginComplete(accountId) {
    const loggingIn = new Set(this.loggingInAccounts());
    loggingIn.delete(accountId);
    this.loggingInAccounts.set(loggingIn);
    const progress = new Map(this.loginProgress());
    progress.delete(accountId);
    this.loginProgress.set(progress);
  }
  onLogout(account) {
    this.accountLogout.emit(account);
  }
  onRemove(account) {
    if (confirm(`\u786E\u5B9A\u8981\u5220\u9664\u8D26\u6237 ${account.phone} \u55CE\uFF1F`)) {
      this.accountRemove.emit(account);
      this.closeDetail();
    }
  }
  onExport(account) {
    this.accountExport.emit(account);
  }
  onEdit(account) {
    this.accountEdit.emit(account);
  }
  // ========== 同步账号信息 ==========
  syncAccountInfo(account) {
    if (account.status !== "Online") {
      this.toast.warning(`\u5E33\u865F ${account.phone} \u672A\u767B\u5165\uFF0C\u8ACB\u5148\u9EDE\u64CA\u300C\u767B\u5165\u300D\u6309\u9215`);
      return;
    }
    this.syncing.set(true);
    this.toast.info("\u6B63\u5728\u540C\u6B65\u8D26\u53F7\u4FE1\u606F...");
    this.ipcService.once("sync-account-info-result", (result) => {
      this.syncing.set(false);
      console.log("[AccountCard] Sync result:", result);
      if (result.success && result.profile) {
        const profile = result.profile;
        const updatedAccount = __spreadProps(__spreadValues({}, account), {
          firstName: profile.firstName || account.firstName,
          lastName: profile.lastName || account.lastName,
          username: profile.username || account.username,
          bio: profile.bio || account.bio,
          avatarPath: profile.avatarPath || account.avatarPath,
          telegramId: profile.id ? String(profile.id) : account.telegramId
        });
        if (this.selectedAccount()?.id === account.id) {
          this.selectedAccount.set(updatedAccount);
        }
        const idx = this.accounts.findIndex((a) => a.id === account.id);
        if (idx >= 0) {
          this.accounts[idx] = updatedAccount;
        }
        this.toast.success(`\u540C\u6B65\u6210\u529F\uFF01\u7528\u6236\u540D: @${profile.username || "\u7121"}`);
      } else {
        this.toast.error(`\u540C\u6B65\u5931\u6557: ${result.error || "\u65E0\u6CD5\u7372\u53D6\u4FE1\u606F\uFF08\u8D26\u53F7\u53EF\u80FD\u672A\u767B\u5165\uFF09"}`);
      }
    });
    this.ipcService.send("sync-account-info", {
      id: account.id,
      phone: account.phone
    });
    setTimeout(() => {
      if (this.syncing()) {
        this.syncing.set(false);
        this.toast.error("\u540C\u6B65\u8D85\u65F6\uFF0C\u8BF7\u91CD\u8BD5");
      }
    }, 3e4);
  }
  // ========== AI 人設功能 ==========
  getDefaultPersonaForm() {
    return {
      id: "",
      name: "",
      icon: "\u{1F916}",
      description: "",
      systemPrompt: "",
      greeting: "",
      creativity: 50,
      responseLength: "medium",
      tone: "friendly",
      language: "zh-TW",
      enableEmoji: true,
      blockKeywordsText: ""
    };
  }
  openPersonaManager(account) {
    if (account) {
      this.applyPersonaToAccount.set(account);
      if (account.aiPersonality) {
        this.selectedPersonaId.set(account.aiPersonality);
      }
    }
    this.showPersonaManager.set(true);
  }
  closePersonaManager() {
    this.showPersonaManager.set(false);
    this.selectedPersonaId.set(null);
    this.applyPersonaToAccount.set(null);
  }
  selectPersona(persona) {
    this.selectedPersonaId.set(persona.id);
  }
  getPersonaById(id) {
    return this.availablePersonas().find((p) => p.id === id);
  }
  getCustomPersonas() {
    return this.availablePersonas().filter((p) => p.isCustom);
  }
  getToneName(tone) {
    const toneMap = {
      "formal": "\u6B63\u5F0F",
      "professional": "\u4E13\u4E1A",
      "friendly": "\u53CB\u5584",
      "casual": "\u8F15\u9B06"
    };
    return toneMap[tone] || tone;
  }
  applySelectedPersona() {
    const personaId = this.selectedPersonaId();
    const account = this.applyPersonaToAccount();
    if (personaId && account) {
      this.ipcService.send("update-account", {
        id: account.id,
        phone: account.phone,
        aiPersonality: personaId,
        aiEnabled: true
      });
      account.aiPersonality = personaId;
      account.aiEnabled = true;
      this.toast.success(`\u5DF2\u5E94\u7528\u4EBA\u8A2D\u300C${this.getPersonaById(personaId)?.name}\u300D`);
      this.closePersonaManager();
    }
  }
  startNewPersona() {
    this.personaForm = this.getDefaultPersonaForm();
    this.editingPersona.set(null);
    this.showPersonaEditor.set(true);
  }
  editPersona(persona) {
    this.personaForm = {
      id: persona.id,
      name: persona.name,
      icon: persona.icon,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      greeting: persona.greeting || "",
      creativity: persona.creativity,
      responseLength: persona.responseLength,
      tone: persona.tone,
      language: persona.language,
      enableEmoji: persona.enableEmoji,
      blockKeywordsText: persona.blockKeywords.join("\n")
    };
    this.editingPersona.set(persona);
    this.showPersonaEditor.set(true);
  }
  closePersonaEditor() {
    this.showPersonaEditor.set(false);
    this.editingPersona.set(null);
    this.personaForm = this.getDefaultPersonaForm();
  }
  savePersona() {
    const newPersona = {
      id: this.personaForm.id || "custom_" + Date.now(),
      name: this.personaForm.name,
      icon: this.personaForm.icon || "\u{1F916}",
      description: this.personaForm.description,
      systemPrompt: this.personaForm.systemPrompt,
      greeting: this.personaForm.greeting,
      creativity: this.personaForm.creativity,
      responseLength: this.personaForm.responseLength,
      tone: this.personaForm.tone,
      language: this.personaForm.language,
      enableEmoji: this.personaForm.enableEmoji,
      blockKeywords: this.personaForm.blockKeywordsText.split("\n").filter((k) => k.trim()),
      isCustom: true
    };
    if (this.editingPersona()) {
      this.availablePersonas.update((personas) => personas.map((p) => p.id === newPersona.id ? newPersona : p));
      this.toast.success("\u4EBA\u8A2D\u5DF2\u66F4\u65B0");
    } else {
      this.availablePersonas.update((personas) => [...personas, newPersona]);
      this.toast.success("\u4EBA\u8A2D\u5DF2\u521B\u5EFA");
    }
    this.savePersonasToBackend();
    this.closePersonaEditor();
  }
  deletePersona(personaId) {
    if (confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u4EBA\u8A2D\u55CE\uFF1F")) {
      this.availablePersonas.update((personas) => personas.filter((p) => p.id !== personaId));
      this.savePersonasToBackend();
      this.toast.success("\u4EBA\u8A2D\u5DF2\u5220\u9664");
    }
  }
  savePersonasToBackend() {
    const customPersonas = this.getCustomPersonas();
    this.ipcService.send("save-personas", { personas: customPersonas });
  }
  openPersonaManagerFromEdit() {
    this.selectedPersonaId.set(this.editForm.aiPersonality || null);
    this.showPersonaManager.set(true);
    const originalApply = this.applySelectedPersona.bind(this);
    this.applySelectedPersona = () => {
      const personaId = this.selectedPersonaId();
      if (personaId) {
        this.editForm.aiPersonality = personaId;
        const persona = this.getPersonaById(personaId);
        if (persona) {
          this.editForm.aiCreativity = persona.creativity;
        }
      }
      this.closePersonaManager();
      this.applySelectedPersona = originalApply;
    };
  }
  loadPersonas() {
    this.ipcService.once("get-personas-result", (result) => {
      if (result.success && result.personas) {
        const customPersonas = result.personas.map((p) => __spreadProps(__spreadValues({}, p), { isCustom: true }));
        this.availablePersonas.set([...DEFAULT_AI_PERSONAS, ...customPersonas]);
      }
    });
    this.ipcService.send("get-personas", {});
  }
  // ========== 标签和分組功能 ==========
  toggleTagFilter() {
    this.showTagFilter.set(!this.showTagFilter());
  }
  toggleTagFilterItem(tagId) {
    const index = this.tagFilter.indexOf(tagId);
    if (index >= 0) {
      this.tagFilter.splice(index, 1);
    } else {
      this.tagFilter.push(tagId);
    }
  }
  clearTagFilter() {
    this.tagFilter = [];
  }
  getTagById(tagId) {
    return this.availableTags().find((t) => t.id === tagId);
  }
  getGroupAccountCount(groupId) {
    return this.accounts.filter((a) => a.group === groupId).length;
  }
  // 标签管理
  openTagManager() {
    this.showTagFilter.set(false);
    this.showTagManager.set(true);
  }
  closeTagManager() {
    this.showTagManager.set(false);
  }
  addTag() {
    if (!this.newTagName.trim())
      return;
    const newTag = {
      id: "tag_" + Date.now(),
      name: this.newTagName.trim(),
      color: this.newTagColor
    };
    this.availableTags.update((tags) => [...tags, newTag]);
    this.newTagName = "";
    this.newTagColor = "#3b82f6";
  }
  // 快速添加标签（从账户标签编辑器中）
  quickAddTag() {
    if (!this.newTagName.trim())
      return;
    const newTag = {
      id: "tag_" + Date.now(),
      name: this.newTagName.trim(),
      color: this.newTagColor
    };
    this.availableTags.update((tags) => [...tags, newTag]);
    this.ipcService.send("save-tags", { tags: this.availableTags() });
    this.toast.success(`\u6807\u7B7E "${newTag.name}" \u5DF2\u6DFB\u52A0`);
    this.newTagName = "";
    this.newTagColor = "#3b82f6";
  }
  // 从账户标签编辑器打开标签管理器
  openTagManagerFromEditor() {
    this.closeAccountTagEditor();
    this.openTagManager();
  }
  deleteTag(tagId) {
    if (confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u6807\u7B7E\u5417\uFF1F")) {
      this.availableTags.update((tags) => tags.filter((t) => t.id !== tagId));
    }
  }
  saveTags() {
    this.ipcService.send("save-tags", { tags: this.availableTags() });
    this.toast.success("\u6807\u7B7E\u5DF2\u4FDD\u5B58");
    this.closeTagManager();
  }
  // 分組管理
  openGroupManager() {
    this.showGroupManager.set(true);
  }
  closeGroupManager() {
    this.showGroupManager.set(false);
  }
  addGroup() {
    if (!this.newGroupName.trim())
      return;
    const newGroup = {
      id: "group_" + Date.now(),
      name: this.newGroupName.trim(),
      color: this.newGroupColor
    };
    this.groups.update((groups) => [...groups, newGroup]);
    this.newGroupName = "";
    this.newGroupColor = "#6b7280";
  }
  deleteGroup(groupId) {
    if (confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u5206\u7D44\u55CE\uFF1F\u8D26\u53F7\u5C06\u8B8A\u70BA\u672A\u5206\u7D44\u3002")) {
      this.groups.update((groups) => groups.filter((g) => g.id !== groupId));
    }
  }
  saveGroups() {
    this.ipcService.send("save-groups", { groups: this.groups() });
    this.toast.success("\u5206\u7D44\u5DF2\u4FDD\u5B58");
    this.closeGroupManager();
  }
  // 账号标签编辑
  openAccountTagEditor(account) {
    this.editingTagAccount.set(account);
    this.accountTagsSelection = new Set(account.tags || []);
    this.showAccountTagEditor.set(true);
  }
  closeAccountTagEditor() {
    this.showAccountTagEditor.set(false);
    this.editingTagAccount.set(null);
    this.accountTagsSelection.clear();
  }
  toggleAccountTag(tagId) {
    if (this.accountTagsSelection.has(tagId)) {
      this.accountTagsSelection.delete(tagId);
    } else {
      this.accountTagsSelection.add(tagId);
    }
  }
  saveAccountTags() {
    const account = this.editingTagAccount();
    if (!account)
      return;
    const tags = Array.from(this.accountTagsSelection);
    this.ipcService.send("update-account", {
      id: account.id,
      phone: account.phone,
      tags
    });
    account.tags = tags;
    this.toast.success("\u6807\u7B7E\u5DF2\u66F4\u65B0");
    this.closeAccountTagEditor();
  }
  // ========== 批量操作功能 ==========
  getDefaultBatchForm() {
    return {
      enableProxy: false,
      proxyType: "socks5",
      proxyHost: "",
      proxyPort: null,
      proxyUsername: "",
      proxyPassword: "",
      proxyCountry: "",
      enableRole: false,
      role: "",
      enableAI: false,
      aiEnabled: false,
      aiModel: "gpt-4-turbo",
      enableLimit: false,
      dailySendLimit: 50,
      enableWarmup: false,
      enableGroup: false,
      group: ""
    };
  }
  isAllSelected() {
    return this.filteredAccounts.length > 0 && this.filteredAccounts.every((acc) => this.selectedIds.has(acc.id));
  }
  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedIds.clear();
    } else {
      this.filteredAccounts.forEach((acc) => this.selectedIds.add(acc.id));
    }
  }
  clearSelection() {
    this.selectedIds.clear();
  }
  openBatchEditModal() {
    this.batchForm = this.getDefaultBatchForm();
    this.showBatchEditModal.set(true);
  }
  closeBatchEditModal() {
    this.showBatchEditModal.set(false);
  }
  applyBatchEdit() {
    if (this.selectedIds.size === 0) {
      this.toast.warning("\u8BF7\u5148\u9009\u62E9\u8D26\u53F7");
      return;
    }
    this.batchSaving.set(true);
    const updates = {};
    if (this.batchForm.enableProxy) {
      let proxyString = "";
      if (this.batchForm.proxyType !== "none" && this.batchForm.proxyHost && this.batchForm.proxyPort) {
        const auth = this.batchForm.proxyUsername && this.batchForm.proxyPassword ? `${this.batchForm.proxyUsername}:${this.batchForm.proxyPassword}@` : "";
        proxyString = `${this.batchForm.proxyType}://${auth}${this.batchForm.proxyHost}:${this.batchForm.proxyPort}`;
      }
      updates.proxy = proxyString;
      updates.proxyType = this.batchForm.proxyType;
      updates.proxyHost = this.batchForm.proxyHost;
      updates.proxyPort = this.batchForm.proxyPort;
      updates.proxyUsername = this.batchForm.proxyUsername;
      updates.proxyPassword = this.batchForm.proxyPassword;
      updates.proxyCountry = this.batchForm.proxyCountry;
    }
    if (this.batchForm.enableRole) {
      updates.role = this.batchForm.role;
    }
    if (this.batchForm.enableAI) {
      updates.aiEnabled = this.batchForm.aiEnabled;
      updates.aiModel = this.batchForm.aiModel;
    }
    if (this.batchForm.enableLimit) {
      updates.dailySendLimit = this.batchForm.dailySendLimit;
      updates.enableWarmup = this.batchForm.enableWarmup;
    }
    if (this.batchForm.enableGroup) {
      updates.group = this.batchForm.group;
    }
    if (Object.keys(updates).length === 0) {
      this.toast.warning("\u8ACB\u81F3\u5C11\u9009\u62E9\u4E00\u9805\u8BBE\u7F6E");
      this.batchSaving.set(false);
      return;
    }
    this.ipcService.once("batch-update-accounts-result", (result) => {
      this.batchSaving.set(false);
      if (result.success) {
        this.toast.success(`\u5DF2\u66F4\u65B0 ${result.count || this.selectedIds.size} \u500B\u8D26\u53F7`);
        this.closeBatchEditModal();
        this.clearSelection();
      } else {
        this.toast.error(`\u6279\u91CF\u66F4\u65B0\u5931\u6557: ${result.error || "\u672A\u77E5\u9519\u8BEF"}`);
      }
    });
    this.ipcService.send("batch-update-accounts", {
      accountIds: Array.from(this.selectedIds),
      updates
    });
    setTimeout(() => {
      if (this.batchSaving()) {
        this.batchSaving.set(false);
        this.toast.error("\u6279\u91CF\u66F4\u65B0\u8D85\u65F6\uFF0C\u8ACB\u91CD\u8A66");
      }
    }, 6e4);
  }
  // ========== 批量登入/登出 ==========
  batchLogin() {
    if (this.selectedIds.size === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u5E33\u865F");
      return;
    }
    const offlineAccounts = this.accounts.filter((a) => this.selectedIds.has(a.id) && (a.status === "Offline" || a.status === "Banned"));
    if (offlineAccounts.length === 0) {
      this.toast.info("\u9078\u4E2D\u7684\u5E33\u865F\u90FD\u5DF2\u5728\u7DDA\u6216\u6B63\u5728\u767B\u5165\u4E2D");
      return;
    }
    this.batchLoggingIn.set(true);
    this.toast.info(`\u6B63\u5728\u6279\u91CF\u767B\u5165 ${offlineAccounts.length} \u500B\u5E33\u865F...`);
    const loggingIn = new Set(this.loggingInAccounts());
    offlineAccounts.forEach((account) => {
      loggingIn.add(account.id);
    });
    this.loggingInAccounts.set(loggingIn);
    let index = 0;
    const loginNext = () => {
      if (index >= offlineAccounts.length) {
        this.batchLoggingIn.set(false);
        this.toast.success(`\u5DF2\u767C\u9001 ${offlineAccounts.length} \u500B\u5E33\u865F\u7684\u767B\u5165\u8ACB\u6C42`);
        return;
      }
      const account = offlineAccounts[index];
      this.accountLogin.emit(account);
      index++;
      setTimeout(loginNext, 2e3);
    };
    loginNext();
  }
  batchLogout() {
    if (this.selectedIds.size === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u5E33\u865F");
      return;
    }
    const onlineAccounts = this.accounts.filter((a) => this.selectedIds.has(a.id) && a.status === "Online");
    if (onlineAccounts.length === 0) {
      this.toast.info("\u9078\u4E2D\u7684\u5E33\u865F\u90FD\u5DF2\u96E2\u7DDA");
      return;
    }
    if (!confirm(`\u78BA\u5B9A\u8981\u9000\u51FA ${onlineAccounts.length} \u500B\u5728\u7DDA\u5E33\u865F\u55CE\uFF1F`)) {
      return;
    }
    this.batchLoggingOut.set(true);
    this.toast.info(`\u6B63\u5728\u6279\u91CF\u9000\u51FA ${onlineAccounts.length} \u500B\u5E33\u865F...`);
    let completed = 0;
    onlineAccounts.forEach((account, idx) => {
      setTimeout(() => {
        this.accountLogout.emit(account);
        completed++;
        if (completed >= onlineAccounts.length) {
          this.batchLoggingOut.set(false);
          this.toast.success(`\u5DF2\u767C\u9001 ${onlineAccounts.length} \u500B\u5E33\u865F\u7684\u9000\u51FA\u8ACB\u6C42`);
        }
      }, idx * 500);
    });
  }
  batchSync() {
    if (this.selectedIds.size === 0) {
      this.toast.warning("\u8BF7\u5148\u9009\u62E9\u8D26\u53F7");
      return;
    }
    this.batchSyncing.set(true);
    const accountIds = Array.from(this.selectedIds);
    let completed = 0;
    accountIds.forEach((id) => {
      const account = this.accounts.find((a) => a.id === id);
      if (account) {
        this.ipcService.send("sync-account-info", { id, phone: account.phone });
      }
    });
    const handler = (result) => {
      completed++;
      if (completed >= accountIds.length) {
        this.batchSyncing.set(false);
        this.toast.success(`\u5DF2\u540C\u6B65 ${accountIds.length} \u4E2A\u8D26\u53F7`);
        this.ipcService.off("sync-account-info-result", handler);
      }
    };
    this.ipcService.on("sync-account-info-result", handler);
    setTimeout(() => {
      if (this.batchSyncing()) {
        this.batchSyncing.set(false);
        this.ipcService.off("sync-account-info-result", handler);
        this.toast.warning(`\u5DF2\u540C\u6B65 ${completed}/${accountIds.length} \u4E2A\u8D26\u53F7`);
      }
    }, 6e4);
  }
  confirmBatchDelete() {
    if (this.selectedIds.size === 0) {
      this.toast.warning("\u8BF7\u5148\u9009\u62E9\u8D26\u53F7");
      return;
    }
    if (confirm(`\u786E\u5B9A\u8981\u5220\u9664\u9078\u4E2D\u7684 ${this.selectedIds.size} \u500B\u8D26\u53F7\u55CE\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u92B7\u3002`)) {
      this.ipcService.send("bulk-delete-accounts", {
        accountIds: Array.from(this.selectedIds)
      });
      this.clearSelection();
      this.toast.success("\u6279\u91CF\u5220\u9664\u8ACB\u6C42\u5DF2\u53D1\u9001");
    }
  }
  // ========== 编辑弹窗功能 ==========
  getDefaultEditForm() {
    return {
      nickname: "",
      notes: "",
      apiId: "",
      apiHash: "",
      dailySendLimit: 50,
      group: "",
      enableWarmup: false,
      proxyType: "none",
      proxyHost: "",
      proxyPort: null,
      proxyUsername: "",
      proxyPassword: "",
      proxyCountry: "",
      proxyRotationEnabled: false,
      role: "",
      customRoleName: "",
      roleDescription: "",
      aiEnabled: false,
      aiModel: "gpt-4-turbo",
      aiCreativity: 50,
      aiResponseLength: 50,
      aiAutoReply: false,
      aiBlockKeywords: "",
      aiPersonality: ""
    };
  }
  openEditModal(account) {
    this.editingAccount.set(account);
    this.editTab.set("basic");
    this.proxyTestResult.set(null);
    this.editForm = {
      nickname: account.nickname || "",
      notes: account.notes || "",
      apiId: account.apiId || "",
      apiHash: account.apiHash || "",
      dailySendLimit: account.dailySendLimit || 50,
      group: account.group || "",
      enableWarmup: account.enableWarmup || false,
      proxyType: account.proxyType || "none",
      proxyHost: account.proxyHost || "",
      proxyPort: account.proxyPort || null,
      proxyUsername: account.proxyUsername || "",
      proxyPassword: account.proxyPassword || "",
      proxyCountry: account.proxyCountry || "",
      proxyRotationEnabled: account.proxyRotationEnabled || false,
      role: account.role || "",
      customRoleName: "",
      roleDescription: "",
      aiEnabled: account.aiEnabled || false,
      aiModel: account.aiModel || "gpt-4-turbo",
      aiCreativity: 50,
      aiResponseLength: 50,
      aiAutoReply: false,
      aiBlockKeywords: "",
      aiPersonality: account.aiPersonality || ""
    };
    this.showEditModal.set(true);
  }
  closeEditModal() {
    this.showEditModal.set(false);
    this.editingAccount.set(null);
    this.editForm = this.getDefaultEditForm();
  }
  onProxyTypeChange() {
    if (this.editForm.proxyType === "none") {
      this.editForm.proxyHost = "";
      this.editForm.proxyPort = null;
      this.editForm.proxyUsername = "";
      this.editForm.proxyPassword = "";
    }
    this.proxyTestResult.set(null);
  }
  selectRole(roleId) {
    this.editForm.role = roleId;
    const template = this.roleTemplates.find((r) => r.id === roleId);
    if (template) {
      this.editForm.customRoleName = template.name;
    }
  }
  testProxy() {
    if (!this.editForm.proxyHost || !this.editForm.proxyPort) {
      this.toast.warning("\u8ACB\u586B\u5BEB\u4EE3\u7406\u5730\u5740\u548C\u7AEF\u53E3");
      return;
    }
    this.testingProxy.set(true);
    this.proxyTestResult.set(null);
    const proxyConfig = {
      type: this.editForm.proxyType,
      host: this.editForm.proxyHost,
      port: this.editForm.proxyPort,
      username: this.editForm.proxyUsername,
      password: this.editForm.proxyPassword
    };
    this.ipcService.once("test-proxy-result", (result) => {
      this.testingProxy.set(false);
      if (result.success) {
        this.proxyTestResult.set({
          success: true,
          message: `\u2705 \u4EE3\u7406\u8FDE\u63A5\u6210\u529F\uFF01\u5EF6\u9072: ${result.latency || "N/A"}ms`
        });
      } else {
        this.proxyTestResult.set({
          success: false,
          message: `\u274C \u8FDE\u63A5\u5931\u6557: ${result.error || "\u672A\u77E5\u9519\u8BEF"}`
        });
      }
    });
    this.ipcService.send("test-proxy", proxyConfig);
    setTimeout(() => {
      if (this.testingProxy()) {
        this.testingProxy.set(false);
        this.proxyTestResult.set({
          success: false,
          message: "\u274C \u6D4B\u8BD5\u8D85\u65F6\uFF0815\u79D2\uFF09"
        });
      }
    }, 15e3);
  }
  saveEdit() {
    const account = this.editingAccount();
    if (!account)
      return;
    this.saving.set(true);
    let proxyString = "";
    if (this.editForm.proxyType !== "none" && this.editForm.proxyHost && this.editForm.proxyPort) {
      const auth = this.editForm.proxyUsername && this.editForm.proxyPassword ? `${this.editForm.proxyUsername}:${this.editForm.proxyPassword}@` : "";
      proxyString = `${this.editForm.proxyType}://${auth}${this.editForm.proxyHost}:${this.editForm.proxyPort}`;
    }
    const roleName = this.editForm.customRoleName || this.roleTemplates.find((r) => r.id === this.editForm.role)?.name || this.editForm.role;
    const updateData = {
      id: account.id,
      phone: account.phone,
      nickname: this.editForm.nickname,
      notes: this.editForm.notes,
      apiId: this.editForm.apiId,
      apiHash: this.editForm.apiHash,
      dailySendLimit: this.editForm.dailySendLimit,
      group: this.editForm.group,
      enableWarmup: this.editForm.enableWarmup,
      proxy: proxyString,
      proxyType: this.editForm.proxyType,
      proxyHost: this.editForm.proxyHost,
      proxyPort: this.editForm.proxyPort,
      proxyUsername: this.editForm.proxyUsername,
      proxyPassword: this.editForm.proxyPassword,
      proxyCountry: this.editForm.proxyCountry,
      proxyRotationEnabled: this.editForm.proxyRotationEnabled,
      role: roleName,
      aiEnabled: this.editForm.aiEnabled,
      aiModel: this.editForm.aiModel,
      aiPersonality: this.editForm.roleDescription
    };
    this.ipcService.once("update-account-result", (result) => {
      this.saving.set(false);
      if (result.success) {
        this.toast.success("\u8D26\u53F7\u8BBE\u7F6E\u5DF2\u4FDD\u5B58");
        const updatedAccount = __spreadValues(__spreadValues({}, account), updateData);
        this.accountUpdated.emit(updatedAccount);
        if (this.selectedAccount()?.id === account.id) {
          this.selectedAccount.set(updatedAccount);
        }
        this.closeEditModal();
      } else {
        this.toast.error(`\u4FDD\u5B58\u5931\u6557: ${result.error || "\u672A\u77E5\u9519\u8BEF"}`);
      }
    });
    this.ipcService.send("update-account", updateData);
    setTimeout(() => {
      if (this.saving()) {
        this.saving.set(false);
        this.toast.error("\u4FDD\u5B58\u8D85\u65F6\uFF0C\u8ACB\u91CD\u8A66");
      }
    }, 3e4);
  }
  static {
    this.\u0275fac = function AccountCardListComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AccountCardListComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AccountCardListComponent, selectors: [["app-account-card-list"]], inputs: { accounts: "accounts" }, outputs: { addAccount: "addAccount", accountSelected: "accountSelected", accountLogin: "accountLogin", accountLogout: "accountLogout", accountRemove: "accountRemove", accountExport: "accountExport", accountEdit: "accountEdit", accountUpdated: "accountUpdated" }, features: [\u0275\u0275NgOnChangesFeature], decls: 90, vars: 41, consts: [[1, "account-card-list"], [1, "toolbar"], [1, "toolbar-left"], [1, "search-box"], [1, "search-icon"], ["type", "text", "placeholder", "\u641C\u7D22\u624B\u673A\u53F7\u3001\u540D\u79F0...", 1, "search-input", 3, "ngModelChange", "ngModel"], [1, "filter-select", 3, "ngModelChange", "ngModel"], ["value", "all"], ["value", "Online"], ["value", "Offline"], ["value", "Banned"], ["value", "Warming Up"], ["value", "_ungrouped"], [3, "value"], [1, "tag-filter-dropdown"], [1, "filter-btn", 3, "click"], [1, "tag-count"], [1, "tag-dropdown"], [1, "toolbar-right"], [1, "view-toggle"], ["title", "\u5361\u7247\u89C6\u56FE", 1, "toggle-btn", 3, "click"], ["width", "16", "height", "16", "viewBox", "0 0 24 24", "fill", "currentColor"], ["x", "3", "y", "3", "width", "7", "height", "7", "rx", "1"], ["x", "14", "y", "3", "width", "7", "height", "7", "rx", "1"], ["x", "3", "y", "14", "width", "7", "height", "7", "rx", "1"], ["x", "14", "y", "14", "width", "7", "height", "7", "rx", "1"], ["title", "\u8868\u683C\u89C6\u56FE", 1, "toggle-btn", 3, "click"], ["x", "3", "y", "4", "width", "18", "height", "3", "rx", "1"], ["x", "3", "y", "10", "width", "18", "height", "3", "rx", "1"], ["x", "3", "y", "16", "width", "18", "height", "3", "rx", "1"], [1, "manage-btn", 3, "click"], [1, "add-btn", 3, "click"], [1, "stats-bar"], [1, "stats-left"], [1, "batch-checkbox"], ["type", "checkbox", 3, "change", "checked"], [1, "checkbox-label"], [1, "stat-item"], [1, "stat-dot", "online"], [1, "stat-label"], [1, "stat-value"], [1, "stat-dot", "offline"], [1, "stat-dot", "banned"], [1, "batch-actions"], [1, "card-grid"], [1, "table-container"], [1, "empty-state"], [1, "tag-dropdown-header"], [1, "clear-btn", 3, "click"], [1, "tag-option", 3, "--tag-color"], [1, "manage-tags-btn", 3, "click"], [1, "tag-option"], [1, "tag-dot"], [1, "batch-count"], ["title", "\u6279\u91CF\u767B\u5165\u96E2\u7DDA\u5E33\u865F", 1, "batch-btn", "success", 3, "click", "disabled"], ["title", "\u6279\u91CF\u9000\u51FA\u5728\u7DDA\u5E33\u865F", 1, "batch-btn", "warning", 3, "click", "disabled"], [1, "batch-btn", "primary", 3, "click"], [1, "batch-btn", 3, "click", "disabled"], [1, "batch-btn", "danger", 3, "click"], [1, "batch-btn", 3, "click"], [1, "account-card", 3, "online", "offline", "banned", "warming", "logging-in", "selected"], [1, "account-card", 3, "click"], [1, "card-select", 3, "click"], [1, "card-header"], [1, "card-avatar-wrapper"], [1, "card-avatar"], [1, "card-status-role"], [1, "card-status"], [1, "status-dot"], [1, "status-text"], [1, "card-role", 3, "click"], [1, "role-icon"], [1, "role-name"], [1, "role-arrow"], [1, "card-main"], [1, "card-nickname"], [1, "card-phone"], [1, "card-name"], [1, "card-username"], [1, "card-tags"], [1, "card-device"], [1, "device-icon"], [1, "device-name"], [1, "card-health"], [1, "health-bar"], [1, "health-fill"], [1, "health-text"], [1, "login-progress-overlay"], [1, "card-actions", 3, "click"], ["title", "\u767B\u5165\u8D26\u53F7", 1, "action-btn", "login"], ["disabled", "", "title", "\u767B\u5165\u4E2D...", 1, "action-btn", "logging-in"], ["title", "\u9000\u51FA\u8D26\u53F7", 1, "action-btn", "logout"], ["title", "\u7F16\u8F91\u8BBE\u7F6E", 1, "action-btn", "edit", 3, "click"], [1, "action-icon"], [1, "action-label"], ["title", "\u5220\u9664\u8D26\u53F7", 1, "action-btn", "remove", 3, "click", "disabled"], ["alt", "", 1, "card-avatar-img", 3, "error", "src"], [1, "card-avatar", "avatar-fallback", 2, "display", "none"], [1, "tag-more"], [1, "tag-badge", 3, "background"], [1, "tag-badge"], [1, "login-spinner"], [1, "login-status-text"], ["title", "\u767B\u5165\u8D26\u53F7", 1, "action-btn", "login", 3, "click"], [1, "action-icon", "spinning"], ["title", "\u9000\u51FA\u8D26\u53F7", 1, "action-btn", "logout", 3, "click"], [1, "account-table"], ["type", "checkbox", 3, "ngModelChange", "change", "ngModel"], [3, "selected"], [3, "click"], [1, "status-dot", "small"], [1, "phone-cell"], [1, "role-cell"], [1, "role-tag-small", 3, "click"], [1, "device-cell"], [1, "health-inline"], [1, "health-bar", "small"], [1, "actions-cell", 3, "click"], ["title", "\u767B\u5165\u8D26\u53F7", 1, "table-action", "login"], ["title", "\u9000\u51FA\u8D26\u53F7", 1, "table-action", "logout"], ["title", "\u8D26\u53F7\u8BBE\u7F6E", 1, "table-action", "edit", 3, "click"], ["title", "\u5220\u9664\u8D26\u53F7", 1, "table-action", "remove", 3, "click"], ["title", "\u767B\u5165\u8D26\u53F7", 1, "table-action", "login", 3, "click"], ["title", "\u9000\u51FA\u8D26\u53F7", 1, "table-action", "logout", 3, "click"], [1, "empty-icon"], [1, "add-btn", "large", 3, "click"], [1, "detail-overlay", 3, "click"], [1, "detail-panel"], [1, "detail-header"], [1, "close-btn", 3, "click"], [1, "detail-content"], [1, "detail-section"], [1, "detail-avatar-wrapper"], [1, "detail-avatar"], ["class", "detail-nickname", 4, "ngIf"], [1, "detail-name"], [1, "detail-phone"], [1, "detail-username"], [1, "detail-role-badge", 3, "click"], [1, "role-icon-large"], [1, "role-label"], [1, "role-change-hint"], [1, "detail-bio"], [1, "detail-grid"], [1, "detail-item"], [1, "label"], [1, "value", "status"], [1, "value"], [1, "value", "role-value", 3, "click"], [1, "role-badge"], [1, "role-edit"], [1, "detail-item", "full-width"], [1, "detail-tags"], [1, "no-tags"], [1, "detail-item", "full"], [1, "detail-login-progress"], [1, "detail-actions-grid"], [1, "action-btn-sm", "primary"], ["disabled", "", 1, "action-btn-sm", "logging-in"], [1, "action-btn-sm", "warning"], [1, "action-btn-sm", 3, "click", "disabled"], [1, "action-btn-sm", 3, "click"], [1, "action-btn-sm", "danger", 3, "click", "disabled"], ["alt", "Avatar", 1, "detail-avatar-img", 3, "error", "src"], [1, "detail-avatar", "avatar-fallback", 2, "display", "none"], [1, "detail-nickname"], [1, "login-progress-text"], [1, "action-btn-sm", "primary", 3, "click"], [1, "action-btn-sm", "warning", 3, "click"], [1, "modal-overlay", 3, "click"], [1, "modal-container"], [1, "modal-header"], [1, "modal-content"], [1, "tab-nav"], [1, "tab-btn", 3, "click"], [1, "tab-panel"], [1, "modal-footer"], [1, "btn-cancel", 3, "click"], [1, "btn-save", 3, "click", "disabled"], [1, "form-group"], ["type", "text", "placeholder", "\u81EA\u5B9A\u4E49\u6635\u79F0\uFF08\u65B9\u4FBF\u8BC6\u522B\uFF09", 3, "ngModelChange", "ngModel"], ["placeholder", "\u6DFB\u52A0\u5907\u6CE8\u4FE1\u606F...", "rows", "3", 3, "ngModelChange", "ngModel"], [1, "form-row"], ["type", "text", "placeholder", "\u4ECE my.telegram.org \u83B7\u53D6", 3, "ngModelChange", "ngModel"], [1, "form-hint"], ["href", "https://my.telegram.org", "target", "_blank"], ["type", "number", "min", "1", "max", "500", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1A\u71DF\u92B7\u7D44A", 3, "ngModelChange", "ngModel"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel"], [1, "form-group", "flex-2"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1A127.0.0.1", 3, "ngModelChange", "ngModel"], [1, "form-group", "flex-1"], ["type", "number", "placeholder", "1080", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "\u4EE3\u7406\u7528\u6236\u540D", 3, "ngModelChange", "ngModel"], ["type", "password", "placeholder", "\u4EE3\u7406\u5BC6\u78BC", 3, "ngModelChange", "ngModel"], ["value", ""], ["value", "US"], ["value", "JP"], ["value", "SG"], ["value", "HK"], ["value", "TW"], ["value", "KR"], ["value", "DE"], ["value", "UK"], [1, "test-btn", 3, "click", "disabled"], [1, "test-result", 3, "success", "error"], [1, "test-result"], [1, "role-grid"], [1, "role-card", 3, "selected"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1AVIP\u5BA2\u670D\u5C0F\u7F8E", 3, "ngModelChange", "ngModel"], ["rows", "4", "placeholder", "\u63CF\u8FF0\u8FD9\u4E2A\u89D2\u8272\u7684\u6027\u683C\u7279\u9EDE\u3001\u8AAA\u8A71\u98CE\u683C\u3001\u4E13\u4E1A\u9818\u57DF\u7B49...", 3, "ngModelChange", "ngModel"], [1, "role-card", 3, "click"], [1, "role-desc"], [1, "persona-select-row"], [1, "current-persona", 3, "click"], [1, "no-persona"], [1, "select-arrow"], [1, "btn-persona-manager", 3, "click"], ["value", "gpt-4-turbo"], ["value", "gpt-3.5-turbo"], ["value", "claude-3-sonnet"], ["value", "ollama"], ["type", "range", "min", "0", "max", "100", "step", "5", 3, "ngModelChange", "ngModel"], [3, "ngValue"], [1, "form-hint", "warning"], ["type", "text", "placeholder", "\u7528\u9017\u865F\u5206\u9694\uFF0C\u4F8B\u5982\uFF1A\u9000\u6B3E,\u6295\u8A34,\u7AF6\u54C1", 3, "ngModelChange", "ngModel"], [1, "persona-icon-small"], [1, "persona-name-small"], [1, "modal-container", "batch-modal"], [1, "batch-warning"], [1, "batch-section"], [1, "batch-section-header"], [1, "batch-section-content"], ["type", "text", "placeholder", "127.0.0.1", 3, "ngModelChange", "ngModel"], ["type", "text", 3, "ngModelChange", "ngModel"], ["type", "password", 3, "ngModelChange", "ngModel"], [1, "account-role-grid"], [1, "account-role-card", 3, "selected", "border-color"], [1, "account-role-card", 3, "click"], [1, "role-card-icon"], [1, "role-card-content"], [1, "role-card-name"], [1, "role-card-desc"], [1, "role-card-check", 3, "color"], [1, "role-card-check"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1A\u92B7\u552E\u7D44A", 3, "ngModelChange", "ngModel"], [1, "modal-container", "tag-manager-modal"], [1, "add-tag-form"], ["type", "text", "placeholder", "\u6807\u7B7E\u540D\u7A31", 1, "tag-input", 3, "ngModelChange", "ngModel"], ["type", "color", 1, "color-picker", 3, "ngModelChange", "ngModel"], [1, "btn-add", 3, "click", "disabled"], [1, "tag-list"], [1, "tag-item"], [1, "btn-save", 3, "click"], [1, "tag-preview"], ["type", "text", 1, "tag-edit-input", 3, "ngModelChange", "ngModel"], ["type", "color", 1, "color-picker", "small", 3, "ngModelChange", "ngModel"], [1, "btn-delete", 3, "click"], [1, "modal-container", "group-manager-modal"], [1, "add-group-form"], ["type", "text", "placeholder", "\u5206\u7D44\u540D\u7A31", 1, "group-input", 3, "ngModelChange", "ngModel"], [1, "group-list"], [1, "group-item"], [1, "group-color-bar"], [1, "group-info"], ["type", "text", 1, "group-edit-input", 3, "ngModelChange", "ngModel"], [1, "group-count"], [1, "modal-container", "account-tag-modal"], [1, "account-tags-grid"], [1, "account-tag-option", 3, "selected"], [1, "quick-add-tag"], [1, "quick-add-form"], ["type", "text", "placeholder", "\u8F93\u5165\u65B0\u6807\u7B7E\u540D\u79F0", 1, "tag-input-inline", 3, "ngModelChange", "ngModel"], ["type", "color", 1, "color-picker-inline", 3, "ngModelChange", "ngModel"], [1, "btn-quick-add", 3, "click", "disabled"], [1, "btn-manage", 3, "click"], [1, "footer-actions"], [1, "account-tag-option"], [1, "tag-badge", "large"], [1, "modal-container", "persona-manager-modal"], [1, "persona-tabs"], [1, "persona-grid"], [1, "custom-persona-section"], [1, "btn-save"], [1, "persona-card", 3, "selected"], [1, "persona-card", 3, "click"], [1, "persona-icon"], [1, "persona-info"], [1, "persona-name"], [1, "persona-desc"], [1, "persona-meta"], [1, "meta-tag"], [1, "btn-new-persona", 3, "click"], [1, "custom-persona-list"], [1, "persona-card", "horizontal", 3, "selected"], [1, "persona-card", "horizontal", 3, "click"], [1, "persona-actions"], [1, "action-btn", 3, "click"], [1, "action-btn", "danger", 3, "click"], [1, "modal-container", "persona-editor-modal"], [1, "persona-form"], [1, "form-group", 2, "flex", "0 0 80px"], ["type", "text", "maxlength", "2", 1, "icon-input", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1A\u4E13\u4E1A\u92B7\u552E", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "\u4E00\u53E5\u8A71\u63CF\u8FF0\u8FD9\u4E2A\u4EBA\u8A2D\u7684\u7279\u9EDE", 3, "ngModelChange", "ngModel"], ["placeholder", "\u63CF\u8FF0 AI \u7684\u89D2\u8272\u3001\u6027\u683C\u3001\u76EE\u6A19\u548C\u884C\u70BA\u6E96\u5247...", "rows", "6", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "AI \u4E3B\u52D5\u767C\u8D77\u5BF9\u8BDD\u6642\u7684\u7B2C\u4E00\u53E5\u8A71", 3, "ngModelChange", "ngModel"], ["value", "short"], ["value", "medium"], ["value", "long"], ["value", "formal"], ["value", "professional"], ["value", "friendly"], ["value", "casual"], ["value", "zh-TW"], ["value", "zh-CN"], ["value", "en"], ["value", "ja"], ["placeholder", "\u5305\u542B\u9019\u4E9B\u5173\u9375\u8A5E\u7684\u6D88\u606F\u4E0D\u81EA\u52A8\u56DE\u590D", "rows", "3", 3, "ngModelChange", "ngModel"], [1, "role-selector-overlay", 3, "click"], [1, "role-selector-popup"], [1, "role-selector-header"], [1, "role-selector-title"], [1, "role-selector-phone"], [1, "role-selector-list"], [1, "role-option", 3, "active"], [1, "role-selector-footer"], [1, "role-selector-cancel", 3, "click"], [1, "role-option", 3, "click"], [1, "role-option-icon"], [1, "role-option-info"], [1, "role-option-name"], [1, "role-option-desc"], [1, "role-option-check"]], template: function AccountCardListComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "span", 4);
        \u0275\u0275text(5, "\u{1F50D}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "input", 5);
        \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Template_input_ngModelChange_6_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.searchQuery, $event) || (ctx.searchQuery = $event);
          return $event;
        });
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(7, "select", 6);
        \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Template_select_ngModelChange_7_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.statusFilter, $event) || (ctx.statusFilter = $event);
          return $event;
        });
        \u0275\u0275elementStart(8, "option", 7);
        \u0275\u0275text(9);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "option", 8);
        \u0275\u0275text(11);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "option", 9);
        \u0275\u0275text(13);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "option", 10);
        \u0275\u0275text(15);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "option", 11);
        \u0275\u0275text(17);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(18, "select", 6);
        \u0275\u0275twoWayListener("ngModelChange", function AccountCardListComponent_Template_select_ngModelChange_18_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.groupFilter, $event) || (ctx.groupFilter = $event);
          return $event;
        });
        \u0275\u0275elementStart(19, "option", 7);
        \u0275\u0275text(20);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "option", 12);
        \u0275\u0275text(22, "\u{1F4C1} \u672A\u5206\u7EC4");
        \u0275\u0275elementEnd();
        \u0275\u0275repeaterCreate(23, AccountCardListComponent_For_24_Template, 2, 2, "option", 13, _forTrack0);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(25, "div", 14)(26, "button", 15);
        \u0275\u0275listener("click", function AccountCardListComponent_Template_button_click_26_listener() {
          return ctx.toggleTagFilter();
        });
        \u0275\u0275text(27, " \u{1F3F7}\uFE0F \u6807\u7B7E ");
        \u0275\u0275conditionalCreate(28, AccountCardListComponent_Conditional_28_Template, 2, 1, "span", 16);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(29, AccountCardListComponent_Conditional_29_Template, 10, 0, "div", 17);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(30, "div", 18)(31, "div", 19)(32, "button", 20);
        \u0275\u0275listener("click", function AccountCardListComponent_Template_button_click_32_listener() {
          return ctx.viewMode.set("card");
        });
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(33, "svg", 21);
        \u0275\u0275element(34, "rect", 22)(35, "rect", 23)(36, "rect", 24)(37, "rect", 25);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(38, "button", 26);
        \u0275\u0275listener("click", function AccountCardListComponent_Template_button_click_38_listener() {
          return ctx.viewMode.set("table");
        });
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(39, "svg", 21);
        \u0275\u0275element(40, "rect", 27)(41, "rect", 28)(42, "rect", 29);
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(43, "button", 30);
        \u0275\u0275listener("click", function AccountCardListComponent_Template_button_click_43_listener() {
          return ctx.openGroupManager();
        });
        \u0275\u0275text(44);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(45, "button", 31);
        \u0275\u0275listener("click", function AccountCardListComponent_Template_button_click_45_listener() {
          return ctx.addAccount.emit();
        });
        \u0275\u0275text(46);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(47, "div", 32)(48, "div", 33)(49, "label", 34)(50, "input", 35);
        \u0275\u0275listener("change", function AccountCardListComponent_Template_input_change_50_listener() {
          return ctx.toggleSelectAll();
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(51, "span", 36);
        \u0275\u0275text(52);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(53, "div", 37);
        \u0275\u0275element(54, "span", 38);
        \u0275\u0275elementStart(55, "span", 39);
        \u0275\u0275text(56);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(57, "span", 40);
        \u0275\u0275text(58);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(59, "div", 37);
        \u0275\u0275element(60, "span", 41);
        \u0275\u0275elementStart(61, "span", 39);
        \u0275\u0275text(62);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(63, "span", 40);
        \u0275\u0275text(64);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(65, "div", 37);
        \u0275\u0275element(66, "span", 42);
        \u0275\u0275elementStart(67, "span", 39);
        \u0275\u0275text(68);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(69, "span", 40);
        \u0275\u0275text(70);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(71, "div", 37)(72, "span", 39);
        \u0275\u0275text(73);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(74, "span", 40);
        \u0275\u0275text(75);
        \u0275\u0275elementEnd()()();
        \u0275\u0275conditionalCreate(76, AccountCardListComponent_Conditional_76_Template, 15, 6, "div", 43);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(77, AccountCardListComponent_Conditional_77_Template, 3, 0, "div", 44);
        \u0275\u0275conditionalCreate(78, AccountCardListComponent_Conditional_78_Template, 25, 1, "div", 45);
        \u0275\u0275conditionalCreate(79, AccountCardListComponent_Conditional_79_Template, 9, 3, "div", 46);
        \u0275\u0275conditionalCreate(80, AccountCardListComponent_Conditional_80_Template, 7, 0, "div", 46);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(81, AccountCardListComponent_Conditional_81_Template, 123, 45);
        \u0275\u0275conditionalCreate(82, AccountCardListComponent_Conditional_82_Template, 26, 14);
        \u0275\u0275conditionalCreate(83, AccountCardListComponent_Conditional_83_Template, 45, 13);
        \u0275\u0275conditionalCreate(84, AccountCardListComponent_Conditional_84_Template, 22, 4);
        \u0275\u0275conditionalCreate(85, AccountCardListComponent_Conditional_85_Template, 22, 4);
        \u0275\u0275conditionalCreate(86, AccountCardListComponent_Conditional_86_Template, 26, 5);
        \u0275\u0275conditionalCreate(87, AccountCardListComponent_Conditional_87_Template, 19, 7);
        \u0275\u0275conditionalCreate(88, AccountCardListComponent_Conditional_88_Template, 88, 14);
        \u0275\u0275conditionalCreate(89, AccountCardListComponent_Conditional_89_Template, 13, 5);
      }
      if (rf & 2) {
        \u0275\u0275advance(6);
        \u0275\u0275twoWayProperty("ngModel", ctx.searchQuery);
        \u0275\u0275advance();
        \u0275\u0275twoWayProperty("ngModel", ctx.statusFilter);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("accounts.allStatus"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("\u{1F7E2} ", ctx.t("accounts.online"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("\u26AA ", ctx.t("accounts.offline"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("\u{1F534} ", ctx.t("accounts.banned"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("\u{1F7E1} ", ctx.t("accounts.warmingUp"));
        \u0275\u0275advance();
        \u0275\u0275twoWayProperty("ngModel", ctx.groupFilter);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("accounts.allGroups"));
        \u0275\u0275advance(3);
        \u0275\u0275repeater(ctx.groups());
        \u0275\u0275advance(5);
        \u0275\u0275conditional(ctx.tagFilter.length > 0 ? 28 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showTagFilter() ? 29 : -1);
        \u0275\u0275advance(3);
        \u0275\u0275classProp("active", ctx.viewMode() === "card");
        \u0275\u0275advance(6);
        \u0275\u0275classProp("active", ctx.viewMode() === "table");
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate1(" \u{1F4C1} ", ctx.t("accounts.manageGroups"), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" \u2795 ", ctx.t("accounts.addAccount"), " ");
        \u0275\u0275advance(4);
        \u0275\u0275property("checked", ctx.isAllSelected());
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("accounts.selectAll"));
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("accounts.online"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.onlineCount);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("accounts.offline"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.offlineCount);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("accounts.banned"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.bannedCount);
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate(ctx.t("accounts.total"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.accounts.length);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.selectedIds.size > 0 ? 76 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.viewMode() === "card" ? 77 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.viewMode() === "table" ? 78 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.filteredAccounts.length === 0 && ctx.accounts.length === 0 ? 79 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.filteredAccounts.length === 0 && ctx.accounts.length > 0 ? 80 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.selectedAccount() ? 81 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showEditModal() ? 82 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showBatchEditModal() ? 83 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showTagManager() ? 84 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showGroupManager() ? 85 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showAccountTagEditor() ? 86 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showPersonaManager() ? 87 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showPersonaEditor() ? 88 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showRoleSelector() ? 89 : -1);
      }
    }, dependencies: [CommonModule, NgIf, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, RangeValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, MaxLengthValidator, MinValidator, MaxValidator, NgModel], styles: ["\n\n.account-card-list[_ngcontent-%COMP%] {\n  padding: 1rem;\n}\n.toolbar[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.toolbar-left[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  flex: 1;\n}\n.search-box[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  flex: 1;\n  max-width: 300px;\n}\n.search-icon[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n}\n.search-input[_ngcontent-%COMP%] {\n  flex: 1;\n  background: transparent;\n  border: none;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n  outline: none;\n}\n.filter-select[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.toolbar-right[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n}\n.view-toggle[_ngcontent-%COMP%] {\n  display: flex;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.5rem;\n  overflow: hidden;\n}\n.toggle-btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: transparent;\n  border: none;\n  color: var(--text-muted, #94a3b8);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.toggle-btn.active[_ngcontent-%COMP%] {\n  background: var(--primary, #06b6d4);\n  color: white;\n}\n.add-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  border-radius: 0.5rem;\n  color: white;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.add-btn[_ngcontent-%COMP%]:hover {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);\n}\n.add-btn.large[_ngcontent-%COMP%] {\n  padding: 0.75rem 1.5rem;\n  font-size: 1rem;\n}\n.stats-bar[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.5rem;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n.stats-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1.5rem;\n}\n.batch-checkbox[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.batch-checkbox[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #06b6d4);\n}\n.checkbox-label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n}\n.batch-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.batch-count[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--primary, #06b6d4);\n  font-weight: 500;\n  margin-right: 0.5rem;\n}\n.batch-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.batch-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.batch-btn.primary[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  color: white;\n}\n.batch-btn.primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n}\n.batch-btn.danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: #ef4444;\n  color: #ef4444;\n  background: rgba(239, 68, 68, 0.1);\n}\n.batch-btn.success[_ngcontent-%COMP%] {\n  border-color: #22c55e;\n  color: #22c55e;\n}\n.batch-btn.success[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(34, 197, 94, 0.1);\n}\n.batch-btn.warning[_ngcontent-%COMP%] {\n  border-color: #f59e0b;\n  color: #f59e0b;\n}\n.batch-btn.warning[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(245, 158, 11, 0.1);\n}\n.batch-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.stat-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.stat-dot[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n.stat-dot.online[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.stat-dot.offline[_ngcontent-%COMP%] {\n  background: #94a3b8;\n}\n.stat-dot.banned[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.stat-label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.stat-value[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--text-primary, white);\n}\n.card-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 1rem;\n}\n.account-card[_ngcontent-%COMP%] {\n  background: var(--bg-card, rgba(30, 41, 59, 0.8));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.75rem;\n  padding: 1rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  position: relative;\n}\n.account-card.selected[_ngcontent-%COMP%] {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.card-select[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0.75rem;\n  right: 0.75rem;\n  z-index: 2;\n}\n.card-select[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  accent-color: var(--primary, #06b6d4);\n  cursor: pointer;\n}\n.account-card[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);\n}\n.account-card.online[_ngcontent-%COMP%] {\n  border-left: 3px solid #22c55e;\n  box-shadow: inset 0 0 20px rgba(34, 197, 94, 0.05);\n}\n.account-card.online[_ngcontent-%COMP%]:hover {\n  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2), inset 0 0 20px rgba(34, 197, 94, 0.05);\n}\n.account-card.offline[_ngcontent-%COMP%] {\n  border-left: 3px solid #94a3b8;\n}\n.account-card.banned[_ngcontent-%COMP%] {\n  border-left: 3px solid #ef4444;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(239, 68, 68, 0.05),\n      transparent);\n}\n.account-card.warming[_ngcontent-%COMP%] {\n  border-left: 3px solid #f59e0b;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(245, 158, 11, 0.05),\n      transparent);\n}\n.account-card.logging-in[_ngcontent-%COMP%] {\n  border-left: 3px solid #06b6d4;\n  animation: _ngcontent-%COMP%_card-pulse 2s ease-in-out infinite;\n}\n@keyframes _ngcontent-%COMP%_card-pulse {\n  0%, 100% {\n    box-shadow: 0 2px 8px rgba(6, 182, 212, 0.1);\n  }\n  50% {\n    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3);\n  }\n}\n.card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.card-avatar[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1rem;\n  font-weight: bold;\n  color: white;\n  flex-shrink: 0;\n}\n.card-avatar-img[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  object-fit: cover;\n  flex-shrink: 0;\n}\n.card-nickname[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--primary, #06b6d4);\n  font-weight: 500;\n  margin-bottom: 0.125rem;\n}\n.card-status[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.card-status-role[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n  flex: 1;\n}\n.card-role[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.25rem 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.375rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-size: 0.75rem;\n}\n.card-role[_ngcontent-%COMP%]:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.role-icon[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n}\n.role-name[_ngcontent-%COMP%] {\n  font-weight: 500;\n}\n.role-arrow[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: var(--text-muted, #94a3b8);\n  margin-left: auto;\n}\n.role-selector-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n}\n.role-selector-popup[_ngcontent-%COMP%] {\n  position: fixed;\n  width: 260px;\n  background: var(--bg-card, #1e293b);\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.75rem;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);\n  z-index: 1001;\n  overflow: hidden;\n}\n.role-selector-header[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.role-selector-title[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.role-selector-phone[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.role-selector-list[_ngcontent-%COMP%] {\n  max-height: 320px;\n  overflow-y: auto;\n}\n.role-option[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.role-option[_ngcontent-%COMP%]:hover {\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n}\n.role-option.active[_ngcontent-%COMP%] {\n  background: rgba(6, 182, 212, 0.1);\n}\n.role-option-icon[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  border-radius: 0.5rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.25rem;\n  flex-shrink: 0;\n}\n.role-option-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.role-option-name[_ngcontent-%COMP%] {\n  display: block;\n  font-weight: 500;\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.role-option-desc[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.role-option-check[_ngcontent-%COMP%] {\n  color: #22c55e;\n  font-weight: bold;\n}\n.role-selector-footer[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: flex;\n  justify-content: flex-end;\n}\n.role-selector-cancel[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background: transparent;\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  font-size: 0.75rem;\n}\n.role-selector-cancel[_ngcontent-%COMP%]:hover {\n  border-color: var(--text-muted, #94a3b8);\n}\n.status-dot[_ngcontent-%COMP%] {\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n}\n.status-dot.small[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n}\n.status-dot.online[_ngcontent-%COMP%] {\n  background: #22c55e;\n  animation: _ngcontent-%COMP%_pulse-online 2s ease-in-out infinite;\n  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);\n}\n.status-dot.offline[_ngcontent-%COMP%] {\n  background: #94a3b8;\n}\n.status-dot.banned[_ngcontent-%COMP%] {\n  background: #ef4444;\n  animation: _ngcontent-%COMP%_pulse-banned 1.5s ease-in-out infinite;\n}\n.status-dot.warning[_ngcontent-%COMP%] {\n  background: #f59e0b;\n  animation: _ngcontent-%COMP%_pulse-warning 2s ease-in-out infinite;\n}\n@keyframes _ngcontent-%COMP%_pulse-online {\n  0%, 100% {\n    opacity: 1;\n    transform: scale(1);\n  }\n  50% {\n    opacity: 0.7;\n    transform: scale(1.1);\n  }\n}\n@keyframes _ngcontent-%COMP%_pulse-banned {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n@keyframes _ngcontent-%COMP%_pulse-warning {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.6;\n  }\n}\n.status-text[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.card-main[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.card-phone[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--text-primary, white);\n}\n.card-name[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n}\n.card-username[_ngcontent-%COMP%] {\n  color: var(--primary, #06b6d4);\n}\n.card-device[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.device-icon[_ngcontent-%COMP%] {\n  font-size: 1rem;\n}\n.card-health[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.health-bar[_ngcontent-%COMP%] {\n  flex: 1;\n  height: 4px;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 2px;\n  overflow: hidden;\n}\n.health-bar.small[_ngcontent-%COMP%] {\n  width: 50px;\n}\n.health-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  transition: width 0.3s;\n}\n.health-fill.good[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.health-fill.warning[_ngcontent-%COMP%] {\n  background: #f59e0b;\n}\n.health-fill.danger[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.health-text[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  min-width: 35px;\n}\n.card-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  padding-top: 0.75rem;\n}\n.action-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.action-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n  transform: translateY(-1px);\n}\n.action-btn.login[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.action-btn.login[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(34, 197, 94, 0.15);\n  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);\n}\n.action-btn.logout[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.action-btn.logout[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(245, 158, 11, 0.15);\n}\n.action-btn.edit[_ngcontent-%COMP%] {\n  color: #3b82f6;\n}\n.action-btn.edit[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(59, 130, 246, 0.15);\n}\n.action-btn.remove[_ngcontent-%COMP%] {\n  color: #94a3b8;\n}\n.action-btn.remove[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(239, 68, 68, 0.15);\n  color: #ef4444;\n}\n.action-label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n}\n.action-btn.logging-in[_ngcontent-%COMP%] {\n  background: rgba(6, 182, 212, 0.2);\n  cursor: not-allowed;\n  opacity: 0.8;\n}\n.action-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.action-icon.spinning[_ngcontent-%COMP%] {\n  display: inline-block;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}\n.login-progress-overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(15, 23, 42, 0.9);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  z-index: 10;\n  border-radius: 0.75rem;\n}\n.login-spinner[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border: 3px solid rgba(6, 182, 212, 0.3);\n  border-top-color: #06b6d4;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n.login-status-text[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: #06b6d4;\n  font-weight: 500;\n}\n.detail-login-progress[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem;\n  background: rgba(6, 182, 212, 0.1);\n  border: 1px solid rgba(6, 182, 212, 0.3);\n  border-radius: 0.5rem;\n  margin-bottom: 1rem;\n}\n.login-progress-text[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: #06b6d4;\n}\n.action-btn-sm.logging-in[_ngcontent-%COMP%] {\n  background: rgba(6, 182, 212, 0.2);\n  color: #06b6d4;\n  cursor: not-allowed;\n}\n.add-card[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  border: 2px dashed var(--border-default, rgba(148, 163, 184, 0.3));\n  background: transparent;\n  min-height: 180px;\n}\n.add-card[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.05);\n}\n.add-icon[_ngcontent-%COMP%] {\n  font-size: 2rem;\n  margin-bottom: 0.5rem;\n}\n.add-text[_ngcontent-%COMP%] {\n  color: var(--text-muted, #94a3b8);\n}\n.table-container[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\n.account-table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--bg-card, rgba(30, 41, 59, 0.8));\n  border-radius: 0.75rem;\n  overflow: hidden;\n}\n.account-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  text-align: left;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: var(--text-muted, #94a3b8);\n  text-transform: uppercase;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n}\n.account-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.875rem;\n}\n.account-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover {\n  background: rgba(6, 182, 212, 0.05);\n}\n.account-table[_ngcontent-%COMP%]   tr.selected[_ngcontent-%COMP%] {\n  background: rgba(6, 182, 212, 0.1);\n}\n.phone-cell[_ngcontent-%COMP%] {\n  font-weight: 500;\n  color: var(--text-primary, white);\n}\n.device-cell[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n}\n.health-inline[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.table-action[_ngcontent-%COMP%] {\n  padding: 0.25rem;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  opacity: 0.7;\n  transition: opacity 0.2s;\n}\n.table-action[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.table-action.login[_ngcontent-%COMP%]:hover {\n  background: rgba(34, 197, 94, 0.2);\n  border-radius: 4px;\n}\n.table-action.logout[_ngcontent-%COMP%]:hover {\n  background: rgba(245, 158, 11, 0.2);\n  border-radius: 4px;\n}\n.table-action.edit[_ngcontent-%COMP%]:hover {\n  background: rgba(59, 130, 246, 0.2);\n  border-radius: 4px;\n}\n.table-action.remove[_ngcontent-%COMP%]:hover {\n  background: rgba(239, 68, 68, 0.2);\n  border-radius: 4px;\n}\n.role-cell[_ngcontent-%COMP%] {\n  min-width: 80px;\n}\n.role-tag-small[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.375rem;\n  font-size: 0.75rem;\n  font-weight: 500;\n  border: 1px solid;\n  cursor: pointer;\n  transition: all 0.2s;\n  white-space: nowrap;\n}\n.role-tag-small[_ngcontent-%COMP%]:hover {\n  filter: brightness(1.1);\n  transform: scale(1.02);\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 4rem 2rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.75rem;\n  border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));\n}\n.empty-icon[_ngcontent-%COMP%] {\n  font-size: 3rem;\n  margin-bottom: 1rem;\n}\n.empty-state[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 0.5rem 0;\n  color: var(--text-primary, white);\n}\n.empty-state[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1.5rem 0;\n  color: var(--text-muted, #94a3b8);\n}\n.detail-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  z-index: 40;\n}\n.detail-panel[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 0;\n  right: 0;\n  width: 400px;\n  max-width: 100%;\n  height: 100vh;\n  background: var(--bg-card, rgb(30, 41, 59));\n  border-left: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  z-index: 50;\n  display: flex;\n  flex-direction: column;\n  transform: translateX(100%);\n  transition: transform 0.3s;\n}\n.detail-panel.open[_ngcontent-%COMP%] {\n  transform: translateX(0);\n}\n.detail-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.detail-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--text-primary, white);\n}\n.close-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--text-muted, #94a3b8);\n  font-size: 1.5rem;\n  cursor: pointer;\n}\n.detail-content[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow-y: auto;\n  padding: 1.5rem;\n}\n.detail-section[_ngcontent-%COMP%] {\n  margin-bottom: 1.5rem;\n}\n.detail-section[_ngcontent-%COMP%]:first-child {\n  text-align: center;\n}\n.detail-avatar[_ngcontent-%COMP%] {\n  width: 72px;\n  height: 72px;\n  border-radius: 50%;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.75rem;\n  font-weight: bold;\n  color: white;\n  margin: 0 auto 0.75rem;\n}\n.detail-avatar-img[_ngcontent-%COMP%] {\n  width: 72px;\n  height: 72px;\n  border-radius: 50%;\n  object-fit: cover;\n  margin: 0 auto 0.75rem;\n  border: 3px solid var(--primary, #06b6d4);\n}\n.detail-nickname[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--primary, #06b6d4);\n  font-weight: 500;\n  margin-bottom: 0.25rem;\n}\n.detail-bio[_ngcontent-%COMP%] {\n  margin-top: 0.75rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-style: italic;\n  text-align: left;\n}\n.detail-name[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 600;\n  color: var(--text-primary, white);\n}\n.detail-phone[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #cbd5e1);\n}\n.detail-username[_ngcontent-%COMP%] {\n  color: var(--primary, #06b6d4);\n  font-size: 0.875rem;\n}\n.detail-role-badge[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-top: 0.75rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.detail-role-badge[_ngcontent-%COMP%]:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.role-icon-large[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border-radius: 0.375rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.125rem;\n}\n.role-label[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-size: 0.875rem;\n}\n.role-change-hint[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: var(--text-muted, #94a3b8);\n  margin-left: 0.25rem;\n}\n.role-value[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.role-badge[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  font-size: 0.75rem;\n  font-weight: 500;\n}\n.role-edit[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  opacity: 0;\n  transition: opacity 0.2s;\n}\n.role-value[_ngcontent-%COMP%]:hover   .role-edit[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.detail-section[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0 0 0.75rem 0;\n  font-size: 0.875rem;\n  color: var(--text-muted, #94a3b8);\n}\n.detail-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 0.75rem;\n}\n.detail-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.detail-item.full[_ngcontent-%COMP%] {\n  grid-column: span 2;\n}\n.detail-item[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.detail-item[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.detail-item[_ngcontent-%COMP%]   .value.status.online[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.detail-item[_ngcontent-%COMP%]   .value.status.offline[_ngcontent-%COMP%] {\n  color: #94a3b8;\n}\n.detail-item[_ngcontent-%COMP%]   .value.status.banned[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.detail-actions[_ngcontent-%COMP%] {\n  padding: 1rem 1.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.detail-actions-grid[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 0.375rem;\n}\n.action-btn-sm[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  text-align: center;\n}\n.action-btn-sm[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.action-btn-sm[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.action-btn-sm.primary[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #22c55e,\n      #16a34a);\n  border-color: transparent;\n  color: white;\n}\n.action-btn-sm.warning[_ngcontent-%COMP%] {\n  background: rgba(245, 158, 11, 0.2);\n  border-color: #f59e0b;\n  color: #fcd34d;\n}\n.action-btn-sm.danger[_ngcontent-%COMP%] {\n  background: rgba(239, 68, 68, 0.1);\n  border-color: rgba(239, 68, 68, 0.3);\n  color: #f87171;\n}\n.action-btn-sm.danger[_ngcontent-%COMP%]:hover {\n  background: rgba(239, 68, 68, 0.2);\n  border-color: #ef4444;\n}\n.detail-btn[_ngcontent-%COMP%] {\n  padding: 0.75rem;\n  border: none;\n  border-radius: 0.5rem;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.detail-btn.primary[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #22c55e,\n      #16a34a);\n  color: white;\n}\n.detail-btn.secondary[_ngcontent-%COMP%] {\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  color: var(--text-secondary, #cbd5e1);\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n}\n.detail-btn.warning[_ngcontent-%COMP%] {\n  background: rgba(245, 158, 11, 0.2);\n  color: #fcd34d;\n}\n.detail-btn.danger[_ngcontent-%COMP%] {\n  background: rgba(239, 68, 68, 0.2);\n  color: #fca5a5;\n}\n.detail-btn[_ngcontent-%COMP%]:hover {\n  transform: translateY(-1px);\n}\n.action-btn[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  min-width: 48px;\n}\n.action-icon[_ngcontent-%COMP%] {\n  font-size: 1rem;\n}\n.action-label[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: var(--text-muted, #94a3b8);\n}\n.action-btn[_ngcontent-%COMP%]:hover   .action-label[_ngcontent-%COMP%] {\n  color: var(--text-primary, white);\n}\n.action-btn.login[_ngcontent-%COMP%]:hover {\n  background: rgba(34, 197, 94, 0.2);\n}\n.action-btn.logout[_ngcontent-%COMP%]:hover {\n  background: rgba(245, 158, 11, 0.2);\n}\n.action-btn.edit[_ngcontent-%COMP%]:hover {\n  background: rgba(59, 130, 246, 0.2);\n}\n.action-btn.remove[_ngcontent-%COMP%]:hover {\n  background: rgba(239, 68, 68, 0.2);\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  z-index: 100;\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n}\n.modal-container[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  width: 560px;\n  max-width: 95vw;\n  max-height: 90vh;\n  background: var(--bg-card, rgb(30, 41, 59));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 1rem;\n  z-index: 101;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);\n}\n.modal-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.modal-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--text-primary, white);\n  font-size: 1.125rem;\n}\n.modal-content[_ngcontent-%COMP%] {\n  flex: 1;\n  overflow-y: auto;\n  padding: 0;\n}\n.modal-footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: flex-end;\n  gap: 0.75rem;\n  padding: 1rem 1.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.tab-nav[_ngcontent-%COMP%] {\n  display: flex;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  padding: 0 1rem;\n  overflow-x: auto;\n}\n.tab-btn[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  background: none;\n  border: none;\n  color: var(--text-muted, #94a3b8);\n  font-size: 0.875rem;\n  cursor: pointer;\n  white-space: nowrap;\n  border-bottom: 2px solid transparent;\n  transition: all 0.2s;\n}\n.tab-btn[_ngcontent-%COMP%]:hover {\n  color: var(--text-primary, white);\n}\n.tab-btn.active[_ngcontent-%COMP%] {\n  color: var(--primary, #06b6d4);\n  border-bottom-color: var(--primary, #06b6d4);\n}\n.tab-panel[_ngcontent-%COMP%] {\n  padding: 1.5rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n}\n.form-group[_ngcontent-%COMP%]   input[type=text][_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   input[type=number][_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   input[type=password][_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.625rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n  transition: border-color 0.2s;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #06b6d4);\n}\n.form-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n}\n.form-row[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.form-row[_ngcontent-%COMP%]   .form-group.flex-2[_ngcontent-%COMP%] {\n  flex: 2;\n}\n.form-row[_ngcontent-%COMP%]   .form-group.flex-1[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.form-hint[_ngcontent-%COMP%] {\n  margin-top: 0.375rem;\n  font-size: 0.75rem;\n  color: var(--text-muted, #64748b);\n}\n.form-hint.warning[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.checkbox-label[_ngcontent-%COMP%] {\n  display: flex !important;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #06b6d4);\n}\n.role-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 0.75rem;\n  margin-top: 0.5rem;\n}\n.role-card[_ngcontent-%COMP%] {\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 2px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  text-align: center;\n}\n.role-card[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.role-card.selected[_ngcontent-%COMP%] {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.2);\n}\n.role-name[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-primary, white);\n  margin-bottom: 0.25rem;\n}\n.role-desc[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.slider-group[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.slider-group[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  min-width: 32px;\n}\n.slider-group[_ngcontent-%COMP%]   input[type=range][_ngcontent-%COMP%] {\n  flex: 1;\n  height: 4px;\n  accent-color: var(--primary, #06b6d4);\n}\n.test-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.625rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-secondary, #cbd5e1);\n  cursor: pointer;\n  transition: all 0.2s;\n  margin-bottom: 0.75rem;\n}\n.test-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.test-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.test-result[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.test-result.success[_ngcontent-%COMP%] {\n  background: rgba(34, 197, 94, 0.2);\n  color: #86efac;\n}\n.test-result.error[_ngcontent-%COMP%] {\n  background: rgba(239, 68, 68, 0.2);\n  color: #fca5a5;\n}\n.btn-cancel[_ngcontent-%COMP%] {\n  padding: 0.625rem 1.25rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-secondary, #cbd5e1);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.btn-cancel[_ngcontent-%COMP%]:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.btn-save[_ngcontent-%COMP%] {\n  padding: 0.625rem 1.25rem;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  border-radius: 0.5rem;\n  color: white;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.btn-save[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);\n}\n.btn-save[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.batch-modal[_ngcontent-%COMP%] {\n  width: 640px;\n  max-height: 85vh;\n}\n.batch-warning[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  background: rgba(245, 158, 11, 0.15);\n  border: 1px solid rgba(245, 158, 11, 0.3);\n  border-radius: 0.5rem;\n  color: #fcd34d;\n  font-size: 0.875rem;\n  margin: 1rem 1.5rem;\n}\n.batch-section[_ngcontent-%COMP%] {\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  border-radius: 0.5rem;\n  margin: 0 1.5rem 1rem;\n  overflow: hidden;\n}\n.batch-section-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.batch-section-header[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #06b6d4);\n}\n.batch-section-content[_ngcontent-%COMP%] {\n  padding: 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.role-grid.compact[_ngcontent-%COMP%] {\n  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));\n  gap: 0.5rem;\n}\n.role-grid.compact[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%] {\n  padding: 0.5rem;\n}\n.role-grid.compact[_ngcontent-%COMP%]   .role-name[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n}\n.account-role-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: 0.5rem;\n}\n.account-role-card[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 2px solid transparent;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.account-role-card[_ngcontent-%COMP%]:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.account-role-card.selected[_ngcontent-%COMP%] {\n  background: rgba(6, 182, 212, 0.1);\n}\n.role-card-icon[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  border-radius: 0.375rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.125rem;\n  flex-shrink: 0;\n}\n.role-card-content[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.role-card-name[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-size: 0.875rem;\n}\n.role-card-desc[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.role-card-check[_ngcontent-%COMP%] {\n  font-weight: bold;\n  font-size: 1rem;\n}\n.tag-filter-dropdown[_ngcontent-%COMP%] {\n  position: relative;\n}\n.filter-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n.filter-btn[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n}\n.tag-count[_ngcontent-%COMP%] {\n  background: var(--primary, #06b6d4);\n  color: white;\n  padding: 0.125rem 0.375rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n}\n.tag-dropdown[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  margin-top: 0.25rem;\n  min-width: 200px;\n  background: var(--bg-card, rgba(30, 41, 59, 0.95));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  padding: 0.5rem;\n  z-index: 100;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n}\n.tag-dropdown-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 0.25rem 0.5rem 0.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  margin-bottom: 0.5rem;\n  font-size: 0.75rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.clear-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n  font-size: 0.75rem;\n}\n.tag-option[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.375rem 0.5rem;\n  cursor: pointer;\n  border-radius: 0.25rem;\n}\n.tag-option[_ngcontent-%COMP%]:hover {\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n}\n.tag-dot[_ngcontent-%COMP%] {\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n}\n.manage-tags-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem;\n  margin-top: 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  font-size: 0.75rem;\n}\n.manage-tags-btn[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.manage-btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n.manage-btn[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.card-tags[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.25rem;\n  margin-top: 0.5rem;\n}\n.tag-badge[_ngcontent-%COMP%] {\n  padding: 0.125rem 0.375rem;\n  border-radius: 0.25rem;\n  font-size: 0.625rem;\n  color: white;\n  font-weight: 500;\n}\n.tag-badge.large[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.75rem;\n}\n.tag-more[_ngcontent-%COMP%] {\n  padding: 0.125rem 0.375rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.25rem;\n  font-size: 0.625rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.tag-manager-modal[_ngcontent-%COMP%], \n.group-manager-modal[_ngcontent-%COMP%], \n.account-tag-modal[_ngcontent-%COMP%] {\n  width: 480px;\n  max-height: 70vh;\n}\n.add-tag-form[_ngcontent-%COMP%], \n.add-group-form[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.tag-input[_ngcontent-%COMP%], \n.group-input[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.color-picker[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 36px;\n  padding: 0;\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n}\n.color-picker.small[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n}\n.btn-add[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  border-radius: 0.375rem;\n  color: white;\n  cursor: pointer;\n  font-size: 0.875rem;\n}\n.btn-add[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.tag-list[_ngcontent-%COMP%], \n.group-list[_ngcontent-%COMP%] {\n  padding: 1rem 1.5rem;\n  max-height: 300px;\n  overflow-y: auto;\n}\n.tag-item[_ngcontent-%COMP%], \n.group-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.3));\n  border-radius: 0.5rem;\n  margin-bottom: 0.5rem;\n}\n.tag-preview[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  font-size: 0.75rem;\n  color: white;\n  min-width: 60px;\n  text-align: center;\n}\n.tag-edit-input[_ngcontent-%COMP%], \n.group-edit-input[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.25rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.btn-delete[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.5rem;\n  background: none;\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.25rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n}\n.btn-delete[_ngcontent-%COMP%]:hover {\n  border-color: #ef4444;\n  color: #ef4444;\n  background: rgba(239, 68, 68, 0.1);\n}\n.group-color-bar[_ngcontent-%COMP%] {\n  width: 4px;\n  height: 40px;\n  border-radius: 2px;\n}\n.group-info[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.group-count[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.empty-state[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n}\n.account-tags-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));\n  gap: 0.75rem;\n  padding: 1.5rem;\n}\n.account-tag-option[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.3));\n  border: 2px solid transparent;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.account-tag-option[_ngcontent-%COMP%]:hover {\n  border-color: var(--border-default, rgba(148, 163, 184, 0.3));\n}\n.account-tag-option.selected[_ngcontent-%COMP%] {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.account-tag-option[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  display: none;\n}\n.quick-add-tag[_ngcontent-%COMP%] {\n  padding: 1rem 1.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  margin-top: 0.5rem;\n}\n.quick-add-form[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n}\n.tag-input-inline[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.tag-input-inline[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #06b6d4);\n}\n.color-picker-inline[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  padding: 0;\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n}\n.btn-quick-add[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background: var(--primary, #06b6d4);\n  color: white;\n  border: none;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.btn-quick-add[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--primary-hover, #0891b2);\n}\n.btn-quick-add[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.modal-footer[_ngcontent-%COMP%]   .btn-manage[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  color: var(--text-secondary, #94a3b8);\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n.modal-footer[_ngcontent-%COMP%]   .btn-manage[_ngcontent-%COMP%]:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.5));\n  color: var(--text-primary, white);\n}\n.modal-footer[_ngcontent-%COMP%]   .footer-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.account-tag-modal[_ngcontent-%COMP%]   .modal-footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.detail-item.full-width[_ngcontent-%COMP%] {\n  grid-column: 1 / -1;\n}\n.detail-tags[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n  margin-top: 0.25rem;\n}\n.no-tags[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #94a3b8);\n  font-size: 0.75rem;\n}\n.persona-manager-modal[_ngcontent-%COMP%] {\n  width: 720px;\n  max-height: 85vh;\n}\n.persona-editor-modal[_ngcontent-%COMP%] {\n  width: 600px;\n  max-height: 90vh;\n}\n.persona-tabs[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.persona-tabs[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.persona-tabs[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n}\n.persona-tabs[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.2),\n      rgba(59, 130, 246, 0.2));\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.persona-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 0.75rem;\n  padding: 1rem 1.5rem;\n  max-height: 400px;\n  overflow-y: auto;\n}\n.persona-card[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 2px solid transparent;\n  border-radius: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.persona-card[_ngcontent-%COMP%]:hover {\n  border-color: var(--border-default, rgba(148, 163, 184, 0.3));\n}\n.persona-card.selected[_ngcontent-%COMP%] {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.persona-card.horizontal[_ngcontent-%COMP%] {\n  flex-direction: row;\n  align-items: center;\n}\n.persona-icon[_ngcontent-%COMP%] {\n  font-size: 2rem;\n  width: 48px;\n  height: 48px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.5rem;\n}\n.persona-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.persona-name[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary, white);\n  margin-bottom: 0.25rem;\n}\n.persona-desc[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #94a3b8);\n  line-height: 1.4;\n}\n.persona-meta[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n.meta-tag[_ngcontent-%COMP%] {\n  padding: 0.125rem 0.375rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.25rem;\n  font-size: 0.625rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.persona-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.25rem;\n}\n.action-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.25rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.action-btn[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.action-btn.danger[_ngcontent-%COMP%]:hover {\n  border-color: #ef4444;\n  color: #ef4444;\n}\n.custom-persona-section[_ngcontent-%COMP%] {\n  padding: 1rem 1.5rem;\n}\n.btn-new-persona[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.75rem;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.2),\n      rgba(59, 130, 246, 0.2));\n  border: 1px dashed var(--primary, #06b6d4);\n  border-radius: 0.5rem;\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.btn-new-persona[_ngcontent-%COMP%]:hover {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.3),\n      rgba(59, 130, 246, 0.3));\n}\n.custom-persona-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  max-height: 300px;\n  overflow-y: auto;\n}\n.persona-form[_ngcontent-%COMP%] {\n  padding: 1rem 1.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.icon-input[_ngcontent-%COMP%] {\n  text-align: center;\n  font-size: 1.5rem !important;\n}\n.persona-select-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n}\n.current-persona[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  cursor: pointer;\n}\n.current-persona[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #06b6d4);\n}\n.persona-icon-small[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n}\n.persona-name-small[_ngcontent-%COMP%] {\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.no-persona[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #94a3b8);\n  font-size: 0.875rem;\n}\n.select-arrow[_ngcontent-%COMP%] {\n  margin-left: auto;\n  color: var(--text-secondary, #94a3b8);\n  font-size: 0.75rem;\n}\n.btn-persona-manager[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.2),\n      rgba(59, 130, 246, 0.2));\n  border: 1px solid var(--primary, #06b6d4);\n  border-radius: 0.375rem;\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n  font-size: 0.75rem;\n  white-space: nowrap;\n}\n.btn-persona-manager[_ngcontent-%COMP%]:hover {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.3),\n      rgba(59, 130, 246, 0.3));\n}\n/*# sourceMappingURL=account-card-list.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AccountCardListComponent, [{
    type: Component,
    args: [{ selector: "app-account-card-list", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="account-card-list">
      <!-- \u9802\u90E8\u5DE5\u5177\u6B04 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon">\u{1F50D}</span>
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              placeholder="\u641C\u7D22\u624B\u673A\u53F7\u3001\u540D\u79F0..."
              class="search-input">
          </div>
          
          <select [(ngModel)]="statusFilter" class="filter-select">
            <option value="all">{{ t('accounts.allStatus') }}</option>
            <option value="Online">\u{1F7E2} {{ t('accounts.online') }}</option>
            <option value="Offline">\u26AA {{ t('accounts.offline') }}</option>
            <option value="Banned">\u{1F534} {{ t('accounts.banned') }}</option>
            <option value="Warming Up">\u{1F7E1} {{ t('accounts.warmingUp') }}</option>
          </select>

          <select [(ngModel)]="groupFilter" class="filter-select">
            <option value="all">{{ t('accounts.allGroups') }}</option>
            <option value="_ungrouped">\u{1F4C1} \u672A\u5206\u7EC4</option>
            @for (group of groups(); track group.id) {
              <option [value]="group.id">\u{1F4C1} {{ group.name }}</option>
            }
          </select>

          <div class="tag-filter-dropdown">
            <button class="filter-btn" (click)="toggleTagFilter()">
              \u{1F3F7}\uFE0F \u6807\u7B7E @if (tagFilter.length > 0) { <span class="tag-count">{{ tagFilter.length }}</span> }
            </button>
            @if (showTagFilter()) {
              <div class="tag-dropdown">
                <div class="tag-dropdown-header">
                  <span>\u9009\u62E9\u6807\u7B7E</span>
                  <button (click)="clearTagFilter()" class="clear-btn">\u6E05\u9664</button>
                </div>
                @for (tag of availableTags(); track tag.id) {
                  <label class="tag-option" [style.--tag-color]="tag.color">
                    <input type="checkbox" [checked]="tagFilter.includes(tag.id)" (change)="toggleTagFilterItem(tag.id)">
                    <span class="tag-dot" [style.background]="tag.color"></span>
                    <span>{{ tag.name }}</span>
                  </label>
                }
                <button class="manage-tags-btn" (click)="openTagManager()">\u2699\uFE0F \u7BA1\u7406\u6807\u7B7E</button>
              </div>
            }
          </div>
        </div>
        
        <div class="toolbar-right">
          <div class="view-toggle">
            <button 
              (click)="viewMode.set('card')"
              [class.active]="viewMode() === 'card'"
              class="toggle-btn"
              title="\u5361\u7247\u89C6\u56FE">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button 
              (click)="viewMode.set('table')"
              [class.active]="viewMode() === 'table'"
              class="toggle-btn"
              title="\u8868\u683C\u89C6\u56FE">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="4" width="18" height="3" rx="1"/>
                <rect x="3" y="10" width="18" height="3" rx="1"/>
                <rect x="3" y="16" width="18" height="3" rx="1"/>
              </svg>
            </button>
          </div>
          
          <button (click)="openGroupManager()" class="manage-btn">
            \u{1F4C1} {{ t('accounts.manageGroups') }}
          </button>

          <button (click)="addAccount.emit()" class="add-btn">
            \u2795 {{ t('accounts.addAccount') }}
          </button>
        </div>
      </div>

      <!-- \u7D71\u8A08\u4FE1\u606F + \u6279\u91CF\u64CD\u4F5C -->
      <div class="stats-bar">
        <div class="stats-left">
          <label class="batch-checkbox">
            <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll()">
            <span class="checkbox-label">{{ t('accounts.selectAll') }}</span>
          </label>
          <div class="stat-item">
            <span class="stat-dot online"></span>
            <span class="stat-label">{{ t('accounts.online') }}</span>
            <span class="stat-value">{{ onlineCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot offline"></span>
            <span class="stat-label">{{ t('accounts.offline') }}</span>
            <span class="stat-value">{{ offlineCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-dot banned"></span>
            <span class="stat-label">{{ t('accounts.banned') }}</span>
            <span class="stat-value">{{ bannedCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ t('accounts.total') }}</span>
            <span class="stat-value">{{ accounts.length }}</span>
          </div>
        </div>
        
        @if (selectedIds.size > 0) {
          <div class="batch-actions">
            <span class="batch-count">\u5DF2\u9078 {{ selectedIds.size }} \u500B</span>
            <button (click)="batchLogin()" class="batch-btn success" [disabled]="batchLoggingIn()" title="\u6279\u91CF\u767B\u5165\u96E2\u7DDA\u5E33\u865F">
              {{ batchLoggingIn() ? '\u23F3' : '\u25B6\uFE0F' }} \u6279\u91CF\u767B\u5165
            </button>
            <button (click)="batchLogout()" class="batch-btn warning" [disabled]="batchLoggingOut()" title="\u6279\u91CF\u9000\u51FA\u5728\u7DDA\u5E33\u865F">
              {{ batchLoggingOut() ? '\u23F3' : '\u23F9\uFE0F' }} \u6279\u91CF\u9000\u51FA
            </button>
            <button (click)="openBatchEditModal()" class="batch-btn primary">
              \u2699\uFE0F \u6279\u91CF\u8BBE\u7F6E
            </button>
            <button (click)="batchSync()" class="batch-btn" [disabled]="batchSyncing()">
              \u{1F504} \u6279\u91CF\u540C\u6B65
            </button>
            <button (click)="confirmBatchDelete()" class="batch-btn danger">
              \u{1F5D1}\uFE0F \u6279\u91CF\u5220\u9664
            </button>
            <button (click)="clearSelection()" class="batch-btn">
              \u2715 \u53D6\u6D88\u9009\u62E9
            </button>
          </div>
        }
      </div>

      <!-- \u5361\u7247\u89C6\u56FE -->
      @if (viewMode() === 'card') {
        <div class="card-grid">
          @for (account of filteredAccounts; track account.id) {
            <div 
              class="account-card" 
              [class.online]="account.status === 'Online'"
              [class.offline]="account.status === 'Offline'"
              [class.banned]="account.status === 'Banned'"
              [class.warming]="account.status === 'Warming Up'"
              [class.logging-in]="isLoggingIn(account.id) || account.status === 'Logging in...' || account.status === 'Waiting Code' || account.status === 'Waiting 2FA'"
              [class.selected]="selectedIds.has(account.id)"
              (click)="selectAccount(account)">
              
              <!-- \u9009\u62E9\u6846 -->
              <div class="card-select" (click)="$event.stopPropagation()">
                <input 
                  type="checkbox" 
                  [checked]="selectedIds.has(account.id)" 
                  (change)="toggleSelect(account.id)">
              </div>
              
              <!-- \u982D\u90E8\uFF1A\u5934\u50CF + \u72B6\u6001 + \u89D2\u8272 -->
              <div class="card-header">
                @if (isValidAvatarPath(account.avatarPath)) {
                  <div class="card-avatar-wrapper">
                    <img [src]="getAvatarUrl(account.avatarPath!)" class="card-avatar-img" alt="" (error)="onAvatarError($event)">
                    <div class="card-avatar avatar-fallback" style="display: none;">{{ getAvatarLetter(account) }}</div>
                  </div>
                } @else {
                  <div class="card-avatar">{{ getAvatarLetter(account) }}</div>
                }
                <div class="card-status-role">
                  <div class="card-status">
                    <span class="status-dot" [class]="getStatusClass(account.status)"></span>
                    <span class="status-text">{{ getStatusText(account.status) }}</span>
                  </div>
                  <!-- \u89D2\u8272\u6A19\u7C64\uFF08\u53EF\u9EDE\u64CA\u5207\u63DB\uFF09 -->
                  <div class="card-role" (click)="openRoleSelector(account, $event)">
                    <span class="role-icon">{{ getRoleIcon(account.role) }}</span>
                    <span class="role-name" [style.color]="getRoleColor(account.role)">{{ getRoleName(account.role) }}</span>
                    <span class="role-arrow">\u25BC</span>
                  </div>
                </div>
              </div>
              
              <!-- \u4E3B\u8981\u4FE1\u606F -->
              <div class="card-main">
                @if (account.nickname) {
                  <div class="card-nickname">{{ account.nickname }}</div>
                }
                <div class="card-phone">{{ account.phone }}</div>
                <div class="card-name">
                  {{ account.firstName || '' }} {{ account.lastName || '' }}
                  @if (account.username) {
                    <span class="card-username">{{ '@' + account.username }}</span>
                  }
                </div>
                
                <!-- \u6807\u7B7E\u986F\u793A -->
                @if (account.tags && account.tags.length > 0) {
                  <div class="card-tags">
                    @for (tagId of account.tags.slice(0, 3); track tagId) {
                      @if (getTagById(tagId); as tag) {
                        <span class="tag-badge" [style.background]="tag.color">{{ tag.name }}</span>
                      }
                    }
                    @if (account.tags.length > 3) {
                      <span class="tag-more">+{{ account.tags.length - 3 }}</span>
                    }
                  </div>
                }
              </div>
              
              <!-- \u8BBE\u5907\u4FE1\u606F -->
              <div class="card-device">
                <span class="device-icon">{{ getDeviceIcon(account.platform) }}</span>
                <span class="device-name">{{ account.deviceModel || 'Unknown Device' }}</span>
              </div>
              
              <!-- \u5065\u5EB7\u5EA6 -->
              <div class="card-health">
                <div class="health-bar">
                  <div 
                    class="health-fill" 
                    [style.width.%]="account.healthScore || 100"
                    [class.good]="(account.healthScore || 100) >= 80"
                    [class.warning]="(account.healthScore || 100) >= 50 && (account.healthScore || 100) < 80"
                    [class.danger]="(account.healthScore || 100) < 50">
                  </div>
                </div>
                <span class="health-text">{{ account.healthScore || 100 }}%</span>
              </div>
              
              <!-- \u767B\u5165\u9032\u5EA6\u6307\u793A\u5668 -->
              @if (isLoggingIn(account.id) || account.status === 'Logging in...' || account.status === 'Waiting Code' || account.status === 'Waiting 2FA') {
                <div class="login-progress-overlay">
                  <div class="login-spinner"></div>
                  <span class="login-status-text">
                    @switch (account.status) {
                      @case ('Logging in...') { \u6B63\u5728\u9023\u63A5... }
                      @case ('Waiting Code') { \u7B49\u5F85\u9A57\u8B49\u78BC }
                      @case ('Waiting 2FA') { \u7B49\u5F852FA\u5BC6\u78BC }
                      @default { {{ getLoginProgress(account.id)?.step || '\u8655\u7406\u4E2D...' }} }
                    }
                  </span>
                </div>
              }

              <!-- \u5FEB\u6377\u64CD\u4F5C\uFF08\u5E36\u6587\u5B57\u6807\u7B7E\uFF09 -->
              <div class="card-actions" (click)="$event.stopPropagation()">
                @if (canLogin(account) && !isLoggingIn(account.id)) {
                  <button (click)="onLogin(account)" class="action-btn login" title="\u767B\u5165\u8D26\u53F7">
                    <span class="action-icon">\u25B6\uFE0F</span>
                    <span class="action-label">\u767B\u5165</span>
                  </button>
                }
                @if (isLoggingIn(account.id) || account.status === 'Logging in...' || account.status === 'Waiting Code' || account.status === 'Waiting 2FA') {
                  <button class="action-btn logging-in" disabled title="\u767B\u5165\u4E2D...">
                    <span class="action-icon spinning">\u23F3</span>
                    <span class="action-label">\u767B\u5165\u4E2D</span>
                  </button>
                }
                @if (account.status === 'Online') {
                  <button (click)="onLogout(account)" class="action-btn logout" title="\u9000\u51FA\u8D26\u53F7">
                    <span class="action-icon">\u23F9\uFE0F</span>
                    <span class="action-label">\u9000\u51FA</span>
                  </button>
                }
                <button (click)="openEditModal(account); $event.stopPropagation()" class="action-btn edit" title="\u7F16\u8F91\u8BBE\u7F6E">
                  <span class="action-icon">\u2699\uFE0F</span>
                  <span class="action-label">\u8BBE\u7F6E</span>
                </button>
                <button (click)="onRemove(account)" class="action-btn remove" title="\u5220\u9664\u8D26\u53F7" [disabled]="isLoggingIn(account.id)">
                  <span class="action-icon">\u{1F5D1}\uFE0F</span>
                  <span class="action-label">\u5220\u9664</span>
                </button>
              </div>
            </div>
          }
          
        </div>
      }

      <!-- \u8868\u683C\u89C6\u56FE -->
      @if (viewMode() === 'table') {
        <div class="table-container">
          <table class="account-table">
            <thead>
              <tr>
                <th><input type="checkbox" [(ngModel)]="selectAll" (change)="toggleSelectAll()"></th>
                <th>\u72B6\u6001</th>
                <th>\u624B\u6A5F\u865F</th>
                <th>\u89D2\u8272</th>
                <th>\u540D\u7A31</th>
                <th>\u8BBE\u5907</th>
                <th>\u5065\u5EB7\u5EA6</th>
                <th>\u4ECA\u65E5\u53D1\u9001</th>
                <th>\u64CD\u4F5C</th>
              </tr>
            </thead>
            <tbody>
              @for (account of filteredAccounts; track account.id) {
                <tr [class.selected]="selectedIds.has(account.id)" (click)="selectAccount(account)">
                  <td (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="selectedIds.has(account.id)" (change)="toggleSelect(account.id)">
                  </td>
                  <td>
                    <span class="status-dot small" [class]="getStatusClass(account.status)"></span>
                  </td>
                  <td class="phone-cell">{{ account.phone }}</td>
                  <td class="role-cell">
                    <span class="role-tag-small" (click)="openRoleSelector(account, $event)"
                          [style.background]="getRoleColor(account.role) + '20'" 
                          [style.color]="getRoleColor(account.role)"
                          [style.border-color]="getRoleColor(account.role) + '40'">
                      {{ getRoleIcon(account.role) }} {{ getRoleName(account.role) }}
                    </span>
                  </td>
                  <td>{{ (account.firstName || '') + ' ' + (account.lastName || '') }}</td>
                  <td class="device-cell">{{ account.deviceModel || '-' }}</td>
                  <td>
                    <div class="health-inline">
                      <div class="health-bar small">
                        <div class="health-fill" [style.width.%]="account.healthScore || 100"></div>
                      </div>
                      <span>{{ account.healthScore || 100 }}%</span>
                    </div>
                  </td>
                  <td>{{ account.dailySendCount || 0 }}/{{ account.dailySendLimit || 50 }}</td>
                  <td class="actions-cell" (click)="$event.stopPropagation()">
                    @if (canLogin(account)) {
                      <button (click)="onLogin(account)" class="table-action login" title="\u767B\u5165\u8D26\u53F7">\u25B6\uFE0F</button>
                    }
                    @if (account.status === 'Online') {
                      <button (click)="onLogout(account)" class="table-action logout" title="\u9000\u51FA\u8D26\u53F7">\u23F9\uFE0F</button>
                    }
                    <button (click)="openEditModal(account); $event.stopPropagation()" class="table-action edit" title="\u8D26\u53F7\u8BBE\u7F6E">\u2699\uFE0F</button>
                    <button (click)="onRemove(account)" class="table-action remove" title="\u5220\u9664\u8D26\u53F7">\u{1F5D1}\uFE0F</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- \u7A7A\u72B6\u6001 -->
      @if (filteredAccounts.length === 0 && accounts.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">\u{1F465}</div>
          <h3>{{ t('accounts.noAccountsYet') }}</h3>
          <p>{{ t('accounts.clickToAddFirst') }}</p>
          <button (click)="addAccount.emit()" class="add-btn large">
            \u2795 {{ t('accounts.addAccount') }}
          </button>
        </div>
      }

      @if (filteredAccounts.length === 0 && accounts.length > 0) {
        <div class="empty-state">
          <div class="empty-icon">\u{1F50D}</div>
          <h3>\u6C92\u6709\u627E\u5230\u5339\u914D\u7684\u8D26\u6237</h3>
          <p>\u8ACB\u5617\u8A66\u8ABF\u6574\u641C\u7D22\u689D\u4EF6\u6216\u7BE9\u9078\u5668</p>
        </div>
      }
    </div>

    <!-- \u8D26\u6237\u8BE6\u60C5\u5074\u908A\u6B04 -->
    @if (selectedAccount()) {
      <div class="detail-overlay" (click)="closeDetail()"></div>
      <div class="detail-panel" [class.open]="selectedAccount()">
        <div class="detail-header">
          <h3>\u8D26\u6237\u8BE6\u60C5</h3>
          <button (click)="closeDetail()" class="close-btn">\xD7</button>
        </div>
        
        <div class="detail-content">
          <!-- \u57FA\u672C\u4FE1\u606F -->
          <div class="detail-section">
            @if (isValidAvatarPath(selectedAccount()!.avatarPath)) {
              <div class="detail-avatar-wrapper">
                <img [src]="getAvatarUrl(selectedAccount()!.avatarPath!)" class="detail-avatar-img" alt="Avatar" (error)="onAvatarError($event)">
                <div class="detail-avatar avatar-fallback" style="display: none;">
                  {{ getAvatarLetter(selectedAccount()!) }}
                </div>
              </div>
            } @else {
              <div class="detail-avatar">
                {{ getAvatarLetter(selectedAccount()!) }}
              </div>
            }
            <div class="detail-nickname" *ngIf="selectedAccount()!.nickname">
              {{ selectedAccount()!.nickname }}
            </div>
            <div class="detail-name">
              {{ selectedAccount()!.firstName || '' }} {{ selectedAccount()!.lastName || '' }}
            </div>
            <div class="detail-phone">{{ selectedAccount()!.phone }}</div>
            @if (selectedAccount()!.username) {
              <div class="detail-username">{{ '@' + selectedAccount()!.username }}</div>
            }

            <!-- \u89D2\u8272\u6A19\u7C64\uFF08\u9192\u76EE\u986F\u793A\uFF09 -->
            <div class="detail-role-badge" (click)="openRoleSelector(selectedAccount()!, $event)">
              <span class="role-icon-large" [style.background]="getRoleColor(selectedAccount()!.role) + '20'" [style.color]="getRoleColor(selectedAccount()!.role)">
                {{ getRoleIcon(selectedAccount()!.role) }}
              </span>
              <span class="role-label" [style.color]="getRoleColor(selectedAccount()!.role)">
                {{ getRoleName(selectedAccount()!.role) }}
              </span>
              <span class="role-change-hint">\u9EDE\u64CA\u66F4\u6539</span>
            </div>

            @if (selectedAccount()!.bio) {
              <div class="detail-bio">{{ selectedAccount()!.bio }}</div>
            }
          </div>

          <!-- \u72B6\u6001\u4FE1\u606F -->
          <div class="detail-section">
            <h4>\u{1F4CA} \u72B6\u6001\u4FE1\u606F</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">\u767B\u5165\u72B6\u6001</span>
                <span class="value status" [class]="getStatusClass(selectedAccount()!.status)">
                  {{ getStatusText(selectedAccount()!.status) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">\u5065\u5EB7\u5206\u6570</span>
                <span class="value">{{ selectedAccount()!.healthScore || 100 }}/100</span>
              </div>
              <div class="detail-item">
                <span class="label">\u4ECA\u65E5\u53D1\u9001</span>
                <span class="value">{{ selectedAccount()!.dailySendCount || 0 }}/{{ selectedAccount()!.dailySendLimit || 50 }}</span>
              </div>
              <div class="detail-item">
                <span class="label">\u89D2\u8272</span>
                <div class="value role-value" (click)="openRoleSelector(selectedAccount()!, $event)">
                  <span class="role-badge" [style.background]="getRoleColor(selectedAccount()!.role) + '20'" [style.color]="getRoleColor(selectedAccount()!.role)">
                    {{ getRoleIcon(selectedAccount()!.role) }} {{ getRoleName(selectedAccount()!.role) }}
                  </span>
                  <span class="role-edit">\u270F\uFE0F</span>
                </div>
              </div>
              <div class="detail-item">
                <span class="label">\u5206\u7D44</span>
                <span class="value">{{ selectedAccount()!.group || '\u672A\u5206\u7D44' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="label">\u6807\u7B7E</span>
                <div class="detail-tags">
                  @if (selectedAccount()!.tags && selectedAccount()!.tags!.length > 0) {
                    @for (tagId of selectedAccount()!.tags!; track tagId) {
                      @if (getTagById(tagId); as tag) {
                        <span class="tag-badge" [style.background]="tag.color">{{ tag.name }}</span>
                      }
                    }
                  } @else {
                    <span class="no-tags">\u7121\u6807\u7B7E</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- \u8BBE\u5907\u4FE1\u606F -->
          <div class="detail-section">
            <h4>\u{1F527} \u8BBE\u5907\u4FE1\u606F</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">\u8BBE\u5907\u578B\u865F</span>
                <span class="value">{{ selectedAccount()!.deviceModel || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">\u7CFB\u7D71\u7248\u672C</span>
                <span class="value">{{ selectedAccount()!.systemVersion || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">\u5E73\u53F0</span>
                <span class="value">{{ selectedAccount()!.platform || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">API ID</span>
                <span class="value">{{ selectedAccount()!.apiId || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- \u4EE3\u7406\u8BBE\u7F6E -->
          <div class="detail-section">
            <h4>\u{1F310} \u4EE3\u7406\u8BBE\u7F6E</h4>
            <div class="detail-grid">
              <div class="detail-item full">
                <span class="label">\u4EE3\u7406\u5730\u5740</span>
                <span class="value">{{ selectedAccount()!.proxy || '\u76F4\u9023\uFF08\u7121\u4EE3\u7406\uFF09' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">\u4EE3\u7406\u7C7B\u578B</span>
                <span class="value">{{ selectedAccount()!.proxyType || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">\u4EE3\u7406\u56FD\u5BB6</span>
                <span class="value">{{ selectedAccount()!.proxyCountry || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- \u767B\u5165\u9032\u5EA6\u6307\u793A\uFF08\u8A73\u60C5\u9762\u677F\uFF09 -->
        @if (isLoggingIn(selectedAccount()!.id) || selectedAccount()!.status === 'Logging in...' || selectedAccount()!.status === 'Waiting Code' || selectedAccount()!.status === 'Waiting 2FA') {
          <div class="detail-login-progress">
            <div class="login-spinner"></div>
            <span class="login-progress-text">
              @switch (selectedAccount()!.status) {
                @case ('Logging in...') { \u6B63\u5728\u9023\u63A5 Telegram \u670D\u52D9\u5668... }
                @case ('Waiting Code') { \u7B49\u5F85\u8F38\u5165\u9A57\u8B49\u78BC... }
                @case ('Waiting 2FA') { \u7B49\u5F85\u8F38\u5165\u5169\u6B65\u9A5F\u9A57\u8B49\u5BC6\u78BC... }
                @default { {{ getLoginProgress(selectedAccount()!.id)?.step || '\u8655\u7406\u4E2D...' }} }
              }
            </span>
          </div>
        }

        <!-- \u64CD\u4F5C\u6309\u94AE -->
        <div class="detail-actions-grid">
          @if (canLogin(selectedAccount()!) && !isLoggingIn(selectedAccount()!.id)) {
            <button (click)="onLogin(selectedAccount()!)" class="action-btn-sm primary">\u25B6\uFE0F \u767B\u5165</button>
          }
          @if (isLoggingIn(selectedAccount()!.id) || selectedAccount()!.status === 'Logging in...' || selectedAccount()!.status === 'Waiting Code' || selectedAccount()!.status === 'Waiting 2FA') {
            <button class="action-btn-sm logging-in" disabled>\u23F3 \u767B\u5165\u4E2D...</button>
          }
          @if (selectedAccount()!.status === 'Online') {
            <button (click)="onLogout(selectedAccount()!)" class="action-btn-sm warning">\u23F9\uFE0F \u9000\u51FA</button>
          }
          <button (click)="syncAccountInfo(selectedAccount()!)" class="action-btn-sm" [disabled]="syncing()">
            {{ syncing() ? '\u23F3' : '\u{1F504}' }} \u540C\u6B65
          </button>
          <button (click)="openAccountTagEditor(selectedAccount()!)" class="action-btn-sm">\u{1F3F7}\uFE0F \u6807\u7B7E</button>
          <button (click)="openPersonaManager(selectedAccount()!)" class="action-btn-sm">\u{1F916} \u4EBA\u8A2D</button>
          <button (click)="onExport(selectedAccount()!)" class="action-btn-sm">\u{1F4E4} \u5C0E\u51FA</button>
          <button (click)="openEditModal(selectedAccount()!)" class="action-btn-sm">\u270F\uFE0F \u7F16\u8F91</button>
          <button (click)="onRemove(selectedAccount()!)" class="action-btn-sm danger" [disabled]="isLoggingIn(selectedAccount()!.id)">\u{1F5D1}\uFE0F \u5220\u9664</button>
        </div>
      </div>
    }

    <!-- \u7F16\u8F91\u8D26\u53F7\u5F39\u7A97 -->
    @if (showEditModal()) {
      <div class="modal-overlay" (click)="closeEditModal()"></div>
      <div class="modal-container">
        <div class="modal-header">
          <h3>\u270F\uFE0F \u7F16\u8F91\u8D26\u53F7</h3>
          <button (click)="closeEditModal()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <!-- \u9078\u9805\u5361\u5BFC\u822A -->
          <div class="tab-nav">
            <button 
              (click)="editTab.set('basic')" 
              [class.active]="editTab() === 'basic'"
              class="tab-btn">
              \u{1F4CB} \u57FA\u672C\u8BBE\u7F6E
            </button>
            <button 
              (click)="editTab.set('proxy')" 
              [class.active]="editTab() === 'proxy'"
              class="tab-btn">
              \u{1F310} \u4EE3\u7406\u8BBE\u7F6E
            </button>
            <button 
              (click)="editTab.set('role')" 
              [class.active]="editTab() === 'role'"
              class="tab-btn">
              \u{1F3AD} \u89D2\u8272\u8BBE\u7F6E
            </button>
            <button 
              (click)="editTab.set('ai')" 
              [class.active]="editTab() === 'ai'"
              class="tab-btn">
              \u{1F916} AI \u8BBE\u7F6E
            </button>
          </div>

          <!-- \u57FA\u672C\u8BBE\u7F6E\u9762\u677F -->
          @if (editTab() === 'basic') {
            <div class="tab-panel">
              <div class="form-group">
                <label>\u6635\u79F0</label>
                <input type="text" [(ngModel)]="editForm.nickname" placeholder="\u81EA\u5B9A\u4E49\u6635\u79F0\uFF08\u65B9\u4FBF\u8BC6\u522B\uFF09">
              </div>
              <div class="form-group">
                <label>\u5907\u6CE8</label>
                <textarea [(ngModel)]="editForm.notes" placeholder="\u6DFB\u52A0\u5907\u6CE8\u4FE1\u606F..." rows="3"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>API ID</label>
                  <input type="text" [(ngModel)]="editForm.apiId" placeholder="\u4ECE my.telegram.org \u83B7\u53D6">
                </div>
                <div class="form-group">
                  <label>API Hash</label>
                  <input type="text" [(ngModel)]="editForm.apiHash" placeholder="\u4ECE my.telegram.org \u83B7\u53D6">
                </div>
              </div>
              <p class="form-hint">API \u51ED\u8BC1\u7528\u4E8E\u8FDE\u63A5 Telegram\uFF0C\u53EF\u4ECE <a href="https://my.telegram.org" target="_blank">my.telegram.org</a> \u83B7\u53D6</p>
              <div class="form-row">
                <div class="form-group">
                  <label>\u6BCF\u65E5\u53D1\u9001\u4E0A\u9650</label>
                  <input type="number" [(ngModel)]="editForm.dailySendLimit" min="1" max="500">
                </div>
                <div class="form-group">
                  <label>\u7FA4\u7D44\u5206\u985E</label>
                  <input type="text" [(ngModel)]="editForm.group" placeholder="\u4F8B\u5982\uFF1A\u71DF\u92B7\u7D44A">
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editForm.enableWarmup">
                  <span>\u542F\u7528\u9810\u71B1\u6A21\u5F0F</span>
                </label>
                <p class="form-hint">\u9810\u71B1\u6A21\u5F0F\u6703\u9010\u6B65\u589E\u52A0\u6BCF\u65E5\u53D1\u9001\u91CF\uFF0C\u964D\u4F4E\u5C01\u865F\u98A8\u96AA</p>
              </div>
            </div>
          }

          <!-- \u4EE3\u7406\u8BBE\u7F6E\u9762\u677F -->
          @if (editTab() === 'proxy') {
            <div class="tab-panel">
              <div class="form-group">
                <label>\u4EE3\u7406\u7C7B\u578B</label>
                <select [(ngModel)]="editForm.proxyType" (ngModelChange)="onProxyTypeChange()">
                  @for (type of proxyTypes; track type.id) {
                    <option [value]="type.id">{{ type.name }}</option>
                  }
                </select>
              </div>
              
              @if (editForm.proxyType && editForm.proxyType !== 'none') {
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label>\u4EE3\u7406\u5730\u5740</label>
                    <input type="text" [(ngModel)]="editForm.proxyHost" placeholder="\u4F8B\u5982\uFF1A127.0.0.1">
                  </div>
                  <div class="form-group flex-1">
                    <label>\u7AEF\u53E3</label>
                    <input type="number" [(ngModel)]="editForm.proxyPort" placeholder="1080">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>\u7528\u6236\u540D\uFF08\u53EF\u9078\uFF09</label>
                    <input type="text" [(ngModel)]="editForm.proxyUsername" placeholder="\u4EE3\u7406\u7528\u6236\u540D">
                  </div>
                  <div class="form-group">
                    <label>\u5BC6\u78BC\uFF08\u53EF\u9078\uFF09</label>
                    <input type="password" [(ngModel)]="editForm.proxyPassword" placeholder="\u4EE3\u7406\u5BC6\u78BC">
                  </div>
                </div>

                <div class="form-group">
                  <label>\u4EE3\u7406\u56FD\u5BB6/\u5730\u5340</label>
                  <select [(ngModel)]="editForm.proxyCountry">
                    <option value="">\u9009\u62E9\u56FD\u5BB6</option>
                    <option value="US">\u{1F1FA}\u{1F1F8} \u7F8E\u570B</option>
                    <option value="JP">\u{1F1EF}\u{1F1F5} \u65E5\u672C</option>
                    <option value="SG">\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761</option>
                    <option value="HK">\u{1F1ED}\u{1F1F0} \u9999\u6E2F</option>
                    <option value="TW">\u{1F1F9}\u{1F1FC} \u53F0\u7063</option>
                    <option value="KR">\u{1F1F0}\u{1F1F7} \u97D3\u570B</option>
                    <option value="DE">\u{1F1E9}\u{1F1EA} \u5FB7\u570B</option>
                    <option value="UK">\u{1F1EC}\u{1F1E7} \u82F1\u570B</option>
                  </select>
                </div>

                <button (click)="testProxy()" class="test-btn" [disabled]="testingProxy()">
                  {{ testingProxy() ? '\u6D4B\u8BD5\u4E2D...' : '\u{1F50D} \u6D4B\u8BD5\u4EE3\u7406\u8FDE\u63A5' }}
                </button>
                
                @if (proxyTestResult()) {
                  <div class="test-result" [class.success]="proxyTestResult()!.success" [class.error]="!proxyTestResult()!.success">
                    {{ proxyTestResult()!.message }}
                  </div>
                }

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="editForm.proxyRotationEnabled">
                    <span>\u542F\u7528\u667A\u80FD\u4EE3\u7406\u8F2A\u63DB</span>
                  </label>
                  <p class="form-hint">\u81EA\u52A8\u5207\u63DB\u4EE3\u7406\u4EE5\u907F\u514D IP \u88AB\u5C01</p>
                </div>
              }
            </div>
          }

          <!-- \u89D2\u8272\u8BBE\u7F6E\u9762\u677F -->
          @if (editTab() === 'role') {
            <div class="tab-panel">
              <div class="form-group">
                <label>\u9009\u62E9\u89D2\u8272\u6A21\u677F</label>
                <div class="role-grid">
                  @for (role of roleTemplates; track role.id) {
                    <div 
                      class="role-card" 
                      [class.selected]="editForm.role === role.id"
                      (click)="selectRole(role.id)">
                      <div class="role-name">{{ role.name }}</div>
                      <div class="role-desc">{{ role.description }}</div>
                    </div>
                  }
                </div>
              </div>
              
              <div class="form-group">
                <label>\u81EA\u5B9A\u7FA9\u89D2\u8272\u540D\u7A31</label>
                <input type="text" [(ngModel)]="editForm.customRoleName" placeholder="\u4F8B\u5982\uFF1AVIP\u5BA2\u670D\u5C0F\u7F8E">
              </div>
              
              <div class="form-group">
                <label>\u89D2\u8272\u4EBA\u8A2D\u63CF\u8FF0</label>
                <textarea [(ngModel)]="editForm.roleDescription" rows="4" 
                  placeholder="\u63CF\u8FF0\u8FD9\u4E2A\u89D2\u8272\u7684\u6027\u683C\u7279\u9EDE\u3001\u8AAA\u8A71\u98CE\u683C\u3001\u4E13\u4E1A\u9818\u57DF\u7B49..."></textarea>
              </div>
            </div>
          }

          <!-- AI \u8BBE\u7F6E\u9762\u677F -->
          @if (editTab() === 'ai') {
            <div class="tab-panel">
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editForm.aiEnabled">
                  <span>\u542F\u7528 AI \u81EA\u52A8\u56DE\u590D</span>
                </label>
              </div>
              
              @if (editForm.aiEnabled) {
                <!-- \u4EBA\u8A2D\u9009\u62E9 -->
                <div class="form-group">
                  <label>AI \u4EBA\u8A2D</label>
                  <div class="persona-select-row">
                    <div class="current-persona" (click)="openPersonaManagerFromEdit()">
                      @if (editForm.aiPersonality && getPersonaById(editForm.aiPersonality); as persona) {
                        <span class="persona-icon-small">{{ persona.icon }}</span>
                        <span class="persona-name-small">{{ persona.name }}</span>
                      } @else {
                        <span class="no-persona">\u70B9\u51FB\u9009\u62E9\u4EBA\u8A2D</span>
                      }
                      <span class="select-arrow">\u25BC</span>
                    </div>
                    <button (click)="openPersonaManagerFromEdit()" class="btn-persona-manager">
                      \u{1F916} \u4EBA\u8A2D\u5EAB
                    </button>
                  </div>
                  <p class="form-hint">\u4EBA\u8A2D\u51B3\u5B9A\u4E86 AI \u7684\u6027\u683C\u548C\u56DE\u590D\u98CE\u683C</p>
                </div>

                <div class="form-group">
                  <label>AI \u6A21\u578B</label>
                  <select [(ngModel)]="editForm.aiModel">
                    <option value="gpt-4-turbo">GPT-4 Turbo\uFF08\u63A8\u85A6\uFF09</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo\uFF08\u5FEB\u901F\uFF09</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    <option value="ollama">\u672C\u5730 Ollama</option>
                  </select>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>\u5275\u9020\u529B {{ editForm.aiCreativity }}%</label>
                    <input type="range" [(ngModel)]="editForm.aiCreativity" min="0" max="100" step="5">
                  </div>
                  <div class="form-group">
                    <label>\u56DE\u590D\u9577\u5EA6</label>
                    <select [(ngModel)]="editForm.aiResponseLength">
                      <option [ngValue]="0">\u7B80\u77ED</option>
                      <option [ngValue]="50">\u9069\u4E2D</option>
                      <option [ngValue]="100">\u8BE6\u7EC6</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="editForm.aiAutoReply">
                    <span>\u81EA\u52A8\u53D1\u9001\u56DE\u590D\uFF08\u7121\u9700\u78BA\u8A8D\uFF09</span>
                  </label>
                  <p class="form-hint warning">\u26A0\uFE0F \u542F\u7528\u5F8C AI \u6703\u81EA\u52A8\u53D1\u9001\u56DE\u590D\uFF0C\u8ACB\u78BA\u4FDD\u5DF2\u8BBE\u7F6E\u597D\u4EBA\u8A2D</p>
                </div>

                <div class="form-group">
                  <label>\u7981\u6B62\u56DE\u590D\u5173\u9375\u8A5E</label>
                  <input type="text" [(ngModel)]="editForm.aiBlockKeywords" 
                    placeholder="\u7528\u9017\u865F\u5206\u9694\uFF0C\u4F8B\u5982\uFF1A\u9000\u6B3E,\u6295\u8A34,\u7AF6\u54C1">
                  <p class="form-hint">\u5305\u542B\u9019\u4E9B\u5173\u9375\u8A5E\u7684\u6D88\u606F\u6703\u6A19\u8A18\u70BA\u5F85\u4EBA\u5DE5\u8655\u7406</p>
                </div>
              }
            </div>
          }
        </div>

        <div class="modal-footer">
          <button (click)="closeEditModal()" class="btn-cancel">\u53D6\u6D88</button>
          <button (click)="saveEdit()" class="btn-save" [disabled]="saving()">
            {{ saving() ? '\u4FDD\u5B58\u4E2D...' : '\u{1F4BE} \u4FDD\u5B58\u8BBE\u7F6E' }}
          </button>
        </div>
      </div>
    }

    <!-- \u6279\u91CF\u7F16\u8F91\u5F39\u7A97 -->
    @if (showBatchEditModal()) {
      <div class="modal-overlay" (click)="closeBatchEditModal()"></div>
      <div class="modal-container batch-modal">
        <div class="modal-header">
          <h3>\u2699\uFE0F \u6279\u91CF\u8BBE\u7F6E - \u5DF2\u9078 {{ selectedIds.size }} \u500B\u8D26\u53F7</h3>
          <button (click)="closeBatchEditModal()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <div class="batch-warning">
            \u26A0\uFE0F \u4EE5\u4E0B\u52FE\u9009\u7684\u8BBE\u7F6E\u5C06\u5E94\u7528\u5230\u6240\u6709\u9078\u4E2D\u7684\u8D26\u53F7
          </div>

          <!-- \u4EE3\u7406\u8BBE\u7F6E -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableProxy">
              <span>\u{1F310} \u4EE3\u7406\u8BBE\u7F6E</span>
            </label>
            @if (batchForm.enableProxy) {
              <div class="batch-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label>\u4EE3\u7406\u7C7B\u578B</label>
                    <select [(ngModel)]="batchForm.proxyType">
                      @for (type of proxyTypes; track type.id) {
                        <option [value]="type.id">{{ type.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group flex-2">
                    <label>\u4EE3\u7406\u5730\u5740</label>
                    <input type="text" [(ngModel)]="batchForm.proxyHost" placeholder="127.0.0.1">
                  </div>
                  <div class="form-group">
                    <label>\u7AEF\u53E3</label>
                    <input type="number" [(ngModel)]="batchForm.proxyPort" placeholder="1080">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>\u7528\u6236\u540D\uFF08\u53EF\u9078\uFF09</label>
                    <input type="text" [(ngModel)]="batchForm.proxyUsername">
                  </div>
                  <div class="form-group">
                    <label>\u5BC6\u78BC\uFF08\u53EF\u9078\uFF09</label>
                    <input type="password" [(ngModel)]="batchForm.proxyPassword">
                  </div>
                  <div class="form-group">
                    <label>\u56FD\u5BB6</label>
                    <select [(ngModel)]="batchForm.proxyCountry">
                      <option value="">\u9009\u62E9</option>
                      <option value="US">\u{1F1FA}\u{1F1F8} \u7F8E\u570B</option>
                      <option value="JP">\u{1F1EF}\u{1F1F5} \u65E5\u672C</option>
                      <option value="SG">\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761</option>
                      <option value="HK">\u{1F1ED}\u{1F1F0} \u9999\u6E2F</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- \u89D2\u8272\u8BBE\u7F6E -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableRole">
              <span>\u{1F3AD} \u5E33\u865F\u89D2\u8272\u8A2D\u7F6E</span>
            </label>
            @if (batchForm.enableRole) {
              <div class="batch-section-content">
                <div class="account-role-grid">
                  @for (role of assignableRoles; track role.id) {
                    <div
                      class="account-role-card"
                      [class.selected]="batchForm.role === role.id"
                      (click)="batchForm.role = role.id"
                      [style.border-color]="batchForm.role === role.id ? role.color : 'transparent'">
                      <span class="role-card-icon" [style.background]="role.color + '20'" [style.color]="role.color">{{ role.icon }}</span>
                      <div class="role-card-content">
                        <div class="role-card-name" [style.color]="role.color">{{ role.name }}</div>
                        <div class="role-card-desc">{{ role.description }}</div>
                      </div>
                      @if (batchForm.role === role.id) {
                        <span class="role-card-check" [style.color]="role.color">\u2713</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- AI \u8BBE\u7F6E -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableAI">
              <span>\u{1F916} AI \u8BBE\u7F6E</span>
            </label>
            @if (batchForm.enableAI) {
              <div class="batch-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="batchForm.aiEnabled">
                      <span>\u542F\u7528 AI \u81EA\u52A8\u56DE\u590D</span>
                    </label>
                  </div>
                  <div class="form-group">
                    <label>AI \u6A21\u578B</label>
                    <select [(ngModel)]="batchForm.aiModel">
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-sonnet">Claude 3</option>
                      <option value="ollama">\u672C\u5730 Ollama</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- \u53D1\u9001\u9650\u5236 -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableLimit">
              <span>\u{1F4CA} \u53D1\u9001\u9650\u5236</span>
            </label>
            @if (batchForm.enableLimit) {
              <div class="batch-section-content">
                <div class="form-row">
                  <div class="form-group">
                    <label>\u6BCF\u65E5\u53D1\u9001\u4E0A\u9650</label>
                    <input type="number" [(ngModel)]="batchForm.dailySendLimit" min="1" max="500">
                  </div>
                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="batchForm.enableWarmup">
                      <span>\u542F\u7528\u9810\u71B1\u6A21\u5F0F</span>
                    </label>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- \u5206\u7D44\u8BBE\u7F6E -->
          <div class="batch-section">
            <label class="batch-section-header">
              <input type="checkbox" [(ngModel)]="batchForm.enableGroup">
              <span>\u{1F4C1} \u5206\u7D44\u8BBE\u7F6E</span>
            </label>
            @if (batchForm.enableGroup) {
              <div class="batch-section-content">
                <div class="form-group">
                  <label>\u5206\u914D\u5230\u7FA4\u7D44</label>
                  <input type="text" [(ngModel)]="batchForm.group" placeholder="\u4F8B\u5982\uFF1A\u92B7\u552E\u7D44A">
                </div>
              </div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeBatchEditModal()" class="btn-cancel">\u53D6\u6D88</button>
          <button (click)="applyBatchEdit()" class="btn-save" [disabled]="batchSaving()">
            {{ batchSaving() ? '\u5E94\u7528\u4E2D...' : '\u2713 \u5E94\u7528\u5230 ' + selectedIds.size + ' \u500B\u8D26\u53F7' }}
          </button>
        </div>
      </div>
    }

    <!-- \u6807\u7B7E\u7BA1\u7406\u5F39\u7A97 -->
    @if (showTagManager()) {
      <div class="modal-overlay" (click)="closeTagManager()"></div>
      <div class="modal-container tag-manager-modal">
        <div class="modal-header">
          <h3>\u{1F3F7}\uFE0F \u6807\u7B7E\u7BA1\u7406</h3>
          <button (click)="closeTagManager()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <!-- \u65B0\u589E\u6807\u7B7E -->
          <div class="add-tag-form">
            <input type="text" [(ngModel)]="newTagName" placeholder="\u6807\u7B7E\u540D\u7A31" class="tag-input">
            <input type="color" [(ngModel)]="newTagColor" class="color-picker">
            <button (click)="addTag()" class="btn-add" [disabled]="!newTagName.trim()">\u2795 \u6DFB\u52A0</button>
          </div>

          <!-- \u6807\u7B7E\u5217\u8868 -->
          <div class="tag-list">
            @for (tag of availableTags(); track tag.id) {
              <div class="tag-item">
                <span class="tag-preview" [style.background]="tag.color">{{ tag.name }}</span>
                <input type="text" [(ngModel)]="tag.name" class="tag-edit-input">
                <input type="color" [(ngModel)]="tag.color" class="color-picker small">
                <button (click)="deleteTag(tag.id)" class="btn-delete">\u{1F5D1}\uFE0F</button>
              </div>
            }
            @if (availableTags().length === 0) {
              <div class="empty-state">\u6682\u65E0\u6807\u7B7E\uFF0C\u8ACB\u6DFB\u52A0</div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeTagManager()" class="btn-cancel">\u53D6\u6D88</button>
          <button (click)="saveTags()" class="btn-save">\u{1F4BE} \u4FDD\u5B58\u6807\u7B7E</button>
        </div>
      </div>
    }

    <!-- \u5206\u7D44\u7BA1\u7406\u5F39\u7A97 -->
    @if (showGroupManager()) {
      <div class="modal-overlay" (click)="closeGroupManager()"></div>
      <div class="modal-container group-manager-modal">
        <div class="modal-header">
          <h3>\u{1F4C1} \u5206\u7D44\u7BA1\u7406</h3>
          <button (click)="closeGroupManager()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <!-- \u65B0\u589E\u5206\u7D44 -->
          <div class="add-group-form">
            <input type="text" [(ngModel)]="newGroupName" placeholder="\u5206\u7D44\u540D\u7A31" class="group-input">
            <input type="color" [(ngModel)]="newGroupColor" class="color-picker">
            <button (click)="addGroup()" class="btn-add" [disabled]="!newGroupName.trim()">\u2795 \u6DFB\u52A0</button>
          </div>

          <!-- \u5206\u7D44\u5217\u8868 -->
          <div class="group-list">
            @for (group of groups(); track group.id) {
              <div class="group-item">
                <div class="group-color-bar" [style.background]="group.color || '#6b7280'"></div>
                <div class="group-info">
                  <input type="text" [(ngModel)]="group.name" class="group-edit-input">
                  <span class="group-count">{{ getGroupAccountCount(group.id) }} \u500B\u8D26\u53F7</span>
                </div>
                <input type="color" [(ngModel)]="group.color" class="color-picker small">
                <button (click)="deleteGroup(group.id)" class="btn-delete">\u{1F5D1}\uFE0F</button>
              </div>
            }
            @if (groups().length === 0) {
              <div class="empty-state">\u6682\u65E0\u5206\u7D44\uFF0C\u8ACB\u6DFB\u52A0</div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeGroupManager()" class="btn-cancel">\u53D6\u6D88</button>
          <button (click)="saveGroups()" class="btn-save">\u{1F4BE} \u4FDD\u5B58\u5206\u7D44</button>
        </div>
      </div>
    }

    <!-- \u8D26\u53F7\u6807\u7B7E\u7F16\u8F91\u5F39\u7A97 -->
    @if (showAccountTagEditor()) {
      <div class="modal-overlay" (click)="closeAccountTagEditor()"></div>
      <div class="modal-container account-tag-modal">
        <div class="modal-header">
          <h3>\u{1F3F7}\uFE0F \u7F16\u8F91\u6807\u7B7E - {{ editingTagAccount()?.phone }}</h3>
          <button (click)="closeAccountTagEditor()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <div class="account-tags-grid">
            @for (tag of availableTags(); track tag.id) {
              <label class="account-tag-option" [class.selected]="accountTagsSelection.has(tag.id)">
                <input 
                  type="checkbox" 
                  [checked]="accountTagsSelection.has(tag.id)" 
                  (change)="toggleAccountTag(tag.id)">
                <span class="tag-badge large" [style.background]="tag.color">{{ tag.name }}</span>
              </label>
            }
          </div>
          @if (availableTags().length === 0) {
            <div class="empty-state">
              \u6682\u65E0\u6807\u7B7E\uFF0C\u8BF7\u5148\u521B\u5EFA\u6807\u7B7E
            </div>
          }
          
          <!-- \u5FEB\u901F\u6DFB\u52A0\u6807\u7B7E -->
          <div class="quick-add-tag">
            <div class="quick-add-form">
              <input type="text" [(ngModel)]="newTagName" placeholder="\u8F93\u5165\u65B0\u6807\u7B7E\u540D\u79F0" class="tag-input-inline">
              <input type="color" [(ngModel)]="newTagColor" class="color-picker-inline">
              <button (click)="quickAddTag()" class="btn-quick-add" [disabled]="!newTagName.trim()">\u2795 \u6DFB\u52A0</button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="openTagManagerFromEditor()" class="btn-manage">\u2699\uFE0F \u7BA1\u7406\u6807\u7B7E</button>
          <div class="footer-actions">
            <button (click)="closeAccountTagEditor()" class="btn-cancel">\u53D6\u6D88</button>
            <button (click)="saveAccountTags()" class="btn-save">\u{1F4BE} \u4FDD\u5B58</button>
          </div>
        </div>
      </div>
    }

    <!-- AI \u4EBA\u8A2D\u7BA1\u7406\u5F39\u7A97 -->
    @if (showPersonaManager()) {
      <div class="modal-overlay" (click)="closePersonaManager()"></div>
      <div class="modal-container persona-manager-modal">
        <div class="modal-header">
          <h3>\u{1F916} AI \u4EBA\u8A2D\u7BA1\u7406</h3>
          <button (click)="closePersonaManager()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <div class="persona-tabs">
            <button 
              [class.active]="personaTab() === 'templates'" 
              (click)="personaTab.set('templates')">
              \u{1F4CB} \u6A21\u677F\u5EAB
            </button>
            <button 
              [class.active]="personaTab() === 'custom'" 
              (click)="personaTab.set('custom')">
              \u270F\uFE0F \u81EA\u5B9A\u7FA9
            </button>
          </div>

          @if (personaTab() === 'templates') {
            <div class="persona-grid">
              @for (persona of availablePersonas(); track persona.id) {
                @if (!persona.isCustom) {
                  <div 
                    class="persona-card" 
                    [class.selected]="selectedPersonaId() === persona.id"
                    (click)="selectPersona(persona)">
                    <div class="persona-icon">{{ persona.icon }}</div>
                    <div class="persona-info">
                      <div class="persona-name">{{ persona.name }}</div>
                      <div class="persona-desc">{{ persona.description }}</div>
                    </div>
                    <div class="persona-meta">
                      <span class="meta-tag">\u5275\u610F: {{ persona.creativity }}%</span>
                      <span class="meta-tag">{{ getToneName(persona.tone) }}</span>
                    </div>
                  </div>
                }
              }
            </div>
          }

          @if (personaTab() === 'custom') {
            <div class="custom-persona-section">
              <button (click)="startNewPersona()" class="btn-new-persona">
                \u2795 \u521B\u5EFA\u65B0\u4EBA\u8A2D
              </button>

              <div class="custom-persona-list">
                @for (persona of getCustomPersonas(); track persona.id) {
                  <div 
                    class="persona-card horizontal" 
                    [class.selected]="selectedPersonaId() === persona.id"
                    (click)="selectPersona(persona)">
                    <div class="persona-icon">{{ persona.icon }}</div>
                    <div class="persona-info">
                      <div class="persona-name">{{ persona.name }}</div>
                      <div class="persona-desc">{{ persona.description }}</div>
                    </div>
                    <div class="persona-actions">
                      <button (click)="editPersona(persona); $event.stopPropagation()" class="action-btn">\u270F\uFE0F</button>
                      <button (click)="deletePersona(persona.id); $event.stopPropagation()" class="action-btn danger">\u{1F5D1}\uFE0F</button>
                    </div>
                  </div>
                }
                @if (getCustomPersonas().length === 0) {
                  <div class="empty-state">\u6682\u65E0\u81EA\u5B9A\u7FA9\u4EBA\u8A2D\uFF0C\u70B9\u51FB\u4E0A\u65B9\u6309\u9215\u521B\u5EFA</div>
                }
              </div>
            </div>
          }
        </div>

        <div class="modal-footer">
          <button (click)="closePersonaManager()" class="btn-cancel">\u53D6\u6D88</button>
          @if (selectedPersonaId()) {
            <button (click)="applySelectedPersona()" class="btn-save">
              \u2713 \u4F7F\u7528\u300C{{ getPersonaById(selectedPersonaId()!)?.name }}\u300D
            </button>
          }
        </div>
      </div>
    }

    <!-- AI \u4EBA\u8A2D\u7F16\u8F91\u5F39\u7A97 -->
    @if (showPersonaEditor()) {
      <div class="modal-overlay" (click)="closePersonaEditor()"></div>
      <div class="modal-container persona-editor-modal">
        <div class="modal-header">
          <h3>{{ editingPersona()?.id ? '\u270F\uFE0F \u7F16\u8F91\u4EBA\u8A2D' : '\u2795 \u521B\u5EFA\u4EBA\u8A2D' }}</h3>
          <button (click)="closePersonaEditor()" class="close-btn">\xD7</button>
        </div>
        
        <div class="modal-content">
          <div class="persona-form">
            <div class="form-row">
              <div class="form-group" style="flex: 0 0 80px">
                <label>\u56FE\u6807</label>
                <input type="text" [(ngModel)]="personaForm.icon" class="icon-input" maxlength="2">
              </div>
              <div class="form-group flex-2">
                <label>\u4EBA\u8A2D\u540D\u7A31</label>
                <input type="text" [(ngModel)]="personaForm.name" placeholder="\u4F8B\u5982\uFF1A\u4E13\u4E1A\u92B7\u552E">
              </div>
            </div>

            <div class="form-group">
              <label>\u7B80\u77ED\u63CF\u8FF0</label>
              <input type="text" [(ngModel)]="personaForm.description" placeholder="\u4E00\u53E5\u8A71\u63CF\u8FF0\u8FD9\u4E2A\u4EBA\u8A2D\u7684\u7279\u9EDE">
            </div>

            <div class="form-group">
              <label>\u7CFB\u7D71\u63D0\u793A\u8A5E (System Prompt)</label>
              <textarea 
                [(ngModel)]="personaForm.systemPrompt" 
                placeholder="\u63CF\u8FF0 AI \u7684\u89D2\u8272\u3001\u6027\u683C\u3001\u76EE\u6A19\u548C\u884C\u70BA\u6E96\u5247..."
                rows="6"></textarea>
              <p class="form-hint">\u9019\u662F AI \u7684\u300C\u6027\u683C\u8BF4\u660E\u4E66\u300D\uFF0C\u51B3\u5B9A\u4E86 AI \u5982\u4F55\u56DE\u5E94\u7528\u6236</p>
            </div>

            <div class="form-group">
              <label>\u958B\u5834\u767D\uFF08\u53EF\u9078\uFF09</label>
              <input type="text" [(ngModel)]="personaForm.greeting" placeholder="AI \u4E3B\u52D5\u767C\u8D77\u5BF9\u8BDD\u6642\u7684\u7B2C\u4E00\u53E5\u8A71">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>\u5275\u9020\u529B {{ personaForm.creativity }}%</label>
                <input type="range" [(ngModel)]="personaForm.creativity" min="0" max="100" step="5">
                <p class="form-hint">\u8D8A\u9AD8\u8D8A\u6709\u5275\u610F\uFF0C\u8D8A\u4F4E\u8D8A\u7A69\u5B9A</p>
              </div>
              <div class="form-group">
                <label>\u56DE\u590D\u9577\u5EA6</label>
                <select [(ngModel)]="personaForm.responseLength">
                  <option value="short">\u7B80\u77ED</option>
                  <option value="medium">\u9069\u4E2D</option>
                  <option value="long">\u8BE6\u7EC6</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>\u8A9E\u6C23\u98CE\u683C</label>
                <select [(ngModel)]="personaForm.tone">
                  <option value="formal">\u6B63\u5F0F</option>
                  <option value="professional">\u4E13\u4E1A</option>
                  <option value="friendly">\u53CB\u5584</option>
                  <option value="casual">\u8F15\u9B06</option>
                </select>
              </div>
              <div class="form-group">
                <label>\u8BED\u8A00</label>
                <select [(ngModel)]="personaForm.language">
                  <option value="zh-TW">\u7E41\u4F53\u4E2D\u6587</option>
                  <option value="zh-CN">\u7C21\u9AD4\u4E2D\u6587</option>
                  <option value="en">English</option>
                  <option value="ja">\u65E5\u672C\u8A9E</option>
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="personaForm.enableEmoji">
                  <span>\u4F7F\u7528\u8868\u60C5\u7B26\u53F7</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>\u5C4F\u853D\u5173\u9375\u8A5E\uFF08\u4E00\u884C\u4E00\u500B\uFF09</label>
              <textarea 
                [(ngModel)]="personaForm.blockKeywordsText" 
                placeholder="\u5305\u542B\u9019\u4E9B\u5173\u9375\u8A5E\u7684\u6D88\u606F\u4E0D\u81EA\u52A8\u56DE\u590D"
                rows="3"></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closePersonaEditor()" class="btn-cancel">\u53D6\u6D88</button>
          <button (click)="savePersona()" class="btn-save" [disabled]="!personaForm.name || !personaForm.systemPrompt">
            \u{1F4BE} \u4FDD\u5B58\u4EBA\u8A2D
          </button>
        </div>
      </div>
    }

    <!-- \u89D2\u8272\u9078\u64C7\u5668\u5F48\u51FA\u6846 -->
    @if (showRoleSelector()) {
      <div class="role-selector-overlay" (click)="closeRoleSelector()"></div>
      <div class="role-selector-popup" [style.top.px]="roleSelectorPosition().top" [style.left.px]="roleSelectorPosition().left">
        <div class="role-selector-header">
          <span class="role-selector-title">\u9078\u64C7\u89D2\u8272</span>
          <span class="role-selector-phone">{{ roleSelectorAccount()?.phone }}</span>
        </div>
        <div class="role-selector-list">
          @for (role of assignableRoles; track role.id) {
            <div 
              class="role-option" 
              [class.active]="roleSelectorAccount()?.role === role.id"
              (click)="changeAccountRole(role.id)">
              <span class="role-option-icon" [style.background]="role.color + '20'" [style.color]="role.color">{{ role.icon }}</span>
              <div class="role-option-info">
                <span class="role-option-name">{{ role.name }}</span>
                <span class="role-option-desc">{{ role.description }}</span>
              </div>
              @if (roleSelectorAccount()?.role === role.id) {
                <span class="role-option-check">\u2713</span>
              }
            </div>
          }
        </div>
        <div class="role-selector-footer">
          <button (click)="closeRoleSelector()" class="role-selector-cancel">\u53D6\u6D88</button>
        </div>
      </div>
    }
  `, styles: ["/* angular:styles/component:css;8fd2093a0c0f4d44eae3df2c39b965f75c52eeeee9652f9dbc849023c03491e6;D:/tgkz2026/src/account-card-list.component.ts */\n.account-card-list {\n  padding: 1rem;\n}\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.toolbar-left {\n  display: flex;\n  gap: 0.75rem;\n  flex: 1;\n}\n.search-box {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  flex: 1;\n  max-width: 300px;\n}\n.search-icon {\n  font-size: 0.875rem;\n}\n.search-input {\n  flex: 1;\n  background: transparent;\n  border: none;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n  outline: none;\n}\n.filter-select {\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.toolbar-right {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n}\n.view-toggle {\n  display: flex;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.5rem;\n  overflow: hidden;\n}\n.toggle-btn {\n  padding: 0.5rem 0.75rem;\n  background: transparent;\n  border: none;\n  color: var(--text-muted, #94a3b8);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.toggle-btn.active {\n  background: var(--primary, #06b6d4);\n  color: white;\n}\n.add-btn {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  border-radius: 0.5rem;\n  color: white;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.add-btn:hover {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);\n}\n.add-btn.large {\n  padding: 0.75rem 1.5rem;\n  font-size: 1rem;\n}\n.stats-bar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.5rem;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n.stats-left {\n  display: flex;\n  align-items: center;\n  gap: 1.5rem;\n}\n.batch-checkbox {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.batch-checkbox input {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #06b6d4);\n}\n.checkbox-label {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n}\n.batch-actions {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.batch-count {\n  font-size: 0.875rem;\n  color: var(--primary, #06b6d4);\n  font-weight: 500;\n  margin-right: 0.5rem;\n}\n.batch-btn {\n  padding: 0.375rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.batch-btn:hover:not(:disabled) {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.batch-btn.primary {\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  color: white;\n}\n.batch-btn.primary:hover:not(:disabled) {\n  transform: translateY(-1px);\n}\n.batch-btn.danger:hover:not(:disabled) {\n  border-color: #ef4444;\n  color: #ef4444;\n  background: rgba(239, 68, 68, 0.1);\n}\n.batch-btn.success {\n  border-color: #22c55e;\n  color: #22c55e;\n}\n.batch-btn.success:hover:not(:disabled) {\n  background: rgba(34, 197, 94, 0.1);\n}\n.batch-btn.warning {\n  border-color: #f59e0b;\n  color: #f59e0b;\n}\n.batch-btn.warning:hover:not(:disabled) {\n  background: rgba(245, 158, 11, 0.1);\n}\n.batch-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.stat-item {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.stat-dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n.stat-dot.online {\n  background: #22c55e;\n}\n.stat-dot.offline {\n  background: #94a3b8;\n}\n.stat-dot.banned {\n  background: #ef4444;\n}\n.stat-label {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.stat-value {\n  font-weight: 600;\n  color: var(--text-primary, white);\n}\n.card-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 1rem;\n}\n.account-card {\n  background: var(--bg-card, rgba(30, 41, 59, 0.8));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.75rem;\n  padding: 1rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  position: relative;\n}\n.account-card.selected {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.card-select {\n  position: absolute;\n  top: 0.75rem;\n  right: 0.75rem;\n  z-index: 2;\n}\n.card-select input {\n  width: 18px;\n  height: 18px;\n  accent-color: var(--primary, #06b6d4);\n  cursor: pointer;\n}\n.account-card:hover {\n  border-color: var(--primary, #06b6d4);\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);\n}\n.account-card.online {\n  border-left: 3px solid #22c55e;\n  box-shadow: inset 0 0 20px rgba(34, 197, 94, 0.05);\n}\n.account-card.online:hover {\n  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2), inset 0 0 20px rgba(34, 197, 94, 0.05);\n}\n.account-card.offline {\n  border-left: 3px solid #94a3b8;\n}\n.account-card.banned {\n  border-left: 3px solid #ef4444;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(239, 68, 68, 0.05),\n      transparent);\n}\n.account-card.warming {\n  border-left: 3px solid #f59e0b;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(245, 158, 11, 0.05),\n      transparent);\n}\n.account-card.logging-in {\n  border-left: 3px solid #06b6d4;\n  animation: card-pulse 2s ease-in-out infinite;\n}\n@keyframes card-pulse {\n  0%, 100% {\n    box-shadow: 0 2px 8px rgba(6, 182, 212, 0.1);\n  }\n  50% {\n    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3);\n  }\n}\n.card-header {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.card-avatar {\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1rem;\n  font-weight: bold;\n  color: white;\n  flex-shrink: 0;\n}\n.card-avatar-img {\n  width: 40px;\n  height: 40px;\n  border-radius: 50%;\n  object-fit: cover;\n  flex-shrink: 0;\n}\n.card-nickname {\n  font-size: 0.75rem;\n  color: var(--primary, #06b6d4);\n  font-weight: 500;\n  margin-bottom: 0.125rem;\n}\n.card-status {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.card-status-role {\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n  flex: 1;\n}\n.card-role {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.25rem 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.375rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-size: 0.75rem;\n}\n.card-role:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.role-icon {\n  font-size: 0.875rem;\n}\n.role-name {\n  font-weight: 500;\n}\n.role-arrow {\n  font-size: 0.625rem;\n  color: var(--text-muted, #94a3b8);\n  margin-left: auto;\n}\n.role-selector-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n}\n.role-selector-popup {\n  position: fixed;\n  width: 260px;\n  background: var(--bg-card, #1e293b);\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.75rem;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);\n  z-index: 1001;\n  overflow: hidden;\n}\n.role-selector-header {\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.role-selector-title {\n  font-weight: 600;\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.role-selector-phone {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.role-selector-list {\n  max-height: 320px;\n  overflow-y: auto;\n}\n.role-option {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.role-option:hover {\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n}\n.role-option.active {\n  background: rgba(6, 182, 212, 0.1);\n}\n.role-option-icon {\n  width: 36px;\n  height: 36px;\n  border-radius: 0.5rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.25rem;\n  flex-shrink: 0;\n}\n.role-option-info {\n  flex: 1;\n  min-width: 0;\n}\n.role-option-name {\n  display: block;\n  font-weight: 500;\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.role-option-desc {\n  display: block;\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.role-option-check {\n  color: #22c55e;\n  font-weight: bold;\n}\n.role-selector-footer {\n  padding: 0.75rem 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: flex;\n  justify-content: flex-end;\n}\n.role-selector-cancel {\n  padding: 0.5rem 1rem;\n  background: transparent;\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  font-size: 0.75rem;\n}\n.role-selector-cancel:hover {\n  border-color: var(--text-muted, #94a3b8);\n}\n.status-dot {\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n}\n.status-dot.small {\n  width: 8px;\n  height: 8px;\n}\n.status-dot.online {\n  background: #22c55e;\n  animation: pulse-online 2s ease-in-out infinite;\n  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);\n}\n.status-dot.offline {\n  background: #94a3b8;\n}\n.status-dot.banned {\n  background: #ef4444;\n  animation: pulse-banned 1.5s ease-in-out infinite;\n}\n.status-dot.warning {\n  background: #f59e0b;\n  animation: pulse-warning 2s ease-in-out infinite;\n}\n@keyframes pulse-online {\n  0%, 100% {\n    opacity: 1;\n    transform: scale(1);\n  }\n  50% {\n    opacity: 0.7;\n    transform: scale(1.1);\n  }\n}\n@keyframes pulse-banned {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n@keyframes pulse-warning {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.6;\n  }\n}\n.status-text {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.card-main {\n  flex: 1;\n}\n.card-phone {\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--text-primary, white);\n}\n.card-name {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n}\n.card-username {\n  color: var(--primary, #06b6d4);\n}\n.card-device {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.device-icon {\n  font-size: 1rem;\n}\n.card-health {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.health-bar {\n  flex: 1;\n  height: 4px;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 2px;\n  overflow: hidden;\n}\n.health-bar.small {\n  width: 50px;\n}\n.health-fill {\n  height: 100%;\n  transition: width 0.3s;\n}\n.health-fill.good {\n  background: #22c55e;\n}\n.health-fill.warning {\n  background: #f59e0b;\n}\n.health-fill.danger {\n  background: #ef4444;\n}\n.health-text {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  min-width: 35px;\n}\n.card-actions {\n  display: flex;\n  gap: 0.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  padding-top: 0.75rem;\n}\n.action-btn {\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.action-btn:hover:not(:disabled) {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n  transform: translateY(-1px);\n}\n.action-btn.login {\n  color: #22c55e;\n}\n.action-btn.login:hover:not(:disabled) {\n  background: rgba(34, 197, 94, 0.15);\n  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);\n}\n.action-btn.logout {\n  color: #f59e0b;\n}\n.action-btn.logout:hover:not(:disabled) {\n  background: rgba(245, 158, 11, 0.15);\n}\n.action-btn.edit {\n  color: #3b82f6;\n}\n.action-btn.edit:hover:not(:disabled) {\n  background: rgba(59, 130, 246, 0.15);\n}\n.action-btn.remove {\n  color: #94a3b8;\n}\n.action-btn.remove:hover:not(:disabled) {\n  background: rgba(239, 68, 68, 0.15);\n  color: #ef4444;\n}\n.action-label {\n  font-size: 0.75rem;\n}\n.action-btn.logging-in {\n  background: rgba(6, 182, 212, 0.2);\n  cursor: not-allowed;\n  opacity: 0.8;\n}\n.action-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.action-icon.spinning {\n  display: inline-block;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}\n.login-progress-overlay {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(15, 23, 42, 0.9);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  z-index: 10;\n  border-radius: 0.75rem;\n}\n.login-spinner {\n  width: 32px;\n  height: 32px;\n  border: 3px solid rgba(6, 182, 212, 0.3);\n  border-top-color: #06b6d4;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n.login-status-text {\n  font-size: 0.875rem;\n  color: #06b6d4;\n  font-weight: 500;\n}\n.detail-login-progress {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem;\n  background: rgba(6, 182, 212, 0.1);\n  border: 1px solid rgba(6, 182, 212, 0.3);\n  border-radius: 0.5rem;\n  margin-bottom: 1rem;\n}\n.login-progress-text {\n  font-size: 0.875rem;\n  color: #06b6d4;\n}\n.action-btn-sm.logging-in {\n  background: rgba(6, 182, 212, 0.2);\n  color: #06b6d4;\n  cursor: not-allowed;\n}\n.add-card {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  border: 2px dashed var(--border-default, rgba(148, 163, 184, 0.3));\n  background: transparent;\n  min-height: 180px;\n}\n.add-card:hover {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.05);\n}\n.add-icon {\n  font-size: 2rem;\n  margin-bottom: 0.5rem;\n}\n.add-text {\n  color: var(--text-muted, #94a3b8);\n}\n.table-container {\n  overflow-x: auto;\n}\n.account-table {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--bg-card, rgba(30, 41, 59, 0.8));\n  border-radius: 0.75rem;\n  overflow: hidden;\n}\n.account-table th {\n  padding: 0.75rem 1rem;\n  text-align: left;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: var(--text-muted, #94a3b8);\n  text-transform: uppercase;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n}\n.account-table td {\n  padding: 0.75rem 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.875rem;\n}\n.account-table tr:hover {\n  background: rgba(6, 182, 212, 0.05);\n}\n.account-table tr.selected {\n  background: rgba(6, 182, 212, 0.1);\n}\n.phone-cell {\n  font-weight: 500;\n  color: var(--text-primary, white);\n}\n.device-cell {\n  font-size: 0.75rem;\n}\n.health-inline {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.table-action {\n  padding: 0.25rem;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  opacity: 0.7;\n  transition: opacity 0.2s;\n}\n.table-action:hover {\n  opacity: 1;\n}\n.table-action.login:hover {\n  background: rgba(34, 197, 94, 0.2);\n  border-radius: 4px;\n}\n.table-action.logout:hover {\n  background: rgba(245, 158, 11, 0.2);\n  border-radius: 4px;\n}\n.table-action.edit:hover {\n  background: rgba(59, 130, 246, 0.2);\n  border-radius: 4px;\n}\n.table-action.remove:hover {\n  background: rgba(239, 68, 68, 0.2);\n  border-radius: 4px;\n}\n.role-cell {\n  min-width: 80px;\n}\n.role-tag-small {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.375rem;\n  font-size: 0.75rem;\n  font-weight: 500;\n  border: 1px solid;\n  cursor: pointer;\n  transition: all 0.2s;\n  white-space: nowrap;\n}\n.role-tag-small:hover {\n  filter: brightness(1.1);\n  transform: scale(1.02);\n}\n.empty-state {\n  text-align: center;\n  padding: 4rem 2rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.75rem;\n  border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));\n}\n.empty-icon {\n  font-size: 3rem;\n  margin-bottom: 1rem;\n}\n.empty-state h3 {\n  margin: 0 0 0.5rem 0;\n  color: var(--text-primary, white);\n}\n.empty-state p {\n  margin: 0 0 1.5rem 0;\n  color: var(--text-muted, #94a3b8);\n}\n.detail-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  z-index: 40;\n}\n.detail-panel {\n  position: fixed;\n  top: 0;\n  right: 0;\n  width: 400px;\n  max-width: 100%;\n  height: 100vh;\n  background: var(--bg-card, rgb(30, 41, 59));\n  border-left: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  z-index: 50;\n  display: flex;\n  flex-direction: column;\n  transform: translateX(100%);\n  transition: transform 0.3s;\n}\n.detail-panel.open {\n  transform: translateX(0);\n}\n.detail-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.detail-header h3 {\n  margin: 0;\n  color: var(--text-primary, white);\n}\n.close-btn {\n  background: none;\n  border: none;\n  color: var(--text-muted, #94a3b8);\n  font-size: 1.5rem;\n  cursor: pointer;\n}\n.detail-content {\n  flex: 1;\n  overflow-y: auto;\n  padding: 1.5rem;\n}\n.detail-section {\n  margin-bottom: 1.5rem;\n}\n.detail-section:first-child {\n  text-align: center;\n}\n.detail-avatar {\n  width: 72px;\n  height: 72px;\n  border-radius: 50%;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.75rem;\n  font-weight: bold;\n  color: white;\n  margin: 0 auto 0.75rem;\n}\n.detail-avatar-img {\n  width: 72px;\n  height: 72px;\n  border-radius: 50%;\n  object-fit: cover;\n  margin: 0 auto 0.75rem;\n  border: 3px solid var(--primary, #06b6d4);\n}\n.detail-nickname {\n  font-size: 0.875rem;\n  color: var(--primary, #06b6d4);\n  font-weight: 500;\n  margin-bottom: 0.25rem;\n}\n.detail-bio {\n  margin-top: 0.75rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-style: italic;\n  text-align: left;\n}\n.detail-name {\n  font-size: 1.25rem;\n  font-weight: 600;\n  color: var(--text-primary, white);\n}\n.detail-phone {\n  color: var(--text-secondary, #cbd5e1);\n}\n.detail-username {\n  color: var(--primary, #06b6d4);\n  font-size: 0.875rem;\n}\n.detail-role-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-top: 0.75rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.detail-role-badge:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.role-icon-large {\n  width: 32px;\n  height: 32px;\n  border-radius: 0.375rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.125rem;\n}\n.role-label {\n  font-weight: 600;\n  font-size: 0.875rem;\n}\n.role-change-hint {\n  font-size: 0.625rem;\n  color: var(--text-muted, #94a3b8);\n  margin-left: 0.25rem;\n}\n.role-value {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.role-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  font-size: 0.75rem;\n  font-weight: 500;\n}\n.role-edit {\n  font-size: 0.75rem;\n  opacity: 0;\n  transition: opacity 0.2s;\n}\n.role-value:hover .role-edit {\n  opacity: 1;\n}\n.detail-section h4 {\n  margin: 0 0 0.75rem 0;\n  font-size: 0.875rem;\n  color: var(--text-muted, #94a3b8);\n}\n.detail-grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 0.75rem;\n}\n.detail-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.detail-item.full {\n  grid-column: span 2;\n}\n.detail-item .label {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.detail-item .value {\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.detail-item .value.status.online {\n  color: #22c55e;\n}\n.detail-item .value.status.offline {\n  color: #94a3b8;\n}\n.detail-item .value.status.banned {\n  color: #ef4444;\n}\n.detail-actions {\n  padding: 1rem 1.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.detail-actions-grid {\n  padding: 0.75rem 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 0.375rem;\n}\n.action-btn-sm {\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  text-align: center;\n}\n.action-btn-sm:hover:not(:disabled) {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.action-btn-sm:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.action-btn-sm.primary {\n  background:\n    linear-gradient(\n      135deg,\n      #22c55e,\n      #16a34a);\n  border-color: transparent;\n  color: white;\n}\n.action-btn-sm.warning {\n  background: rgba(245, 158, 11, 0.2);\n  border-color: #f59e0b;\n  color: #fcd34d;\n}\n.action-btn-sm.danger {\n  background: rgba(239, 68, 68, 0.1);\n  border-color: rgba(239, 68, 68, 0.3);\n  color: #f87171;\n}\n.action-btn-sm.danger:hover {\n  background: rgba(239, 68, 68, 0.2);\n  border-color: #ef4444;\n}\n.detail-btn {\n  padding: 0.75rem;\n  border: none;\n  border-radius: 0.5rem;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.detail-btn.primary {\n  background:\n    linear-gradient(\n      135deg,\n      #22c55e,\n      #16a34a);\n  color: white;\n}\n.detail-btn.secondary {\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  color: var(--text-secondary, #cbd5e1);\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n}\n.detail-btn.warning {\n  background: rgba(245, 158, 11, 0.2);\n  color: #fcd34d;\n}\n.detail-btn.danger {\n  background: rgba(239, 68, 68, 0.2);\n  color: #fca5a5;\n}\n.detail-btn:hover {\n  transform: translateY(-1px);\n}\n.action-btn {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  min-width: 48px;\n}\n.action-icon {\n  font-size: 1rem;\n}\n.action-label {\n  font-size: 0.625rem;\n  color: var(--text-muted, #94a3b8);\n}\n.action-btn:hover .action-label {\n  color: var(--text-primary, white);\n}\n.action-btn.login:hover {\n  background: rgba(34, 197, 94, 0.2);\n}\n.action-btn.logout:hover {\n  background: rgba(245, 158, 11, 0.2);\n}\n.action-btn.edit:hover {\n  background: rgba(59, 130, 246, 0.2);\n}\n.action-btn.remove:hover {\n  background: rgba(239, 68, 68, 0.2);\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  z-index: 100;\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n}\n.modal-container {\n  position: fixed;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  width: 560px;\n  max-width: 95vw;\n  max-height: 90vh;\n  background: var(--bg-card, rgb(30, 41, 59));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 1rem;\n  z-index: 101;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);\n}\n.modal-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.modal-header h3 {\n  margin: 0;\n  color: var(--text-primary, white);\n  font-size: 1.125rem;\n}\n.modal-content {\n  flex: 1;\n  overflow-y: auto;\n  padding: 0;\n}\n.modal-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 0.75rem;\n  padding: 1rem 1.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.tab-nav {\n  display: flex;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  padding: 0 1rem;\n  overflow-x: auto;\n}\n.tab-btn {\n  padding: 0.75rem 1rem;\n  background: none;\n  border: none;\n  color: var(--text-muted, #94a3b8);\n  font-size: 0.875rem;\n  cursor: pointer;\n  white-space: nowrap;\n  border-bottom: 2px solid transparent;\n  transition: all 0.2s;\n}\n.tab-btn:hover {\n  color: var(--text-primary, white);\n}\n.tab-btn.active {\n  color: var(--primary, #06b6d4);\n  border-bottom-color: var(--primary, #06b6d4);\n}\n.tab-panel {\n  padding: 1.5rem;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #cbd5e1);\n}\n.form-group input[type=text],\n.form-group input[type=number],\n.form-group input[type=password],\n.form-group select,\n.form-group textarea {\n  width: 100%;\n  padding: 0.625rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n  transition: border-color 0.2s;\n}\n.form-group input:focus,\n.form-group select:focus,\n.form-group textarea:focus {\n  outline: none;\n  border-color: var(--primary, #06b6d4);\n}\n.form-row {\n  display: flex;\n  gap: 1rem;\n}\n.form-row .form-group {\n  flex: 1;\n}\n.form-row .form-group.flex-2 {\n  flex: 2;\n}\n.form-row .form-group.flex-1 {\n  flex: 1;\n}\n.form-hint {\n  margin-top: 0.375rem;\n  font-size: 0.75rem;\n  color: var(--text-muted, #64748b);\n}\n.form-hint.warning {\n  color: #f59e0b;\n}\n.checkbox-label {\n  display: flex !important;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.checkbox-label input[type=checkbox] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #06b6d4);\n}\n.role-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 0.75rem;\n  margin-top: 0.5rem;\n}\n.role-card {\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 2px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  text-align: center;\n}\n.role-card:hover {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.role-card.selected {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.2);\n}\n.role-name {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-primary, white);\n  margin-bottom: 0.25rem;\n}\n.role-desc {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n}\n.slider-group {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.slider-group span {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  min-width: 32px;\n}\n.slider-group input[type=range] {\n  flex: 1;\n  height: 4px;\n  accent-color: var(--primary, #06b6d4);\n}\n.test-btn {\n  width: 100%;\n  padding: 0.625rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-secondary, #cbd5e1);\n  cursor: pointer;\n  transition: all 0.2s;\n  margin-bottom: 0.75rem;\n}\n.test-btn:hover:not(:disabled) {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.test-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.test-result {\n  padding: 0.5rem 0.75rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.test-result.success {\n  background: rgba(34, 197, 94, 0.2);\n  color: #86efac;\n}\n.test-result.error {\n  background: rgba(239, 68, 68, 0.2);\n  color: #fca5a5;\n}\n.btn-cancel {\n  padding: 0.625rem 1.25rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-secondary, #cbd5e1);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.btn-cancel:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.btn-save {\n  padding: 0.625rem 1.25rem;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  border-radius: 0.5rem;\n  color: white;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.btn-save:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);\n}\n.btn-save:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.batch-modal {\n  width: 640px;\n  max-height: 85vh;\n}\n.batch-warning {\n  padding: 0.75rem 1rem;\n  background: rgba(245, 158, 11, 0.15);\n  border: 1px solid rgba(245, 158, 11, 0.3);\n  border-radius: 0.5rem;\n  color: #fcd34d;\n  font-size: 0.875rem;\n  margin: 1rem 1.5rem;\n}\n.batch-section {\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  border-radius: 0.5rem;\n  margin: 0 1.5rem 1rem;\n  overflow: hidden;\n}\n.batch-section-header {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: var(--text-primary, white);\n}\n.batch-section-header input {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #06b6d4);\n}\n.batch-section-content {\n  padding: 1rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.role-grid.compact {\n  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));\n  gap: 0.5rem;\n}\n.role-grid.compact .role-card {\n  padding: 0.5rem;\n}\n.role-grid.compact .role-name {\n  font-size: 0.75rem;\n}\n.account-role-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n  gap: 0.5rem;\n}\n.account-role-card {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 2px solid transparent;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.account-role-card:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.8));\n}\n.account-role-card.selected {\n  background: rgba(6, 182, 212, 0.1);\n}\n.role-card-icon {\n  width: 36px;\n  height: 36px;\n  border-radius: 0.375rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.125rem;\n  flex-shrink: 0;\n}\n.role-card-content {\n  flex: 1;\n  min-width: 0;\n}\n.role-card-name {\n  font-weight: 600;\n  font-size: 0.875rem;\n}\n.role-card-desc {\n  font-size: 0.75rem;\n  color: var(--text-muted, #94a3b8);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.role-card-check {\n  font-weight: bold;\n  font-size: 1rem;\n}\n.tag-filter-dropdown {\n  position: relative;\n}\n.filter-btn {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n.filter-btn:hover {\n  border-color: var(--primary, #06b6d4);\n}\n.tag-count {\n  background: var(--primary, #06b6d4);\n  color: white;\n  padding: 0.125rem 0.375rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n}\n.tag-dropdown {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  margin-top: 0.25rem;\n  min-width: 200px;\n  background: var(--bg-card, rgba(30, 41, 59, 0.95));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  padding: 0.5rem;\n  z-index: 100;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n}\n.tag-dropdown-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 0.25rem 0.5rem 0.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  margin-bottom: 0.5rem;\n  font-size: 0.75rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.clear-btn {\n  background: none;\n  border: none;\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n  font-size: 0.75rem;\n}\n.tag-option {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.375rem 0.5rem;\n  cursor: pointer;\n  border-radius: 0.25rem;\n}\n.tag-option:hover {\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n}\n.tag-dot {\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n}\n.manage-tags-btn {\n  width: 100%;\n  padding: 0.5rem;\n  margin-top: 0.5rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.3));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  font-size: 0.75rem;\n}\n.manage-tags-btn:hover {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.manage-btn {\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-secondary, #cbd5e1);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n.manage-btn:hover {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.card-tags {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.25rem;\n  margin-top: 0.5rem;\n}\n.tag-badge {\n  padding: 0.125rem 0.375rem;\n  border-radius: 0.25rem;\n  font-size: 0.625rem;\n  color: white;\n  font-weight: 500;\n}\n.tag-badge.large {\n  padding: 0.25rem 0.5rem;\n  font-size: 0.75rem;\n}\n.tag-more {\n  padding: 0.125rem 0.375rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border-radius: 0.25rem;\n  font-size: 0.625rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.tag-manager-modal,\n.group-manager-modal,\n.account-tag-modal {\n  width: 480px;\n  max-height: 70vh;\n}\n.add-tag-form,\n.add-group-form {\n  display: flex;\n  gap: 0.5rem;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.tag-input,\n.group-input {\n  flex: 1;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.color-picker {\n  width: 40px;\n  height: 36px;\n  padding: 0;\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n}\n.color-picker.small {\n  width: 32px;\n  height: 32px;\n}\n.btn-add {\n  padding: 0.5rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #06b6d4,\n      #3b82f6);\n  border: none;\n  border-radius: 0.375rem;\n  color: white;\n  cursor: pointer;\n  font-size: 0.875rem;\n}\n.btn-add:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.tag-list,\n.group-list {\n  padding: 1rem 1.5rem;\n  max-height: 300px;\n  overflow-y: auto;\n}\n.tag-item,\n.group-item {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.3));\n  border-radius: 0.5rem;\n  margin-bottom: 0.5rem;\n}\n.tag-preview {\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  font-size: 0.75rem;\n  color: white;\n  min-width: 60px;\n  text-align: center;\n}\n.tag-edit-input,\n.group-edit-input {\n  flex: 1;\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.25rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.btn-delete {\n  padding: 0.375rem 0.5rem;\n  background: none;\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.25rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n}\n.btn-delete:hover {\n  border-color: #ef4444;\n  color: #ef4444;\n  background: rgba(239, 68, 68, 0.1);\n}\n.group-color-bar {\n  width: 4px;\n  height: 40px;\n  border-radius: 2px;\n}\n.group-info {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.group-count {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.empty-state {\n  text-align: center;\n  padding: 2rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.empty-state a {\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n}\n.account-tags-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));\n  gap: 0.75rem;\n  padding: 1.5rem;\n}\n.account-tag-option {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.3));\n  border: 2px solid transparent;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.account-tag-option:hover {\n  border-color: var(--border-default, rgba(148, 163, 184, 0.3));\n}\n.account-tag-option.selected {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.account-tag-option input {\n  display: none;\n}\n.quick-add-tag {\n  padding: 1rem 1.5rem;\n  border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n  margin-top: 0.5rem;\n}\n.quick-add-form {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n}\n.tag-input-inline {\n  flex: 1;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.tag-input-inline:focus {\n  outline: none;\n  border-color: var(--primary, #06b6d4);\n}\n.color-picker-inline {\n  width: 36px;\n  height: 36px;\n  padding: 0;\n  border: none;\n  border-radius: 0.375rem;\n  cursor: pointer;\n}\n.btn-quick-add {\n  padding: 0.5rem 1rem;\n  background: var(--primary, #06b6d4);\n  color: white;\n  border: none;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.btn-quick-add:hover:not(:disabled) {\n  background: var(--primary-hover, #0891b2);\n}\n.btn-quick-add:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.modal-footer .btn-manage {\n  padding: 0.5rem 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  color: var(--text-secondary, #94a3b8);\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n.modal-footer .btn-manage:hover {\n  background: var(--bg-secondary, rgba(30, 41, 59, 0.5));\n  color: var(--text-primary, white);\n}\n.modal-footer .footer-actions {\n  display: flex;\n  gap: 0.5rem;\n}\n.account-tag-modal .modal-footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.detail-item.full-width {\n  grid-column: 1 / -1;\n}\n.detail-tags {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n  margin-top: 0.25rem;\n}\n.no-tags {\n  color: var(--text-secondary, #94a3b8);\n  font-size: 0.75rem;\n}\n.persona-manager-modal {\n  width: 720px;\n  max-height: 85vh;\n}\n.persona-editor-modal {\n  width: 600px;\n  max-height: 90vh;\n}\n.persona-tabs {\n  display: flex;\n  gap: 0.5rem;\n  padding: 1rem 1.5rem;\n  border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));\n}\n.persona-tabs button {\n  padding: 0.5rem 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.5rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.persona-tabs button:hover {\n  border-color: var(--primary, #06b6d4);\n}\n.persona-tabs button.active {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.2),\n      rgba(59, 130, 246, 0.2));\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.persona-grid {\n  display: grid;\n  grid-template-columns: repeat(2, 1fr);\n  gap: 0.75rem;\n  padding: 1rem 1.5rem;\n  max-height: 400px;\n  overflow-y: auto;\n}\n.persona-card {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 2px solid transparent;\n  border-radius: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.persona-card:hover {\n  border-color: var(--border-default, rgba(148, 163, 184, 0.3));\n}\n.persona-card.selected {\n  border-color: var(--primary, #06b6d4);\n  background: rgba(6, 182, 212, 0.1);\n}\n.persona-card.horizontal {\n  flex-direction: row;\n  align-items: center;\n}\n.persona-icon {\n  font-size: 2rem;\n  width: 48px;\n  height: 48px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.5rem;\n}\n.persona-info {\n  flex: 1;\n}\n.persona-name {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary, white);\n  margin-bottom: 0.25rem;\n}\n.persona-desc {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #94a3b8);\n  line-height: 1.4;\n}\n.persona-meta {\n  display: flex;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n.meta-tag {\n  padding: 0.125rem 0.375rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border-radius: 0.25rem;\n  font-size: 0.625rem;\n  color: var(--text-secondary, #94a3b8);\n}\n.persona-actions {\n  display: flex;\n  gap: 0.25rem;\n}\n.action-btn {\n  padding: 0.375rem 0.5rem;\n  background: var(--bg-card, rgba(30, 41, 59, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.25rem;\n  color: var(--text-secondary, #94a3b8);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.action-btn:hover {\n  border-color: var(--primary, #06b6d4);\n  color: var(--primary, #06b6d4);\n}\n.action-btn.danger:hover {\n  border-color: #ef4444;\n  color: #ef4444;\n}\n.custom-persona-section {\n  padding: 1rem 1.5rem;\n}\n.btn-new-persona {\n  width: 100%;\n  padding: 0.75rem;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.2),\n      rgba(59, 130, 246, 0.2));\n  border: 1px dashed var(--primary, #06b6d4);\n  border-radius: 0.5rem;\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.btn-new-persona:hover {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.3),\n      rgba(59, 130, 246, 0.3));\n}\n.custom-persona-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  max-height: 300px;\n  overflow-y: auto;\n}\n.persona-form {\n  padding: 1rem 1.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.icon-input {\n  text-align: center;\n  font-size: 1.5rem !important;\n}\n.persona-select-row {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n}\n.current-persona {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));\n  border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));\n  border-radius: 0.375rem;\n  cursor: pointer;\n}\n.current-persona:hover {\n  border-color: var(--primary, #06b6d4);\n}\n.persona-icon-small {\n  font-size: 1.25rem;\n}\n.persona-name-small {\n  color: var(--text-primary, white);\n  font-size: 0.875rem;\n}\n.no-persona {\n  color: var(--text-secondary, #94a3b8);\n  font-size: 0.875rem;\n}\n.select-arrow {\n  margin-left: auto;\n  color: var(--text-secondary, #94a3b8);\n  font-size: 0.75rem;\n}\n.btn-persona-manager {\n  padding: 0.5rem 0.75rem;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.2),\n      rgba(59, 130, 246, 0.2));\n  border: 1px solid var(--primary, #06b6d4);\n  border-radius: 0.375rem;\n  color: var(--primary, #06b6d4);\n  cursor: pointer;\n  font-size: 0.75rem;\n  white-space: nowrap;\n}\n.btn-persona-manager:hover {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(6, 182, 212, 0.3),\n      rgba(59, 130, 246, 0.3));\n}\n/*# sourceMappingURL=account-card-list.component.css.map */\n"] }]
  }], null, { accounts: [{
    type: Input
  }], addAccount: [{
    type: Output
  }], accountSelected: [{
    type: Output
  }], accountLogin: [{
    type: Output
  }], accountLogout: [{
    type: Output
  }], accountRemove: [{
    type: Output
  }], accountExport: [{
    type: Output
  }], accountEdit: [{
    type: Output
  }], accountUpdated: [{
    type: Output
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AccountCardListComponent, { className: "AccountCardListComponent", filePath: "src/account-card-list.component.ts", lineNumber: 4015 });
})();

// src/views/accounts-view.component.ts
function AccountsViewComponent_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 21);
    \u0275\u0275listener("click", function AccountsViewComponent_Conditional_8_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showUpgrade());
    });
    \u0275\u0275text(1, " \u5347\u7D1A\u89E3\u9396\u66F4\u591A ");
    \u0275\u0275elementEnd();
  }
}
function AccountsViewComponent_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 22);
    \u0275\u0275text(1, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u5C0E\u5165\u4E2D... ");
  }
}
function AccountsViewComponent_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u{1F4E5}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u5C0E\u5165 Session ");
  }
}
var AccountsViewComponent = class _AccountsViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.dialog = inject(DialogService);
    this.membershipService = inject(MembershipService);
    this.accountService = inject(AccountManagementService);
    this.accounts = this.accountService.accounts;
    this.isImportingSession = signal(false, ...ngDevMode ? [{ debugName: "isImportingSession" }] : []);
    this.ipcCleanup = [];
  }
  ngOnInit() {
    this.loadAccounts();
    this.setupIpcListeners();
  }
  ngOnDestroy() {
    this.ipcCleanup.forEach((fn) => fn());
  }
  loadAccounts() {
    this.ipc.send("get-accounts");
  }
  setupIpcListeners() {
    const cleanup1 = this.ipc.on("session-import-result", (data) => {
      this.isImportingSession.set(false);
      if (data.success) {
        const msg = data.phone ? `\u2705 Session \u5C0E\u5165\u6210\u529F: ${data.phone}` : `\u2705 Session \u5C0E\u5165\u5B8C\u6210: ${data.count || 1} \u500B\u5E33\u865F`;
        this.toast.success(msg);
        this.reloadAccounts();
      } else {
        this.toast.error(`\u274C \u5C0E\u5165\u5931\u6557: ${data.message || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    const cleanup2 = this.ipc.on("session-import-error", (data) => {
      this.isImportingSession.set(false);
      this.toast.error(`\u274C Session \u5C0E\u5165\u5931\u6557: ${data.error}`);
    });
    this.ipcCleanup.push(cleanup1, cleanup2);
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 導航 - 使用 NavBridgeService 替代 Angular Router
  navigateTo(view) {
    const viewMap = {
      "add-account": "add-account",
      "api-credentials": "api-credentials",
      "accounts": "accounts",
      "settings": "settings"
    };
    const targetView = viewMap[view] || view;
    this.nav.navigateTo(targetView);
  }
  // 顯示升級提示
  showUpgrade() {
    this.toast.info("\u8ACB\u5347\u7D1A\u6703\u54E1\u4EE5\u89E3\u9396\u66F4\u591A\u529F\u80FD");
  }
  // 打開 QR 登入
  openQrLogin() {
    this.dialog.openQrLogin();
  }
  // 導入 Session
  importSession() {
    this.isImportingSession.set(true);
    this.toast.info("\u6B63\u5728\u6253\u958B\u6587\u4EF6\u9078\u64C7\u5668...");
    this.ipc.send("import-session");
    setTimeout(() => {
      if (this.isImportingSession()) {
        this.isImportingSession.set(false);
      }
    }, 3e4);
  }
  // 重新加載帳戶
  reloadAccounts() {
    this.ipc.send("get-accounts");
    this.toast.info("\u6B63\u5728\u5237\u65B0\u5E33\u6236\u5217\u8868...");
  }
  // 刷新隊列狀態
  refreshQueueStatus() {
    this.ipc.send("get-queue-status");
  }
  // 登入帳戶
  loginAccount(id) {
    this.accountService.loginAccount(id);
  }
  // 登出帳戶
  logoutAccount(id) {
    this.accountService.logoutAccount(id);
  }
  // 刪除帳戶
  removeAccount(id) {
    this.dialog.confirm({
      title: "\u78BA\u8A8D\u522A\u9664",
      message: "\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u5E33\u6236\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002",
      type: "danger",
      confirmText: "\u522A\u9664",
      onConfirm: () => {
        this.accountService.removeAccount(id);
      }
    });
  }
  // 導出 Session
  exportAccount(phone) {
    this.ipc.send("export-session", { phone });
    this.toast.info("\u6B63\u5728\u5C0E\u51FA Session...");
  }
  // 編輯帳戶
  editAccount(account) {
    this.accountService.toggleSelection(account.id);
    this.toast.info(`\u7DE8\u8F2F\u5E33\u6236: ${account.phone}`);
  }
  static {
    this.\u0275fac = function AccountsViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AccountsViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AccountsViewComponent, selectors: [["app-accounts-view"]], decls: 37, vars: 9, consts: [[1, "flex", "items-center", "justify-between", "mb-6"], ["id", "accounts-section", 1, "text-4xl", "font-bold", "text-slate-900", "dark:text-white"], [1, "flex", "items-center", "gap-3"], [1, "text-sm", "text-slate-500"], [1, "text-lg", "font-bold", "px-3", "py-1", "rounded-lg"], [1, "text-xs", "px-3", "py-1", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "text-white", "rounded-full", "hover:opacity-90", "transition-opacity"], [1, "bg-slate-100/50", "dark:bg-slate-900/50", "backdrop-blur-sm", "border", "border-slate-500/20", "p-4", "rounded-xl", "shadow-lg", "mb-6"], [1, "flex", "flex-wrap", "items-center", "justify-between", "gap-4"], [1, "flex", "flex-wrap", "items-center", "gap-3"], [1, "flex", "items-center", "gap-2", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "hover:from-cyan-600", "hover:to-blue-600", "text-white", "text-sm", "font-bold", "py-2", "px-4", "rounded-lg", "transition", "duration-200", "shadow-lg", "shadow-cyan-500/20", 3, "click"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", 1, "h-4", "w-4"], ["x1", "12", "y1", "5", "x2", "12", "y2", "19"], ["x1", "5", "y1", "12", "x2", "19", "y2", "12"], [1, "flex", "items-center", "gap-2", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "hover:from-amber-600", "hover:to-orange-600", "text-white", "text-sm", "font-bold", "py-2", "px-4", "rounded-lg", "transition", "duration-200", "shadow-lg", "shadow-amber-500/20", 3, "click"], ["x", "3", "y", "11", "width", "18", "height", "11", "rx", "2", "ry", "2"], ["d", "M7 11V7a5 5 0 0 1 10 0v4"], [1, "flex", "items-center", "gap-2", "bg-gradient-to-r", "from-emerald-500", "to-teal-500", "hover:from-emerald-600", "hover:to-teal-600", "text-white", "text-sm", "font-bold", "py-2", "px-4", "rounded-lg", "transition", "duration-200", "shadow-lg", "shadow-emerald-500/20", 3, "click"], [1, "flex", "items-center", "gap-2", "bg-slate-200", "dark:bg-slate-800/50", "hover:bg-slate-300", "dark:hover:bg-slate-700/50", "disabled:opacity-50", "disabled:cursor-not-allowed", "text-sm", "font-bold", "py-2", "px-4", "rounded-lg", "transition", "duration-200", 3, "click", "disabled"], ["title", "\u5237\u65B0\u5E33\u6236\u5217\u8868", 1, "flex", "items-center", "gap-2", "bg-slate-200", "dark:bg-slate-800/50", "hover:bg-slate-300", "dark:hover:bg-slate-700/50", "text-sm", "py-2", "px-3", "rounded-lg", "transition", "duration-200", 3, "click"], ["title", "\u5237\u65B0\u968A\u5217\u72C0\u614B", 1, "flex", "items-center", "gap-2", "bg-slate-200", "dark:bg-slate-800/50", "hover:bg-slate-300", "dark:hover:bg-slate-700/50", "text-sm", "py-2", "px-3", "rounded-lg", "transition", "duration-200", 3, "click"], [3, "addAccount", "accountLogin", "accountLogout", "accountRemove", "accountExport", "accountEdit", "accounts"], [1, "text-xs", "px-3", "py-1", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "text-white", "rounded-full", "hover:opacity-90", "transition-opacity", 3, "click"], [1, "animate-spin"]], template: function AccountsViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h2", 1);
        \u0275\u0275text(2);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "div", 2)(4, "span", 3);
        \u0275\u0275text(5, "\u8CEC\u6236\u914D\u984D:");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "span", 4);
        \u0275\u0275text(7);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(8, AccountsViewComponent_Conditional_8_Template, 2, 0, "button", 5);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(9, "div", 6)(10, "div", 7)(11, "div", 8)(12, "button", 9);
        \u0275\u0275listener("click", function AccountsViewComponent_Template_button_click_12_listener() {
          return ctx.navigateTo("add-account");
        });
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(13, "svg", 10);
        \u0275\u0275element(14, "line", 11)(15, "line", 12);
        \u0275\u0275elementEnd();
        \u0275\u0275text(16, " \u6DFB\u52A0\u5E33\u6236 ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(17, "button", 13);
        \u0275\u0275listener("click", function AccountsViewComponent_Template_button_click_17_listener() {
          return ctx.navigateTo("api-credentials");
        });
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(18, "svg", 10);
        \u0275\u0275element(19, "rect", 14)(20, "path", 15);
        \u0275\u0275elementEnd();
        \u0275\u0275text(21, " API \u6191\u64DA\u6C60 ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(22, "button", 16);
        \u0275\u0275listener("click", function AccountsViewComponent_Template_button_click_22_listener() {
          return ctx.openQrLogin();
        });
        \u0275\u0275elementStart(23, "span");
        \u0275\u0275text(24, "\u{1F4F1}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(25, " \u6383\u78BC\u767B\u5165 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "button", 17);
        \u0275\u0275listener("click", function AccountsViewComponent_Template_button_click_26_listener() {
          return ctx.importSession();
        });
        \u0275\u0275conditionalCreate(27, AccountsViewComponent_Conditional_27_Template, 3, 0)(28, AccountsViewComponent_Conditional_28_Template, 3, 0);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(29, "div", 2)(30, "button", 18);
        \u0275\u0275listener("click", function AccountsViewComponent_Template_button_click_30_listener() {
          return ctx.reloadAccounts();
        });
        \u0275\u0275elementStart(31, "span");
        \u0275\u0275text(32, "\u{1F504}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(33, "button", 19);
        \u0275\u0275listener("click", function AccountsViewComponent_Template_button_click_33_listener() {
          return ctx.refreshQueueStatus();
        });
        \u0275\u0275elementStart(34, "span");
        \u0275\u0275text(35, "\u{1F4CA}");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(36, "app-account-card-list", 20);
        \u0275\u0275listener("addAccount", function AccountsViewComponent_Template_app_account_card_list_addAccount_36_listener() {
          return ctx.navigateTo("add-account");
        })("accountLogin", function AccountsViewComponent_Template_app_account_card_list_accountLogin_36_listener($event) {
          return ctx.loginAccount($event.id);
        })("accountLogout", function AccountsViewComponent_Template_app_account_card_list_accountLogout_36_listener($event) {
          return ctx.logoutAccount($event.id);
        })("accountRemove", function AccountsViewComponent_Template_app_account_card_list_accountRemove_36_listener($event) {
          return ctx.removeAccount($event.id);
        })("accountExport", function AccountsViewComponent_Template_app_account_card_list_accountExport_36_listener($event) {
          return ctx.exportAccount($event.phone);
        })("accountEdit", function AccountsViewComponent_Template_app_account_card_list_accountEdit_36_listener($event) {
          return ctx.editAccount($event);
        });
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("accounts.manageAccounts"));
        \u0275\u0275advance(4);
        \u0275\u0275classMap(ctx.membershipService.quotas().maxAccounts === -1 ? "bg-emerald-500/20 text-emerald-400" : ctx.accounts().length >= ctx.membershipService.quotas().maxAccounts ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400");
        \u0275\u0275advance();
        \u0275\u0275textInterpolate2(" ", ctx.accounts().length, "/", ctx.membershipService.quotas().maxAccounts === -1 ? "\u221E" : ctx.membershipService.quotas().maxAccounts, " ");
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.membershipService.quotas().maxAccounts !== -1 && ctx.accounts().length >= ctx.membershipService.quotas().maxAccounts ? 8 : -1);
        \u0275\u0275advance(18);
        \u0275\u0275property("disabled", ctx.isImportingSession());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isImportingSession() ? 27 : 28);
        \u0275\u0275advance(9);
        \u0275\u0275property("accounts", ctx.accounts());
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      AccountCardListComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AccountsViewComponent, [{
    type: Component,
    args: [{
      selector: "app-accounts-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        AccountCardListComponent
      ],
      template: `
    <!-- \u5E33\u6236\u7BA1\u7406\u9801\u9762 - \u4F7F\u7528\u5361\u7247\u8996\u5716 -->
    <div class="flex items-center justify-between mb-6">
      <h2 id="accounts-section" class="text-4xl font-bold text-slate-900 dark:text-white">{{ t('accounts.manageAccounts') }}</h2>
      <!-- \u8CEC\u6236\u914D\u984D\u986F\u793A -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-500">\u8CEC\u6236\u914D\u984D:</span>
        <span class="text-lg font-bold px-3 py-1 rounded-lg"
              [class]="membershipService.quotas().maxAccounts === -1 ? 'bg-emerald-500/20 text-emerald-400' : 
                       (accounts().length >= membershipService.quotas().maxAccounts ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400')">
          {{ accounts().length }}/{{ membershipService.quotas().maxAccounts === -1 ? '\u221E' : membershipService.quotas().maxAccounts }}
        </span>
        @if (membershipService.quotas().maxAccounts !== -1 && accounts().length >= membershipService.quotas().maxAccounts) {
          <button (click)="showUpgrade()" class="text-xs px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:opacity-90 transition-opacity">
            \u5347\u7D1A\u89E3\u9396\u66F4\u591A
          </button>
        }
      </div>
    </div>
    
    <!-- \u5FEB\u901F\u64CD\u4F5C\u5DE5\u5177\u6B04 -->
    <div class="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-500/20 p-4 rounded-xl shadow-lg mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- \u6DFB\u52A0\u5E33\u6236 -->
          <button (click)="navigateTo('add-account')" class="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg shadow-cyan-500/20">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            \u6DFB\u52A0\u5E33\u6236
          </button>
          
          <!-- API \u6191\u64DA\u6C60 -->
          <button (click)="navigateTo('api-credentials')" class="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg shadow-amber-500/20">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            API \u6191\u64DA\u6C60
          </button>
          
          <button (click)="openQrLogin()" class="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg shadow-emerald-500/20">
            <span>\u{1F4F1}</span>
            \u6383\u78BC\u767B\u5165
          </button>
          
          <button (click)="importSession()" 
                  [disabled]="isImportingSession()"
                  class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold py-2 px-4 rounded-lg transition duration-200">
            @if (isImportingSession()) {
              <span class="animate-spin">\u23F3</span>
              \u5C0E\u5165\u4E2D...
            } @else {
              <span>\u{1F4E5}</span>
              \u5C0E\u5165 Session
            }
          </button>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="reloadAccounts()" class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 text-sm py-2 px-3 rounded-lg transition duration-200" title="\u5237\u65B0\u5E33\u6236\u5217\u8868">
            <span>\u{1F504}</span>
          </button>
          <button (click)="refreshQueueStatus()" class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 text-sm py-2 px-3 rounded-lg transition duration-200" title="\u5237\u65B0\u968A\u5217\u72C0\u614B">
            <span>\u{1F4CA}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- \u5E33\u6236\u5361\u7247\u5217\u8868\u7D44\u4EF6 -->
    <app-account-card-list
      [accounts]="accounts()"
      (addAccount)="navigateTo('add-account')"
      (accountLogin)="loginAccount($event.id)"
      (accountLogout)="logoutAccount($event.id)"
      (accountRemove)="removeAccount($event.id)"
      (accountExport)="exportAccount($event.phone)"
      (accountEdit)="editAccount($event)">
    </app-account-card-list>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AccountsViewComponent, { className: "AccountsViewComponent", filePath: "src/views/accounts-view.component.ts", lineNumber: 110 });
})();

export {
  AccountsViewComponent
};
//# sourceMappingURL=chunk-MVMHNEHY.js.map
