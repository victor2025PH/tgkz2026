import {
  ElectronIpcService
} from "./chunk-355UGVEO.js";
import {
  CommonModule,
  NgForOf,
  NgIf
} from "./chunk-7CO55ZOM.js";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵinject,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-Y4VZODST.js";

// src/services/billing.service.ts
var BillingService = class _BillingService {
  constructor(ipc) {
    this.ipc = ipc;
    this._quotaPacks = signal([], ...ngDevMode ? [{ debugName: "_quotaPacks" }] : []);
    this.quotaPacks = this._quotaPacks.asReadonly();
    this._myPackages = signal([], ...ngDevMode ? [{ debugName: "_myPackages" }] : []);
    this.myPackages = this._myPackages.asReadonly();
    this._bills = signal([], ...ngDevMode ? [{ debugName: "_bills" }] : []);
    this.bills = this._bills.asReadonly();
    this._overageInfo = signal(null, ...ngDevMode ? [{ debugName: "_overageInfo" }] : []);
    this.overageInfo = this._overageInfo.asReadonly();
    this._freezeStatus = signal(null, ...ngDevMode ? [{ debugName: "_freezeStatus" }] : []);
    this.freezeStatus = this._freezeStatus.asReadonly();
    this._loading = signal(false, ...ngDevMode ? [{ debugName: "_loading" }] : []);
    this.loading = this._loading.asReadonly();
    this.hasActivePackages = computed(() => this._myPackages().length > 0, ...ngDevMode ? [{ debugName: "hasActivePackages" }] : []);
    this.isFrozen = computed(() => this._freezeStatus()?.frozen ?? false, ...ngDevMode ? [{ debugName: "isFrozen" }] : []);
    this.unpaidBills = computed(() => this._bills().filter((b) => b.status === "pending"), ...ngDevMode ? [{ debugName: "unpaidBills" }] : []);
    this.totalOverageCharge = computed(() => {
      const info = this._overageInfo();
      if (!info)
        return 0;
      return Object.values(info).reduce((sum, i) => sum + (i.charge || 0), 0);
    }, ...ngDevMode ? [{ debugName: "totalOverageCharge" }] : []);
  }
  /**
   * 加載可購買的配額包
   */
  async loadQuotaPacks() {
    this._loading.set(true);
    try {
      const response = await this.ipc.invoke("get-quota-packs", {});
      if (response?.success && response?.data?.packs) {
        this._quotaPacks.set(response.data.packs);
      }
    } catch (error) {
      console.error("Failed to load quota packs:", error);
    } finally {
      this._loading.set(false);
    }
  }
  /**
   * 購買配額包
   */
  async purchasePack(packId, paymentMethod = "balance") {
    try {
      const response = await this.ipc.invoke("purchase-quota-pack", {
        pack_id: packId,
        payment_method: paymentMethod
      });
      if (response?.success) {
        await this.loadMyPackages();
      }
      return response || { success: false, error: "\u672A\u77E5\u932F\u8AA4" };
    } catch (error) {
      console.error("Failed to purchase pack:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 加載我的配額包
   */
  async loadMyPackages(activeOnly = true) {
    try {
      const response = await this.ipc.invoke("get-my-packages", {
        active_only: activeOnly
      });
      if (response?.success && response?.data?.packages) {
        this._myPackages.set(response.data.packages);
      }
    } catch (error) {
      console.error("Failed to load my packages:", error);
    }
  }
  /**
   * 加載賬單
   */
  async loadBills(status, type, limit = 50) {
    try {
      const params = { limit };
      if (status)
        params.status = status;
      if (type)
        params.type = type;
      const response = await this.ipc.invoke("get-user-bills", params);
      if (response?.success && response?.data?.bills) {
        this._bills.set(response.data.bills);
      }
    } catch (error) {
      console.error("Failed to load bills:", error);
    }
  }
  /**
   * 支付賬單
   */
  async payBill(billId, paymentMethod = "balance") {
    try {
      const response = await this.ipc.invoke("pay-bill", {
        bill_id: billId,
        payment_method: paymentMethod
      });
      if (response?.success) {
        await this.loadBills();
        await this.loadFreezeStatus();
      }
      return response || { success: false, error: "\u672A\u77E5\u932F\u8AA4" };
    } catch (error) {
      console.error("Failed to pay bill:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 加載超額信息
   */
  async loadOverageInfo() {
    try {
      const response = await this.ipc.invoke("get-overage-info", {});
      if (response?.success && response?.data) {
        this._overageInfo.set(response.data);
      }
    } catch (error) {
      console.error("Failed to load overage info:", error);
    }
  }
  /**
   * 加載凍結狀態
   */
  async loadFreezeStatus() {
    try {
      const response = await this.ipc.invoke("get-freeze-status", {});
      if (response?.success && response?.data) {
        this._freezeStatus.set(response.data);
      }
    } catch (error) {
      console.error("Failed to load freeze status:", error);
    }
  }
  /**
   * 格式化價格
   */
  formatPrice(cents) {
    return `\xA5${(cents / 100).toFixed(2)}`;
  }
  /**
   * 獲取配額包類型圖標
   */
  getPackTypeIcon(type) {
    const icons = {
      messages: "\u{1F4AC}",
      ai_calls: "\u{1F916}",
      accounts: "\u{1F4F1}",
      combo: "\u{1F381}"
    };
    return icons[type] || "\u{1F4E6}";
  }
  /**
   * 獲取賬單狀態標籤
   */
  getBillStatusLabel(status) {
    const labels = {
      pending: { text: "\u5F85\u652F\u4ED8", color: "#f59e0b" },
      paid: { text: "\u5DF2\u652F\u4ED8", color: "#22c55e" },
      failed: { text: "\u652F\u4ED8\u5931\u6557", color: "#ef4444" },
      cancelled: { text: "\u5DF2\u53D6\u6D88", color: "#6b7280" },
      refunded: { text: "\u5DF2\u9000\u6B3E", color: "#8b5cf6" }
    };
    return labels[status] || { text: status, color: "#666" };
  }
  /**
   * 刷新所有計費數據
   */
  async refresh() {
    await Promise.all([
      this.loadQuotaPacks(),
      this.loadMyPackages(),
      this.loadBills(),
      this.loadOverageInfo(),
      this.loadFreezeStatus()
    ]);
  }
  static {
    this.\u0275fac = function BillingService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _BillingService)(\u0275\u0275inject(ElectronIpcService));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _BillingService, factory: _BillingService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BillingService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: ElectronIpcService }], null);
})();

// src/components/quota-pack-store.component.ts
function QuotaPackStoreComponent_section_6_div_4_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 21)(1, "span", 22);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 23);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 24);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const quota_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getQuotaIcon(quota_r1.type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", quota_r1.remaining, "/", quota_r1.total);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getQuotaLabel(quota_r1.type));
  }
}
function QuotaPackStoreComponent_section_6_div_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 13)(1, "div", 14)(2, "span", 15);
    \u0275\u0275text(3, "\u{1F4E6}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 16);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 17);
    \u0275\u0275template(7, QuotaPackStoreComponent_section_6_div_4_div_7_Template, 7, 4, "div", 18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 19)(9, "span", 20);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const pkg_r3 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(pkg_r3.pack_name);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngForOf", ctx_r1.getQuotaItems(pkg_r3.remaining));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r1.formatExpiry(pkg_r3.expires_at), " ");
  }
}
function QuotaPackStoreComponent_section_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 10)(1, "h3");
    \u0275\u0275text(2, "\u6211\u7684\u914D\u984D\u5305");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 11);
    \u0275\u0275template(4, QuotaPackStoreComponent_section_6_div_4_Template, 11, 3, "div", 12);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275property("ngForOf", ctx_r1.myPackages());
  }
}
function QuotaPackStoreComponent_button_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 25);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_button_11_Template_button_click_0_listener() {
      const type_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectedType.set(type_r5.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const type_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r1.selectedType() === type_r5.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", type_r5.icon, " ", type_r5.label, " ");
  }
}
function QuotaPackStoreComponent_div_13_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275text(1, "\u71B1\u92B7");
    \u0275\u0275elementEnd();
  }
}
function QuotaPackStoreComponent_div_13_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38)(1, "span", 22);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 39);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 24);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const q_r8 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getQuotaIcon(q_r8.type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("+", q_r8.amount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getQuotaLabel(q_r8.type));
  }
}
function QuotaPackStoreComponent_div_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 26);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_div_13_Template_div_click_0_listener() {
      const pack_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectPack(pack_r7));
    });
    \u0275\u0275template(1, QuotaPackStoreComponent_div_13_div_1_Template, 2, 0, "div", 27);
    \u0275\u0275elementStart(2, "div", 28)(3, "span", 29);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "h4");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 30);
    \u0275\u0275template(8, QuotaPackStoreComponent_div_13_div_8_Template, 7, 3, "div", 31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "p", 32);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 33)(12, "span", 34);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 35);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "button", 36);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_div_13_Template_button_click_16_listener($event) {
      const pack_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openPurchaseDialog(pack_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(17, " \u7ACB\u5373\u8CFC\u8CB7 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const pack_r7 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("featured", pack_r7.featured);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", pack_r7.featured);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.billing.getPackTypeIcon(pack_r7.type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(pack_r7.name);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngForOf", ctx_r1.getPackQuotas(pack_r7));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(pack_r7.description);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.billing.formatPrice(pack_r7.price));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u6709\u6548\u671F ", pack_r7.validity_days, " \u5929");
  }
}
function QuotaPackStoreComponent_div_14_div_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 54)(1, "div", 55)(2, "span", 56);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 57)(5, "span", 58);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 59);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 60)(10, "span");
    \u0275\u0275text(11, "\u50F9\u683C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span", 61);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 62)(15, "span");
    \u0275\u0275text(16, "\u6709\u6548\u671F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span");
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.billing.getPackTypeIcon(ctx_r1.selectedPack().type));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.selectedPack().name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.selectedPack().description);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.billing.formatPrice(ctx_r1.selectedPack().price));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r1.selectedPack().validity_days, " \u5929");
  }
}
function QuotaPackStoreComponent_div_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 40);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_div_14_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showPurchaseDialog.set(false));
    });
    \u0275\u0275elementStart(1, "div", 41);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_div_14_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r9);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "h3");
    \u0275\u0275text(3, "\u78BA\u8A8D\u8CFC\u8CB7");
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, QuotaPackStoreComponent_div_14_div_4_Template, 19, 5, "div", 42);
    \u0275\u0275elementStart(5, "div", 43)(6, "h4");
    \u0275\u0275text(7, "\u9078\u64C7\u652F\u4ED8\u65B9\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 44)(9, "label", 45)(10, "input", 46);
    \u0275\u0275listener("change", function QuotaPackStoreComponent_div_14_Template_input_change_10_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.paymentMethod.set("balance"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 47);
    \u0275\u0275text(12, "\u{1F4B0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span", 48);
    \u0275\u0275text(14, "\u9918\u984D\u652F\u4ED8");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "label", 45)(16, "input", 49);
    \u0275\u0275listener("change", function QuotaPackStoreComponent_div_14_Template_input_change_16_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.paymentMethod.set("alipay"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 47);
    \u0275\u0275text(18, "\u{1F499}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "span", 48);
    \u0275\u0275text(20, "\u652F\u4ED8\u5BF6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "label", 45)(22, "input", 50);
    \u0275\u0275listener("change", function QuotaPackStoreComponent_div_14_Template_input_change_22_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.paymentMethod.set("wechat"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "span", 47);
    \u0275\u0275text(24, "\u{1F49A}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "span", 48);
    \u0275\u0275text(26, "\u5FAE\u4FE1\u652F\u4ED8");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(27, "div", 51)(28, "button", 52);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_div_14_Template_button_click_28_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showPurchaseDialog.set(false));
    });
    \u0275\u0275text(29, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "button", 53);
    \u0275\u0275listener("click", function QuotaPackStoreComponent_div_14_Template_button_click_30_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmPurchase());
    });
    \u0275\u0275text(31);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275property("ngIf", ctx_r1.selectedPack());
    \u0275\u0275advance(5);
    \u0275\u0275classProp("selected", ctx_r1.paymentMethod() === "balance");
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.paymentMethod() === "balance");
    \u0275\u0275advance(5);
    \u0275\u0275classProp("selected", ctx_r1.paymentMethod() === "alipay");
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.paymentMethod() === "alipay");
    \u0275\u0275advance(5);
    \u0275\u0275classProp("selected", ctx_r1.paymentMethod() === "wechat");
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.paymentMethod() === "wechat");
    \u0275\u0275advance(8);
    \u0275\u0275property("disabled", ctx_r1.isPurchasing());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.isPurchasing() ? "\u8655\u7406\u4E2D..." : "\u78BA\u8A8D\u652F\u4ED8", " ");
  }
}
function QuotaPackStoreComponent_div_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 63)(1, "span", 64);
    \u0275\u0275text(2, "\u2713");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4, "\u8CFC\u8CB7\u6210\u529F\uFF01\u914D\u984D\u5DF2\u6DFB\u52A0");
    \u0275\u0275elementEnd()();
  }
}
var QuotaPackStoreComponent = class _QuotaPackStoreComponent {
  constructor() {
    this.billing = inject(BillingService);
    this.selectedType = signal("all", ...ngDevMode ? [{ debugName: "selectedType" }] : []);
    this.selectedPack = signal(null, ...ngDevMode ? [{ debugName: "selectedPack" }] : []);
    this.showPurchaseDialog = signal(false, ...ngDevMode ? [{ debugName: "showPurchaseDialog" }] : []);
    this.paymentMethod = signal("balance", ...ngDevMode ? [{ debugName: "paymentMethod" }] : []);
    this.isPurchasing = signal(false, ...ngDevMode ? [{ debugName: "isPurchasing" }] : []);
    this.showSuccess = signal(false, ...ngDevMode ? [{ debugName: "showSuccess" }] : []);
    this.packTypes = [
      { value: "all", label: "\u5168\u90E8", icon: "\u{1F4E6}" },
      { value: "messages", label: "\u6D88\u606F\u5305", icon: "\u{1F4AC}" },
      { value: "ai_calls", label: "AI \u5305", icon: "\u{1F916}" },
      { value: "combo", label: "\u7D44\u5408\u5305", icon: "\u{1F381}" },
      { value: "accounts", label: "\u5E33\u865F\u5305", icon: "\u{1F4F1}" }
    ];
    this.quotaIcons = {
      daily_messages: "\u{1F4AC}",
      ai_calls: "\u{1F916}",
      tg_accounts: "\u{1F4F1}",
      groups: "\u{1F465}"
    };
    this.quotaLabels = {
      daily_messages: "\u6BCF\u65E5\u6D88\u606F",
      ai_calls: "AI \u8ABF\u7528",
      tg_accounts: "TG \u5E33\u865F",
      groups: "\u7FA4\u7D44\u6578"
    };
    this.myPackages = computed(() => this.billing.myPackages(), ...ngDevMode ? [{ debugName: "myPackages" }] : []);
    this.filteredPacks = computed(() => {
      const packs = this.billing.quotaPacks();
      const type = this.selectedType();
      if (type === "all")
        return packs;
      return packs.filter((p) => p.type === type);
    }, ...ngDevMode ? [{ debugName: "filteredPacks" }] : []);
  }
  ngOnInit() {
    this.billing.loadQuotaPacks();
    this.billing.loadMyPackages();
  }
  getQuotaIcon(type) {
    return this.quotaIcons[type] || "\u{1F4CA}";
  }
  getQuotaLabel(type) {
    return this.quotaLabels[type] || type;
  }
  getQuotaItems(remaining) {
    return Object.entries(remaining).map(([type, value]) => ({
      type,
      remaining: value,
      total: value
      // 這裡應該是原始值
    }));
  }
  getPackQuotas(pack) {
    return Object.entries(pack.quotas).map(([type, amount]) => ({
      type,
      amount
    }));
  }
  formatExpiry(isoTime) {
    try {
      const date = new Date(isoTime);
      const now = /* @__PURE__ */ new Date();
      const days = Math.ceil((date.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (days < 0)
        return "\u5DF2\u904E\u671F";
      if (days === 0)
        return "\u4ECA\u65E5\u5230\u671F";
      if (days === 1)
        return "\u660E\u65E5\u5230\u671F";
      return `${days} \u5929\u5F8C\u5230\u671F`;
    } catch {
      return "";
    }
  }
  selectPack(pack) {
    this.selectedPack.set(pack);
  }
  openPurchaseDialog(pack) {
    this.selectedPack.set(pack);
    this.showPurchaseDialog.set(true);
  }
  async confirmPurchase() {
    const pack = this.selectedPack();
    if (!pack)
      return;
    this.isPurchasing.set(true);
    const result = await this.billing.purchasePack(pack.id, this.paymentMethod());
    this.isPurchasing.set(false);
    if (result.success) {
      this.showPurchaseDialog.set(false);
      this.showSuccess.set(true);
      setTimeout(() => {
        this.showSuccess.set(false);
      }, 3e3);
    } else {
      alert(result.error || "\u8CFC\u8CB7\u5931\u6557");
    }
  }
  static {
    this.\u0275fac = function QuotaPackStoreComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QuotaPackStoreComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _QuotaPackStoreComponent, selectors: [["app-quota-pack-store"]], decls: 16, vars: 5, consts: [[1, "pack-store"], [1, "store-header"], ["class", "my-packages", 4, "ngIf"], [1, "available-packs"], [1, "type-filter"], [3, "active", "click", 4, "ngFor", "ngForOf"], [1, "packs-grid"], ["class", "pack-card", 3, "featured", "click", 4, "ngFor", "ngForOf"], ["class", "dialog-overlay", 3, "click", 4, "ngIf"], ["class", "success-toast", 4, "ngIf"], [1, "my-packages"], [1, "packages-list"], ["class", "package-card", 4, "ngFor", "ngForOf"], [1, "package-card"], [1, "package-header"], [1, "package-icon"], [1, "package-name"], [1, "package-quotas"], ["class", "quota-item", 4, "ngFor", "ngForOf"], [1, "package-footer"], [1, "expires"], [1, "quota-item"], [1, "quota-icon"], [1, "quota-value"], [1, "quota-label"], [3, "click"], [1, "pack-card", 3, "click"], ["class", "featured-badge", 4, "ngIf"], [1, "pack-header"], [1, "pack-icon"], [1, "pack-quotas"], ["class", "quota-row", 4, "ngFor", "ngForOf"], [1, "pack-desc"], [1, "pack-footer"], [1, "pack-price"], [1, "pack-validity"], [1, "buy-btn", 3, "click"], [1, "featured-badge"], [1, "quota-row"], [1, "quota-amount"], [1, "dialog-overlay", 3, "click"], [1, "dialog-content", 3, "click"], ["class", "purchase-summary", 4, "ngIf"], [1, "payment-methods"], [1, "method-options"], [1, "method-option"], ["type", "radio", "name", "payment", "value", "balance", 3, "change", "checked"], [1, "method-icon"], [1, "method-label"], ["type", "radio", "name", "payment", "value", "alipay", 3, "change", "checked"], ["type", "radio", "name", "payment", "value", "wechat", 3, "change", "checked"], [1, "dialog-actions"], [1, "btn-cancel", 3, "click"], [1, "btn-confirm", 3, "click", "disabled"], [1, "purchase-summary"], [1, "pack-preview"], [1, "icon"], [1, "info"], [1, "name"], [1, "desc"], [1, "price-row"], [1, "price"], [1, "validity-row"], [1, "success-toast"], [1, "success-icon"]], template: function QuotaPackStoreComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h2");
        \u0275\u0275text(3, "\u914D\u984D\u5305\u5546\u5E97");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "p");
        \u0275\u0275text(5, "\u8CFC\u8CB7\u984D\u5916\u914D\u984D\uFF0C\u7A81\u7834\u9650\u5236");
        \u0275\u0275elementEnd()();
        \u0275\u0275template(6, QuotaPackStoreComponent_section_6_Template, 5, 1, "section", 2);
        \u0275\u0275elementStart(7, "section", 3)(8, "h3");
        \u0275\u0275text(9, "\u53EF\u8CFC\u8CB7\u914D\u984D\u5305");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "div", 4);
        \u0275\u0275template(11, QuotaPackStoreComponent_button_11_Template, 2, 4, "button", 5);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "div", 6);
        \u0275\u0275template(13, QuotaPackStoreComponent_div_13_Template, 18, 9, "div", 7);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(14, QuotaPackStoreComponent_div_14_Template, 32, 12, "div", 8)(15, QuotaPackStoreComponent_div_15_Template, 5, 0, "div", 9);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(6);
        \u0275\u0275property("ngIf", ctx.myPackages().length > 0);
        \u0275\u0275advance(5);
        \u0275\u0275property("ngForOf", ctx.packTypes);
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ctx.filteredPacks());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showPurchaseDialog());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showSuccess());
      }
    }, dependencies: [CommonModule, NgForOf, NgIf], styles: ["\n\n.pack-store[_ngcontent-%COMP%] {\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.store-header[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-bottom: 32px;\n}\n.store-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 28px;\n  font-weight: 700;\n  margin: 0 0 8px;\n}\n.store-header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin: 0;\n}\n.my-packages[_ngcontent-%COMP%] {\n  margin-bottom: 32px;\n}\n.my-packages[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%], \n.available-packs[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 18px;\n  margin-bottom: 16px;\n}\n.packages-list[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  overflow-x: auto;\n  padding-bottom: 8px;\n}\n.package-card[_ngcontent-%COMP%] {\n  min-width: 200px;\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.package-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.package-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.package-name[_ngcontent-%COMP%] {\n  font-weight: 600;\n}\n.package-quotas[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.quota-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n}\n.package-footer[_ngcontent-%COMP%] {\n  margin-top: 12px;\n  padding-top: 12px;\n  border-top: 1px solid var(--border-color, #333);\n}\n.expires[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.type-filter[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 20px;\n  flex-wrap: wrap;\n}\n.type-filter[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 20px;\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.type-filter[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n  background: var(--primary, #3b82f6);\n  border-color: var(--primary, #3b82f6);\n  color: white;\n}\n.packs-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));\n  gap: 20px;\n}\n.pack-card[_ngcontent-%COMP%] {\n  position: relative;\n  padding: 24px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  cursor: pointer;\n  transition: all 0.3s;\n}\n.pack-card[_ngcontent-%COMP%]:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);\n}\n.pack-card.featured[_ngcontent-%COMP%] {\n  border-color: var(--primary, #3b82f6);\n  background:\n    linear-gradient(\n      135deg,\n      rgba(59, 130, 246, 0.1),\n      rgba(139, 92, 246, 0.1));\n}\n.featured-badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: -10px;\n  right: 16px;\n  padding: 4px 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #f59e0b,\n      #ef4444);\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n  color: white;\n}\n.pack-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 16px;\n}\n.pack-icon[_ngcontent-%COMP%] {\n  font-size: 32px;\n}\n.pack-header[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n}\n.pack-quotas[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.quota-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.quota-amount[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: #22c55e;\n}\n.quota-label[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n}\n.pack-desc[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n  margin: 0 0 16px;\n}\n.pack-footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.pack-price[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 700;\n  color: var(--primary, #3b82f6);\n}\n.pack-validity[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n}\n.buy-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 14px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.buy-btn[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.dialog-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.dialog-content[_ngcontent-%COMP%] {\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 16px;\n  padding: 24px;\n  min-width: 400px;\n}\n.dialog-content[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 20px;\n}\n.purchase-summary[_ngcontent-%COMP%] {\n  margin-bottom: 20px;\n}\n.pack-preview[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  margin-bottom: 16px;\n}\n.pack-preview[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  font-size: 36px;\n}\n.pack-preview[_ngcontent-%COMP%]   .name[_ngcontent-%COMP%] {\n  display: block;\n  font-weight: 600;\n}\n.pack-preview[_ngcontent-%COMP%]   .desc[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.price-row[_ngcontent-%COMP%], \n.validity-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  padding: 8px 0;\n}\n.price[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  color: var(--primary, #3b82f6);\n}\n.payment-methods[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  font-size: 14px;\n  margin: 0 0 12px;\n  color: var(--text-secondary, #888);\n}\n.method-options[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n}\n.method-option[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 12px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 2px solid var(--border-color, #333);\n  border-radius: 8px;\n  cursor: pointer;\n  text-align: center;\n  transition: all 0.2s;\n}\n.method-option[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  display: none;\n}\n.method-option.selected[_ngcontent-%COMP%] {\n  border-color: var(--primary, #3b82f6);\n}\n.method-icon[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 24px;\n  margin-bottom: 4px;\n}\n.method-label[_ngcontent-%COMP%] {\n  font-size: 12px;\n}\n.dialog-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  margin-top: 24px;\n}\n.btn-cancel[_ngcontent-%COMP%], \n.btn-confirm[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 12px;\n  border-radius: 8px;\n  font-size: 14px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.btn-cancel[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.btn-confirm[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  color: white;\n}\n.btn-confirm[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.success-toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 24px;\n  left: 50%;\n  transform: translateX(-50%);\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px 24px;\n  background: #22c55e;\n  border-radius: 12px;\n  color: white;\n  font-weight: 600;\n  animation: _ngcontent-%COMP%_slideUp 0.3s ease;\n}\n@keyframes _ngcontent-%COMP%_slideUp {\n  from {\n    transform: translateX(-50%) translateY(20px);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(-50%) translateY(0);\n    opacity: 1;\n  }\n}\n.success-icon[_ngcontent-%COMP%] {\n  font-size: 20px;\n}\n/*# sourceMappingURL=quota-pack-store.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QuotaPackStoreComponent, [{
    type: Component,
    args: [{ selector: "app-quota-pack-store", standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="pack-store">
      <!-- \u6A19\u984C -->
      <header class="store-header">
        <h2>\u914D\u984D\u5305\u5546\u5E97</h2>
        <p>\u8CFC\u8CB7\u984D\u5916\u914D\u984D\uFF0C\u7A81\u7834\u9650\u5236</p>
      </header>
      
      <!-- \u6211\u7684\u914D\u984D\u5305 -->
      <section class="my-packages" *ngIf="myPackages().length > 0">
        <h3>\u6211\u7684\u914D\u984D\u5305</h3>
        <div class="packages-list">
          <div class="package-card" *ngFor="let pkg of myPackages()">
            <div class="package-header">
              <span class="package-icon">\u{1F4E6}</span>
              <span class="package-name">{{ pkg.pack_name }}</span>
            </div>
            <div class="package-quotas">
              <div class="quota-item" *ngFor="let quota of getQuotaItems(pkg.remaining)">
                <span class="quota-icon">{{ getQuotaIcon(quota.type) }}</span>
                <span class="quota-value">{{ quota.remaining }}/{{ quota.total }}</span>
                <span class="quota-label">{{ getQuotaLabel(quota.type) }}</span>
              </div>
            </div>
            <div class="package-footer">
              <span class="expires">
                {{ formatExpiry(pkg.expires_at) }}
              </span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- \u53EF\u8CFC\u8CB7\u7684\u914D\u984D\u5305 -->
      <section class="available-packs">
        <h3>\u53EF\u8CFC\u8CB7\u914D\u984D\u5305</h3>
        
        <!-- \u985E\u578B\u904E\u6FFE -->
        <div class="type-filter">
          <button 
            *ngFor="let type of packTypes"
            [class.active]="selectedType() === type.value"
            (click)="selectedType.set(type.value)">
            {{ type.icon }} {{ type.label }}
          </button>
        </div>
        
        <!-- \u914D\u984D\u5305\u7DB2\u683C -->
        <div class="packs-grid">
          <div class="pack-card" 
               *ngFor="let pack of filteredPacks()"
               [class.featured]="pack.featured"
               (click)="selectPack(pack)">
            <div class="featured-badge" *ngIf="pack.featured">\u71B1\u92B7</div>
            
            <div class="pack-header">
              <span class="pack-icon">{{ billing.getPackTypeIcon(pack.type) }}</span>
              <h4>{{ pack.name }}</h4>
            </div>
            
            <div class="pack-quotas">
              <div class="quota-row" *ngFor="let q of getPackQuotas(pack)">
                <span class="quota-icon">{{ getQuotaIcon(q.type) }}</span>
                <span class="quota-amount">+{{ q.amount }}</span>
                <span class="quota-label">{{ getQuotaLabel(q.type) }}</span>
              </div>
            </div>
            
            <p class="pack-desc">{{ pack.description }}</p>
            
            <div class="pack-footer">
              <span class="pack-price">{{ billing.formatPrice(pack.price) }}</span>
              <span class="pack-validity">\u6709\u6548\u671F {{ pack.validity_days }} \u5929</span>
            </div>
            
            <button class="buy-btn" (click)="openPurchaseDialog(pack); $event.stopPropagation()">
              \u7ACB\u5373\u8CFC\u8CB7
            </button>
          </div>
        </div>
      </section>
      
      <!-- \u8CFC\u8CB7\u78BA\u8A8D\u5C0D\u8A71\u6846 -->
      <div class="dialog-overlay" *ngIf="showPurchaseDialog()" (click)="showPurchaseDialog.set(false)">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h3>\u78BA\u8A8D\u8CFC\u8CB7</h3>
          
          <div class="purchase-summary" *ngIf="selectedPack()">
            <div class="pack-preview">
              <span class="icon">{{ billing.getPackTypeIcon(selectedPack()!.type) }}</span>
              <div class="info">
                <span class="name">{{ selectedPack()!.name }}</span>
                <span class="desc">{{ selectedPack()!.description }}</span>
              </div>
            </div>
            
            <div class="price-row">
              <span>\u50F9\u683C</span>
              <span class="price">{{ billing.formatPrice(selectedPack()!.price) }}</span>
            </div>
            
            <div class="validity-row">
              <span>\u6709\u6548\u671F</span>
              <span>{{ selectedPack()!.validity_days }} \u5929</span>
            </div>
          </div>
          
          <!-- \u652F\u4ED8\u65B9\u5F0F -->
          <div class="payment-methods">
            <h4>\u9078\u64C7\u652F\u4ED8\u65B9\u5F0F</h4>
            <div class="method-options">
              <label class="method-option" [class.selected]="paymentMethod() === 'balance'">
                <input type="radio" name="payment" value="balance"
                       [checked]="paymentMethod() === 'balance'"
                       (change)="paymentMethod.set('balance')">
                <span class="method-icon">\u{1F4B0}</span>
                <span class="method-label">\u9918\u984D\u652F\u4ED8</span>
              </label>
              <label class="method-option" [class.selected]="paymentMethod() === 'alipay'">
                <input type="radio" name="payment" value="alipay"
                       [checked]="paymentMethod() === 'alipay'"
                       (change)="paymentMethod.set('alipay')">
                <span class="method-icon">\u{1F499}</span>
                <span class="method-label">\u652F\u4ED8\u5BF6</span>
              </label>
              <label class="method-option" [class.selected]="paymentMethod() === 'wechat'">
                <input type="radio" name="payment" value="wechat"
                       [checked]="paymentMethod() === 'wechat'"
                       (change)="paymentMethod.set('wechat')">
                <span class="method-icon">\u{1F49A}</span>
                <span class="method-label">\u5FAE\u4FE1\u652F\u4ED8</span>
              </label>
            </div>
          </div>
          
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="showPurchaseDialog.set(false)">\u53D6\u6D88</button>
            <button class="btn-confirm" [disabled]="isPurchasing()" (click)="confirmPurchase()">
              {{ isPurchasing() ? '\u8655\u7406\u4E2D...' : '\u78BA\u8A8D\u652F\u4ED8' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- \u8CFC\u8CB7\u6210\u529F\u63D0\u793A -->
      <div class="success-toast" *ngIf="showSuccess()">
        <span class="success-icon">\u2713</span>
        <span>\u8CFC\u8CB7\u6210\u529F\uFF01\u914D\u984D\u5DF2\u6DFB\u52A0</span>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;4e680dece2e3bede26c73b937ed70b2edb1450d7acff44eb6f849e0650c73932;D:/tgkz2026/src/components/quota-pack-store.component.ts */\n.pack-store {\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.store-header {\n  text-align: center;\n  margin-bottom: 32px;\n}\n.store-header h2 {\n  font-size: 28px;\n  font-weight: 700;\n  margin: 0 0 8px;\n}\n.store-header p {\n  color: var(--text-secondary, #888);\n  margin: 0;\n}\n.my-packages {\n  margin-bottom: 32px;\n}\n.my-packages h3,\n.available-packs h3 {\n  font-size: 18px;\n  margin-bottom: 16px;\n}\n.packages-list {\n  display: flex;\n  gap: 16px;\n  overflow-x: auto;\n  padding-bottom: 8px;\n}\n.package-card {\n  min-width: 200px;\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.package-header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.package-icon {\n  font-size: 24px;\n}\n.package-name {\n  font-weight: 600;\n}\n.package-quotas {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.quota-item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n}\n.package-footer {\n  margin-top: 12px;\n  padding-top: 12px;\n  border-top: 1px solid var(--border-color, #333);\n}\n.expires {\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.type-filter {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 20px;\n  flex-wrap: wrap;\n}\n.type-filter button {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 20px;\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.type-filter button.active {\n  background: var(--primary, #3b82f6);\n  border-color: var(--primary, #3b82f6);\n  color: white;\n}\n.packs-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));\n  gap: 20px;\n}\n.pack-card {\n  position: relative;\n  padding: 24px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  cursor: pointer;\n  transition: all 0.3s;\n}\n.pack-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);\n}\n.pack-card.featured {\n  border-color: var(--primary, #3b82f6);\n  background:\n    linear-gradient(\n      135deg,\n      rgba(59, 130, 246, 0.1),\n      rgba(139, 92, 246, 0.1));\n}\n.featured-badge {\n  position: absolute;\n  top: -10px;\n  right: 16px;\n  padding: 4px 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #f59e0b,\n      #ef4444);\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n  color: white;\n}\n.pack-header {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 16px;\n}\n.pack-icon {\n  font-size: 32px;\n}\n.pack-header h4 {\n  margin: 0;\n  font-size: 18px;\n}\n.pack-quotas {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.quota-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.quota-amount {\n  font-weight: 600;\n  color: #22c55e;\n}\n.quota-label {\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n}\n.pack-desc {\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n  margin: 0 0 16px;\n}\n.pack-footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.pack-price {\n  font-size: 24px;\n  font-weight: 700;\n  color: var(--primary, #3b82f6);\n}\n.pack-validity {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n}\n.buy-btn {\n  width: 100%;\n  padding: 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 14px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.buy-btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.dialog-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.dialog-content {\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 16px;\n  padding: 24px;\n  min-width: 400px;\n}\n.dialog-content h3 {\n  margin: 0 0 20px;\n}\n.purchase-summary {\n  margin-bottom: 20px;\n}\n.pack-preview {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  margin-bottom: 16px;\n}\n.pack-preview .icon {\n  font-size: 36px;\n}\n.pack-preview .name {\n  display: block;\n  font-weight: 600;\n}\n.pack-preview .desc {\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.price-row,\n.validity-row {\n  display: flex;\n  justify-content: space-between;\n  padding: 8px 0;\n}\n.price {\n  font-size: 20px;\n  font-weight: 700;\n  color: var(--primary, #3b82f6);\n}\n.payment-methods h4 {\n  font-size: 14px;\n  margin: 0 0 12px;\n  color: var(--text-secondary, #888);\n}\n.method-options {\n  display: flex;\n  gap: 12px;\n}\n.method-option {\n  flex: 1;\n  padding: 12px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 2px solid var(--border-color, #333);\n  border-radius: 8px;\n  cursor: pointer;\n  text-align: center;\n  transition: all 0.2s;\n}\n.method-option input {\n  display: none;\n}\n.method-option.selected {\n  border-color: var(--primary, #3b82f6);\n}\n.method-icon {\n  display: block;\n  font-size: 24px;\n  margin-bottom: 4px;\n}\n.method-label {\n  font-size: 12px;\n}\n.dialog-actions {\n  display: flex;\n  gap: 12px;\n  margin-top: 24px;\n}\n.btn-cancel,\n.btn-confirm {\n  flex: 1;\n  padding: 12px;\n  border-radius: 8px;\n  font-size: 14px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.btn-cancel {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.btn-confirm {\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  color: white;\n}\n.btn-confirm:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.success-toast {\n  position: fixed;\n  bottom: 24px;\n  left: 50%;\n  transform: translateX(-50%);\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px 24px;\n  background: #22c55e;\n  border-radius: 12px;\n  color: white;\n  font-weight: 600;\n  animation: slideUp 0.3s ease;\n}\n@keyframes slideUp {\n  from {\n    transform: translateX(-50%) translateY(20px);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(-50%) translateY(0);\n    opacity: 1;\n  }\n}\n.success-icon {\n  font-size: 20px;\n}\n/*# sourceMappingURL=quota-pack-store.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(QuotaPackStoreComponent, { className: "QuotaPackStoreComponent", filePath: "src/components/quota-pack-store.component.ts", lineNumber: 563 });
})();

// src/views/billing-view.component.ts
function BillingViewComponent_div_1_p_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 11);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u9810\u8A08\u89E3\u51CD\u6642\u9593\uFF1A", ctx_r1.unfreezeTime());
  }
}
function BillingViewComponent_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6)(1, "span", 7);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 8)(4, "h4");
    \u0275\u0275text(5, "\u914D\u984D\u5DF2\u51CD\u7D50");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "p");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275template(8, BillingViewComponent_div_1_p_8_Template, 2, 1, "p", 9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 10);
    \u0275\u0275listener("click", function BillingViewComponent_div_1_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.payUnpaidBills());
    });
    \u0275\u0275text(10, "\u7ACB\u5373\u652F\u4ED8");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.freezeReason());
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r1.unfreezeTime());
  }
}
function BillingViewComponent_button_3_span_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tab_r4.badge());
  }
}
function BillingViewComponent_button_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 12);
    \u0275\u0275listener("click", function BillingViewComponent_button_3_Template_button_click_0_listener() {
      const tab_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.activeTab.set(tab_r4.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275template(2, BillingViewComponent_button_3_span_2_Template, 2, 1, "span", 13);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r1.activeTab() === tab_r4.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", tab_r4.icon, " ", tab_r4.label, " ");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", tab_r4.badge && tab_r4.badge() > 0);
  }
}
function BillingViewComponent_div_4_section_34_div_4_span_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 41);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("+\u914D\u984D\u5305 ", item_r5.pack_bonus);
  }
}
function BillingViewComponent_div_4_section_34_div_4_span_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 42);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u8D85\u984D ", item_r5.overage);
  }
}
function BillingViewComponent_div_4_section_34_div_4_div_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 43);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u9810\u8A08\u8CBB\u7528\uFF1A", ctx_r1.billing.formatPrice(item_r5.charge), " ");
  }
}
function BillingViewComponent_div_4_section_34_div_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28)(1, "div", 29)(2, "span", 30);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 31);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 32);
    \u0275\u0275element(7, "div", 33)(8, "div", 34)(9, "div", 35);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 36)(11, "span", 37);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275template(13, BillingViewComponent_div_4_section_34_div_4_span_13_Template, 2, 1, "span", 38)(14, BillingViewComponent_div_4_section_34_div_4_span_14_Template, 2, 1, "span", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275template(15, BillingViewComponent_div_4_section_34_div_4_div_15_Template, 2, 1, "div", 40);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getQuotaIcon(item_r5.type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getQuotaLabel(item_r5.type));
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", item_r5.basePercent, "%");
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", item_r5.packPercent, "%");
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", item_r5.overagePercent, "%");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u57FA\u790E ", item_r5.base_limit);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", item_r5.pack_bonus > 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", item_r5.overage > 0);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", item_r5.charge > 0);
  }
}
function BillingViewComponent_div_4_section_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 25)(1, "h3");
    \u0275\u0275text(2, "\u8D85\u984D\u4F7F\u7528\u60C5\u6CC1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 26);
    \u0275\u0275template(4, BillingViewComponent_div_4_section_34_div_4_Template, 16, 12, "div", 27);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275property("ngForOf", ctx_r1.overageItems());
  }
}
function BillingViewComponent_div_4_div_38_tr_15_button_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 48);
    \u0275\u0275listener("click", function BillingViewComponent_div_4_div_38_tr_15_button_11_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const bill_r7 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.payBill(bill_r7));
    });
    \u0275\u0275text(1, " \u652F\u4ED8 ");
    \u0275\u0275elementEnd();
  }
}
function BillingViewComponent_div_4_div_38_tr_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td")(8, "span", 46);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "td");
    \u0275\u0275template(11, BillingViewComponent_div_4_div_38_tr_15_button_11_Template, 2, 0, "button", 47);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const bill_r7 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatDate(bill_r7.created_at));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(bill_r7.description);
    \u0275\u0275advance();
    \u0275\u0275classProp("refund", bill_r7.amount < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", bill_r7.amount < 0 ? "" : "", "", ctx_r1.billing.formatPrice(ctx_r1.Math.abs(bill_r7.amount)), " ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", ctx_r1.billing.getBillStatusLabel(bill_r7.status).color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.billing.getBillStatusLabel(bill_r7.status).text, " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", bill_r7.status === "pending");
  }
}
function BillingViewComponent_div_4_div_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44)(1, "table")(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "\u65E5\u671F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "\u63CF\u8FF0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "\u91D1\u984D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "\u64CD\u4F5C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "tbody");
    \u0275\u0275template(15, BillingViewComponent_div_4_div_38_tr_15_Template, 12, 10, "tr", 45);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(15);
    \u0275\u0275property("ngForOf", ctx_r1.recentBills());
  }
}
function BillingViewComponent_div_4_ng_template_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49)(1, "span", 50);
    \u0275\u0275text(2, "\u{1F4DD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "\u66AB\u7121\u8CEC\u55AE\u8A18\u9304");
    \u0275\u0275elementEnd()();
  }
}
function BillingViewComponent_div_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 15)(1, "div", 16)(2, "div", 17)(3, "span", 18);
    \u0275\u0275text(4, "\u{1F4E6}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 19)(6, "span", 20);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 21);
    \u0275\u0275text(9, "\u6709\u6548\u914D\u984D\u5305");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "div", 17)(11, "span", 18);
    \u0275\u0275text(12, "\u{1F4B3}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 19)(14, "span", 20);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 21);
    \u0275\u0275text(17, "\u5F85\u652F\u4ED8\u8CEC\u55AE");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 17)(19, "span", 18);
    \u0275\u0275text(20, "\u{1F4C8}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 19)(22, "span", 20);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "span", 21);
    \u0275\u0275text(25, "\u672C\u6708\u8D85\u984D\u8CBB\u7528");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(26, "div", 17)(27, "span", 18);
    \u0275\u0275text(28, "\u{1F4B0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 19)(30, "span", 20);
    \u0275\u0275text(31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "span", 21);
    \u0275\u0275text(33, "\u7D2F\u8A08\u6D88\u8CBB");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275template(34, BillingViewComponent_div_4_section_34_Template, 5, 1, "section", 22);
    \u0275\u0275elementStart(35, "section", 23)(36, "h3");
    \u0275\u0275text(37, "\u6700\u8FD1\u8CEC\u55AE");
    \u0275\u0275elementEnd();
    \u0275\u0275template(38, BillingViewComponent_div_4_div_38_Template, 16, 1, "div", 24)(39, BillingViewComponent_div_4_ng_template_39_Template, 5, 0, "ng-template", null, 0, \u0275\u0275templateRefExtractor);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const noBills_r8 = \u0275\u0275reference(40);
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.activePackagesCount());
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r1.unpaidBillsCount());
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r1.billing.formatPrice(ctx_r1.totalOverage()));
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r1.billing.formatPrice(ctx_r1.totalSpent()));
    \u0275\u0275advance(3);
    \u0275\u0275property("ngIf", ctx_r1.overageInfo());
    \u0275\u0275advance(4);
    \u0275\u0275property("ngIf", ctx_r1.recentBills().length > 0)("ngIfElse", noBills_r8);
  }
}
function BillingViewComponent_div_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 15);
    \u0275\u0275element(1, "app-quota-pack-store");
    \u0275\u0275elementEnd();
  }
}
function BillingViewComponent_div_6_div_15_button_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 71);
    \u0275\u0275listener("click", function BillingViewComponent_div_6_div_15_button_15_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const bill_r11 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.payBill(bill_r11));
    });
    \u0275\u0275text(1, " \u7ACB\u5373\u652F\u4ED8 ");
    \u0275\u0275elementEnd();
  }
}
function BillingViewComponent_div_6_div_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 61)(1, "div", 62)(2, "span", 63);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 64);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 65);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 66)(9, "span", 67);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 68);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 69);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275template(15, BillingViewComponent_div_6_div_15_button_15_Template, 2, 0, "button", 70);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const bill_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getBillTypeIcon(bill_r11.billing_type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", bill_r11.id.slice(0, 12), "...");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(bill_r11.description);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("refund", bill_r11.amount < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", bill_r11.amount >= 0 ? "+" : "", "", ctx_r1.billing.formatPrice(bill_r11.amount), " ");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r1.billing.getBillStatusLabel(bill_r11.status).color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.billing.getBillStatusLabel(bill_r11.status).text, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatDate(bill_r11.created_at));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", bill_r11.status === "pending");
  }
}
function BillingViewComponent_div_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 15)(1, "section", 51)(2, "div", 52)(3, "select", 53);
    \u0275\u0275twoWayListener("valueChange", function BillingViewComponent_div_6_Template_select_valueChange_3_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.billFilter, $event) || (ctx_r1.billFilter = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("change", function BillingViewComponent_div_6_Template_select_change_3_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.loadFilteredBills());
    });
    \u0275\u0275elementStart(4, "option", 54);
    \u0275\u0275text(5, "\u5168\u90E8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "option", 55);
    \u0275\u0275text(7, "\u5F85\u652F\u4ED8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "option", 56);
    \u0275\u0275text(9, "\u5DF2\u652F\u4ED8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "option", 57);
    \u0275\u0275text(11, "\u5DF2\u9000\u6B3E");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "button", 58);
    \u0275\u0275listener("click", function BillingViewComponent_div_6_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.refreshBills());
    });
    \u0275\u0275text(13, " \u{1F504} \u5237\u65B0 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 59);
    \u0275\u0275template(15, BillingViewComponent_div_6_div_15_Template, 16, 12, "div", 60);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("value", ctx_r1.billFilter);
    \u0275\u0275advance(12);
    \u0275\u0275property("ngForOf", ctx_r1.allBills());
  }
}
var BillingViewComponent = class _BillingViewComponent {
  constructor() {
    this.billing = inject(BillingService);
    this.Math = Math;
    this.activeTab = signal("overview", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.billFilter = "";
    this.tabs = [
      { value: "overview", label: "\u6982\u89BD", icon: "\u{1F4CA}", badge: void 0 },
      { value: "packages", label: "\u914D\u984D\u5305", icon: "\u{1F4E6}", badge: void 0 },
      { value: "bills", label: "\u8CEC\u55AE", icon: "\u{1F4B3}", badge: () => this.unpaidBillsCount() }
    ];
    this.quotaIcons = {
      daily_messages: "\u{1F4AC}",
      ai_calls: "\u{1F916}"
    };
    this.quotaLabels = {
      daily_messages: "\u6BCF\u65E5\u6D88\u606F",
      ai_calls: "AI \u8ABF\u7528"
    };
    this.isFrozen = computed(() => this.billing.freezeStatus()?.frozen ?? false, ...ngDevMode ? [{ debugName: "isFrozen" }] : []);
    this.freezeReason = computed(() => this.billing.freezeStatus()?.reason ?? "", ...ngDevMode ? [{ debugName: "freezeReason" }] : []);
    this.unfreezeTime = computed(() => {
      const time = this.billing.freezeStatus()?.unfreeze_at;
      if (!time)
        return "";
      return this.formatDate(time);
    }, ...ngDevMode ? [{ debugName: "unfreezeTime" }] : []);
    this.activePackagesCount = computed(() => this.billing.myPackages().length, ...ngDevMode ? [{ debugName: "activePackagesCount" }] : []);
    this.unpaidBillsCount = computed(() => this.billing.unpaidBills().length, ...ngDevMode ? [{ debugName: "unpaidBillsCount" }] : []);
    this.totalOverage = computed(() => this.billing.totalOverageCharge(), ...ngDevMode ? [{ debugName: "totalOverage" }] : []);
    this.totalSpent = computed(() => {
      return this.billing.bills().filter((b) => b.status === "paid" && b.amount > 0).reduce((sum, b) => sum + b.amount, 0);
    }, ...ngDevMode ? [{ debugName: "totalSpent" }] : []);
    this.overageInfo = computed(() => this.billing.overageInfo(), ...ngDevMode ? [{ debugName: "overageInfo" }] : []);
    this.overageItems = computed(() => {
      const info = this.overageInfo();
      if (!info)
        return [];
      return Object.entries(info).map(([type, data]) => {
        const total = data.used;
        const base = Math.min(data.base_limit, total);
        const pack = Math.min(data.pack_bonus, Math.max(0, total - data.base_limit));
        const overage = data.overage;
        const max = Math.max(total, data.total_limit) || 1;
        return __spreadProps(__spreadValues({
          type
        }, data), {
          basePercent: base / max * 100,
          packPercent: pack / max * 100,
          overagePercent: overage / max * 100
        });
      });
    }, ...ngDevMode ? [{ debugName: "overageItems" }] : []);
    this.recentBills = computed(() => this.billing.bills().slice(0, 5), ...ngDevMode ? [{ debugName: "recentBills" }] : []);
    this.allBills = computed(() => this.billing.bills(), ...ngDevMode ? [{ debugName: "allBills" }] : []);
  }
  ngOnInit() {
    this.billing.refresh();
  }
  getQuotaIcon(type) {
    return this.quotaIcons[type] || "\u{1F4CA}";
  }
  getQuotaLabel(type) {
    return this.quotaLabels[type] || type;
  }
  getBillTypeIcon(type) {
    const icons = {
      subscription: "\u{1F4C5}",
      overage: "\u{1F4C8}",
      quota_pack: "\u{1F4E6}",
      refund: "\u21A9\uFE0F"
    };
    return icons[type] || "\u{1F4B3}";
  }
  formatDate(isoTime) {
    try {
      return new Date(isoTime).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoTime;
    }
  }
  async payBill(bill) {
    const result = await this.billing.payBill(bill.id);
    if (!result.success) {
      alert(result.error || "\u652F\u4ED8\u5931\u6557");
    }
  }
  async payUnpaidBills() {
    const unpaid = this.billing.unpaidBills();
    for (const bill of unpaid) {
      await this.billing.payBill(bill.id);
    }
  }
  loadFilteredBills() {
    this.billing.loadBills(this.billFilter || void 0);
  }
  refreshBills() {
    this.billing.loadBills();
  }
  static {
    this.\u0275fac = function BillingViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _BillingViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _BillingViewComponent, selectors: [["app-billing-view"]], decls: 7, vars: 5, consts: [["noBills", ""], [1, "billing-view"], ["class", "freeze-warning", 4, "ngIf"], [1, "tabs"], [3, "active", "click", 4, "ngFor", "ngForOf"], ["class", "tab-content", 4, "ngIf"], [1, "freeze-warning"], [1, "warning-icon"], [1, "warning-content"], ["class", "unfreeze-time", 4, "ngIf"], [1, "pay-btn", 3, "click"], [1, "unfreeze-time"], [3, "click"], ["class", "badge", 4, "ngIf"], [1, "badge"], [1, "tab-content"], [1, "stats-grid"], [1, "stat-card"], [1, "stat-icon"], [1, "stat-info"], [1, "stat-value"], [1, "stat-label"], ["class", "overage-section", 4, "ngIf"], [1, "recent-bills"], ["class", "bills-table", 4, "ngIf", "ngIfElse"], [1, "overage-section"], [1, "overage-list"], ["class", "overage-item", 4, "ngFor", "ngForOf"], [1, "overage-item"], [1, "overage-header"], [1, "quota-icon"], [1, "quota-name"], [1, "usage-bar"], [1, "usage-base"], [1, "usage-pack"], [1, "usage-overage"], [1, "usage-legend"], [1, "legend-item", "base"], ["class", "legend-item pack", 4, "ngIf"], ["class", "legend-item overage", 4, "ngIf"], ["class", "overage-charge", 4, "ngIf"], [1, "legend-item", "pack"], [1, "legend-item", "overage"], [1, "overage-charge"], [1, "bills-table"], [4, "ngFor", "ngForOf"], [1, "status-badge"], ["class", "action-btn", 3, "click", 4, "ngIf"], [1, "action-btn", 3, "click"], [1, "empty-state"], [1, "empty-icon"], [1, "all-bills"], [1, "bills-filter"], [3, "valueChange", "change", "value"], ["value", ""], ["value", "pending"], ["value", "paid"], ["value", "refunded"], [1, "refresh-btn", 3, "click"], [1, "bills-list"], ["class", "bill-card", 4, "ngFor", "ngForOf"], [1, "bill-card"], [1, "bill-header"], [1, "bill-type"], [1, "bill-id"], [1, "bill-desc"], [1, "bill-footer"], [1, "bill-amount"], [1, "bill-status"], [1, "bill-date"], ["class", "pay-bill-btn", 3, "click", 4, "ngIf"], [1, "pay-bill-btn", 3, "click"]], template: function BillingViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 1);
        \u0275\u0275template(1, BillingViewComponent_div_1_Template, 11, 2, "div", 2);
        \u0275\u0275elementStart(2, "div", 3);
        \u0275\u0275template(3, BillingViewComponent_button_3_Template, 3, 5, "button", 4);
        \u0275\u0275elementEnd();
        \u0275\u0275template(4, BillingViewComponent_div_4_Template, 41, 7, "div", 5)(5, BillingViewComponent_div_5_Template, 2, 0, "div", 5)(6, BillingViewComponent_div_6_Template, 16, 2, "div", 5);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.isFrozen());
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ctx.tabs);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab() === "overview");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab() === "packages");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab() === "bills");
      }
    }, dependencies: [CommonModule, NgForOf, NgIf, QuotaPackStoreComponent], styles: ['\n\n.billing-view[_ngcontent-%COMP%] {\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.freeze-warning[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 16px 24px;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(239, 68, 68, 0.2),\n      rgba(245, 158, 11, 0.2));\n  border: 1px solid #ef4444;\n  border-radius: 12px;\n  margin-bottom: 24px;\n}\n.warning-icon[_ngcontent-%COMP%] {\n  font-size: 32px;\n}\n.warning-content[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.warning-content[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0 0 4px;\n  color: #ef4444;\n}\n.warning-content[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 14px;\n  color: var(--text-secondary, #888);\n}\n.pay-btn[_ngcontent-%COMP%] {\n  padding: 12px 24px;\n  background: #ef4444;\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n}\n.tabs[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 24px;\n  border-bottom: 1px solid var(--border-color, #333);\n  padding-bottom: 12px;\n}\n.tabs[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  background: transparent;\n  border: none;\n  color: var(--text-secondary, #888);\n  font-size: 14px;\n  cursor: pointer;\n  border-radius: 8px;\n  transition: all 0.2s;\n  position: relative;\n}\n.tabs[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n  background: var(--bg-secondary, #1a1a1a);\n  color: var(--text-primary, #fff);\n}\n.badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  min-width: 18px;\n  height: 18px;\n  padding: 0 6px;\n  background: #ef4444;\n  border-radius: 9px;\n  font-size: 11px;\n  font-weight: 600;\n  color: white;\n}\n.stats-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 16px;\n  margin-bottom: 32px;\n}\n.stat-card[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 20px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.stat-icon[_ngcontent-%COMP%] {\n  font-size: 32px;\n}\n.stat-value[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 24px;\n  font-weight: 700;\n}\n.stat-label[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n}\n.overage-section[_ngcontent-%COMP%] {\n  margin-bottom: 32px;\n}\n.overage-section[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%], \n.recent-bills[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 18px;\n  margin: 0 0 16px;\n}\n.overage-list[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 16px;\n}\n.overage-item[_ngcontent-%COMP%] {\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.overage-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.quota-icon[_ngcontent-%COMP%] {\n  font-size: 20px;\n}\n.usage-bar[_ngcontent-%COMP%] {\n  height: 8px;\n  background: var(--bg-tertiary, #2a2a2a);\n  border-radius: 4px;\n  overflow: hidden;\n  display: flex;\n}\n.usage-base[_ngcontent-%COMP%] {\n  height: 100%;\n  background: #3b82f6;\n}\n.usage-pack[_ngcontent-%COMP%] {\n  height: 100%;\n  background: #22c55e;\n}\n.usage-overage[_ngcontent-%COMP%] {\n  height: 100%;\n  background: #ef4444;\n}\n.usage-legend[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  margin-top: 8px;\n  font-size: 12px;\n}\n.legend-item[_ngcontent-%COMP%]::before {\n  content: "";\n  display: inline-block;\n  width: 8px;\n  height: 8px;\n  border-radius: 2px;\n  margin-right: 4px;\n}\n.legend-item.base[_ngcontent-%COMP%]::before {\n  background: #3b82f6;\n}\n.legend-item.pack[_ngcontent-%COMP%]::before {\n  background: #22c55e;\n}\n.legend-item.overage[_ngcontent-%COMP%]::before {\n  background: #ef4444;\n}\n.overage-charge[_ngcontent-%COMP%] {\n  margin-top: 8px;\n  font-size: 13px;\n  color: #ef4444;\n  font-weight: 600;\n}\n.bills-table[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\ntable[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n}\nth[_ngcontent-%COMP%], \ntd[_ngcontent-%COMP%] {\n  padding: 12px;\n  text-align: left;\n  border-bottom: 1px solid var(--border-color, #333);\n}\nth[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  font-weight: 500;\n  font-size: 13px;\n}\ntd.refund[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.status-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 4px 8px;\n  border-radius: 4px;\n  font-size: 12px;\n  color: white;\n}\n.action-btn[_ngcontent-%COMP%] {\n  padding: 6px 12px;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 4px;\n  color: white;\n  font-size: 12px;\n  cursor: pointer;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 48px;\n  color: var(--text-secondary, #888);\n}\n.empty-icon[_ngcontent-%COMP%] {\n  font-size: 48px;\n  display: block;\n  margin-bottom: 12px;\n}\n.bills-filter[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 16px;\n}\n.bills-filter[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n}\n.refresh-btn[_ngcontent-%COMP%] {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n}\n.bills-list[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 16px;\n}\n.bill-card[_ngcontent-%COMP%] {\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.bill-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n.bill-type[_ngcontent-%COMP%] {\n  font-size: 20px;\n}\n.bill-id[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n  font-family: monospace;\n}\n.bill-desc[_ngcontent-%COMP%] {\n  font-size: 14px;\n  margin-bottom: 12px;\n}\n.bill-footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.bill-amount[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n}\n.bill-amount.refund[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.bill-date[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n  margin-top: 8px;\n}\n.pay-bill-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  margin-top: 12px;\n  padding: 10px;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n}\n/*# sourceMappingURL=billing-view.component.css.map */'], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BillingViewComponent, [{
    type: Component,
    args: [{ selector: "app-billing-view", standalone: true, imports: [CommonModule, QuotaPackStoreComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="billing-view">
      <!-- \u51CD\u7D50\u8B66\u544A -->
      <div class="freeze-warning" *ngIf="isFrozen()">
        <span class="warning-icon">\u26A0\uFE0F</span>
        <div class="warning-content">
          <h4>\u914D\u984D\u5DF2\u51CD\u7D50</h4>
          <p>{{ freezeReason() }}</p>
          <p class="unfreeze-time" *ngIf="unfreezeTime()">\u9810\u8A08\u89E3\u51CD\u6642\u9593\uFF1A{{ unfreezeTime() }}</p>
        </div>
        <button class="pay-btn" (click)="payUnpaidBills()">\u7ACB\u5373\u652F\u4ED8</button>
      </div>
      
      <!-- \u6A19\u7C64\u9801 -->
      <div class="tabs">
        <button 
          *ngFor="let tab of tabs"
          [class.active]="activeTab() === tab.value"
          (click)="activeTab.set(tab.value)">
          {{ tab.icon }} {{ tab.label }}
          <span class="badge" *ngIf="tab.badge && tab.badge() > 0">{{ tab.badge() }}</span>
        </button>
      </div>
      
      <!-- \u6982\u89BD\u6A19\u7C64\u9801 -->
      <div class="tab-content" *ngIf="activeTab() === 'overview'">
        <!-- \u7D71\u8A08\u5361\u7247 -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-icon">\u{1F4E6}</span>
            <div class="stat-info">
              <span class="stat-value">{{ activePackagesCount() }}</span>
              <span class="stat-label">\u6709\u6548\u914D\u984D\u5305</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">\u{1F4B3}</span>
            <div class="stat-info">
              <span class="stat-value">{{ unpaidBillsCount() }}</span>
              <span class="stat-label">\u5F85\u652F\u4ED8\u8CEC\u55AE</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">\u{1F4C8}</span>
            <div class="stat-info">
              <span class="stat-value">{{ billing.formatPrice(totalOverage()) }}</span>
              <span class="stat-label">\u672C\u6708\u8D85\u984D\u8CBB\u7528</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">\u{1F4B0}</span>
            <div class="stat-info">
              <span class="stat-value">{{ billing.formatPrice(totalSpent()) }}</span>
              <span class="stat-label">\u7D2F\u8A08\u6D88\u8CBB</span>
            </div>
          </div>
        </div>
        
        <!-- \u8D85\u984D\u4F7F\u7528\u60C5\u6CC1 -->
        <section class="overage-section" *ngIf="overageInfo()">
          <h3>\u8D85\u984D\u4F7F\u7528\u60C5\u6CC1</h3>
          <div class="overage-list">
            <div class="overage-item" *ngFor="let item of overageItems()">
              <div class="overage-header">
                <span class="quota-icon">{{ getQuotaIcon(item.type) }}</span>
                <span class="quota-name">{{ getQuotaLabel(item.type) }}</span>
              </div>
              <div class="usage-bar">
                <div class="usage-base" [style.width.%]="item.basePercent"></div>
                <div class="usage-pack" [style.width.%]="item.packPercent"></div>
                <div class="usage-overage" [style.width.%]="item.overagePercent"></div>
              </div>
              <div class="usage-legend">
                <span class="legend-item base">\u57FA\u790E {{ item.base_limit }}</span>
                <span class="legend-item pack" *ngIf="item.pack_bonus > 0">+\u914D\u984D\u5305 {{ item.pack_bonus }}</span>
                <span class="legend-item overage" *ngIf="item.overage > 0">\u8D85\u984D {{ item.overage }}</span>
              </div>
              <div class="overage-charge" *ngIf="item.charge > 0">
                \u9810\u8A08\u8CBB\u7528\uFF1A{{ billing.formatPrice(item.charge) }}
              </div>
            </div>
          </div>
        </section>
        
        <!-- \u6700\u8FD1\u8CEC\u55AE -->
        <section class="recent-bills">
          <h3>\u6700\u8FD1\u8CEC\u55AE</h3>
          <div class="bills-table" *ngIf="recentBills().length > 0; else noBills">
            <table>
              <thead>
                <tr>
                  <th>\u65E5\u671F</th>
                  <th>\u63CF\u8FF0</th>
                  <th>\u91D1\u984D</th>
                  <th>\u72C0\u614B</th>
                  <th>\u64CD\u4F5C</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let bill of recentBills()">
                  <td>{{ formatDate(bill.created_at) }}</td>
                  <td>{{ bill.description }}</td>
                  <td [class.refund]="bill.amount < 0">
                    {{ bill.amount < 0 ? '' : '' }}{{ billing.formatPrice(Math.abs(bill.amount)) }}
                  </td>
                  <td>
                    <span class="status-badge" [style.background]="billing.getBillStatusLabel(bill.status).color">
                      {{ billing.getBillStatusLabel(bill.status).text }}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn" *ngIf="bill.status === 'pending'" (click)="payBill(bill)">
                      \u652F\u4ED8
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noBills>
            <div class="empty-state">
              <span class="empty-icon">\u{1F4DD}</span>
              <p>\u66AB\u7121\u8CEC\u55AE\u8A18\u9304</p>
            </div>
          </ng-template>
        </section>
      </div>
      
      <!-- \u914D\u984D\u5305\u6A19\u7C64\u9801 -->
      <div class="tab-content" *ngIf="activeTab() === 'packages'">
        <app-quota-pack-store />
      </div>
      
      <!-- \u8CEC\u55AE\u6A19\u7C64\u9801 -->
      <div class="tab-content" *ngIf="activeTab() === 'bills'">
        <section class="all-bills">
          <div class="bills-filter">
            <select [(value)]="billFilter" (change)="loadFilteredBills()">
              <option value="">\u5168\u90E8</option>
              <option value="pending">\u5F85\u652F\u4ED8</option>
              <option value="paid">\u5DF2\u652F\u4ED8</option>
              <option value="refunded">\u5DF2\u9000\u6B3E</option>
            </select>
            <button class="refresh-btn" (click)="refreshBills()">
              \u{1F504} \u5237\u65B0
            </button>
          </div>
          
          <div class="bills-list">
            <div class="bill-card" *ngFor="let bill of allBills()">
              <div class="bill-header">
                <span class="bill-type">{{ getBillTypeIcon(bill.billing_type) }}</span>
                <span class="bill-id">{{ bill.id.slice(0, 12) }}...</span>
              </div>
              <div class="bill-desc">{{ bill.description }}</div>
              <div class="bill-footer">
                <span class="bill-amount" [class.refund]="bill.amount < 0">
                  {{ bill.amount >= 0 ? '+' : '' }}{{ billing.formatPrice(bill.amount) }}
                </span>
                <span class="bill-status" [style.color]="billing.getBillStatusLabel(bill.status).color">
                  {{ billing.getBillStatusLabel(bill.status).text }}
                </span>
              </div>
              <div class="bill-date">{{ formatDate(bill.created_at) }}</div>
              <button class="pay-bill-btn" *ngIf="bill.status === 'pending'" (click)="payBill(bill)">
                \u7ACB\u5373\u652F\u4ED8
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `, styles: ['/* angular:styles/component:css;890a6c9a8f96fce744920167b722eaac5f04abb4c718f1d40314b7be9aa7371c;D:/tgkz2026/src/views/billing-view.component.ts */\n.billing-view {\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.freeze-warning {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 16px 24px;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(239, 68, 68, 0.2),\n      rgba(245, 158, 11, 0.2));\n  border: 1px solid #ef4444;\n  border-radius: 12px;\n  margin-bottom: 24px;\n}\n.warning-icon {\n  font-size: 32px;\n}\n.warning-content {\n  flex: 1;\n}\n.warning-content h4 {\n  margin: 0 0 4px;\n  color: #ef4444;\n}\n.warning-content p {\n  margin: 0;\n  font-size: 14px;\n  color: var(--text-secondary, #888);\n}\n.pay-btn {\n  padding: 12px 24px;\n  background: #ef4444;\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n}\n.tabs {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 24px;\n  border-bottom: 1px solid var(--border-color, #333);\n  padding-bottom: 12px;\n}\n.tabs button {\n  padding: 10px 20px;\n  background: transparent;\n  border: none;\n  color: var(--text-secondary, #888);\n  font-size: 14px;\n  cursor: pointer;\n  border-radius: 8px;\n  transition: all 0.2s;\n  position: relative;\n}\n.tabs button.active {\n  background: var(--bg-secondary, #1a1a1a);\n  color: var(--text-primary, #fff);\n}\n.badge {\n  position: absolute;\n  top: 2px;\n  right: 2px;\n  min-width: 18px;\n  height: 18px;\n  padding: 0 6px;\n  background: #ef4444;\n  border-radius: 9px;\n  font-size: 11px;\n  font-weight: 600;\n  color: white;\n}\n.stats-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 16px;\n  margin-bottom: 32px;\n}\n.stat-card {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 20px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.stat-icon {\n  font-size: 32px;\n}\n.stat-value {\n  display: block;\n  font-size: 24px;\n  font-weight: 700;\n}\n.stat-label {\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n}\n.overage-section {\n  margin-bottom: 32px;\n}\n.overage-section h3,\n.recent-bills h3 {\n  font-size: 18px;\n  margin: 0 0 16px;\n}\n.overage-list {\n  display: grid;\n  gap: 16px;\n}\n.overage-item {\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.overage-header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.quota-icon {\n  font-size: 20px;\n}\n.usage-bar {\n  height: 8px;\n  background: var(--bg-tertiary, #2a2a2a);\n  border-radius: 4px;\n  overflow: hidden;\n  display: flex;\n}\n.usage-base {\n  height: 100%;\n  background: #3b82f6;\n}\n.usage-pack {\n  height: 100%;\n  background: #22c55e;\n}\n.usage-overage {\n  height: 100%;\n  background: #ef4444;\n}\n.usage-legend {\n  display: flex;\n  gap: 16px;\n  margin-top: 8px;\n  font-size: 12px;\n}\n.legend-item::before {\n  content: "";\n  display: inline-block;\n  width: 8px;\n  height: 8px;\n  border-radius: 2px;\n  margin-right: 4px;\n}\n.legend-item.base::before {\n  background: #3b82f6;\n}\n.legend-item.pack::before {\n  background: #22c55e;\n}\n.legend-item.overage::before {\n  background: #ef4444;\n}\n.overage-charge {\n  margin-top: 8px;\n  font-size: 13px;\n  color: #ef4444;\n  font-weight: 600;\n}\n.bills-table {\n  overflow-x: auto;\n}\ntable {\n  width: 100%;\n  border-collapse: collapse;\n}\nth,\ntd {\n  padding: 12px;\n  text-align: left;\n  border-bottom: 1px solid var(--border-color, #333);\n}\nth {\n  color: var(--text-secondary, #888);\n  font-weight: 500;\n  font-size: 13px;\n}\ntd.refund {\n  color: #22c55e;\n}\n.status-badge {\n  display: inline-block;\n  padding: 4px 8px;\n  border-radius: 4px;\n  font-size: 12px;\n  color: white;\n}\n.action-btn {\n  padding: 6px 12px;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 4px;\n  color: white;\n  font-size: 12px;\n  cursor: pointer;\n}\n.empty-state {\n  text-align: center;\n  padding: 48px;\n  color: var(--text-secondary, #888);\n}\n.empty-icon {\n  font-size: 48px;\n  display: block;\n  margin-bottom: 12px;\n}\n.bills-filter {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 16px;\n}\n.bills-filter select {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n}\n.refresh-btn {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n}\n.bills-list {\n  display: grid;\n  gap: 16px;\n}\n.bill-card {\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.bill-header {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n.bill-type {\n  font-size: 20px;\n}\n.bill-id {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n  font-family: monospace;\n}\n.bill-desc {\n  font-size: 14px;\n  margin-bottom: 12px;\n}\n.bill-footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.bill-amount {\n  font-size: 20px;\n  font-weight: 700;\n}\n.bill-amount.refund {\n  color: #22c55e;\n}\n.bill-date {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n  margin-top: 8px;\n}\n.pay-bill-btn {\n  width: 100%;\n  margin-top: 12px;\n  padding: 10px;\n  background: var(--primary, #3b82f6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n}\n/*# sourceMappingURL=billing-view.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(BillingViewComponent, { className: "BillingViewComponent", filePath: "src/views/billing-view.component.ts", lineNumber: 550 });
})();
export {
  BillingViewComponent
};
//# sourceMappingURL=chunk-XOJYTUJU.js.map
