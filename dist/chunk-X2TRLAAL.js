import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  ToastService
} from "./chunk-P26VRYR4.js";
import {
  Injectable,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-K4KD4A2Z.js";

// src/services/account-management.service.ts
var ACCOUNT_ROLES = [
  { id: "Listener", name: "\u76E3\u63A7\u865F", icon: "\u{1F441}\uFE0F", description: "\u7528\u65BC\u76E3\u63A7\u7FA4\u7D44\u6D88\u606F", color: "blue" },
  { id: "Sender", name: "\u767C\u9001\u865F", icon: "\u{1F4E4}", description: "\u7528\u65BC\u767C\u9001\u6D88\u606F", color: "green" },
  { id: "Explorer", name: "\u63A2\u7D22\u865F", icon: "\u{1F50D}", description: "\u7528\u65BC\u641C\u7D22\u548C\u767C\u73FE\u8CC7\u6E90", color: "purple" },
  { id: "AI", name: "AI \u865F", icon: "\u{1F916}", description: "\u7528\u65BC AI \u5C0D\u8A71", color: "cyan" },
  { id: "Backup", name: "\u5099\u7528\u865F", icon: "\u26A1", description: "\u5099\u7528\u5E33\u865F", color: "yellow" },
  { id: "Unassigned", name: "\u672A\u5206\u914D", icon: "\u2B55", description: "\u5C1A\u672A\u5206\u914D\u89D2\u8272", color: "gray" }
];
var AccountManagementService = class _AccountManagementService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._accounts = signal([], ...ngDevMode ? [{ debugName: "_accounts" }] : []);
    this._selectedAccountIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "_selectedAccountIds" }] : []);
    this._filter = signal({ status: "all", role: "all" }, ...ngDevMode ? [{ debugName: "_filter" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._initialized = false;
    this.accounts = this._accounts.asReadonly();
    this.selectedAccountIds = this._selectedAccountIds.asReadonly();
    this.filter = this._filter.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.filteredAccounts = computed(() => {
      const accounts = this._accounts();
      const filter = this._filter();
      return accounts.filter((account) => {
        if (filter.status && filter.status !== "all") {
          if (account.status !== filter.status)
            return false;
        }
        if (filter.role && filter.role !== "all") {
          if (account.role !== filter.role)
            return false;
        }
        if (filter.search) {
          const search = filter.search.toLowerCase();
          const matchPhone = account.phone?.toLowerCase().includes(search);
          const matchName = account.name?.toLowerCase().includes(search);
          if (!matchPhone && !matchName)
            return false;
        }
        return true;
      });
    }, ...ngDevMode ? [{ debugName: "filteredAccounts" }] : []);
    this.stats = computed(() => {
      const accounts = this._accounts();
      const byRole = {};
      for (const role of ACCOUNT_ROLES) {
        byRole[role.id] = 0;
      }
      for (const account of accounts) {
        if (account.role && byRole[account.role] !== void 0) {
          byRole[account.role]++;
        }
      }
      return {
        total: accounts.length,
        online: accounts.filter((a) => a.status === "Online").length,
        offline: accounts.filter((a) => a.status === "Offline").length,
        connecting: accounts.filter((a) => a.status === "Connecting").length,
        error: accounts.filter((a) => a.status === "Error" || a.status === "Banned").length,
        byRole
      };
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.onlineAccounts = computed(() => this._accounts().filter((a) => a.status === "Online"), ...ngDevMode ? [{ debugName: "onlineAccounts" }] : []);
    this.listenerAccounts = computed(() => this._accounts().filter((a) => a.role === "Listener" && a.status === "Online"), ...ngDevMode ? [{ debugName: "listenerAccounts" }] : []);
    this.senderAccounts = computed(() => this._accounts().filter((a) => a.role === "Sender" && a.status === "Online"), ...ngDevMode ? [{ debugName: "senderAccounts" }] : []);
    this.selectedAccounts = computed(() => {
      const ids = this._selectedAccountIds();
      return this._accounts().filter((a) => ids.has(a.id));
    }, ...ngDevMode ? [{ debugName: "selectedAccounts" }] : []);
    this.hasSelection = computed(() => this._selectedAccountIds().size > 0, ...ngDevMode ? [{ debugName: "hasSelection" }] : []);
    this.allSelected = computed(() => {
      const filtered = this.filteredAccounts();
      const selected = this._selectedAccountIds();
      return filtered.length > 0 && filtered.every((a) => selected.has(a.id));
    }, ...ngDevMode ? [{ debugName: "allSelected" }] : []);
    this._loginState = signal({
      accountId: null,
      phone: "",
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    }, ...ngDevMode ? [{ debugName: "_loginState" }] : []);
    this._loginCode = signal("", ...ngDevMode ? [{ debugName: "_loginCode" }] : []);
    this._login2FAPassword = signal("", ...ngDevMode ? [{ debugName: "_login2FAPassword" }] : []);
    this.loginState = this._loginState.asReadonly();
    this.loginCode = this._loginCode.asReadonly();
    this.login2FAPassword = this._login2FAPassword.asReadonly();
    this.setupIpcListeners();
  }
  setupIpcListeners() {
    if (this._initialized)
      return;
    this._initialized = true;
    console.log("[AccountManagementService] Setting up IPC listeners");
    this.ipc.on("accounts-updated", (accounts) => {
      console.log("[AccountManagementService] Received accounts-updated:", accounts.length, "accounts");
      this._accounts.set(accounts);
      this._isLoading.set(false);
    });
    this.ipc.on("account-deleted", (data) => {
      if (data.success) {
        this._accounts.update((list) => list.filter((a) => a.id !== data.accountId));
        this.toast.success("\u5E33\u865F\u5DF2\u522A\u9664");
      } else {
        this.toast.error(`\u522A\u9664\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipc.on("login-requires-code", (data) => {
      console.log("[AccountManagementService] Login requires code for account:", data.accountId);
      this.handleCodeRequired(data);
    });
    this.ipc.on("login-requires-2fa", (data) => {
      console.log("[AccountManagementService] Login requires 2FA for account:", data.accountId);
      this.handle2FARequired(data);
    });
    this.ipc.on("login-success", (data) => {
      console.log("[AccountManagementService] Login success for account:", data.accountId);
      this.handleLoginSuccess(data);
    });
    this.ipc.on("login-failed", (data) => {
      console.log("[AccountManagementService] Login failed for account:", data.accountId);
      this.handleLoginFailed(data);
    });
    this.ipc.on("logout-result", (data) => {
      this.handleLogoutResult(data);
    });
    this.loadAccounts();
  }
  loadAccounts() {
    console.log("[AccountManagementService] Loading accounts...");
    this._isLoading.set(true);
    this.ipc.send("get-accounts");
  }
  // ========== 帳號操作 ==========
  setAccounts(accounts) {
    this._accounts.set(accounts);
  }
  updateAccount(account) {
    this._accounts.update((list) => list.map((a) => a.id === account.id ? __spreadValues(__spreadValues({}, a), account) : a));
  }
  addAccount(account) {
    this._accounts.update((list) => [...list, account]);
  }
  removeAccount(accountId) {
    this._accounts.update((list) => list.filter((a) => a.id !== accountId));
    this._selectedAccountIds.update((ids) => {
      const newIds = new Set(ids);
      newIds.delete(accountId);
      return newIds;
    });
  }
  // ========== 選擇操作 ==========
  toggleSelection(accountId) {
    this._selectedAccountIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(accountId)) {
        newIds.delete(accountId);
      } else {
        newIds.add(accountId);
      }
      return newIds;
    });
  }
  selectAll() {
    const filtered = this.filteredAccounts();
    this._selectedAccountIds.set(new Set(filtered.map((a) => a.id)));
  }
  deselectAll() {
    this._selectedAccountIds.set(/* @__PURE__ */ new Set());
  }
  toggleSelectAll() {
    if (this.allSelected()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }
  isSelected(accountId) {
    return this._selectedAccountIds().has(accountId);
  }
  // ========== 過濾操作 ==========
  setFilter(filter) {
    this._filter.update((f) => __spreadValues(__spreadValues({}, f), filter));
  }
  clearFilter() {
    this._filter.set({ status: "all", role: "all" });
  }
  // ========== API 操作 ==========
  async connectAccount(accountId) {
    const account = this._accounts().find((a) => a.id === accountId);
    if (!account)
      return false;
    this.updateAccount(__spreadProps(__spreadValues({}, account), { status: "Connecting" }));
    return new Promise((resolve) => {
      this.ipc.send("connect-account", { accountId, phone: account.phone });
      resolve(true);
    });
  }
  async disconnectAccount(accountId) {
    const account = this._accounts().find((a) => a.id === accountId);
    if (!account)
      return false;
    return new Promise((resolve) => {
      this.ipc.send("disconnect-account", { accountId, phone: account.phone });
      resolve(true);
    });
  }
  async deleteAccount(accountId) {
    return new Promise((resolve) => {
      this.ipc.send("delete-account", { accountId });
      resolve(true);
    });
  }
  async setAccountRole(accountId, role) {
    const account = this._accounts().find((a) => a.id === accountId);
    if (!account)
      return false;
    this.updateAccount(__spreadProps(__spreadValues({}, account), { role }));
    return new Promise((resolve) => {
      this.ipc.send("update-account", {
        accountId,
        updates: { role }
      });
      resolve(true);
    });
  }
  async batchSetRole(accountIds, role) {
    for (const id of accountIds) {
      await this.setAccountRole(id, role);
    }
    this.toast.success(`\u5DF2\u5C07 ${accountIds.length} \u500B\u5E33\u865F\u8A2D\u70BA ${this.getRoleName(role)}`);
  }
  async batchConnect(accountIds) {
    for (const id of accountIds) {
      await this.connectAccount(id);
    }
    this.toast.info(`\u6B63\u5728\u9023\u63A5 ${accountIds.length} \u500B\u5E33\u865F...`);
  }
  async batchDisconnect(accountIds) {
    for (const id of accountIds) {
      await this.disconnectAccount(id);
    }
    this.toast.info(`\u6B63\u5728\u65B7\u958B ${accountIds.length} \u500B\u5E33\u865F...`);
  }
  // ========== 輔助方法 ==========
  getAccount(accountId) {
    return this._accounts().find((a) => a.id === accountId);
  }
  getAccountByPhone(phone) {
    return this._accounts().find((a) => a.phone === phone);
  }
  getRoleInfo(role) {
    return ACCOUNT_ROLES.find((r) => r.id === role);
  }
  getRoleName(role) {
    return this.getRoleInfo(role)?.name || "\u672A\u77E5";
  }
  getRoleIcon(role) {
    return this.getRoleInfo(role)?.icon || "\u2B55";
  }
  getStatusColor(status) {
    const colors = {
      "Online": "text-green-400",
      "Offline": "text-gray-400",
      "Connecting": "text-yellow-400",
      "Error": "text-red-400",
      "Banned": "text-red-500",
      "Limited": "text-orange-400"
    };
    return colors[status] || "text-gray-400";
  }
  getStatusText(status) {
    const texts = {
      "Online": "\u5728\u7DDA",
      "Offline": "\u96E2\u7DDA",
      "Connecting": "\u9023\u63A5\u4E2D",
      "Error": "\u932F\u8AA4",
      "Banned": "\u5DF2\u5C01\u7981",
      "Limited": "\u53D7\u9650"
    };
    return texts[status] || "\u672A\u77E5";
  }
  setLoginCode(code) {
    this._loginCode.set(code);
  }
  setLogin2FAPassword(password) {
    this._login2FAPassword.set(password);
  }
  // ========== 登錄操作 ==========
  loginAccount(accountId) {
    const account = this._accounts().find((a) => a.id === accountId);
    if (!account) {
      this.toast.error("\u8D26\u6237\u672A\u627E\u5230");
      return;
    }
    this.toast.info("\u6B63\u5728\u767B\u5F55\u8D26\u6237...");
    this._loginState.set({
      accountId,
      phone: account.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this._loginCode.set("");
    this._login2FAPassword.set("");
    this.ipc.send("login-account", accountId);
  }
  logoutAccount(accountId) {
    const account = this._accounts().find((a) => a.id === accountId);
    if (!account) {
      this.toast.error("\u8D26\u6237\u672A\u627E\u5230");
      return;
    }
    if (confirm(`\u786E\u5B9A\u8981\u9000\u51FA\u8D26\u6237 ${account.phone} \u5417\uFF1F`)) {
      this.toast.info("\u6B63\u5728\u9000\u51FA\u8D26\u6237...");
      this.ipc.send("logout-account", accountId);
    }
  }
  submitLoginCode() {
    const state = this._loginState();
    if (!state.accountId || !state.phoneCodeHash || !this._loginCode().trim()) {
      return;
    }
    this._loginState.set({
      accountId: state.accountId,
      phone: state.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: state.phoneCodeHash,
      isSubmittingCode: true
    });
    this.toast.info("\u6B63\u5728\u9A8C\u8BC1\u9A8C\u8BC1\u7801...");
    this.ipc.send("login-account", {
      accountId: state.accountId,
      phoneCode: this._loginCode().trim(),
      phoneCodeHash: state.phoneCodeHash
    });
    this._loginCode.set("");
  }
  submitLogin2FA() {
    const state = this._loginState();
    if (!state.accountId || !this._login2FAPassword().trim()) {
      return;
    }
    this.ipc.send("login-account", {
      accountId: state.accountId,
      twoFactorPassword: this._login2FAPassword().trim()
    });
    this._login2FAPassword.set("");
  }
  cancelLogin() {
    this._loginState.set({
      accountId: null,
      phone: "",
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this._loginCode.set("");
    this._login2FAPassword.set("");
  }
  resendVerificationCode() {
    const state = this._loginState();
    if (!state.accountId)
      return;
    this._loginState.set({
      accountId: state.accountId,
      phone: state.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this._loginCode.set("");
    this.toast.info("\u6B63\u5728\u91CD\u65B0\u53D1\u9001\u9A8C\u8BC1\u7801\u5230\u60A8\u7684 Telegram \u5E94\u7528...", 5e3);
    this.ipc.send("login-account", state.accountId);
  }
  checkAccountStatus(accountId) {
    this.ipc.send("check-account-status", accountId);
  }
  // ========== IPC 事件處理 ==========
  handleCodeRequired(data) {
    this._loginState.update((s) => __spreadProps(__spreadValues({}, s), {
      accountId: data.accountId,
      requiresCode: true,
      phoneCodeHash: data.phoneCodeHash,
      isSubmittingCode: false
    }));
  }
  handle2FARequired(data) {
    this._loginState.update((s) => __spreadProps(__spreadValues({}, s), {
      accountId: data.accountId,
      requiresCode: false,
      requires2FA: true,
      isSubmittingCode: false
    }));
  }
  handleLoginSuccess(data) {
    this._loginState.set({
      accountId: null,
      phone: "",
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this.toast.success("\u767B\u5F55\u6210\u529F");
  }
  handleLoginFailed(data) {
    this._loginState.update((s) => __spreadProps(__spreadValues({}, s), {
      isSubmittingCode: false
    }));
    this.toast.error(`\u767B\u5F55\u5931\u8D25: ${data.error}`);
  }
  handleLogoutResult(data) {
    if (data.success) {
      const account = this._accounts().find((a) => a.id === data.accountId);
      this.toast.success(`\u8D26\u6237 ${account?.phone || ""} \u5DF2\u9000\u51FA`);
    } else {
      this.toast.error(`\u9000\u51FA\u5931\u8D25: ${data.error || "\u672A\u77E5\u9519\u8BEF"}`);
    }
  }
  static {
    this.\u0275fac = function AccountManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AccountManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AccountManagementService, factory: _AccountManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AccountManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  AccountManagementService
};
//# sourceMappingURL=chunk-X2TRLAAL.js.map
