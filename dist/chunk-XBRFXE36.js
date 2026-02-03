import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  Component,
  Injectable,
  Input,
  Output,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵdomProperty,
  ɵɵgetCurrentView,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-K4KD4A2Z.js";

// src/monitoring/monitoring-state.service.ts
var MonitoringStateService = class _MonitoringStateService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this._accounts = signal([], ...ngDevMode ? [{ debugName: "_accounts" }] : []);
    this._groups = signal([], ...ngDevMode ? [{ debugName: "_groups" }] : []);
    this._keywordSets = signal([], ...ngDevMode ? [{ debugName: "_keywordSets" }] : []);
    this._chatTemplates = signal([], ...ngDevMode ? [{ debugName: "_chatTemplates" }] : []);
    this._triggerRules = signal([], ...ngDevMode ? [{ debugName: "_triggerRules" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._lastUpdated = signal(null, ...ngDevMode ? [{ debugName: "_lastUpdated" }] : []);
    this._aiProcessing = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_aiProcessing" }] : []);
    this._aiStats = signal({
      totalReplies: 0,
      successRate: 100,
      avgResponseTime: 0
    }, ...ngDevMode ? [{ debugName: "_aiStats" }] : []);
    this.accounts = this._accounts.asReadonly();
    this.groups = this._groups.asReadonly();
    this.keywordSets = this._keywordSets.asReadonly();
    this.chatTemplates = this._chatTemplates.asReadonly();
    this.triggerRules = this._triggerRules.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.lastUpdated = this._lastUpdated.asReadonly();
    this.aiProcessing = this._aiProcessing.asReadonly();
    this.aiStats = this._aiStats.asReadonly();
    this.connectedAccounts = computed(() => this._accounts().filter((a) => a.status === "connected"), ...ngDevMode ? [{ debugName: "connectedAccounts" }] : []);
    this.listenerAccounts = computed(() => this._accounts().filter((a) => a.isListener), ...ngDevMode ? [{ debugName: "listenerAccounts" }] : []);
    this.senderAccounts = computed(() => this._accounts().filter((a) => a.isSender), ...ngDevMode ? [{ debugName: "senderAccounts" }] : []);
    this.monitoringGroups = computed(() => this._groups().filter((g) => g.isMonitoring), ...ngDevMode ? [{ debugName: "monitoringGroups" }] : []);
    this.totalMembers = computed(() => this._groups().reduce((sum, g) => sum + g.memberCount, 0), ...ngDevMode ? [{ debugName: "totalMembers" }] : []);
    this.todayMatches = computed(() => this._groups().reduce((sum, g) => sum + (g.stats?.matchesToday || 0), 0), ...ngDevMode ? [{ debugName: "todayMatches" }] : []);
    this.groupsWithKeywords = computed(() => this._groups().filter((g) => g.linkedKeywordSets.length > 0), ...ngDevMode ? [{ debugName: "groupsWithKeywords" }] : []);
    this.activeKeywordSets = computed(() => this._keywordSets().filter((s) => s.isActive), ...ngDevMode ? [{ debugName: "activeKeywordSets" }] : []);
    this.totalKeywords = computed(() => this._keywordSets().reduce((sum, s) => sum + s.keywords.length, 0), ...ngDevMode ? [{ debugName: "totalKeywords" }] : []);
    this.totalKeywordMatches = computed(() => this._keywordSets().reduce((sum, s) => sum + s.totalMatches, 0), ...ngDevMode ? [{ debugName: "totalKeywordMatches" }] : []);
    this.activeTemplates = computed(() => this._chatTemplates().filter((t) => t.isActive), ...ngDevMode ? [{ debugName: "activeTemplates" }] : []);
    this.activeTriggerRules = computed(() => this._triggerRules().filter((r) => r.isActive || r.is_active), ...ngDevMode ? [{ debugName: "activeTriggerRules" }] : []);
    this.hasActiveTriggerRules = computed(() => this.activeTriggerRules().length > 0, ...ngDevMode ? [{ debugName: "hasActiveTriggerRules" }] : []);
    this.configStatus = computed(() => {
      const steps = [
        {
          id: "listener",
          name: "\u76E3\u63A7\u5E33\u865F",
          description: "\u8A2D\u7F6E\u7528\u65BC\u76E3\u63A7\u7FA4\u7D44\u6D88\u606F\u7684\u5E33\u865F",
          isCompleted: this.listenerAccounts().some((a) => a.status === "connected"),
          count: this.listenerAccounts().length,
          action: "add-listener",
          icon: "\u{1F464}"
        },
        {
          id: "groups",
          name: "\u76E3\u63A7\u7FA4\u7D44",
          description: "\u6DFB\u52A0\u9700\u8981\u76E3\u63A7\u7684 Telegram \u7FA4\u7D44",
          isCompleted: this._groups().length > 0,
          count: this._groups().length,
          action: "add-group",
          icon: "\u{1F4AC}"
        },
        {
          id: "keywords",
          name: "\u95DC\u9375\u8A5E\u96C6",
          description: "\u5275\u5EFA\u7528\u65BC\u5339\u914D\u6D88\u606F\u7684\u95DC\u9375\u8A5E",
          isCompleted: this._keywordSets().some((s) => s.keywords.length > 0),
          count: this.totalKeywords(),
          action: "add-keywords",
          icon: "\u{1F511}"
        },
        {
          id: "binding",
          name: "\u7D81\u5B9A\u8A5E\u96C6",
          description: "\u5C07\u95DC\u9375\u8A5E\u96C6\u7D81\u5B9A\u5230\u76E3\u63A7\u7FA4\u7D44",
          isCompleted: this.groupsWithKeywords().length > 0,
          count: this.groupsWithKeywords().length,
          action: "bind-keywords",
          icon: "\u{1F517}"
        },
        {
          id: "templates",
          name: "\u804A\u5929\u6A21\u7248",
          description: "\u8A2D\u7F6E\u81EA\u52D5\u56DE\u8986\u4F7F\u7528\u7684\u6D88\u606F\u6A21\u7248",
          isCompleted: this._chatTemplates().length > 0,
          count: this._chatTemplates().length,
          action: "add-template",
          icon: "\u{1F4DD}"
        },
        {
          id: "sender",
          name: "\u767C\u9001\u5E33\u865F",
          description: "\u914D\u7F6E\u7528\u65BC\u767C\u9001\u6D88\u606F\u7684\u5E33\u865F",
          isCompleted: this.senderAccounts().some((a) => a.status === "connected"),
          count: this.senderAccounts().length,
          action: "add-sender",
          icon: "\u{1F4E4}"
        }
      ];
      const completedCount = steps.filter((s) => s.isCompleted).length;
      const totalCount = steps.length;
      const percentage = Math.round(completedCount / totalCount * 100);
      const isReady = completedCount >= 4;
      const nextStep = steps.find((s) => !s.isCompleted);
      return {
        steps,
        completedCount,
        totalCount,
        percentage,
        isReady,
        nextStep
      };
    }, ...ngDevMode ? [{ debugName: "configStatus" }] : []);
    this.listeners = [];
    this.aiProcessingCount = computed(() => this._aiProcessing().size, ...ngDevMode ? [{ debugName: "aiProcessingCount" }] : []);
    this._loadAllTimeout = null;
    this._lastLoadTime = 0;
    this._isInitialLoadDone = false;
    this.setupListeners();
  }
  ngOnDestroy() {
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("initial-state", (data) => {
      this.processInitialState(data);
    });
    this.listeners.push(cleanup1);
    const cleanup1b = this.ipcService.on("initial-state-config", (data) => {
      console.log("[StateService] Received initial-state-config");
      this.processInitialState(data);
    });
    this.listeners.push(cleanup1b);
    const cleanup2 = this.ipcService.on("accounts-updated", (accounts) => {
      this.updateAccounts(accounts);
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("get-groups-result", (data) => {
      if (data.groups) {
        this.updateGroups(data.groups);
      }
    });
    this.listeners.push(cleanup3);
    const cleanup4 = this.ipcService.on("get-keyword-sets-result", (data) => {
      if (data.keywordSets) {
        this.updateKeywordSets(data.keywordSets);
      }
    });
    this.listeners.push(cleanup4);
    const cleanup5 = this.ipcService.on("get-chat-templates-result", (data) => {
      if (data.templates) {
        this.updateChatTemplates(data.templates);
      }
    });
    this.listeners.push(cleanup5);
    const cleanup6 = this.ipcService.on("templates-updated", (data) => {
      if (data.chatTemplates) {
        this.updateChatTemplates(data.chatTemplates);
      } else if (data.messageTemplates) {
        this.updateChatTemplates(data.messageTemplates);
      }
    });
    this.listeners.push(cleanup6);
    const cleanup7 = this.ipcService.on("trigger-rules-result", (data) => {
      if (data.success && data.rules) {
        this.updateTriggerRules(data.rules);
      }
    });
    this.listeners.push(cleanup7);
    const cleanup8 = this.ipcService.on("private-message-received", (data) => {
      if (data.userId && data.username) {
        this.markAiProcessing(data.userId, data.username);
      }
    });
    this.listeners.push(cleanup8);
    const cleanup9 = this.ipcService.on("ai-response-sent", (data) => {
      if (data.userId) {
        this.markAiCompleted(data.userId, true);
      }
    });
    this.listeners.push(cleanup9);
    const cleanup10 = this.ipcService.on("ai-suggestion-ready", (data) => {
      if (data.userId) {
        this.markAiCompleted(data.userId, true);
      }
    });
    this.listeners.push(cleanup10);
  }
  // === AI 狀態管理 ===
  markAiProcessing(userId, username) {
    const current = new Map(this._aiProcessing());
    current.set(userId, { user: username, startTime: /* @__PURE__ */ new Date() });
    this._aiProcessing.set(current);
  }
  markAiCompleted(userId, success) {
    const current = new Map(this._aiProcessing());
    const entry = current.get(userId);
    if (entry) {
      const responseTime = Date.now() - entry.startTime.getTime();
      current.delete(userId);
      this._aiProcessing.set(current);
      const stats = this._aiStats();
      const totalReplies = stats.totalReplies + 1;
      const successRate = success ? (stats.successRate * stats.totalReplies + 100) / totalReplies : stats.successRate * stats.totalReplies / totalReplies;
      const avgResponseTime = (stats.avgResponseTime * stats.totalReplies + responseTime) / totalReplies;
      this._aiStats.set({
        totalReplies,
        successRate: Math.round(successRate),
        avgResponseTime: Math.round(avgResponseTime)
      });
    }
  }
  loadAll(force = false) {
    const now = Date.now();
    if (!force && this._isInitialLoadDone && now - this._lastLoadTime < 3e3) {
      console.log("[StateService] Skipping loadAll - recently loaded");
      return;
    }
    if (this._loadAllTimeout) {
      clearTimeout(this._loadAllTimeout);
    }
    this._loadAllTimeout = setTimeout(() => {
      this._isLoading.set(true);
      this._lastLoadTime = Date.now();
      console.log("[StateService] Loading all data...");
      this.ipcService.send("get-initial-state");
      this.ipcService.send("get-monitored-groups", {});
      this.ipcService.send("get-trigger-rules", {});
      this.ipcService.send("get-chat-templates", {});
      this.ipcService.send("get-keyword-sets", {});
      this._isInitialLoadDone = true;
      this._loadAllTimeout = null;
    }, 300);
  }
  refresh() {
    console.log("[StateService] Refreshing all data...");
    this.loadAll(true);
  }
  // === 數據處理 ===
  processInitialState(data) {
    console.log("[StateService] Processing initial state, keys:", Object.keys(data));
    if (data.accounts) {
      this.updateAccounts(data.accounts);
    }
    if (data.monitoredGroups) {
      this.updateGroups(data.monitoredGroups);
    }
    if (data.keywordSets) {
      this.updateKeywordSets(data.keywordSets);
    }
    if (data.chatTemplates) {
      this.updateChatTemplates(data.chatTemplates);
    }
    if (data.messageTemplates && !data.chatTemplates) {
      this.updateChatTemplates(data.messageTemplates);
    }
    if (data.triggerRules) {
      this.updateTriggerRules(data.triggerRules);
    }
    this._isLoading.set(false);
    this._lastUpdated.set(/* @__PURE__ */ new Date());
  }
  updateAccounts(rawAccounts) {
    const accounts = rawAccounts.map((acc) => ({
      id: acc.id || acc.phone,
      phone: acc.phone || "",
      username: acc.nickname || acc.username || acc.firstName || "",
      firstName: acc.first_name || acc.firstName || "",
      avatar: acc.avatar || acc.photo || "",
      status: acc.status === "Online" ? "connected" : acc.status === "Error" ? "error" : "disconnected",
      isListener: acc.role === "Listener",
      isSender: acc.role === "Sender",
      healthScore: acc.healthScore || 100,
      dailySendLimit: acc.dailySendLimit || 50,
      dailySendCount: acc.dailySendCount || 0,
      stats: {
        sentToday: acc.dailyMessageCount || 0,
        sentWeek: acc.weeklyMessageCount || 0,
        repliesWeek: 0,
        conversionsWeek: 0
      }
    }));
    this._accounts.set(accounts);
  }
  updateGroups(rawGroups) {
    console.log("[StateService] ========== updateGroups ==========");
    console.log("[StateService] Raw groups count:", rawGroups?.length);
    const groups = rawGroups.map((g) => {
      const keywordSetIds = g.keywordSetIds || g.keyword_set_ids || [];
      const linkedKeywordSets = keywordSetIds.map((id) => String(id));
      console.log(`[StateService] Group ${g.id} "${g.name}": keywordSetIds=`, keywordSetIds, "linkedKeywordSets=", linkedKeywordSets);
      return {
        id: String(g.id),
        name: g.name || g.title || g.url || "\u672A\u77E5\u7FA4\u7D44",
        url: g.url || g.link || "",
        telegramId: g.telegram_id || g.telegramId || "",
        // 🔧 FIX: 添加 Telegram 數字 ID
        memberCount: g.memberCount || g.member_count || 0,
        isMonitoring: g.is_active !== false,
        linkedKeywordSets,
        accountPhone: g.phone || g.account_phone,
        stats: {
          matchesToday: g.matchesToday || 0,
          matchesWeek: g.matchesWeek || 0,
          leadsToday: g.leadsToday || 0,
          leadsWeek: g.leadsWeek || 0
        }
      };
    });
    this._groups.set(groups);
    console.log("[StateService] Groups updated, total:", groups.length);
  }
  /**
   * 更新單個群組的關鍵詞集綁定
   */
  updateGroupKeywordSets(groupId, linkedKeywordSets) {
    this._groups.update((groups) => groups.map((g) => g.id === groupId ? __spreadProps(__spreadValues({}, g), { linkedKeywordSets }) : g));
  }
  /**
   * 🆕 更新單個群組的成員數
   */
  updateGroupMemberCount(groupId, memberCount) {
    this._groups.update((groups) => groups.map((g) => g.id === groupId ? __spreadProps(__spreadValues({}, g), { memberCount }) : g));
  }
  updateKeywordSets(rawSets) {
    const sets = rawSets.map((s) => {
      let keywords = [];
      if (s.keywords) {
        if (typeof s.keywords === "string") {
          try {
            const parsed = JSON.parse(s.keywords);
            keywords = Array.isArray(parsed) ? parsed.map((k, idx) => ({
              id: String(k.id || idx),
              text: typeof k === "string" ? k : k.text || k.keyword || "",
              matchCount: k.matchCount || 0,
              isNew: false
            })) : [];
          } catch {
            keywords = [];
          }
        } else if (Array.isArray(s.keywords)) {
          keywords = s.keywords.map((k, idx) => ({
            id: String(k.id || idx),
            text: typeof k === "string" ? k : k.text || k.keyword || "",
            matchCount: k.matchCount || 0,
            isNew: false
          }));
        }
      }
      return {
        id: String(s.id),
        name: s.name,
        keywords,
        matchMode: s.matchMode || "fuzzy",
        isActive: s.is_active !== false && s.isActive !== false,
        totalMatches: keywords.reduce((sum, k) => sum + (k.matchCount || 0), 0)
      };
    });
    this._keywordSets.set(sets);
  }
  updateChatTemplates(rawTemplates) {
    const templates = rawTemplates.map((t) => {
      let variables = [];
      if (t.variables) {
        if (typeof t.variables === "string") {
          try {
            variables = JSON.parse(t.variables);
          } catch {
            variables = [];
          }
        } else if (Array.isArray(t.variables)) {
          variables = t.variables;
        }
      }
      return {
        id: String(t.id),
        name: t.name,
        content: t.content || "",
        templateType: t.template_type || t.templateType || "custom",
        variables,
        usageCount: t.usage_count || t.usageCount || 0,
        isActive: t.is_active !== false && t.isActive !== false
      };
    });
    this._chatTemplates.set(templates);
  }
  updateTriggerRules(rawRules) {
    const rules = rawRules.map((r) => __spreadProps(__spreadValues({}, r), {
      id: r.id,
      name: r.name,
      isActive: r.is_active === 1 || r.isActive === true,
      responseType: r.response_type || r.responseType,
      triggerCount: r.trigger_count || r.triggerCount || 0,
      successCount: r.success_count || r.successCount || 0
    }));
    this._triggerRules.set(rules);
    console.log("[StateService] Trigger rules updated, total:", rules.length, "active:", rules.filter((r) => r.isActive).length);
  }
  // === 輔助方法 ===
  getKeywordSetById(id) {
    return this._keywordSets().find((s) => s.id === id);
  }
  getKeywordSetName(id) {
    const set = this.getKeywordSetById(id);
    return set ? set.name : `\u8A5E\u96C6 ${id}`;
  }
  getAccountById(id) {
    return this._accounts().find((a) => a.id === id);
  }
  getGroupById(id) {
    return this._groups().find((g) => g.id === id);
  }
  static {
    this.\u0275fac = function MonitoringStateService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MonitoringStateService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MonitoringStateService, factory: _MonitoringStateService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MonitoringStateService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/monitoring/config-progress.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function ConfigProgressComponent_Conditional_0_For_3_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElement(0, "div", 10);
  }
  if (rf & 2) {
    const step_r1 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275classProp("bg-emerald-500", step_r1.isCompleted)("bg-slate-600", !step_r1.isCompleted);
  }
}
function ConfigProgressComponent_Conditional_0_For_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 8);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(2, ConfigProgressComponent_Conditional_0_For_3_Conditional_2_Template, 1, 4, "div", 9);
  }
  if (rf & 2) {
    const step_r1 = ctx.$implicit;
    const \u0275$index_6_r2 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("bg-emerald-500/20", step_r1.isCompleted)("text-emerald-400", step_r1.isCompleted)("bg-slate-700", !step_r1.isCompleted)("text-slate-500", !step_r1.isCompleted);
    \u0275\u0275domProperty("title", step_r1.name);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r1.isCompleted ? "\u2713" : \u0275$index_6_r2 + 1, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(\u0275$index_6_r2 < ctx_r2.status().steps.length - 1 ? 2 : -1);
  }
}
function ConfigProgressComponent_Conditional_0_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 11);
    \u0275\u0275domListener("click", function ConfigProgressComponent_Conditional_0_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onAction(ctx_r2.status().nextStep.action));
    });
    \u0275\u0275domElementStart(1, "span");
    \u0275\u0275text(2, "\u2192");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.status().nextStep.name);
  }
}
function ConfigProgressComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 0)(1, "div", 4);
    \u0275\u0275repeaterCreate(2, ConfigProgressComponent_Conditional_0_For_3_Template, 3, 11, null, null, _forTrack0);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div", 5)(5, "span", 6);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(7, ConfigProgressComponent_Conditional_0_Conditional_7_Template, 5, 1, "button", 7);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.status().steps);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("", ctx_r2.status().percentage, "%");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.status().nextStep ? 7 : -1);
  }
}
function ConfigProgressComponent_Conditional_1_For_19_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 33);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const step_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275classProp("bg-emerald-500/20", step_r5.isCompleted)("text-emerald-400", step_r5.isCompleted)("bg-slate-600/50", !step_r5.isCompleted)("text-slate-400", !step_r5.isCompleted);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r5.count, " ");
  }
}
function ConfigProgressComponent_Conditional_1_For_19_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 34);
    \u0275\u0275domListener("click", function ConfigProgressComponent_Conditional_1_For_19_Conditional_10_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const step_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onAction(step_r5.action));
    });
    \u0275\u0275text(1, " \u8A2D\u7F6E ");
    \u0275\u0275domElementEnd();
  }
}
function ConfigProgressComponent_Conditional_1_For_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 25)(1, "div", 26);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 27)(4, "div", 28)(5, "span", 29);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(7, ConfigProgressComponent_Conditional_1_For_19_Conditional_7_Template, 2, 9, "span", 30);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "p", 31);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(10, ConfigProgressComponent_Conditional_1_For_19_Conditional_10_Template, 2, 0, "button", 32);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const step_r5 = ctx.$implicit;
    \u0275\u0275classProp("bg-emerald-500/10", step_r5.isCompleted)("bg-slate-700/30", !step_r5.isCompleted);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-emerald-500/20", step_r5.isCompleted)("text-emerald-400", step_r5.isCompleted)("bg-slate-600", !step_r5.isCompleted)("text-slate-400", !step_r5.isCompleted);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r5.isCompleted ? "\u2713" : step_r5.icon, " ");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("text-white", step_r5.isCompleted)("text-slate-300", !step_r5.isCompleted);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r5.name, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(step_r5.count !== void 0 && step_r5.count > 0 ? 7 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(step_r5.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(!step_r5.isCompleted && step_r5.action ? 10 : -1);
  }
}
function ConfigProgressComponent_Conditional_1_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 23);
    \u0275\u0275domElement(1, "span", 35);
    \u0275\u0275domElementStart(2, "span", 5);
    \u0275\u0275text(3, "\u914D\u7F6E\u5B8C\u6210\uFF0C\u53EF\u4EE5\u958B\u59CB\u76E3\u63A7");
    \u0275\u0275domElementEnd()();
  }
}
function ConfigProgressComponent_Conditional_1_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 24)(1, "span", 36);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "button", 37);
    \u0275\u0275domListener("click", function ConfigProgressComponent_Conditional_1_Conditional_22_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onAction(ctx_r2.status().nextStep.action));
    });
    \u0275\u0275text(4, " \u7ACB\u5373\u8A2D\u7F6E ");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" \u4E0B\u4E00\u6B65\uFF1A", ctx_r2.status().nextStep.name, " ");
  }
}
function ConfigProgressComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 1)(1, "div", 12)(2, "h3", 13)(3, "span");
    \u0275\u0275text(4, "\u{1F4CB}");
    \u0275\u0275domElementEnd();
    \u0275\u0275text(5, " \u914D\u7F6E\u9032\u5EA6 ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "span", 5)(7, "span", 6);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(9, "span", 14);
    \u0275\u0275text(10);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(11, "div", 15)(12, "div", 16)(13, "div", 17);
    \u0275\u0275domElement(14, "div", 18);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(15, "div", 19);
    \u0275\u0275text(16);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(17, "div", 20);
    \u0275\u0275repeaterCreate(18, ConfigProgressComponent_Conditional_1_For_19_Template, 11, 21, "div", 21, _forTrack0);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(20, "div", 22);
    \u0275\u0275conditionalCreate(21, ConfigProgressComponent_Conditional_1_Conditional_21_Template, 4, 0, "div", 23)(22, ConfigProgressComponent_Conditional_1_Conditional_22_Template, 5, 1, "div", 24);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r2.status().completedCount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("/", ctx_r2.status().totalCount);
    \u0275\u0275advance(4);
    \u0275\u0275styleProp("width", ctx_r2.status().percentage, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.status().percentage, "% \u5B8C\u6210 ");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.status().steps);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r2.status().isReady ? 21 : ctx_r2.status().nextStep ? 22 : -1);
  }
}
function ConfigProgressComponent_Conditional_2_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 50);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275domElementEnd();
  }
}
function ConfigProgressComponent_Conditional_2_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 51);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", ctx_r2.status().completedCount, "/", ctx_r2.status().totalCount);
  }
}
function ConfigProgressComponent_Conditional_2_For_22_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 43);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const step_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("(", step_r8.count, ")");
  }
}
function ConfigProgressComponent_Conditional_2_For_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 53)(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(5, ConfigProgressComponent_Conditional_2_For_22_Conditional_5_Template, 2, 1, "span", 43);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const step_r8 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275classProp("text-emerald-400", step_r8.isCompleted)("text-slate-500", !step_r8.isCompleted);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r8.isCompleted ? "\u2713" : "\u25CB", " ");
    \u0275\u0275advance();
    \u0275\u0275classProp("text-white", step_r8.isCompleted)("text-slate-400", !step_r8.isCompleted);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r8.name, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(step_r8.count && step_r8.count > 0 ? 5 : -1);
  }
}
function ConfigProgressComponent_Conditional_2_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 43);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u9084\u6709 ", ctx_r2.status().steps.length - 4, " \u500B\u6B65\u9A5F... ");
  }
}
function ConfigProgressComponent_Conditional_2_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 54)(1, "div", 55)(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(6, "button", 56);
    \u0275\u0275domListener("click", function ConfigProgressComponent_Conditional_2_Conditional_24_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onAction(ctx_r2.status().nextStep.action));
    });
    \u0275\u0275text(7, " \u7ACB\u5373\u8A2D\u7F6E \u2192 ");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.status().nextStep.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u4E0B\u4E00\u6B65\uFF1A", ctx_r2.status().nextStep.name);
  }
}
function ConfigProgressComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 2)(1, "div", 38)(2, "div")(3, "h3", 39);
    \u0275\u0275text(4, "\u914D\u7F6E\u9032\u5EA6");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p", 40);
    \u0275\u0275text(6, " \u5B8C\u6210\u914D\u7F6E\u5F8C\u5373\u53EF\u958B\u59CB\u81EA\u52D5\u5316\u76E3\u63A7 ");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(7, "div", 41)(8, "div", 42);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "div", 43);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(12, "div", 44)(13, "div", 45);
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(14, "svg", 46);
    \u0275\u0275domElement(15, "circle", 47)(16, "circle", 48);
    \u0275\u0275domElementEnd();
    \u0275\u0275namespaceHTML();
    \u0275\u0275domElementStart(17, "div", 49);
    \u0275\u0275conditionalCreate(18, ConfigProgressComponent_Conditional_2_Conditional_18_Template, 2, 0, "span", 50)(19, ConfigProgressComponent_Conditional_2_Conditional_19_Template, 2, 2, "span", 51);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(20, "div", 52);
    \u0275\u0275repeaterCreate(21, ConfigProgressComponent_Conditional_2_For_22_Template, 6, 11, "div", 53, _forTrack0);
    \u0275\u0275conditionalCreate(23, ConfigProgressComponent_Conditional_2_Conditional_23_Template, 2, 1, "div", 43);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(24, ConfigProgressComponent_Conditional_2_Conditional_24_Template, 8, 2, "div", 54);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1("", ctx_r2.status().percentage, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", ctx_r2.status().completedCount, "/", ctx_r2.status().totalCount, " \u6B65\u9A5F");
    \u0275\u0275advance(5);
    \u0275\u0275attribute("stroke-dasharray", ctx_r2.circumference)("stroke-dashoffset", ctx_r2.dashOffset());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.status().isReady ? 18 : 19);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r2.status().steps.slice(0, 4));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.status().steps.length > 4 ? 23 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.status().nextStep ? 24 : -1);
  }
}
function ConfigProgressComponent_Conditional_3_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" \xB7 \u4E0B\u4E00\u6B65\uFF1A", ctx_r2.status().nextStep.name, " ");
  }
}
function ConfigProgressComponent_Conditional_3_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 62);
    \u0275\u0275domListener("click", function ConfigProgressComponent_Conditional_3_Conditional_9_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onAction(ctx_r2.status().nextStep.action));
    });
    \u0275\u0275text(1, " \u7E7C\u7E8C\u914D\u7F6E ");
    \u0275\u0275domElementEnd();
  }
}
function ConfigProgressComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 3)(1, "div", 57);
    \u0275\u0275text(2, " \u26A0\uFE0F ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 58)(4, "h4", 59);
    \u0275\u0275text(5, "\u914D\u7F6E\u672A\u5B8C\u6210");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "p", 60);
    \u0275\u0275text(7);
    \u0275\u0275conditionalCreate(8, ConfigProgressComponent_Conditional_3_Conditional_8_Template, 1, 1);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(9, ConfigProgressComponent_Conditional_3_Conditional_9_Template, 2, 0, "button", 61);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1(" \u9084\u9700\u8981\u5B8C\u6210 ", ctx_r2.status().totalCount - ctx_r2.status().completedCount, " \u500B\u6B65\u9A5F\u624D\u80FD\u958B\u59CB\u76E3\u63A7 ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.status().nextStep ? 8 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.status().nextStep ? 9 : -1);
  }
}
var ConfigProgressComponent = class _ConfigProgressComponent {
  constructor() {
    this.stateService = inject(MonitoringStateService);
    this.mode = input("detailed", ...ngDevMode ? [{ debugName: "mode" }] : []);
    this.action = output();
    this.status = computed(() => this.stateService.configStatus(), ...ngDevMode ? [{ debugName: "status" }] : []);
    this.circumference = 2 * Math.PI * 40;
    this.dashOffset = computed(() => {
      const percentage = this.status().percentage;
      return this.circumference * (1 - percentage / 100);
    }, ...ngDevMode ? [{ debugName: "dashOffset" }] : []);
  }
  onAction(actionId) {
    this.action.emit(actionId);
  }
  static {
    this.\u0275fac = function ConfigProgressComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ConfigProgressComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ConfigProgressComponent, selectors: [["app-config-progress"]], inputs: { mode: [1, "mode"] }, outputs: { action: "action" }, decls: 4, vars: 4, consts: [[1, "flex", "items-center", "gap-3", "px-4", "py-2", "bg-slate-800/80", "rounded-xl", "border", "border-slate-700/50"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden"], [1, "bg-gradient-to-br", "from-slate-800/80", "to-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-6"], [1, "bg-gradient-to-r", "from-amber-500/20", "to-orange-500/20", "border", "border-amber-500/30", "rounded-xl", "p-4", "flex", "items-center", "gap-4"], [1, "flex", "items-center", "gap-1"], [1, "text-sm"], [1, "text-emerald-400", "font-bold"], [1, "text-xs", "text-cyan-400", "hover:text-cyan-300", "transition-colors", "flex", "items-center", "gap-1"], [1, "w-6", "h-6", "rounded-full", "flex", "items-center", "justify-center", "text-xs", "transition-all", 3, "title"], [1, "w-3", "h-0.5", "transition-all", 3, "bg-emerald-500", "bg-slate-600"], [1, "w-3", "h-0.5", "transition-all"], [1, "text-xs", "text-cyan-400", "hover:text-cyan-300", "transition-colors", "flex", "items-center", "gap-1", 3, "click"], [1, "p-4", "border-b", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "text-slate-500"], [1, "px-4", "pt-4"], [1, "relative"], [1, "h-2", "bg-slate-700", "rounded-full", "overflow-hidden"], [1, "h-full", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "rounded-full", "transition-all", "duration-500"], [1, "mt-1", "text-right", "text-xs", "text-slate-500"], [1, "p-4", "space-y-2"], [1, "flex", "items-center", "gap-3", "p-3", "rounded-lg", "transition-all", 3, "bg-emerald-500/10", "bg-slate-700/30"], [1, "p-4", "border-t", "border-slate-700/50"], [1, "flex", "items-center", "gap-2", "text-emerald-400"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-3", "p-3", "rounded-lg", "transition-all"], [1, "w-8", "h-8", "rounded-full", "flex", "items-center", "justify-center", "text-sm"], [1, "flex-1", "min-w-0"], [1, "flex", "items-center", "gap-2"], [1, "text-sm", "font-medium"], [1, "text-xs", "px-1.5", "py-0.5", "rounded", 3, "bg-emerald-500/20", "text-emerald-400", "bg-slate-600/50", "text-slate-400"], [1, "text-xs", "text-slate-500", "truncate"], [1, "px-3", "py-1.5", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "text-xs", "rounded-lg", "transition-colors"], [1, "text-xs", "px-1.5", "py-0.5", "rounded"], [1, "px-3", "py-1.5", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "text-xs", "rounded-lg", "transition-colors", 3, "click"], [1, "w-2", "h-2", "bg-emerald-500", "rounded-full", "animate-pulse"], [1, "text-sm", "text-slate-400"], [1, "px-4", "py-2", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "text-white", "text-sm", "rounded-lg", "hover:from-cyan-600", "hover:to-blue-600", "transition-colors", 3, "click"], [1, "flex", "items-start", "justify-between", "mb-4"], [1, "font-semibold", "text-white"], [1, "text-sm", "text-slate-400", "mt-1"], [1, "text-right"], [1, "text-3xl", "font-bold", "text-emerald-400"], [1, "text-xs", "text-slate-500"], [1, "flex", "items-center", "gap-6"], [1, "relative", "w-24", "h-24"], [1, "w-24", "h-24", "transform", "-rotate-90"], ["cx", "48", "cy", "48", "r", "40", "stroke-width", "8", "stroke", "currentColor", "fill", "none", 1, "text-slate-700"], ["cx", "48", "cy", "48", "r", "40", "stroke-width", "8", "stroke", "currentColor", "fill", "none", "stroke-linecap", "round", 1, "text-emerald-500"], [1, "absolute", "inset-0", "flex", "items-center", "justify-center"], [1, "text-2xl"], [1, "text-lg", "text-slate-300"], [1, "flex-1", "space-y-2"], [1, "flex", "items-center", "gap-2", "text-sm"], [1, "mt-4", "pt-4", "border-t", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-2", "text-sm", "text-slate-400"], [1, "px-4", "py-2", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "text-sm", "rounded-lg", "transition-colors", 3, "click"], [1, "w-10", "h-10", "bg-amber-500/20", "rounded-full", "flex", "items-center", "justify-center", "text-xl"], [1, "flex-1"], [1, "font-medium", "text-amber-300"], [1, "text-sm", "text-amber-200/70"], [1, "px-4", "py-2", "bg-amber-500", "hover:bg-amber-600", "text-white", "rounded-lg", "transition-colors"], [1, "px-4", "py-2", "bg-amber-500", "hover:bg-amber-600", "text-white", "rounded-lg", "transition-colors", 3, "click"]], template: function ConfigProgressComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275conditionalCreate(0, ConfigProgressComponent_Conditional_0_Template, 8, 2, "div", 0);
        \u0275\u0275conditionalCreate(1, ConfigProgressComponent_Conditional_1_Template, 23, 6, "div", 1);
        \u0275\u0275conditionalCreate(2, ConfigProgressComponent_Conditional_2_Template, 25, 8, "div", 2);
        \u0275\u0275conditionalCreate(3, ConfigProgressComponent_Conditional_3_Template, 10, 3, "div", 3);
      }
      if (rf & 2) {
        \u0275\u0275conditional(ctx.mode() === "compact" ? 0 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.mode() === "detailed" ? 1 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.mode() === "card" ? 2 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.mode() === "banner" && !ctx.status().isReady ? 3 : -1);
      }
    }, dependencies: [CommonModule], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ConfigProgressComponent, [{
    type: Component,
    args: [{
      selector: "app-config-progress",
      standalone: true,
      imports: [CommonModule],
      template: `
    <!-- \u7DCA\u6E4A\u6A21\u5F0F\uFF1A\u7528\u65BC\u9802\u90E8\u6B04 -->
    @if (mode() === 'compact') {
      <div class="flex items-center gap-3 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
        <!-- \u6B65\u9A5F\u6307\u793A\u5668 -->
        <div class="flex items-center gap-1">
          @for (step of status().steps; track step.id; let i = $index) {
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
                 [class.bg-emerald-500/20]="step.isCompleted"
                 [class.text-emerald-400]="step.isCompleted"
                 [class.bg-slate-700]="!step.isCompleted"
                 [class.text-slate-500]="!step.isCompleted"
                 [title]="step.name">
              {{ step.isCompleted ? '\u2713' : (i + 1) }}
            </div>
            @if (i < status().steps.length - 1) {
              <div class="w-3 h-0.5 transition-all"
                   [class.bg-emerald-500]="step.isCompleted"
                   [class.bg-slate-600]="!step.isCompleted">
              </div>
            }
          }
        </div>
        
        <!-- \u9032\u5EA6\u767E\u5206\u6BD4 -->
        <div class="text-sm">
          <span class="text-emerald-400 font-bold">{{ status().percentage }}%</span>
        </div>
        
        <!-- \u4E0B\u4E00\u6B65\u63D0\u793A -->
        @if (status().nextStep) {
          <button (click)="onAction(status().nextStep!.action!)"
                  class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
            <span>\u2192</span>
            <span>{{ status().nextStep!.name }}</span>
          </button>
        }
      </div>
    }
    
    <!-- \u8A73\u7D30\u6A21\u5F0F\uFF1A\u7528\u65BC\u5074\u908A\u6B04\u6216\u9762\u677F -->
    @if (mode() === 'detailed') {
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <!-- \u6A19\u984C -->
        <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 class="font-semibold text-white flex items-center gap-2">
            <span>\u{1F4CB}</span> \u914D\u7F6E\u9032\u5EA6
          </h3>
          <span class="text-sm">
            <span class="text-emerald-400 font-bold">{{ status().completedCount }}</span>
            <span class="text-slate-500">/{{ status().totalCount }}</span>
          </span>
        </div>
        
        <!-- \u9032\u5EA6\u689D -->
        <div class="px-4 pt-4">
          <div class="relative">
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                   [style.width.%]="status().percentage">
              </div>
            </div>
            <div class="mt-1 text-right text-xs text-slate-500">
              {{ status().percentage }}% \u5B8C\u6210
            </div>
          </div>
        </div>
        
        <!-- \u6B65\u9A5F\u5217\u8868 -->
        <div class="p-4 space-y-2">
          @for (step of status().steps; track step.id) {
            <div class="flex items-center gap-3 p-3 rounded-lg transition-all"
                 [class.bg-emerald-500/10]="step.isCompleted"
                 [class.bg-slate-700/30]="!step.isCompleted">
              <!-- \u72C0\u614B\u5716\u6A19 -->
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                   [class.bg-emerald-500/20]="step.isCompleted"
                   [class.text-emerald-400]="step.isCompleted"
                   [class.bg-slate-600]="!step.isCompleted"
                   [class.text-slate-400]="!step.isCompleted">
                {{ step.isCompleted ? '\u2713' : step.icon }}
              </div>
              
              <!-- \u6B65\u9A5F\u4FE1\u606F -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium"
                        [class.text-white]="step.isCompleted"
                        [class.text-slate-300]="!step.isCompleted">
                    {{ step.name }}
                  </span>
                  @if (step.count !== undefined && step.count > 0) {
                    <span class="text-xs px-1.5 py-0.5 rounded"
                          [class.bg-emerald-500/20]="step.isCompleted"
                          [class.text-emerald-400]="step.isCompleted"
                          [class.bg-slate-600/50]="!step.isCompleted"
                          [class.text-slate-400]="!step.isCompleted">
                      {{ step.count }}
                    </span>
                  }
                </div>
                <p class="text-xs text-slate-500 truncate">{{ step.description }}</p>
              </div>
              
              <!-- \u64CD\u4F5C\u6309\u9215 -->
              @if (!step.isCompleted && step.action) {
                <button (click)="onAction(step.action)"
                        class="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg transition-colors">
                  \u8A2D\u7F6E
                </button>
              }
            </div>
          }
        </div>
        
        <!-- \u5E95\u90E8\u72C0\u614B -->
        <div class="p-4 border-t border-slate-700/50">
          @if (status().isReady) {
            <div class="flex items-center gap-2 text-emerald-400">
              <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span class="text-sm">\u914D\u7F6E\u5B8C\u6210\uFF0C\u53EF\u4EE5\u958B\u59CB\u76E3\u63A7</span>
            </div>
          } @else if (status().nextStep) {
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-400">
                \u4E0B\u4E00\u6B65\uFF1A{{ status().nextStep!.name }}
              </span>
              <button (click)="onAction(status().nextStep!.action!)"
                      class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors">
                \u7ACB\u5373\u8A2D\u7F6E
              </button>
            </div>
          }
        </div>
      </div>
    }
    
    <!-- \u5361\u7247\u6A21\u5F0F\uFF1A\u7528\u65BC\u7E3D\u89BD\u9801\u9762 -->
    @if (mode() === 'card') {
      <div class="bg-gradient-to-br from-slate-800/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="font-semibold text-white">\u914D\u7F6E\u9032\u5EA6</h3>
            <p class="text-sm text-slate-400 mt-1">
              \u5B8C\u6210\u914D\u7F6E\u5F8C\u5373\u53EF\u958B\u59CB\u81EA\u52D5\u5316\u76E3\u63A7
            </p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-emerald-400">{{ status().percentage }}%</div>
            <div class="text-xs text-slate-500">{{ status().completedCount }}/{{ status().totalCount }} \u6B65\u9A5F</div>
          </div>
        </div>
        
        <!-- \u74B0\u5F62\u9032\u5EA6 -->
        <div class="flex items-center gap-6">
          <div class="relative w-24 h-24">
            <svg class="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke-width="8" stroke="currentColor" 
                      class="text-slate-700" fill="none"/>
              <circle cx="48" cy="48" r="40" stroke-width="8" stroke="currentColor" 
                      class="text-emerald-500" fill="none"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="circumference"
                      [attr.stroke-dashoffset]="dashOffset()"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              @if (status().isReady) {
                <span class="text-2xl">\u2713</span>
              } @else {
                <span class="text-lg text-slate-300">{{ status().completedCount }}/{{ status().totalCount }}</span>
              }
            </div>
          </div>
          
          <!-- \u6B65\u9A5F\u6458\u8981 -->
          <div class="flex-1 space-y-2">
            @for (step of status().steps.slice(0, 4); track step.id) {
              <div class="flex items-center gap-2 text-sm">
                <span [class.text-emerald-400]="step.isCompleted"
                      [class.text-slate-500]="!step.isCompleted">
                  {{ step.isCompleted ? '\u2713' : '\u25CB' }}
                </span>
                <span [class.text-white]="step.isCompleted"
                      [class.text-slate-400]="!step.isCompleted">
                  {{ step.name }}
                </span>
                @if (step.count && step.count > 0) {
                  <span class="text-xs text-slate-500">({{ step.count }})</span>
                }
              </div>
            }
            @if (status().steps.length > 4) {
              <div class="text-xs text-slate-500">
                \u9084\u6709 {{ status().steps.length - 4 }} \u500B\u6B65\u9A5F...
              </div>
            }
          </div>
        </div>
        
        <!-- \u4E0B\u4E00\u6B65\u63D0\u793A -->
        @if (status().nextStep) {
          <div class="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-slate-400">
              <span>{{ status().nextStep!.icon }}</span>
              <span>\u4E0B\u4E00\u6B65\uFF1A{{ status().nextStep!.name }}</span>
            </div>
            <button (click)="onAction(status().nextStep!.action!)"
                    class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm rounded-lg transition-colors">
              \u7ACB\u5373\u8A2D\u7F6E \u2192
            </button>
          </div>
        }
      </div>
    }
    
    <!-- \u6A6B\u5E45\u6A21\u5F0F\uFF1A\u7528\u65BC\u63D0\u793A\u7528\u6236\u5B8C\u6210\u914D\u7F6E -->
    @if (mode() === 'banner' && !status().isReady) {
      <div class="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-xl">
          \u26A0\uFE0F
        </div>
        <div class="flex-1">
          <h4 class="font-medium text-amber-300">\u914D\u7F6E\u672A\u5B8C\u6210</h4>
          <p class="text-sm text-amber-200/70">
            \u9084\u9700\u8981\u5B8C\u6210 {{ status().totalCount - status().completedCount }} \u500B\u6B65\u9A5F\u624D\u80FD\u958B\u59CB\u76E3\u63A7
            @if (status().nextStep) {
              \xB7 \u4E0B\u4E00\u6B65\uFF1A{{ status().nextStep!.name }}
            }
          </p>
        </div>
        @if (status().nextStep) {
          <button (click)="onAction(status().nextStep!.action!)"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
            \u7E7C\u7E8C\u914D\u7F6E
          </button>
        }
      </div>
    }
  `
    }]
  }], null, { mode: [{ type: Input, args: [{ isSignal: true, alias: "mode", required: false }] }], action: [{ type: Output, args: ["action"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ConfigProgressComponent, { className: "ConfigProgressComponent", filePath: "src/monitoring/config-progress.component.ts", lineNumber: 253 });
})();

export {
  MonitoringStateService,
  ConfigProgressComponent
};
//# sourceMappingURL=chunk-XBRFXE36.js.map
