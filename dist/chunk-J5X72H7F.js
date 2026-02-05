import {
  DialogService,
  ExportService
} from "./chunk-CTKGMQYJ.js";
import {
  UnifiedContactsService
} from "./chunk-SRBGSWCK.js";
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
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-P26VRYR4.js";
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
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/views/leads-view.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function LeadsViewComponent_Conditional_77_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u5DF2\u5168\u9078 ");
  }
}
function LeadsViewComponent_Conditional_78_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u90E8\u5206\u9078\u4E2D ");
  }
}
function LeadsViewComponent_Conditional_79_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u5168\u9078 ");
  }
}
function LeadsViewComponent_Conditional_89_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u5DF2\u9078 ", ctx_r0.selectedCount(), " \u500B ");
  }
}
function LeadsViewComponent_Conditional_90_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 10);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u5171 ", ctx_r0.filteredContacts().length, " \u500B\u5BA2\u6236 ");
  }
}
function LeadsViewComponent_Conditional_92_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 30)(1, "button", 42);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_92_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.batchSend());
    });
    \u0275\u0275text(2, " \u{1F4E8} \u7FA4\u767C ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 43);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_92_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.batchInvite());
    });
    \u0275\u0275text(4, " \u{1F465} \u62C9\u7FA4 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 44);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_92_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.batchDelete());
    });
    \u0275\u0275text(6, " \u{1F5D1}\uFE0F \u522A\u9664 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r0.isDeleting());
  }
}
function LeadsViewComponent_Conditional_93_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 37)(1, "span", 45);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "div", 36);
    \u0275\u0275elementStart(4, "button", 46);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_93_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.batchSend());
    });
    \u0275\u0275elementStart(5, "span");
    \u0275\u0275text(6, "\u{1F4E8}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(7, " \u7FA4\u767C\u6D88\u606F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 47);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_93_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.batchInvite());
    });
    \u0275\u0275elementStart(9, "span");
    \u0275\u0275text(10, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(11, " \u6279\u91CF\u62C9\u7FA4 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 48);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_93_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.startMultiRoleCollaboration());
    });
    \u0275\u0275elementStart(13, "span");
    \u0275\u0275text(14, "\u{1F916}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(15, " AI \u591A\u89D2\u8272\u71DF\u92B7 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 49);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_93_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.batchDelete());
    });
    \u0275\u0275elementStart(17, "span");
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "button", 50);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_93_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.clearSelection());
    });
    \u0275\u0275text(21, " \u2716 \u53D6\u6D88\u9078\u64C7 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" \u{1F446} \u5DF2\u9078\u64C7 ", ctx_r0.selectedCount(), " \u500B\u5BA2\u6236 - \u8ACB\u9078\u64C7\u6279\u91CF\u64CD\u4F5C ");
    \u0275\u0275advance(14);
    \u0275\u0275property("disabled", ctx_r0.isDeleting());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.isDeleting() ? "\u23F3" : "\u{1F5D1}\uFE0F");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.isDeleting() ? "\u522A\u9664\u4E2D..." : "\u522A\u9664", " ");
  }
}
function LeadsViewComponent_Conditional_95_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 39)(1, "span", 51);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 52);
    \u0275\u0275text(4, "\u66AB\u7121\u5BA2\u6236\u6578\u64DA");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 53);
    \u0275\u0275text(6, "\u8ACB\u5148\u5230\u300C\u8CC7\u6E90\u4E2D\u5FC3\u300D\u6DFB\u52A0\u5BA2\u6236\uFF0C\u6216\u5F9E\u76E3\u63A7\u7FA4\u7D44\u81EA\u52D5\u6536\u96C6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 54);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_95_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToResourceCenter());
    });
    \u0275\u0275text(8, " \u524D\u5F80\u8CC7\u6E90\u4E2D\u5FC3 \u2192 ");
    \u0275\u0275elementEnd()();
  }
}
function LeadsViewComponent_Conditional_96_For_2_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 63);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const contact_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", contact_r6.username);
  }
}
function LeadsViewComponent_Conditional_96_For_2_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 68);
    \u0275\u0275text(1, " \u2B06\uFE0F \u8ACB\u4F7F\u7528\u4E0A\u65B9\u6279\u91CF\u64CD\u4F5C\u6B04 ");
    \u0275\u0275elementEnd();
  }
}
function LeadsViewComponent_Conditional_96_For_2_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 69);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_96_For_2_Conditional_17_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const contact_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      ctx_r0.sendMessage(contact_r6);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(1, " \u{1F4AC} \u767C\u9001 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 70);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_96_For_2_Conditional_17_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r7);
      const contact_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      ctx_r0.inviteToGroup(contact_r6);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(3, " \u{1F465} \u62C9\u7FA4 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 71);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_96_For_2_Conditional_17_Template_button_click_4_listener($event) {
      \u0275\u0275restoreView(_r7);
      const contact_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      ctx_r0.deleteContact(contact_r6);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(5, " \u{1F5D1}\uFE0F ");
    \u0275\u0275elementEnd();
  }
}
function LeadsViewComponent_Conditional_96_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 56);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_96_For_2_Template_div_click_0_listener() {
      const contact_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.toggleSelect(contact_r6.id));
    });
    \u0275\u0275elementStart(1, "div", 57)(2, "input", 58);
    \u0275\u0275listener("change", function LeadsViewComponent_Conditional_96_For_2_Template_input_change_2_listener() {
      const contact_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.toggleSelect(contact_r6.id));
    })("click", function LeadsViewComponent_Conditional_96_For_2_Template_input_click_2_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "div", 59)(4, "div", 60);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 61)(7, "p", 62);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(9, LeadsViewComponent_Conditional_96_For_2_Conditional_9_Template, 2, 1, "p", 63);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 64)(11, "span", 65);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span", 66);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 67);
    \u0275\u0275conditionalCreate(16, LeadsViewComponent_Conditional_96_For_2_Conditional_16_Template, 2, 0, "div", 68)(17, LeadsViewComponent_Conditional_96_For_2_Conditional_17_Template, 6, 0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const contact_r6 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("ring-2", ctx_r0.isSelected(contact_r6.id))("ring-cyan-500", ctx_r0.isSelected(contact_r6.id));
    \u0275\u0275advance(2);
    \u0275\u0275property("checked", ctx_r0.isSelected(contact_r6.id));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r0.getInitial(contact_r6), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(contact_r6.display_name || contact_r6.username || contact_r6.telegram_id);
    \u0275\u0275advance();
    \u0275\u0275conditional(contact_r6.username ? 9 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", contact_r6.source_name || contact_r6.source_type || "\u672A\u77E5\u4F86\u6E90", " ");
    \u0275\u0275advance();
    \u0275\u0275classMap(ctx_r0.getStatusClass(contact_r6.status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getStatusLabel(contact_r6.status), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.selectedIds().size > 1 ? 16 : 17);
  }
}
function LeadsViewComponent_Conditional_96_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40);
    \u0275\u0275repeaterCreate(1, LeadsViewComponent_Conditional_96_For_2_Template, 18, 13, "div", 55, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.filteredContacts());
  }
}
function LeadsViewComponent_Conditional_97_For_15_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 80);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const contact_r10 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", contact_r10.username);
  }
}
function LeadsViewComponent_Conditional_97_For_15_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 83);
    \u0275\u0275text(1, " \u2B06\uFE0F \u4F7F\u7528\u6279\u91CF\u64CD\u4F5C ");
    \u0275\u0275elementEnd();
  }
}
function LeadsViewComponent_Conditional_97_For_15_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 30)(1, "button", 84);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_97_For_15_Conditional_19_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r11);
      const contact_r10 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.sendMessage(contact_r10));
    });
    \u0275\u0275text(2, " \u{1F4AC} ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 85);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_97_For_15_Conditional_19_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r11);
      const contact_r10 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.inviteToGroup(contact_r10));
    });
    \u0275\u0275text(4, " \u{1F465} ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 86);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_97_For_15_Conditional_19_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r11);
      const contact_r10 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.viewContact(contact_r10));
    });
    \u0275\u0275text(6, " \u{1F441}\uFE0F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 87);
    \u0275\u0275listener("click", function LeadsViewComponent_Conditional_97_For_15_Conditional_19_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r11);
      const contact_r10 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.deleteContact(contact_r10));
    });
    \u0275\u0275text(8, " \u{1F5D1}\uFE0F ");
    \u0275\u0275elementEnd()();
  }
}
function LeadsViewComponent_Conditional_97_For_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr", 76)(1, "td", 77)(2, "input", 74);
    \u0275\u0275listener("change", function LeadsViewComponent_Conditional_97_For_15_Template_input_change_2_listener() {
      const contact_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.toggleSelect(contact_r10.id));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "td", 77)(4, "div", 2)(5, "div", 78);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div")(8, "p", 79);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, LeadsViewComponent_Conditional_97_For_15_Conditional_10_Template, 2, 1, "p", 80);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(11, "td", 81)(12, "span", 82);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "td", 77)(15, "span", 66);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "td", 77);
    \u0275\u0275conditionalCreate(18, LeadsViewComponent_Conditional_97_For_15_Conditional_18_Template, 2, 0, "div", 83)(19, LeadsViewComponent_Conditional_97_For_15_Conditional_19_Template, 9, 0, "div", 30);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const contact_r10 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275property("checked", ctx_r0.isSelected(contact_r10.id));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r0.getInitial(contact_r10), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(contact_r10.display_name || contact_r10.username || contact_r10.telegram_id);
    \u0275\u0275advance();
    \u0275\u0275conditional(contact_r10.username ? 10 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(contact_r10.source_name || contact_r10.source_type || "-");
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r0.getStatusClass(contact_r10.status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getStatusLabel(contact_r10.status), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.selectedIds().size > 1 ? 18 : 19);
  }
}
function LeadsViewComponent_Conditional_97_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "table", 41)(1, "thead")(2, "tr", 72)(3, "th", 73)(4, "input", 74);
    \u0275\u0275listener("change", function LeadsViewComponent_Conditional_97_Template_input_change_4_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.toggleSelectAll());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "th", 75);
    \u0275\u0275text(6, "\u5BA2\u6236");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "th", 75);
    \u0275\u0275text(8, "\u4F86\u6E90");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "th", 75);
    \u0275\u0275text(10, "\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "th", 75);
    \u0275\u0275text(12, "\u64CD\u4F5C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "tbody");
    \u0275\u0275repeaterCreate(14, LeadsViewComponent_Conditional_97_For_15_Template, 20, 9, "tr", 76, _forTrack0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275property("checked", ctx_r0.isAllSelected());
    \u0275\u0275advance(10);
    \u0275\u0275repeater(ctx_r0.filteredContacts());
  }
}
var LeadsViewComponent = class _LeadsViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.dialog = inject(DialogService);
    this.exportService = inject(ExportService);
    this.membershipService = inject(MembershipService);
    this.contactsService = inject(UnifiedContactsService);
    this.searchTerm = signal("", ...ngDevMode ? [{ debugName: "searchTerm" }] : []);
    this.statusFilter = signal("", ...ngDevMode ? [{ debugName: "statusFilter" }] : []);
    this.selectedIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "selectedIds" }] : []);
    this.viewMode = signal("card", ...ngDevMode ? [{ debugName: "viewMode" }] : []);
    this.isDeleting = signal(false, ...ngDevMode ? [{ debugName: "isDeleting" }] : []);
    this.isSending = signal(false, ...ngDevMode ? [{ debugName: "isSending" }] : []);
    this.isInviting = signal(false, ...ngDevMode ? [{ debugName: "isInviting" }] : []);
    this.sendProgress = signal({ sent: 0, total: 0, success: 0, failed: 0 }, ...ngDevMode ? [{ debugName: "sendProgress" }] : []);
    this.inviteProgress = signal({ invited: 0, total: 0, success: 0, failed: 0, skipped: 0 }, ...ngDevMode ? [{ debugName: "inviteProgress" }] : []);
    this.contacts = computed(() => this.contactsService.contacts(), ...ngDevMode ? [{ debugName: "contacts" }] : []);
    this.filteredContacts = computed(() => {
      let result = this.contacts();
      const search = this.searchTerm().toLowerCase();
      const status = this.statusFilter();
      result = result.filter((c) => c.contact_type === "user");
      if (search) {
        result = result.filter((c) => c.display_name?.toLowerCase().includes(search) || c.username?.toLowerCase().includes(search) || c.telegram_id?.toString().includes(search) || c.source_name?.toLowerCase().includes(search));
      }
      if (status) {
        result = result.filter((c) => c.status === status);
      }
      return result;
    }, ...ngDevMode ? [{ debugName: "filteredContacts" }] : []);
    this.pendingCount = computed(() => this.contacts().filter((c) => c.contact_type === "user" && c.status === "new").length, ...ngDevMode ? [{ debugName: "pendingCount" }] : []);
    this.sentCount = computed(() => this.contacts().filter((c) => c.contact_type === "user" && c.status === "contacted").length, ...ngDevMode ? [{ debugName: "sentCount" }] : []);
    this.repliedCount = computed(() => this.contacts().filter((c) => c.contact_type === "user" && c.status === "replied").length, ...ngDevMode ? [{ debugName: "repliedCount" }] : []);
    this.failedCount = computed(() => this.contacts().filter((c) => c.contact_type === "user" && c.status === "failed").length, ...ngDevMode ? [{ debugName: "failedCount" }] : []);
    this.selectedCount = computed(() => this.selectedIds().size, ...ngDevMode ? [{ debugName: "selectedCount" }] : []);
    this.ipcCleanup = [];
  }
  ngOnInit() {
    this.contactsService.loadContacts();
    this.setupIpcListeners();
  }
  ngOnDestroy() {
    this.ipcCleanup.forEach((fn) => fn());
  }
  setupIpcListeners() {
    const cleanup1 = this.ipc.on("message-sent", (data) => {
      if (data.success) {
        this.toast.success("\u6D88\u606F\u767C\u9001\u6210\u529F");
        if (data.telegramId) {
          this.contactsService.updateContactStatus(data.telegramId, "contacted");
        }
      } else {
        if (data.telegramId) {
          this.contactsService.updateContactStatus(data.telegramId, "failed");
        }
      }
    });
    const cleanup2 = this.ipc.on("private-message-received", (data) => {
      if (data.telegramId) {
        this.contactsService.updateContactStatus(data.telegramId, "replied");
        this.toast.info("\u6536\u5230\u5BA2\u6236\u56DE\u8986");
      }
    });
    const cleanup3 = this.ipc.on("batch-send:progress", (data) => {
      this.sendProgress.set(data);
      console.log(`\u767C\u9001\u9032\u5EA6: ${data.sent}/${data.total}, \u6210\u529F: ${data.success}, \u5931\u6557: ${data.failed}`);
    });
    const cleanup4 = this.ipc.on("batch-send:complete", (data) => {
      this.isSending.set(false);
      this.sendProgress.set({ sent: 0, total: 0, success: 0, failed: 0 });
      if (data.failed > 0) {
        this.toast.warning(`\u6279\u91CF\u767C\u9001\u5B8C\u6210: \u6210\u529F ${data.success}\uFF0C\u5931\u6557 ${data.failed}${data.failureSummary ? ` (${data.failureSummary})` : ""}`);
      } else {
        this.toast.success(`\u6279\u91CF\u767C\u9001\u5B8C\u6210: \u6210\u529F ${data.success} \u689D`);
      }
      this.contactsService.loadContacts();
    });
    const cleanup5 = this.ipc.on("batch-invite:progress", (data) => {
      this.inviteProgress.set(data);
      console.log(`\u62C9\u7FA4\u9032\u5EA6: ${data.invited}/${data.total}`);
    });
    const cleanup6 = this.ipc.on("batch-invite:complete", (data) => {
      this.isInviting.set(false);
      this.inviteProgress.set({ invited: 0, total: 0, success: 0, failed: 0, skipped: 0 });
      this.toast.success(`\u6279\u91CF\u62C9\u7FA4\u5B8C\u6210: \u6210\u529F ${data.success}\uFF0C\u8DF3\u904E ${data.skipped}\uFF0C\u5931\u6557 ${data.failed}`);
      this.contactsService.loadContacts();
    });
    this.ipcCleanup.push(cleanup1, cleanup2, cleanup3, cleanup4, cleanup5, cleanup6);
  }
  // 刷新數據
  refresh() {
    this.contactsService.loadContacts();
    this.toast.info("\u6B63\u5728\u5237\u65B0...");
  }
  // 前往資源中心
  goToResourceCenter() {
    this.nav.navigateTo("resource-center");
  }
  // 選擇相關方法
  isSelected(id) {
    return this.selectedIds().has(id);
  }
  toggleSelect(id) {
    this.selectedIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }
  isAllSelected() {
    const filtered = this.filteredContacts();
    return filtered.length > 0 && filtered.every((c) => this.selectedIds().has(c.id));
  }
  // 🆕 部分選中狀態（三態複選框）
  isPartialSelected() {
    const filtered = this.filteredContacts();
    const selectedCount = this.selectedIds().size;
    return selectedCount > 0 && selectedCount < filtered.length && !this.isAllSelected();
  }
  toggleSelectAll() {
    const filtered = this.filteredContacts();
    if (this.isAllSelected()) {
      this.selectedIds.set(/* @__PURE__ */ new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map((c) => c.id)));
    }
  }
  // 🆕 全選（明確方法）
  selectAll() {
    const filtered = this.filteredContacts();
    this.selectedIds.set(new Set(filtered.map((c) => c.id)));
    this.toast.info(`\u5DF2\u5168\u9078 ${filtered.length} \u500B\u5BA2\u6236`);
  }
  // 🆕 反選
  invertSelection() {
    const filtered = this.filteredContacts();
    const currentSelected = this.selectedIds();
    const newSelected = /* @__PURE__ */ new Set();
    filtered.forEach((c) => {
      if (!currentSelected.has(c.id)) {
        newSelected.add(c.id);
      }
    });
    this.selectedIds.set(newSelected);
    this.toast.info(`\u5DF2\u9078\u64C7 ${newSelected.size} \u500B\u5BA2\u6236`);
  }
  // 批量發送 - 🔧 P0: 轉換數據格式
  batchSend() {
    const selectedContacts = this.contacts().filter((c) => this.selectedIds().has(c.id));
    if (selectedContacts.length === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u5BA2\u6236");
      return;
    }
    const targets = this.convertToSendTargets(selectedContacts);
    if (targets.length === 0) {
      this.toast.error("\u9078\u4E2D\u7684\u5BA2\u6236\u6C92\u6709\u6709\u6548\u7684 Telegram ID");
      return;
    }
    this.dialog.openBatchSend(targets);
  }
  // 單個發送消息 - 🔧 P0: 轉換數據格式
  sendMessage(contact) {
    const targets = this.convertToSendTargets([contact]);
    if (targets.length === 0) {
      this.toast.error("\u6B64\u5BA2\u6236\u6C92\u6709\u6709\u6548\u7684 Telegram ID");
      return;
    }
    this.dialog.openBatchSend(targets);
  }
  // 🔧 P0: 將 UnifiedContact 轉換為 BatchSendTarget 格式
  convertToSendTargets(contacts) {
    return contacts.filter((c) => c.telegram_id).map((c) => ({
      telegramId: c.telegram_id,
      username: c.username || "",
      firstName: c.first_name || c.display_name?.split(" ")[0] || "",
      lastName: c.last_name || c.display_name?.split(" ")[1] || "",
      displayName: c.display_name || c.username || c.telegram_id,
      // 來源信息（用於變量替換）
      groupName: c.source_name || "",
      source: c.source_type || ""
    }));
  }
  // 🔧 批量拉群
  batchInvite() {
    const selectedContacts = this.contacts().filter((c) => this.selectedIds().has(c.id));
    if (selectedContacts.length === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u5BA2\u6236");
      return;
    }
    const targets = selectedContacts.map((c) => ({
      telegramId: c.telegram_id || String(c.id),
      username: c.username || "",
      firstName: c.first_name || c.display_name?.split(" ")[0] || "",
      lastName: c.last_name || c.display_name?.split(" ")[1] || ""
    }));
    this.dialog.openBatchInvite(targets);
  }
  // 🔧 單個拉群
  inviteToGroup(contact) {
    const target = {
      telegramId: contact.telegram_id || String(contact.id),
      username: contact.username || "",
      firstName: contact.first_name || contact.display_name?.split(" ")[0] || "",
      lastName: contact.last_name || contact.display_name?.split(" ")[1] || ""
    };
    this.dialog.openBatchInvite([target]);
  }
  // 🔧 P0: 批量刪除 - 使用 contactsService 確保本地狀態同步
  batchDelete() {
    const count = this.selectedIds().size;
    if (count === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u5BA2\u6236");
      return;
    }
    if (this.isDeleting()) {
      this.toast.warning("\u6B63\u5728\u522A\u9664\u4E2D\uFF0C\u8ACB\u7A0D\u5019...");
      return;
    }
    if (!confirm(`\u78BA\u5B9A\u8981\u522A\u9664\u9078\u4E2D\u7684 ${count} \u500B\u5BA2\u6236\u55CE\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u5FA9\u3002`)) {
      return;
    }
    const selectedContacts = this.contacts().filter((c) => this.selectedIds().has(c.id));
    const telegramIds = selectedContacts.map((c) => c.telegram_id).filter(Boolean);
    if (telegramIds.length === 0) {
      this.toast.error("\u9078\u4E2D\u7684\u5BA2\u6236\u6C92\u6709\u6709\u6548\u7684 Telegram ID");
      return;
    }
    this.isDeleting.set(true);
    this.contactsService.deleteContacts(telegramIds);
    this.toast.info(`\u6B63\u5728\u522A\u9664 ${telegramIds.length} \u500B\u5BA2\u6236...`);
    const cleanup = this.ipc.once("unified-contacts:delete-result", (result) => {
      this.isDeleting.set(false);
      if (result.success) {
        this.toast.success(`\u5DF2\u522A\u9664 ${result.deleted || result.leadsDeleted || telegramIds.length} \u500B\u5BA2\u6236`);
        this.clearSelection();
      } else {
        this.toast.error(`\u522A\u9664\u5931\u6557: ${result.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    setTimeout(() => {
      if (this.isDeleting()) {
        this.isDeleting.set(false);
        this.toast.warning("\u522A\u9664\u64CD\u4F5C\u8D85\u6642\uFF0C\u8ACB\u5237\u65B0\u9801\u9762\u67E5\u770B\u7D50\u679C");
      }
    }, 3e4);
  }
  // 🔧 P0: 單個刪除 - 使用 contactsService 確保本地狀態同步
  deleteContact(contact) {
    if (!confirm(`\u78BA\u5B9A\u8981\u522A\u9664\u5BA2\u6236\u300C${contact.display_name || contact.username || contact.telegram_id}\u300D\u55CE\uFF1F`)) {
      return;
    }
    if (!contact.telegram_id) {
      this.toast.error("\u6B64\u5BA2\u6236\u6C92\u6709\u6709\u6548\u7684 Telegram ID");
      return;
    }
    this.isDeleting.set(true);
    this.contactsService.deleteContacts([contact.telegram_id]);
    this.toast.info("\u6B63\u5728\u522A\u9664\u5BA2\u6236...");
    const cleanup = this.ipc.once("unified-contacts:delete-result", (result) => {
      this.isDeleting.set(false);
      if (result.success) {
        this.toast.success("\u5BA2\u6236\u5DF2\u522A\u9664");
      } else {
        this.toast.error(`\u522A\u9664\u5931\u6557: ${result.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
  }
  // 🔧 清除選擇
  clearSelection() {
    this.selectedIds.set(/* @__PURE__ */ new Set());
  }
  // 查看聯繫人詳情
  viewContact(contact) {
    console.log("View contact:", contact);
  }
  // 獲取首字母
  getInitial(contact) {
    const name = contact.display_name || contact.username || contact.telegram_id || "?";
    return name.charAt(0).toUpperCase();
  }
  // 獲取狀態樣式類
  getStatusClass(status) {
    const classes = {
      "new": "bg-blue-500/20 text-blue-400",
      "contacted": "bg-emerald-500/20 text-emerald-400",
      "replied": "bg-green-500/20 text-green-400",
      "failed": "bg-red-500/20 text-red-400",
      "blacklisted": "bg-slate-500/20 text-slate-400"
    };
    return classes[status] || "bg-slate-500/20 text-slate-400";
  }
  // 獲取狀態標籤
  getStatusLabel(status) {
    const labels = {
      "new": "\u5F85\u767C\u9001",
      "contacted": "\u5DF2\u767C\u9001",
      "replied": "\u5DF2\u56DE\u8986",
      "failed": "\u767C\u9001\u5931\u6557",
      "blacklisted": "\u5DF2\u62C9\u9ED1"
    };
    return labels[status] || status || "\u672A\u77E5";
  }
  /**
   * 🆕 啟動 AI 多角色協作營銷
   */
  startMultiRoleCollaboration() {
    const selectedContacts = this.contacts().filter((c) => this.selectedIds().has(c.id));
    if (selectedContacts.length === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u5BA2\u6236");
      return;
    }
    const targetUsers = selectedContacts.map((c) => ({
      id: c.id?.toString() || c.telegram_id,
      telegramId: c.telegram_id || c.id?.toString() || "",
      username: c.username,
      firstName: c.first_name || c.display_name?.split(" ")[0],
      lastName: c.last_name || c.display_name?.split(" ")[1],
      intentScore: this.calculateContactIntent(c),
      source: c.source_type || "leads"
    }));
    sessionStorage.setItem("multiRoleTargetUsers", JSON.stringify(targetUsers));
    this.toast.success(`\u{1F916} \u5DF2\u9078\u64C7 ${targetUsers.length} \u500B\u76EE\u6A19\uFF0C\u6B63\u5728\u8DF3\u8F49\u5230\u591A\u89D2\u8272\u5354\u4F5C\u4E2D\u5FC3...`);
    this.ipc.send("navigate-to-multi-role", { targetUsers });
    setTimeout(() => {
      this.ipc.send("multi-role:open-ai-planner", { targetUsers });
    }, 500);
  }
  /**
   * 計算聯繫人意向分數
   */
  calculateContactIntent(contact) {
    let score = 30;
    if (contact.status === "replied")
      score += 30;
    else if (contact.status === "contacted")
      score += 15;
    else if (contact.status === "new")
      score += 10;
    if (contact.source_type === "lead")
      score += 20;
    else if (contact.source_type === "member")
      score += 10;
    if (contact.tags?.includes("\u9AD8\u610F\u5411"))
      score += 25;
    else if (contact.tags?.includes("\u6709\u8208\u8DA3"))
      score += 15;
    if (contact.last_message_at)
      score += 10;
    return Math.min(100, score);
  }
  static {
    this.\u0275fac = function LeadsViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LeadsViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LeadsViewComponent, selectors: [["app-leads-view"]], decls: 98, vars: 37, consts: [[1, "page-content"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "flex", "items-center", "gap-3"], [1, "text-3xl"], [1, "text-2xl", "font-bold", 2, "color", "var(--text-primary)"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "rounded-lg", "transition-colors", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-primary)", 3, "click"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "rounded-lg", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "text-white", "disabled:opacity-50", 3, "click", "disabled"], [1, "grid", "grid-cols-2", "md:grid-cols-5", "gap-4", "mb-6"], [1, "rounded-xl", "p-4", "text-center", 2, "background-color", "var(--bg-card)", "border", "1px solid var(--border-color)"], [1, "text-2xl", "mb-1"], [1, "text-sm", 2, "color", "var(--text-muted)"], [1, "text-xl", "font-bold", "text-cyan-400"], [1, "text-xl", "font-bold", "text-blue-400"], [1, "text-xl", "font-bold", "text-emerald-400"], [1, "text-xl", "font-bold", "text-green-400"], [1, "text-xl", "font-bold", "text-red-400"], [1, "flex", "items-center", "gap-4", "mb-6"], [1, "flex-1", "relative"], ["type", "text", "placeholder", "\u641C\u7D22\u5BA2\u6236\u540D\u7A31\u3001\u7528\u6236\u540D\u6216\u4F86\u6E90...", 1, "w-full", "py-3", "px-4", "pl-10", "rounded-xl", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-primary)", "border", "1px solid var(--border-color)", 3, "ngModelChange", "ngModel"], [1, "absolute", "left-3", "top-1/2", "-translate-y-1/2", "text-slate-400"], [1, "py-3", "px-4", "rounded-xl", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-primary)", "border", "1px solid var(--border-color)", 3, "ngModelChange", "ngModel"], ["value", ""], ["value", "new"], ["value", "contacted"], ["value", "replied"], ["value", "failed"], [1, "flex", "rounded-lg", "overflow-hidden", 2, "border", "1px solid var(--border-color)"], [1, "p-2", "px-3", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-4", "mb-4", "p-3", "rounded-xl", 2, "background-color", "var(--bg-card)", "border", "1px solid var(--border-color)"], ["type", "checkbox", 1, "w-5", "h-5", "rounded", "accent-cyan-500", "cursor-pointer", 3, "change", "checked", "indeterminate"], [1, "flex", "items-center", "gap-2"], [1, "px-3", "py-1.5", "rounded-lg", "text-xs", "transition-colors", 3, "click"], [1, "px-3", "py-1.5", "rounded-lg", "text-xs", "transition-colors", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-muted)", 3, "click"], [1, "px-3", "py-1.5", "rounded-lg", "text-xs", "transition-colors", "disabled:opacity-50", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-muted)", 3, "click", "disabled"], [1, "w-px", "h-6", "bg-slate-700"], [1, "px-3", "py-1", "rounded-full", "text-sm", "font-medium", "bg-cyan-500/20", "text-cyan-400"], [1, "flex-1"], [1, "sticky", "top-0", "z-50", "flex", "items-center", "gap-4", "mb-4", "p-4", "rounded-xl", "border", "transition-all", "duration-300", "shadow-lg", "backdrop-blur-sm", "bg-gradient-to-r", "from-amber-500/30", "to-orange-500/30", "border-amber-500/50", 2, "background-color", "rgba(15, 23, 42, 0.95)"], [1, "rounded-xl", "overflow-hidden", 2, "background-color", "var(--bg-card)", "border", "1px solid var(--border-color)"], [1, "p-12", "text-center", 2, "color", "var(--text-muted)"], [1, "p-4", "grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4", "gap-4"], [1, "w-full"], [1, "flex", "items-center", "gap-1.5", "px-3", "py-1.5", "rounded-lg", "text-xs", "bg-cyan-500", "hover:bg-cyan-600", "text-white", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-1.5", "px-3", "py-1.5", "rounded-lg", "text-xs", "bg-purple-500", "hover:bg-purple-600", "text-white", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-1.5", "px-3", "py-1.5", "rounded-lg", "text-xs", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "transition-colors", "disabled:opacity-50", 3, "click", "disabled"], [1, "text-amber-400", "font-bold", "text-lg"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "rounded-lg", "bg-cyan-500", "hover:bg-cyan-600", "text-white", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "rounded-lg", "bg-purple-500", "hover:bg-purple-600", "text-white", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "rounded-lg", "bg-gradient-to-r", "from-pink-500", "to-purple-500", "hover:opacity-90", "text-white", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "rounded-lg", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "transition-colors", "disabled:opacity-50", 3, "click", "disabled"], [1, "flex", "items-center", "gap-2", "px-3", "py-2", "rounded-lg", "hover:bg-slate-700/50", "transition-colors", "text-slate-400", 3, "click"], [1, "text-5xl", "mb-4", "block"], [1, "text-lg", "mb-2"], [1, "text-sm", "mb-4"], [1, "px-4", "py-2", "bg-cyan-500", "hover:bg-cyan-600", "text-white", "rounded-lg", "transition-colors", 3, "click"], [1, "rounded-xl", "p-4", "transition-all", "hover:scale-[1.02]", "cursor-pointer", "relative", "group", 2, "background-color", "var(--bg-tertiary)", "border", "1px solid var(--border-color)", 3, "ring-2", "ring-cyan-500"], [1, "rounded-xl", "p-4", "transition-all", "hover:scale-[1.02]", "cursor-pointer", "relative", "group", 2, "background-color", "var(--bg-tertiary)", "border", "1px solid var(--border-color)", 3, "click"], [1, "absolute", "top-3", "right-3"], ["type", "checkbox", 1, "rounded", "w-5", "h-5", "accent-cyan-500", "cursor-pointer", 3, "change", "click", "checked"], [1, "flex", "items-center", "gap-3", "mb-3"], [1, "w-12", "h-12", "rounded-full", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "flex", "items-center", "justify-center", "text-white", "font-bold", "text-lg", "shadow-lg"], [1, "flex-1", "min-w-0"], [1, "font-medium", "truncate", 2, "color", "var(--text-primary)"], [1, "text-xs", "truncate", 2, "color", "var(--text-muted)"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-xs", "px-2", "py-1", "rounded", "bg-slate-700/50", 2, "color", "var(--text-muted)"], [1, "px-2", "py-1", "rounded-full", "text-xs", "font-medium"], [1, "flex", "items-center", "gap-2", "pt-2", "border-t", 2, "border-color", "var(--border-color)"], [1, "flex-1", "text-center", "py-2", "text-xs", "text-amber-400"], [1, "flex-1", "flex", "items-center", "justify-center", "gap-1", "py-2", "rounded-lg", "text-xs", "font-medium", "transition-colors", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", 3, "click"], [1, "flex-1", "flex", "items-center", "justify-center", "gap-1", "py-2", "rounded-lg", "text-xs", "font-medium", "transition-colors", "bg-purple-500/20", "hover:bg-purple-500/30", "text-purple-400", 3, "click"], ["title", "\u522A\u9664", 1, "p-2", "rounded-lg", "text-xs", "transition-colors", "hover:bg-red-500/20", "text-red-400", 3, "click"], [2, "background-color", "var(--bg-tertiary)"], [1, "py-3", "px-4", "text-left", "text-sm", "font-medium", "w-10", 2, "color", "var(--text-muted)"], ["type", "checkbox", 1, "rounded", 3, "change", "checked"], [1, "py-3", "px-4", "text-left", "text-sm", "font-medium", 2, "color", "var(--text-muted)"], [1, "border-t", "transition-colors", "hover:bg-slate-800/30", 2, "border-color", "var(--border-color)"], [1, "py-3", "px-4"], [1, "w-10", "h-10", "rounded-full", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "flex", "items-center", "justify-center", "text-white", "font-bold"], [1, "font-medium", 2, "color", "var(--text-primary)"], [1, "text-xs", 2, "color", "var(--text-muted)"], [1, "py-3", "px-4", 2, "color", "var(--text-muted)"], [1, "text-xs", "px-2", "py-1", "rounded", "bg-slate-700/50"], [1, "text-xs", "text-amber-400"], ["title", "\u767C\u9001\u6D88\u606F", 1, "p-2", "rounded-lg", "hover:bg-cyan-500/20", "transition-colors", "text-cyan-400", 3, "click"], ["title", "\u62C9\u7FA4", 1, "p-2", "rounded-lg", "hover:bg-purple-500/20", "transition-colors", "text-purple-400", 3, "click"], ["title", "\u67E5\u770B\u8A73\u60C5", 1, "p-2", "rounded-lg", "hover:bg-slate-700/50", "transition-colors", "text-slate-400", 3, "click"], ["title", "\u522A\u9664", 1, "p-2", "rounded-lg", "hover:bg-red-500/20", "transition-colors", "text-red-400", 3, "click"]], template: function LeadsViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "span", 3);
        \u0275\u0275text(4, "\u{1F4E4}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "h2", 4);
        \u0275\u0275text(6, "\u767C\u9001\u63A7\u5236\u53F0");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(7, "div", 2)(8, "button", 5);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_8_listener() {
          return ctx.refresh();
        });
        \u0275\u0275elementStart(9, "span");
        \u0275\u0275text(10, "\u{1F504}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(11, " \u5237\u65B0 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "button", 6);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_12_listener() {
          return ctx.batchSend();
        });
        \u0275\u0275elementStart(13, "span");
        \u0275\u0275text(14, "\u{1F4E8}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(15, " \u6279\u91CF\u767C\u9001 ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(16, "div", 7)(17, "div", 8)(18, "div", 9);
        \u0275\u0275text(19, "\u{1F465}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "div", 10);
        \u0275\u0275text(21, "\u7E3D\u5BA2\u6236");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "div", 11);
        \u0275\u0275text(23);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(24, "div", 8)(25, "div", 9);
        \u0275\u0275text(26, "\u23F3");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "div", 10);
        \u0275\u0275text(28, "\u5F85\u767C\u9001");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "div", 12);
        \u0275\u0275text(30);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(31, "div", 8)(32, "div", 9);
        \u0275\u0275text(33, "\u2705");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "div", 10);
        \u0275\u0275text(35, "\u5DF2\u767C\u9001");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(36, "div", 13);
        \u0275\u0275text(37);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(38, "div", 8)(39, "div", 9);
        \u0275\u0275text(40, "\u{1F4AC}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(41, "div", 10);
        \u0275\u0275text(42, "\u5DF2\u56DE\u8986");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(43, "div", 14);
        \u0275\u0275text(44);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(45, "div", 8)(46, "div", 9);
        \u0275\u0275text(47, "\u274C");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "div", 10);
        \u0275\u0275text(49, "\u767C\u9001\u5931\u6557");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(50, "div", 15);
        \u0275\u0275text(51);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(52, "div", 16)(53, "div", 17)(54, "input", 18);
        \u0275\u0275listener("ngModelChange", function LeadsViewComponent_Template_input_ngModelChange_54_listener($event) {
          return ctx.searchTerm.set($event);
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(55, "span", 19);
        \u0275\u0275text(56, "\u{1F50D}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(57, "select", 20);
        \u0275\u0275listener("ngModelChange", function LeadsViewComponent_Template_select_ngModelChange_57_listener($event) {
          return ctx.statusFilter.set($event);
        });
        \u0275\u0275elementStart(58, "option", 21);
        \u0275\u0275text(59, "\u5168\u90E8\u72C0\u614B");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(60, "option", 22);
        \u0275\u0275text(61, "\u5F85\u767C\u9001");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(62, "option", 23);
        \u0275\u0275text(63, "\u5DF2\u767C\u9001");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(64, "option", 24);
        \u0275\u0275text(65, "\u5DF2\u56DE\u8986");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(66, "option", 25);
        \u0275\u0275text(67, "\u767C\u9001\u5931\u6557");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(68, "div", 26)(69, "button", 27);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_69_listener() {
          return ctx.viewMode.set("list");
        });
        \u0275\u0275text(70, " \u{1F4CB} ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(71, "button", 27);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_71_listener() {
          return ctx.viewMode.set("card");
        });
        \u0275\u0275text(72, " \u{1F0CF} ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(73, "div", 28)(74, "div", 2)(75, "input", 29);
        \u0275\u0275listener("change", function LeadsViewComponent_Template_input_change_75_listener() {
          return ctx.toggleSelectAll();
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(76, "span", 10);
        \u0275\u0275conditionalCreate(77, LeadsViewComponent_Conditional_77_Template, 1, 0)(78, LeadsViewComponent_Conditional_78_Template, 1, 0)(79, LeadsViewComponent_Conditional_79_Template, 1, 0);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(80, "div", 30)(81, "button", 31);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_81_listener() {
          return ctx.selectAll();
        });
        \u0275\u0275text(82);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(83, "button", 32);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_83_listener() {
          return ctx.invertSelection();
        });
        \u0275\u0275text(84, " \u{1F504} \u53CD\u9078 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(85, "button", 33);
        \u0275\u0275listener("click", function LeadsViewComponent_Template_button_click_85_listener() {
          return ctx.clearSelection();
        });
        \u0275\u0275text(86, " \u2716 \u6E05\u9664 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275element(87, "div", 34);
        \u0275\u0275elementStart(88, "div", 30);
        \u0275\u0275conditionalCreate(89, LeadsViewComponent_Conditional_89_Template, 2, 1, "span", 35)(90, LeadsViewComponent_Conditional_90_Template, 2, 1, "span", 10);
        \u0275\u0275elementEnd();
        \u0275\u0275element(91, "div", 36);
        \u0275\u0275conditionalCreate(92, LeadsViewComponent_Conditional_92_Template, 7, 1, "div", 30);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(93, LeadsViewComponent_Conditional_93_Template, 22, 4, "div", 37);
        \u0275\u0275elementStart(94, "div", 38);
        \u0275\u0275conditionalCreate(95, LeadsViewComponent_Conditional_95_Template, 9, 0, "div", 39)(96, LeadsViewComponent_Conditional_96_Template, 3, 0, "div", 40)(97, LeadsViewComponent_Conditional_97_Template, 16, 1, "table", 41);
        \u0275\u0275elementEnd()();
      }
      if (rf & 2) {
        \u0275\u0275advance(12);
        \u0275\u0275property("disabled", ctx.selectedCount() === 0);
        \u0275\u0275advance(11);
        \u0275\u0275textInterpolate(ctx.contacts().length);
        \u0275\u0275advance(7);
        \u0275\u0275textInterpolate(ctx.pendingCount());
        \u0275\u0275advance(7);
        \u0275\u0275textInterpolate(ctx.sentCount());
        \u0275\u0275advance(7);
        \u0275\u0275textInterpolate(ctx.repliedCount());
        \u0275\u0275advance(7);
        \u0275\u0275textInterpolate(ctx.failedCount());
        \u0275\u0275advance(3);
        \u0275\u0275property("ngModel", ctx.searchTerm());
        \u0275\u0275advance(3);
        \u0275\u0275property("ngModel", ctx.statusFilter());
        \u0275\u0275advance(12);
        \u0275\u0275styleProp("background-color", ctx.viewMode() !== "list" ? "var(--bg-tertiary)" : "");
        \u0275\u0275classProp("bg-cyan-500", ctx.viewMode() === "list")("text-white", ctx.viewMode() === "list");
        \u0275\u0275advance(2);
        \u0275\u0275styleProp("background-color", ctx.viewMode() !== "card" ? "var(--bg-tertiary)" : "");
        \u0275\u0275classProp("bg-cyan-500", ctx.viewMode() === "card")("text-white", ctx.viewMode() === "card");
        \u0275\u0275advance(4);
        \u0275\u0275property("checked", ctx.isAllSelected())("indeterminate", ctx.isPartialSelected());
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.isAllSelected() ? 77 : ctx.isPartialSelected() ? 78 : 79);
        \u0275\u0275advance(4);
        \u0275\u0275styleProp("background-color", !ctx.isAllSelected() ? "var(--bg-tertiary)" : "")("color", !ctx.isAllSelected() ? "var(--text-muted)" : "");
        \u0275\u0275classProp("bg-cyan-500", ctx.isAllSelected())("text-white", ctx.isAllSelected());
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" \u2611\uFE0F \u5168\u9078 (", ctx.filteredContacts().length, ") ");
        \u0275\u0275advance(3);
        \u0275\u0275property("disabled", ctx.selectedCount() === 0);
        \u0275\u0275advance(4);
        \u0275\u0275conditional(ctx.selectedCount() > 0 ? 89 : 90);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.selectedCount() > 0 ? 92 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.selectedCount() > 1 ? 93 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.filteredContacts().length === 0 ? 95 : ctx.viewMode() === "card" ? 96 : 97);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LeadsViewComponent, [{
    type: Component,
    args: [{
      selector: "app-leads-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [CommonModule, FormsModule],
      template: `
    <div class="page-content">
      <!-- \u{1F527} \u9801\u9762\u6A19\u984C + \u64CD\u4F5C\u6309\u9215 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">\u{1F4E4}</span>
          <h2 class="text-2xl font-bold" style="color: var(--text-primary);">\u767C\u9001\u63A7\u5236\u53F0</h2>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="refresh()" 
                  class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style="background-color: var(--bg-tertiary); color: var(--text-primary);">
            <span>\u{1F504}</span>
            \u5237\u65B0
          </button>
          <button (click)="batchSend()" 
                  [disabled]="selectedCount() === 0"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-50">
            <span>\u{1F4E8}</span>
            \u6279\u91CF\u767C\u9001
          </button>
        </div>
      </div>
      
      <!-- \u{1F527} \u7D71\u8A08\u5361\u7247 -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">\u{1F465}</div>
          <div class="text-sm" style="color: var(--text-muted);">\u7E3D\u5BA2\u6236</div>
          <div class="text-xl font-bold text-cyan-400">{{ contacts().length }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">\u23F3</div>
          <div class="text-sm" style="color: var(--text-muted);">\u5F85\u767C\u9001</div>
          <div class="text-xl font-bold text-blue-400">{{ pendingCount() }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">\u2705</div>
          <div class="text-sm" style="color: var(--text-muted);">\u5DF2\u767C\u9001</div>
          <div class="text-xl font-bold text-emerald-400">{{ sentCount() }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">\u{1F4AC}</div>
          <div class="text-sm" style="color: var(--text-muted);">\u5DF2\u56DE\u8986</div>
          <div class="text-xl font-bold text-green-400">{{ repliedCount() }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">\u274C</div>
          <div class="text-sm" style="color: var(--text-muted);">\u767C\u9001\u5931\u6557</div>
          <div class="text-xl font-bold text-red-400">{{ failedCount() }}</div>
        </div>
      </div>
      
      <!-- \u641C\u7D22\u548C\u7BE9\u9078 + \u8996\u5716\u5207\u63DB -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex-1 relative">
          <input type="text" 
                 [ngModel]="searchTerm()"
                 (ngModelChange)="searchTerm.set($event)"
                 placeholder="\u641C\u7D22\u5BA2\u6236\u540D\u7A31\u3001\u7528\u6236\u540D\u6216\u4F86\u6E90..."
                 class="w-full py-3 px-4 pl-10 rounded-xl"
                 style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">\u{1F50D}</span>
        </div>
        <select [ngModel]="statusFilter()"
                (ngModelChange)="statusFilter.set($event)"
                class="py-3 px-4 rounded-xl"
                style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
          <option value="">\u5168\u90E8\u72C0\u614B</option>
          <option value="new">\u5F85\u767C\u9001</option>
          <option value="contacted">\u5DF2\u767C\u9001</option>
          <option value="replied">\u5DF2\u56DE\u8986</option>
          <option value="failed">\u767C\u9001\u5931\u6557</option>
        </select>
        <!-- \u8996\u5716\u5207\u63DB\u6309\u9215 -->
        <div class="flex rounded-lg overflow-hidden" style="border: 1px solid var(--border-color);">
          <button (click)="viewMode.set('list')" 
                  class="p-2 px-3 transition-colors"
                  [class.bg-cyan-500]="viewMode() === 'list'"
                  [class.text-white]="viewMode() === 'list'"
                  [style.background-color]="viewMode() !== 'list' ? 'var(--bg-tertiary)' : ''">
            \u{1F4CB}
          </button>
          <button (click)="viewMode.set('card')" 
                  class="p-2 px-3 transition-colors"
                  [class.bg-cyan-500]="viewMode() === 'card'"
                  [class.text-white]="viewMode() === 'card'"
                  [style.background-color]="viewMode() !== 'card' ? 'var(--bg-tertiary)' : ''">
            \u{1F0CF}
          </button>
        </div>
      </div>
      
      <!-- \u{1F195} \u5168\u9078\u63A7\u5236\u6B04 - \u59CB\u7D42\u986F\u793A -->
      <div class="flex items-center gap-4 mb-4 p-3 rounded-xl"
           style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
        <!-- \u5168\u9078\u8907\u9078\u6846\uFF08\u4E09\u614B\uFF09 -->
        <div class="flex items-center gap-3">
          <input type="checkbox" 
                 [checked]="isAllSelected()"
                 [indeterminate]="isPartialSelected()"
                 (change)="toggleSelectAll()"
                 class="w-5 h-5 rounded accent-cyan-500 cursor-pointer">
          <span class="text-sm" style="color: var(--text-muted);">
            @if (isAllSelected()) {
              \u5DF2\u5168\u9078
            } @else if (isPartialSelected()) {
              \u90E8\u5206\u9078\u4E2D
            } @else {
              \u5168\u9078
            }
          </span>
        </div>
        
        <!-- \u5FEB\u6377\u9078\u64C7\u6309\u9215 -->
        <div class="flex items-center gap-2">
          <button (click)="selectAll()" 
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  [class.bg-cyan-500]="isAllSelected()"
                  [class.text-white]="isAllSelected()"
                  [style.background-color]="!isAllSelected() ? 'var(--bg-tertiary)' : ''"
                  [style.color]="!isAllSelected() ? 'var(--text-muted)' : ''">
            \u2611\uFE0F \u5168\u9078 ({{ filteredContacts().length }})
          </button>
          <button (click)="invertSelection()" 
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style="background-color: var(--bg-tertiary); color: var(--text-muted);">
            \u{1F504} \u53CD\u9078
          </button>
          <button (click)="clearSelection()" 
                  [disabled]="selectedCount() === 0"
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                  style="background-color: var(--bg-tertiary); color: var(--text-muted);">
            \u2716 \u6E05\u9664
          </button>
        </div>
        
        <!-- \u5206\u9694\u7DDA -->
        <div class="w-px h-6 bg-slate-700"></div>
        
        <!-- \u9078\u4E2D\u8A08\u6578 -->
        <div class="flex items-center gap-2">
          @if (selectedCount() > 0) {
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/20 text-cyan-400">
              \u5DF2\u9078 {{ selectedCount() }} \u500B
            </span>
          } @else {
            <span class="text-sm" style="color: var(--text-muted);">
              \u5171 {{ filteredContacts().length }} \u500B\u5BA2\u6236
            </span>
          }
        </div>
        
        <!-- \u53F3\u5074\u5FEB\u6377\u64CD\u4F5C\uFF08\u9078\u4E2D\u6642\u986F\u793A\uFF09 -->
        <div class="flex-1"></div>
        @if (selectedCount() > 0) {
          <div class="flex items-center gap-2">
            <button (click)="batchSend()" 
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-600 text-white transition-colors">
              \u{1F4E8} \u7FA4\u767C
            </button>
            <button (click)="batchInvite()" 
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-500 hover:bg-purple-600 text-white transition-colors">
              \u{1F465} \u62C9\u7FA4
            </button>
            <button (click)="batchDelete()" 
                    [disabled]="isDeleting()"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50">
              \u{1F5D1}\uFE0F \u522A\u9664
            </button>
          </div>
        }
      </div>
      
      <!-- \u6279\u91CF\u64CD\u4F5C\u6B04 (\u9078\u4E2D\u591A\u500B\u6642\u986F\u793A) - \u{1F527} P0: sticky \u5B9A\u4F4D\u59CB\u7D42\u53EF\u898B -->
      @if (selectedCount() > 1) {
        <div class="sticky top-0 z-50 flex items-center gap-4 mb-4 p-4 rounded-xl border transition-all duration-300 shadow-lg backdrop-blur-sm bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-amber-500/50"
             style="background-color: rgba(15, 23, 42, 0.95);">
          <span class="text-amber-400 font-bold text-lg">
            \u{1F446} \u5DF2\u9078\u64C7 {{ selectedCount() }} \u500B\u5BA2\u6236 - \u8ACB\u9078\u64C7\u6279\u91CF\u64CD\u4F5C
          </span>
          <div class="flex-1"></div>
          <button (click)="batchSend()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors">
            <span>\u{1F4E8}</span> \u7FA4\u767C\u6D88\u606F
          </button>
          <button (click)="batchInvite()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors">
            <span>\u{1F465}</span> \u6279\u91CF\u62C9\u7FA4
          </button>
          <button (click)="startMultiRoleCollaboration()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white transition-colors">
            <span>\u{1F916}</span> AI \u591A\u89D2\u8272\u71DF\u92B7
          </button>
          <button (click)="batchDelete()" 
                  [disabled]="isDeleting()"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50">
            <span>{{ isDeleting() ? '\u23F3' : '\u{1F5D1}\uFE0F' }}</span> {{ isDeleting() ? '\u522A\u9664\u4E2D...' : '\u522A\u9664' }}
          </button>
          <button (click)="clearSelection()" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400">
            \u2716 \u53D6\u6D88\u9078\u64C7
          </button>
        </div>
      }
      
      <!-- \u5BA2\u6236\u5217\u8868 / \u5361\u7247 -->
      <div class="rounded-xl overflow-hidden" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
        @if (filteredContacts().length === 0) {
          <div class="p-12 text-center" style="color: var(--text-muted);">
            <span class="text-5xl mb-4 block">\u{1F4ED}</span>
            <p class="text-lg mb-2">\u66AB\u7121\u5BA2\u6236\u6578\u64DA</p>
            <p class="text-sm mb-4">\u8ACB\u5148\u5230\u300C\u8CC7\u6E90\u4E2D\u5FC3\u300D\u6DFB\u52A0\u5BA2\u6236\uFF0C\u6216\u5F9E\u76E3\u63A7\u7FA4\u7D44\u81EA\u52D5\u6536\u96C6</p>
            <button (click)="goToResourceCenter()" 
                    class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
              \u524D\u5F80\u8CC7\u6E90\u4E2D\u5FC3 \u2192
            </button>
          </div>
        } @else if (viewMode() === 'card') {
          <!-- \u5361\u7247\u8996\u5716 -->
          <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (contact of filteredContacts(); track contact.id) {
              <div class="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer relative group"
                   [class.ring-2]="isSelected(contact.id)"
                   [class.ring-cyan-500]="isSelected(contact.id)"
                   style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color);"
                   (click)="toggleSelect(contact.id)">
                <!-- \u9078\u4E2D\u6A19\u8A18 - \u{1F527} P0: \u7D81\u5B9A change \u4E8B\u4EF6 -->
                <div class="absolute top-3 right-3">
                  <input type="checkbox" 
                         [checked]="isSelected(contact.id)" 
                         (change)="toggleSelect(contact.id)"
                         (click)="$event.stopPropagation()"
                         class="rounded w-5 h-5 accent-cyan-500 cursor-pointer">
                </div>
                
                <!-- \u982D\u50CF\u548C\u57FA\u672C\u4FE1\u606F -->
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {{ getInitial(contact) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate" style="color: var(--text-primary);">{{ contact.display_name || contact.username || contact.telegram_id }}</p>
                    @if (contact.username) {
                      <p class="text-xs truncate" style="color: var(--text-muted);">&#64;{{ contact.username }}</p>
                    }
                  </div>
                </div>
                
                <!-- \u4F86\u6E90\u548C\u72C0\u614B -->
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs px-2 py-1 rounded bg-slate-700/50" style="color: var(--text-muted);">
                    {{ contact.source_name || contact.source_type || '\u672A\u77E5\u4F86\u6E90' }}
                  </span>
                  <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="getStatusClass(contact.status)">
                    {{ getStatusLabel(contact.status) }}
                  </span>
                </div>
                
                <!-- \u5FEB\u6377\u64CD\u4F5C\u6309\u9215 - \u{1F527} P0: \u9078\u4E2D\u591A\u500B\u6642\u7981\u7528\u55AE\u500B\u64CD\u4F5C -->
                <div class="flex items-center gap-2 pt-2 border-t" style="border-color: var(--border-color);">
                  @if (selectedIds().size > 1) {
                    <!-- \u9078\u4E2D\u591A\u500B\u6642\u63D0\u793A\u4F7F\u7528\u6279\u91CF\u64CD\u4F5C -->
                    <div class="flex-1 text-center py-2 text-xs text-amber-400">
                      \u2B06\uFE0F \u8ACB\u4F7F\u7528\u4E0A\u65B9\u6279\u91CF\u64CD\u4F5C\u6B04
                    </div>
                  } @else {
                    <button (click)="sendMessage(contact); $event.stopPropagation()" 
                            class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400">
                      \u{1F4AC} \u767C\u9001
                    </button>
                    <button (click)="inviteToGroup(contact); $event.stopPropagation()" 
                            class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-500/20 hover:bg-purple-500/30 text-purple-400">
                      \u{1F465} \u62C9\u7FA4
                    </button>
                    <button (click)="deleteContact(contact); $event.stopPropagation()" 
                            class="p-2 rounded-lg text-xs transition-colors hover:bg-red-500/20 text-red-400" title="\u522A\u9664">
                      \u{1F5D1}\uFE0F
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- \u5217\u8868\u8996\u5716 -->
          <table class="w-full">
            <thead>
              <tr style="background-color: var(--bg-tertiary);">
                <th class="py-3 px-4 text-left text-sm font-medium w-10" style="color: var(--text-muted);">
                  <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll()" class="rounded">
                </th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">\u5BA2\u6236</th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">\u4F86\u6E90</th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">\u72C0\u614B</th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">\u64CD\u4F5C</th>
              </tr>
            </thead>
            <tbody>
              @for (contact of filteredContacts(); track contact.id) {
                <tr class="border-t transition-colors hover:bg-slate-800/30" style="border-color: var(--border-color);">
                  <td class="py-3 px-4">
                    <input type="checkbox" [checked]="isSelected(contact.id)" (change)="toggleSelect(contact.id)" class="rounded">
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {{ getInitial(contact) }}
                      </div>
                      <div>
                        <p class="font-medium" style="color: var(--text-primary);">{{ contact.display_name || contact.username || contact.telegram_id }}</p>
                        @if (contact.username) {
                          <p class="text-xs" style="color: var(--text-muted);">&#64;{{ contact.username }}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4" style="color: var(--text-muted);">
                    <span class="text-xs px-2 py-1 rounded bg-slate-700/50">{{ contact.source_name || contact.source_type || '-' }}</span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="getStatusClass(contact.status)">
                      {{ getStatusLabel(contact.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <!-- \u{1F527} P0: \u9078\u4E2D\u591A\u500B\u6642\u7981\u7528\u55AE\u500B\u64CD\u4F5C -->
                    @if (selectedIds().size > 1) {
                      <div class="text-xs text-amber-400">
                        \u2B06\uFE0F \u4F7F\u7528\u6279\u91CF\u64CD\u4F5C
                      </div>
                    } @else {
                      <div class="flex items-center gap-2">
                        <button (click)="sendMessage(contact)" class="p-2 rounded-lg hover:bg-cyan-500/20 transition-colors text-cyan-400" title="\u767C\u9001\u6D88\u606F">
                          \u{1F4AC}
                        </button>
                        <button (click)="inviteToGroup(contact)" class="p-2 rounded-lg hover:bg-purple-500/20 transition-colors text-purple-400" title="\u62C9\u7FA4">
                          \u{1F465}
                        </button>
                        <button (click)="viewContact(contact)" class="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400" title="\u67E5\u770B\u8A73\u60C5">
                          \u{1F441}\uFE0F
                        </button>
                        <button (click)="deleteContact(contact)" class="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400" title="\u522A\u9664">
                          \u{1F5D1}\uFE0F
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LeadsViewComponent, { className: "LeadsViewComponent", filePath: "src/views/leads-view.component.ts", lineNumber: 383 });
})();

export {
  LeadsViewComponent
};
//# sourceMappingURL=chunk-J5X72H7F.js.map
