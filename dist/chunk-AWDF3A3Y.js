import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  ToastService
} from "./chunk-ORLIRJMO.js";
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

// src/services/monitoring-management.service.ts
var MonitoringManagementService = class _MonitoringManagementService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.monitoredGroups = signal([], ...ngDevMode ? [{ debugName: "monitoredGroups" }] : []);
    this.keywordSets = signal([], ...ngDevMode ? [{ debugName: "keywordSets" }] : []);
    this.triggerRules = signal([], ...ngDevMode ? [{ debugName: "triggerRules" }] : []);
    this.monitoringActive = signal(false, ...ngDevMode ? [{ debugName: "monitoringActive" }] : []);
    this.showJoinMonitorDialog = signal(false, ...ngDevMode ? [{ debugName: "showJoinMonitorDialog" }] : []);
    this.joinMonitorConfig = signal({
      resourceId: 0,
      resourceTitle: "",
      accountPhone: "",
      selectedKeywordSetId: null,
      customKeywords: []
    }, ...ngDevMode ? [{ debugName: "joinMonitorConfig" }] : []);
    this.showQuickCreateKeywordSet = signal(false, ...ngDevMode ? [{ debugName: "showQuickCreateKeywordSet" }] : []);
    this.quickKeywordSetName = signal("", ...ngDevMode ? [{ debugName: "quickKeywordSetName" }] : []);
    this.quickKeywords = signal([], ...ngDevMode ? [{ debugName: "quickKeywords" }] : []);
    this.quickKeywordInput = signal("", ...ngDevMode ? [{ debugName: "quickKeywordInput" }] : []);
    this.showBatchJoinMonitorDialog = signal(false, ...ngDevMode ? [{ debugName: "showBatchJoinMonitorDialog" }] : []);
    this.batchJoinMonitorProgress = signal(0, ...ngDevMode ? [{ debugName: "batchJoinMonitorProgress" }] : []);
    this.isBatchJoining = signal(false, ...ngDevMode ? [{ debugName: "isBatchJoining" }] : []);
    this.activeMonitoredGroups = computed(() => this.monitoredGroups().filter((g) => g.status === "active"), ...ngDevMode ? [{ debugName: "activeMonitoredGroups" }] : []);
    this.activeKeywordSets = computed(() => this.keywordSets().filter((s) => s.active), ...ngDevMode ? [{ debugName: "activeKeywordSets" }] : []);
    this.totalMatchedCount = computed(() => this.monitoredGroups().reduce((sum, g) => sum + (g.matchedCount || 0), 0), ...ngDevMode ? [{ debugName: "totalMatchedCount" }] : []);
    this.recommendedKeywords = [
      "\u4ED8\u6B3E",
      "\u652F\u4ED8",
      "\u6536\u6B3E",
      "USDT",
      "BTC",
      "\u6BD4\u7279\u5E63",
      "\u6295\u8CC7",
      "\u7406\u8CA1",
      "\u8CFA\u9322",
      "\u517C\u8077",
      "\u4EE3\u7406",
      "\u5408\u4F5C"
    ];
    this.setupIpcListeners();
  }
  // ==================== 加載方法 ====================
  loadMonitoredGroups() {
    this.ipcService.send("get-monitored-groups", {});
  }
  loadKeywordSets() {
    this.ipcService.send("get-keyword-sets", {});
  }
  loadTriggerRules() {
    this.ipcService.send("get-trigger-rules", {});
  }
  loadAllMonitoringData() {
    this.loadMonitoredGroups();
    this.loadKeywordSets();
    this.loadTriggerRules();
  }
  // ==================== 監控群組操作 ====================
  startMonitoring() {
    this.ipcService.send("start-monitoring", {});
    this.monitoringActive.set(true);
  }
  stopMonitoring() {
    this.ipcService.send("stop-monitoring", {});
    this.monitoringActive.set(false);
  }
  toggleMonitoring() {
    if (this.monitoringActive()) {
      this.stopMonitoring();
    } else {
      this.startMonitoring();
    }
  }
  addMonitoredGroup(group) {
    this.ipcService.send("add-monitored-group", group);
  }
  removeMonitoredGroup(groupId) {
    if (!confirm("\u78BA\u5B9A\u8981\u505C\u6B62\u76E3\u63A7\u6B64\u7FA4\u7D44\u55CE\uFF1F"))
      return;
    this.ipcService.send("remove-monitored-group", { id: groupId });
  }
  pauseMonitoredGroup(groupId) {
    this.ipcService.send("pause-monitored-group", { id: groupId });
  }
  resumeMonitoredGroup(groupId) {
    this.ipcService.send("resume-monitored-group", { id: groupId });
  }
  // ==================== 加入並監控 ====================
  openJoinAndMonitorDialog(resource) {
    this.joinMonitorConfig.set({
      resourceId: resource.id,
      resourceTitle: resource.title || resource.name,
      accountPhone: "",
      selectedKeywordSetId: null,
      customKeywords: []
    });
    this.showJoinMonitorDialog.set(true);
  }
  closeJoinMonitorDialog() {
    this.showJoinMonitorDialog.set(false);
  }
  selectMonitorAccount(phone) {
    this.joinMonitorConfig.update((c) => __spreadProps(__spreadValues({}, c), { accountPhone: phone }));
  }
  selectKeywordSet(setId) {
    this.joinMonitorConfig.update((c) => __spreadProps(__spreadValues({}, c), { selectedKeywordSetId: setId }));
  }
  addMonitorKeyword(keyword) {
    const kw = keyword || this.quickKeywordInput().trim();
    if (!kw)
      return;
    this.joinMonitorConfig.update((c) => __spreadProps(__spreadValues({}, c), {
      customKeywords: [...c.customKeywords, kw]
    }));
    this.quickKeywordInput.set("");
  }
  removeMonitorKeyword(keyword) {
    this.joinMonitorConfig.update((c) => __spreadProps(__spreadValues({}, c), {
      customKeywords: c.customKeywords.filter((k) => k !== keyword)
    }));
  }
  executeJoinAndMonitor() {
    const config = this.joinMonitorConfig();
    if (!config.accountPhone) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u57F7\u884C\u5E33\u865F");
      return;
    }
    if (!config.selectedKeywordSetId && config.customKeywords.length === 0) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u95DC\u9375\u8A5E\u96C6\u6216\u6DFB\u52A0\u81EA\u5B9A\u7FA9\u95DC\u9375\u8A5E");
      return;
    }
    this.ipcService.send("join-and-monitor", {
      resourceId: config.resourceId,
      accountPhone: config.accountPhone,
      keywordSetId: config.selectedKeywordSetId,
      customKeywords: config.customKeywords
    });
    this.closeJoinMonitorDialog();
    this.toastService.success("\u6B63\u5728\u52A0\u5165\u4E26\u8A2D\u7F6E\u76E3\u63A7...");
  }
  // ==================== 快速創建關鍵詞集 ====================
  openQuickCreateKeywordSet() {
    this.quickKeywordSetName.set("");
    this.quickKeywords.set([]);
    this.quickKeywordInput.set("");
    this.showQuickCreateKeywordSet.set(true);
  }
  closeQuickCreateKeywordSet() {
    this.showQuickCreateKeywordSet.set(false);
  }
  addQuickKeyword() {
    const keyword = this.quickKeywordInput().trim();
    if (!keyword)
      return;
    this.quickKeywords.update((kws) => [...kws, keyword]);
    this.quickKeywordInput.set("");
  }
  removeQuickKeyword(keyword) {
    this.quickKeywords.update((kws) => kws.filter((k) => k !== keyword));
  }
  addQuickRecommendedKeyword(keyword) {
    if (!this.quickKeywords().includes(keyword)) {
      this.quickKeywords.update((kws) => [...kws, keyword]);
    }
  }
  executeQuickCreateKeywordSet() {
    const name = this.quickKeywordSetName().trim();
    const keywords = this.quickKeywords();
    if (!name) {
      this.toastService.warning("\u8ACB\u8F38\u5165\u95DC\u9375\u8A5E\u96C6\u540D\u7A31");
      return;
    }
    if (keywords.length === 0) {
      this.toastService.warning("\u8ACB\u6DFB\u52A0\u81F3\u5C11\u4E00\u500B\u95DC\u9375\u8A5E");
      return;
    }
    this.ipcService.send("create-keyword-set", {
      name,
      keywords: keywords.map((k) => ({ keyword: k, isRegex: false }))
    });
    this.closeQuickCreateKeywordSet();
    this.toastService.success("\u95DC\u9375\u8A5E\u96C6\u5275\u5EFA\u6210\u529F");
  }
  // ==================== 批量加入監控 ====================
  openBatchJoinMonitorDialog() {
    this.batchJoinMonitorProgress.set(0);
    this.isBatchJoining.set(false);
    this.showBatchJoinMonitorDialog.set(true);
  }
  closeBatchJoinMonitorDialog() {
    this.showBatchJoinMonitorDialog.set(false);
  }
  executeBatchJoinMonitor(resources, accountPhone, keywordSetId) {
    if (resources.length === 0) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u8981\u52A0\u5165\u7684\u7FA4\u7D44");
      return;
    }
    if (!accountPhone) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u57F7\u884C\u5E33\u865F");
      return;
    }
    this.isBatchJoining.set(true);
    this.batchJoinMonitorProgress.set(0);
    this.ipcService.send("batch-join-and-monitor", {
      resourceIds: resources.map((r) => r.id),
      accountPhone,
      keywordSetId
    });
  }
  // ==================== 關鍵詞集操作 ====================
  createKeywordSet(name, keywords) {
    this.ipcService.send("create-keyword-set", { name, keywords });
  }
  deleteKeywordSet(setId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u95DC\u9375\u8A5E\u96C6\u55CE\uFF1F"))
      return;
    this.ipcService.send("delete-keyword-set", { id: setId });
  }
  toggleKeywordSetStatus(setId) {
    this.ipcService.send("toggle-keyword-set-status", { id: setId });
  }
  addKeywordToSet(setId, keyword) {
    this.ipcService.send("add-keyword-to-set", { setId, keyword });
  }
  removeKeywordFromSet(setId, keyword) {
    this.ipcService.send("remove-keyword-from-set", { setId, keyword });
  }
  // ==================== 觸發規則操作 ====================
  createTriggerRule(rule) {
    this.ipcService.send("create-trigger-rule", rule);
  }
  deleteTriggerRule(ruleId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u89F8\u767C\u898F\u5247\u55CE\uFF1F"))
      return;
    this.ipcService.send("delete-trigger-rule", { id: ruleId });
  }
  toggleTriggerRuleStatus(ruleId) {
    this.ipcService.send("toggle-trigger-rule-status", { id: ruleId });
  }
  // ==================== 輔助方法 ====================
  getKeywordSetName(setId) {
    return this.keywordSets().find((s) => s.id === setId)?.name || "Unknown";
  }
  getKeywordPreview(keywords) {
    if (!keywords || keywords.length === 0)
      return "";
    const preview = keywords.slice(0, 3).map((k) => k.keyword).join(", ");
    if (keywords.length > 3) {
      return `${preview} \u7B49 ${keywords.length} \u500B`;
    }
    return preview;
  }
  getRecommendedKeywords() {
    return this.recommendedKeywords;
  }
  // ==================== IPC 事件處理 ====================
  setupIpcListeners() {
    this.ipcService.on("monitored-groups-result", (data) => this.handleMonitoredGroups(data));
    this.ipcService.on("keyword-sets-result", (data) => this.handleKeywordSets(data));
    this.ipcService.on("trigger-rules-result", (data) => this.handleTriggerRules(data));
    this.ipcService.on("monitoring-started", (data) => {
      console.log("[MonitoringManagement] monitoring-started:", data);
      this.monitoringActive.set(true);
    });
    this.ipcService.on("monitoring-stopped", () => {
      console.log("[MonitoringManagement] monitoring-stopped");
      this.monitoringActive.set(false);
    });
    this.ipcService.on("monitoring-status-changed", (active) => {
      console.log("[MonitoringManagement] monitoring-status-changed:", active);
      this.monitoringActive.set(active);
    });
    this.ipcService.on("monitoring-status", (data) => {
      const isActive = data.isMonitoring ?? data.active ?? false;
      console.log("[MonitoringManagement] monitoring-status:", isActive);
      this.monitoringActive.set(isActive);
    });
    this.ipcService.on("group-added-to-monitor", (data) => this.handleGroupAdded(data));
    this.ipcService.on("keyword-set-created", (data) => this.handleKeywordSetCreated(data));
    this.ipcService.on("batch-join-progress", (data) => this.handleBatchJoinProgress(data));
    this.ipcService.on("batch-join-completed", (data) => this.handleBatchJoinCompleted(data));
  }
  handleMonitoredGroups(data) {
    if (data.success || data.groups) {
      this.monitoredGroups.set(data.groups || []);
    }
  }
  handleKeywordSets(data) {
    if (data.success || data.sets) {
      this.keywordSets.set(data.sets || []);
    }
  }
  handleTriggerRules(data) {
    if (data.success || data.rules) {
      this.triggerRules.set(data.rules || []);
    }
  }
  handleGroupAdded(data) {
    if (data.success) {
      this.toastService.success("\u7FA4\u7D44\u5DF2\u52A0\u5165\u76E3\u63A7");
      this.loadMonitoredGroups();
    } else {
      this.toastService.error(`\u52A0\u5165\u5931\u6557: ${data.error}`);
    }
  }
  handleKeywordSetCreated(data) {
    if (data.success) {
      this.loadKeywordSets();
    }
  }
  handleBatchJoinProgress(data) {
    this.batchJoinMonitorProgress.set(data.progress || 0);
  }
  handleBatchJoinCompleted(data) {
    this.isBatchJoining.set(false);
    this.batchJoinMonitorProgress.set(100);
    if (data.success) {
      this.toastService.success(`\u6279\u91CF\u52A0\u5165\u5B8C\u6210: ${data.successCount}/${data.totalCount} \u500B\u7FA4\u7D44`);
      this.loadMonitoredGroups();
    } else {
      this.toastService.error(`\u6279\u91CF\u52A0\u5165\u5931\u6557: ${data.error}`);
    }
    setTimeout(() => this.closeBatchJoinMonitorDialog(), 1500);
  }
  static {
    this.\u0275fac = function MonitoringManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MonitoringManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MonitoringManagementService, factory: _MonitoringManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MonitoringManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  MonitoringManagementService
};
//# sourceMappingURL=chunk-AWDF3A3Y.js.map
