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

// src/services/unified-contacts.service.ts
var DEFAULT_TAGS = [
  "\u9AD8\u610F\u5411",
  "\u5F85\u8DDF\u9032",
  "\u5DF2\u6210\u4EA4",
  "\u6D41\u5931\u98A8\u96AA",
  "VIP",
  "\u65B0\u767C\u73FE",
  "\u5DF2\u806F\u7E6B",
  "\u9700\u8981\u5831\u50F9",
  "\u6280\u8853\u8AEE\u8A62",
  "\u6F5B\u5728\u5927\u5BA2\u6236"
];
var STATUS_OPTIONS = [
  { value: "new", label: "\u65B0\u767C\u73FE", color: "bg-blue-500" },
  { value: "contacted", label: "\u5DF2\u806F\u7E6B", color: "bg-yellow-500" },
  { value: "interested", label: "\u6709\u610F\u5411", color: "bg-green-500" },
  { value: "negotiating", label: "\u6D3D\u8AC7\u4E2D", color: "bg-purple-500" },
  { value: "converted", label: "\u5DF2\u6210\u4EA4", color: "bg-emerald-500" },
  { value: "lost", label: "\u5DF2\u6D41\u5931", color: "bg-gray-500" },
  { value: "blocked", label: "\u5DF2\u5C01\u9396", color: "bg-red-500" },
  // 🔧 P1: 發送控制台專用狀態
  { value: "replied", label: "\u5DF2\u56DE\u8986", color: "bg-teal-500" },
  { value: "failed", label: "\u767C\u9001\u5931\u6557", color: "bg-rose-500" }
];
var UnifiedContactsService = class _UnifiedContactsService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this._contacts = signal([], ...ngDevMode ? [{ debugName: "_contacts" }] : []);
    this.contacts = this._contacts.asReadonly();
    this._stats = signal({
      total: 0,
      users: 0,
      groups: 0,
      channels: 0,
      by_status: {},
      by_source: {},
      recent_added: 0
    }, ...ngDevMode ? [{ debugName: "_stats" }] : []);
    this.stats = this._stats.asReadonly();
    this._total = signal(0, ...ngDevMode ? [{ debugName: "_total" }] : []);
    this.total = this._total.asReadonly();
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this.isLoading = this._isLoading.asReadonly();
    this._isSyncing = signal(false, ...ngDevMode ? [{ debugName: "_isSyncing" }] : []);
    this.isSyncing = this._isSyncing.asReadonly();
    this._hasImportedFromLeads = signal(false, ...ngDevMode ? [{ debugName: "_hasImportedFromLeads" }] : []);
    this.hasData = computed(() => this._contacts().length > 0 || this._hasImportedFromLeads(), ...ngDevMode ? [{ debugName: "hasData" }] : []);
    this._filter = signal({}, ...ngDevMode ? [{ debugName: "_filter" }] : []);
    this.filter = this._filter.asReadonly();
    this._selectedIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "_selectedIds" }] : []);
    this.selectedIds = this._selectedIds.asReadonly();
    this.selectedContacts = computed(() => {
      const ids = this._selectedIds();
      return this._contacts().filter((c) => ids.has(c.telegram_id));
    }, ...ngDevMode ? [{ debugName: "selectedContacts" }] : []);
    this.setupIpcListeners();
  }
  setupIpcListeners() {
    this.ipc.on("unified-contacts:list", (data) => {
      console.log("[UnifiedContacts] Received list:", data);
      this._isLoading.set(false);
      if (data.success) {
        this._contacts.set(data.contacts || []);
        this._total.set(data.total || 0);
      } else {
        console.error("[UnifiedContacts] List error:", data.error);
        this._contacts.set([]);
        this._total.set(0);
      }
    });
    this.ipc.on("unified-contacts:stats", (data) => {
      console.log("[UnifiedContacts] Received stats:", data);
      if (data.success) {
        this._stats.set(data.stats);
      }
    });
    this.ipc.on("unified-contacts:sync-result", (data) => {
      console.log("[UnifiedContacts] ========== SYNC RESULT ==========");
      console.log("[UnifiedContacts] Sync result:", data);
      this._isSyncing.set(false);
      if (data.success) {
        console.log("[UnifiedContacts] Sync successful, stats:", data.stats);
        this.loadContacts();
        this.loadStats();
      } else {
        console.error("[UnifiedContacts] Sync failed:", data.error);
      }
    });
    this.ipc.on("unified-contacts:update-result", (data) => {
      console.log("[UnifiedContacts] Update result:", data);
      if (data.success) {
        this.loadContacts();
      }
    });
    this.ipc.on("unified-contacts:add-tags-result", (data) => {
      console.log("[UnifiedContacts] Add tags result:", data);
      if (data.success) {
        this.loadContacts();
      }
    });
    this.ipc.on("unified-contacts:update-status-result", (data) => {
      console.log("[UnifiedContacts] Update status result:", data);
      if (data.success) {
        this.loadContacts();
      }
    });
    this.ipc.on("unified-contacts:delete-result", (data) => {
      console.log("[UnifiedContacts] Delete result:", data);
      if (data.success) {
        const deletedIds = this._pendingDeleteIds || /* @__PURE__ */ new Set();
        const currentContacts = this._contacts();
        const remainingContacts = currentContacts.filter((c) => !deletedIds.has(c.telegram_id));
        this._contacts.set(remainingContacts);
        this._total.set(remainingContacts.length);
        this._selectedIds.set(/* @__PURE__ */ new Set());
        this._pendingDeleteIds = void 0;
        this.updateLocalStats(remainingContacts);
        console.log("[UnifiedContacts] Deleted successfully, remaining:", remainingContacts.length);
      }
    });
  }
  /**
   * 同步所有來源數據
   */
  syncFromSources() {
    console.log("[UnifiedContacts] ========== SYNC START ==========");
    console.log("[UnifiedContacts] Sending unified-contacts:sync to backend...");
    this._isSyncing.set(true);
    try {
      this.ipc.send("unified-contacts:sync", {});
      console.log("[UnifiedContacts] IPC command sent successfully");
    } catch (e) {
      console.error("[UnifiedContacts] Failed to send IPC command:", e);
      this._isSyncing.set(false);
      return;
    }
    setTimeout(() => {
      if (this._isSyncing()) {
        console.warn("[UnifiedContacts] Sync timeout after 60s, resetting state");
        this._isSyncing.set(false);
      }
    }, 6e4);
  }
  /**
   * 強制結束所有狀態（同步 + 載入）
   */
  forceEndSync() {
    console.log("[UnifiedContacts] Force ending all loading states...");
    this._isSyncing.set(false);
    this._isLoading.set(false);
  }
  /**
   * 🆕 強制重新載入聯繫人（忽略緩存，確保數據最新）
   */
  forceReloadContacts(filter) {
    console.log("[UnifiedContacts] Force reload contacts");
    this._hasImportedFromLeads.set(false);
    const currentFilter = filter || this._filter();
    this._filter.set(currentFilter);
    this._isLoading.set(true);
    this.ipc.send("unified-contacts:get", {
      contactType: currentFilter.contactType,
      sourceType: currentFilter.sourceType,
      status: currentFilter.status,
      tags: currentFilter.tags,
      search: currentFilter.search,
      orderBy: currentFilter.orderBy || "created_at DESC",
      limit: 500,
      // 獲取更多數據
      offset: 0
    });
  }
  /**
   * 載入聯繫人列表
   * 🆕 優化：如果已從 leads 導入數據，則只在前端過濾，不發送後端請求
   */
  loadContacts(filter) {
    const currentFilter = filter || this._filter();
    this._filter.set(currentFilter);
    if (this._hasImportedFromLeads() && this._contacts().length > 0) {
      console.log("[UnifiedContacts] Data already imported from leads, skipping backend request");
      this._isLoading.set(false);
      return;
    }
    console.log("[UnifiedContacts] Loading contacts with filter:", currentFilter);
    this._isLoading.set(true);
    this.ipc.send("unified-contacts:get", {
      contactType: currentFilter.contactType,
      sourceType: currentFilter.sourceType,
      status: currentFilter.status,
      tags: currentFilter.tags,
      search: currentFilter.search,
      orderBy: currentFilter.orderBy || "created_at DESC",
      limit: currentFilter.limit || 100,
      offset: currentFilter.offset || 0
    });
    setTimeout(() => {
      if (this._isLoading()) {
        console.warn("[UnifiedContacts] Load timeout, resetting state");
        this._isLoading.set(false);
      }
    }, 15e3);
  }
  /**
   * 載入統計數據
   * 🆕 優化：如果已從 leads 導入數據，跳過後端請求
   */
  loadStats() {
    if (this._hasImportedFromLeads()) {
      console.log("[UnifiedContacts] Stats already computed from leads, skipping backend request");
      return;
    }
    console.log("[UnifiedContacts] Loading stats...");
    this.ipc.send("unified-contacts:stats", {});
  }
  /**
   * 設置篩選條件
   */
  setFilter(filter) {
    const newFilter = __spreadValues(__spreadValues({}, this._filter()), filter);
    this.loadContacts(newFilter);
  }
  /**
   * 重置篩選
   */
  resetFilter() {
    this.loadContacts({});
  }
  /**
   * 搜索
   */
  search(keyword) {
    this.setFilter({ search: keyword, offset: 0 });
  }
  /**
   * 分頁
   */
  setPage(page, pageSize = 100) {
    this.setFilter({ offset: (page - 1) * pageSize, limit: pageSize });
  }
  /**
   * 選擇/取消選擇聯繫人
   */
  toggleSelect(telegramId) {
    const current = new Set(this._selectedIds());
    if (current.has(telegramId)) {
      current.delete(telegramId);
    } else {
      current.add(telegramId);
    }
    this._selectedIds.set(current);
  }
  /**
   * 全選/取消全選
   */
  toggleSelectAll() {
    const current = this._selectedIds();
    const allIds = this._contacts().map((c) => c.telegram_id);
    if (current.size === allIds.length) {
      this._selectedIds.set(/* @__PURE__ */ new Set());
    } else {
      this._selectedIds.set(new Set(allIds));
    }
  }
  /**
   * 清除選擇
   */
  clearSelection() {
    this._selectedIds.set(/* @__PURE__ */ new Set());
  }
  /**
   * 更新單個聯繫人
   */
  updateContact(telegramId, updates) {
    console.log("[UnifiedContacts] Updating contact:", telegramId, updates);
    this.ipc.send("unified-contacts:update", {
      telegramId,
      updates
    });
  }
  /**
   * 批量添加標籤
   */
  addTags(telegramIds, tags) {
    console.log("[UnifiedContacts] Adding tags:", telegramIds, tags);
    this.ipc.send("unified-contacts:add-tags", {
      telegramIds,
      tags
    });
  }
  /**
   * 批量更新狀態
   */
  updateStatus(telegramIds, status) {
    console.log("[UnifiedContacts] Updating status:", telegramIds, status);
    this.ipc.send("unified-contacts:update-status", {
      telegramIds,
      status
    });
  }
  /**
   * 批量刪除
   */
  deleteContacts(telegramIds) {
    console.log("[UnifiedContacts] Deleting contacts:", telegramIds.length);
    this._pendingDeleteIds = new Set(telegramIds);
    this.ipc.send("unified-contacts:delete", {
      telegramIds
    });
  }
  /**
   * 🆕 更新本地統計（刪除後使用）
   */
  updateLocalStats(contacts) {
    const byStatus = {};
    const bySource = {};
    contacts.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      bySource[c.source_type] = (bySource[c.source_type] || 0) + 1;
    });
    this._stats.set({
      total: contacts.length,
      users: contacts.filter((c) => c.contact_type === "user").length,
      groups: contacts.filter((c) => c.contact_type === "group").length,
      channels: contacts.filter((c) => c.contact_type === "channel").length,
      by_status: byStatus,
      by_source: bySource,
      recent_added: contacts.filter((c) => {
        const created = new Date(c.created_at);
        const weekAgo = /* @__PURE__ */ new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created > weekAgo;
      }).length
    });
  }
  /**
   * 為選中的聯繫人添加標籤
   */
  addTagsToSelected(tags) {
    const ids = Array.from(this._selectedIds());
    if (ids.length > 0) {
      this.addTags(ids, tags);
    }
  }
  /**
   * 更新選中聯繫人的狀態
   */
  updateSelectedStatus(status) {
    const ids = Array.from(this._selectedIds());
    if (ids.length > 0) {
      this.updateStatus(ids, status);
    }
  }
  /**
   * 刪除選中的聯繫人
   */
  deleteSelected() {
    const ids = Array.from(this._selectedIds());
    if (ids.length > 0) {
      this.deleteContacts(ids);
    }
  }
  // ==================== 成員提取同步 ====================
  /**
   * 從成員提取結果導入聯繫人
   * 將提取的成員自動同步到統一聯繫人庫
   */
  importFromExtraction(members, source) {
    if (!members.length)
      return;
    console.log("[UnifiedContacts] Importing from extraction:", members.length, "members from", source.sourceName);
    this.ipc.send("unified-contacts:import-members", {
      members: members.map((m) => ({
        telegram_id: m.telegramId,
        username: m.username,
        first_name: m.firstName,
        last_name: m.lastName,
        display_name: m.displayName,
        phone: m.phone,
        is_bot: m.isBot,
        is_premium: m.isPremium,
        is_verified: m.isVerified,
        online_status: m.onlineStatus,
        last_seen: m.lastSeen,
        is_chinese: m.isChinese,
        activity_score: m.activityScore,
        value_level: m.valueLevel
      })),
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      sourceId: source.sourceId
    });
  }
  /**
   * 更新聯繫人狀態（從發送控制台接收）
   * 當用戶從發送控制台發送消息後，更新聯繫人狀態
   */
  updateContactStatus(telegramId, status) {
    console.log("[UnifiedContacts] Updating single contact status:", telegramId, status);
    this.updateContact(telegramId, { status });
  }
  /**
   * 同步發送控制台的目標列表
   * 返回所有可發送的用戶聯繫人
   */
  getSendTargets() {
    return this._contacts().filter((c) => c.contact_type === "user" && !c.is_bot);
  }
  /**
   * 標記聯繫人為已聯繫
   */
  markAsContacted(telegramIds) {
    this.updateStatus(telegramIds, "contacted");
  }
  /**
   * 獲取指定來源的聯繫人數量
   */
  getCountBySource(sourceType) {
    return this._contacts().filter((c) => c.source_type === sourceType).length;
  }
  /**
   * 獲取狀態標籤顏色
   */
  getStatusColor(status) {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return option?.color || "bg-gray-500";
  }
  /**
   * 獲取狀態標籤
   */
  getStatusLabel(status) {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return option?.label || status;
  }
  // ==================== 🆕 直接從 Leads 導入（前端同步） ====================
  /**
   * Lead 狀態映射到 Contact 狀態
   */
  mapLeadStatus(leadStatus) {
    const mapping = {
      "New": "new",
      "Contacted": "contacted",
      "Replied": "interested",
      "Interested": "interested",
      "Follow-up": "negotiating",
      "Negotiating": "negotiating",
      "Closed-Won": "converted",
      "Closed-Lost": "lost",
      "Unsubscribed": "blocked"
    };
    return mapping[leadStatus] || "new";
  }
  /**
   * 直接從前端 leads 數據導入到資源中心
   * 這樣就不需要後端同步，數據保持一致
   */
  importLeadsDirectly(leads) {
    console.log("[UnifiedContacts] Importing leads directly:", leads.length);
    if (!leads || leads.length === 0) {
      return;
    }
    const contacts = leads.map((lead, index) => ({
      id: lead.id || index,
      telegram_id: String(lead.userId || lead.user_id || ""),
      username: lead.username || "",
      display_name: lead.firstName || lead.username || String(lead.userId || ""),
      first_name: lead.firstName || "",
      last_name: lead.lastName || "",
      phone: lead.phone || "",
      contact_type: "user",
      source_type: lead.sourceType === "group_extract" ? "member" : "lead",
      source_id: lead.sourceChatId || lead.campaignId?.toString() || "",
      source_name: lead.sourceGroup || lead.sourceChatTitle || "\u767C\u9001\u63A7\u5236\u53F0",
      status: this.mapLeadStatus(lead.status || "New"),
      tags: lead.tags || [],
      ai_score: lead.aiScore || 0.5,
      activity_score: lead.activityScore || 0.5,
      value_level: lead.valueLevel || "C",
      is_online: lead.onlineStatus === "Online",
      last_seen: lead.lastSeen,
      is_bot: false,
      is_premium: lead.isPremium || false,
      is_verified: lead.isVerified || false,
      member_count: 0,
      message_count: (lead.interactionHistory || []).length,
      last_contact_at: lead.lastContactAt,
      last_message_at: lead.lastMessageAt,
      bio: lead.bio || "",
      notes: lead.notes || "",
      metadata: {},
      created_at: lead.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      synced_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    this._contacts.set(contacts);
    this._total.set(contacts.length);
    const byStatus = {};
    const bySource = {};
    contacts.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      bySource[c.source_type] = (bySource[c.source_type] || 0) + 1;
    });
    this._stats.set({
      total: contacts.length,
      users: contacts.length,
      groups: 0,
      channels: 0,
      by_status: byStatus,
      by_source: bySource,
      recent_added: contacts.filter((c) => {
        const created = new Date(c.created_at);
        const weekAgo = /* @__PURE__ */ new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length
    });
    this._isLoading.set(false);
    this._isSyncing.set(false);
    this._hasImportedFromLeads.set(true);
    console.log("[UnifiedContacts] Imported", contacts.length, "contacts from leads");
  }
  /**
   * 🆕 重置導入狀態（用於強制刷新）
   */
  resetImportState() {
    this._hasImportedFromLeads.set(false);
  }
  /**
   * 清理
   */
  ngOnDestroy() {
  }
  static {
    this.\u0275fac = function UnifiedContactsService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UnifiedContactsService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UnifiedContactsService, factory: _UnifiedContactsService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UnifiedContactsService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/lead-scoring.service.ts
var DEFAULT_RULES = [
  // 正面行為
  { id: "r1", action: "message_replied", name: "\u56DE\u8986\u6D88\u606F", description: "\u5BA2\u6236\u56DE\u8986\u4E86\u60A8\u7684\u6D88\u606F", points: 10, enabled: true, maxPerDay: 5 },
  { id: "r2", action: "positive_reply", name: "\u6B63\u9762\u56DE\u8986", description: "\u5BA2\u6236\u8868\u9054\u4E86\u8208\u8DA3\u6216\u7A4D\u6975\u614B\u5EA6", points: 15, enabled: true },
  { id: "r3", action: "question_asked", name: "\u4E3B\u52D5\u63D0\u554F", description: "\u5BA2\u6236\u4E3B\u52D5\u8A62\u554F\u7522\u54C1/\u670D\u52D9", points: 20, enabled: true },
  { id: "r4", action: "price_inquiry", name: "\u8A62\u554F\u50F9\u683C", description: "\u5BA2\u6236\u8A62\u554F\u50F9\u683C\uFF0C\u9AD8\u8CFC\u8CB7\u610F\u5411", points: 25, enabled: true },
  { id: "r5", action: "demo_requested", name: "\u8ACB\u6C42\u6F14\u793A", description: "\u5BA2\u6236\u8ACB\u6C42\u7522\u54C1\u6F14\u793A", points: 30, enabled: true },
  { id: "r6", action: "meeting_scheduled", name: "\u9810\u7D04\u6703\u8B70", description: "\u5BA2\u6236\u540C\u610F\u9810\u7D04\u6703\u8B70", points: 40, enabled: true },
  { id: "r7", action: "referral_made", name: "\u63A8\u85A6\u4ED6\u4EBA", description: "\u5BA2\u6236\u63A8\u85A6\u4E86\u5176\u4ED6\u6F5B\u5728\u5BA2\u6236", points: 50, enabled: true },
  // 中性行為
  { id: "r8", action: "message_sent", name: "\u767C\u9001\u6D88\u606F", description: "\u5411\u5BA2\u6236\u767C\u9001\u6D88\u606F", points: 2, enabled: true, maxPerDay: 3 },
  { id: "r9", action: "message_opened", name: "\u6253\u958B\u6D88\u606F", description: "\u5BA2\u6236\u6253\u958B\u4E86\u6D88\u606F", points: 5, enabled: true, maxPerDay: 5 },
  { id: "r10", action: "link_clicked", name: "\u9EDE\u64CA\u9023\u7D50", description: "\u5BA2\u6236\u9EDE\u64CA\u4E86\u6D88\u606F\u4E2D\u7684\u9023\u7D50", points: 8, enabled: true },
  // 負面行為
  { id: "r11", action: "negative_reply", name: "\u8CA0\u9762\u56DE\u8986", description: "\u5BA2\u6236\u8868\u9054\u4E0D\u611F\u8208\u8DA3", points: -10, enabled: true },
  { id: "r12", action: "unsubscribed", name: "\u53D6\u6D88\u8A02\u95B1", description: "\u5BA2\u6236\u53D6\u6D88\u8A02\u95B1\u6216\u62C9\u9ED1", points: -30, enabled: true },
  { id: "r13", action: "complained", name: "\u6295\u8A34", description: "\u5BA2\u6236\u6295\u8A34\u6216\u8209\u5831", points: -50, enabled: true },
  { id: "r14", action: "inactive_7d", name: "7\u5929\u672A\u6D3B\u8E8D", description: "\u5BA2\u62367\u5929\u5167\u7121\u4EFB\u4F55\u4E92\u52D5", points: -5, enabled: true },
  { id: "r15", action: "inactive_30d", name: "30\u5929\u672A\u6D3B\u8E8D", description: "\u5BA2\u623630\u5929\u5167\u7121\u4EFB\u4F55\u4E92\u52D5", points: -15, enabled: true }
];
var HEAT_LEVELS = [
  { level: "cold", minScore: -100, maxScore: 20, color: "#64748b", icon: "\u2744\uFE0F", label: "\u51B7\u6DE1" },
  { level: "warm", minScore: 21, maxScore: 50, color: "#eab308", icon: "\u{1F324}\uFE0F", label: "\u6EAB\u548C" },
  { level: "hot", minScore: 51, maxScore: 100, color: "#f97316", icon: "\u{1F525}", label: "\u71B1\u9580" },
  { level: "burning", minScore: 101, maxScore: 999, color: "#ef4444", icon: "\u{1F4A5}", label: "\u7206\u71B1" }
];
var LeadScoringService = class _LeadScoringService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._rules = signal(DEFAULT_RULES, ...ngDevMode ? [{ debugName: "_rules" }] : []);
    this.rules = this._rules.asReadonly();
    this._scores = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_scores" }] : []);
    this._globalHistory = signal([], ...ngDevMode ? [{ debugName: "_globalHistory" }] : []);
    this.globalHistory = this._globalHistory.asReadonly();
    this.stats = computed(() => {
      const scores = Array.from(this._scores().values());
      const byLevel = {
        cold: scores.filter((s) => s.heatLevel === "cold").length,
        warm: scores.filter((s) => s.heatLevel === "warm").length,
        hot: scores.filter((s) => s.heatLevel === "hot").length,
        burning: scores.filter((s) => s.heatLevel === "burning").length
      };
      return {
        total: scores.length,
        avgScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length : 0,
        byLevel,
        hotLeads: scores.filter((s) => s.heatLevel === "hot" || s.heatLevel === "burning")
      };
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.loadData();
    this.setupIpcListeners();
  }
  /**
   * 設置 IPC 監聽器
   */
  setupIpcListeners() {
    this.ipc.on("scoring:message-sent", (data) => {
      this.recordAction(data.contactId, "message_sent");
    });
    this.ipc.on("scoring:reply-received", (data) => {
      if (data.sentiment && data.sentiment > 0.3) {
        this.recordAction(data.contactId, "positive_reply");
      } else if (data.sentiment && data.sentiment < -0.3) {
        this.recordAction(data.contactId, "negative_reply");
      } else {
        this.recordAction(data.contactId, "message_replied");
      }
    });
    this.ipc.on("scoring:price-inquiry", (data) => {
      this.recordAction(data.contactId, "price_inquiry");
    });
  }
  /**
   * 載入數據
   */
  loadData() {
    try {
      const rulesStr = localStorage.getItem("tg-matrix-scoring-rules");
      if (rulesStr) {
        this._rules.set(JSON.parse(rulesStr));
      }
      const scoresStr = localStorage.getItem("tg-matrix-lead-scores");
      if (scoresStr) {
        const scoresArr = JSON.parse(scoresStr);
        const scoresMap = /* @__PURE__ */ new Map();
        scoresArr.forEach((s) => scoresMap.set(s.contactId, s));
        this._scores.set(scoresMap);
      }
      const historyStr = localStorage.getItem("tg-matrix-scoring-history");
      if (historyStr) {
        this._globalHistory.set(JSON.parse(historyStr));
      }
    } catch (e) {
      console.error("Failed to load scoring data:", e);
    }
  }
  /**
   * 保存數據
   */
  saveData() {
    try {
      localStorage.setItem("tg-matrix-scoring-rules", JSON.stringify(this._rules()));
      localStorage.setItem("tg-matrix-lead-scores", JSON.stringify(Array.from(this._scores().values())));
      localStorage.setItem("tg-matrix-scoring-history", JSON.stringify(this._globalHistory().slice(0, 1e3)));
    } catch (e) {
      console.error("Failed to save scoring data:", e);
    }
  }
  /**
   * 記錄評分行為
   */
  recordAction(contactId, action, metadata) {
    const rule = this._rules().find((r) => r.action === action && r.enabled);
    if (!rule)
      return 0;
    if (rule.maxPerDay) {
      const todayCount = this.getTodayActionCount(contactId, action);
      if (todayCount >= rule.maxPerDay) {
        return 0;
      }
    }
    if (rule.cooldownMinutes) {
      const lastAction = this.getLastActionTime(contactId, action);
      if (lastAction) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1e3;
        if (Date.now() - new Date(lastAction).getTime() < cooldownMs) {
          return 0;
        }
      }
    }
    const history = {
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      action,
      points: rule.points,
      reason: rule.name,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      metadata
    };
    this._globalHistory.update((h) => [history, ...h.slice(0, 999)]);
    this.updateScore(contactId, history);
    this.saveData();
    return rule.points;
  }
  /**
   * 更新客戶評分
   */
  updateScore(contactId, history) {
    const scores = this._scores();
    let score = scores.get(contactId);
    if (!score) {
      score = this.createNewScore(contactId);
    }
    score.history = [history, ...score.history.slice(0, 99)];
    score.totalScore = Math.max(-100, Math.min(999, score.totalScore + history.points));
    this.updateCategoryScores(score);
    score.heatLevel = this.calculateHeatLevel(score.totalScore);
    score.lastActivity = history.timestamp;
    score.activityCount++;
    score.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const newScores = new Map(scores);
    newScores.set(contactId, score);
    this._scores.set(newScores);
  }
  /**
   * 創建新評分記錄
   */
  createNewScore(contactId) {
    return {
      contactId,
      totalScore: 0,
      heatLevel: "cold",
      behaviorScore: 0,
      engagementScore: 0,
      intentScore: 0,
      recencyScore: 0,
      activityCount: 0,
      history: [],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * 更新分類評分
   */
  updateCategoryScores(score) {
    const recent = score.history.slice(0, 20);
    const behaviorActions = ["message_replied", "link_clicked", "message_opened"];
    score.behaviorScore = recent.filter((h) => behaviorActions.includes(h.action)).reduce((sum, h) => sum + h.points, 0);
    const engagementActions = ["positive_reply", "question_asked"];
    score.engagementScore = recent.filter((h) => engagementActions.includes(h.action)).reduce((sum, h) => sum + h.points, 0);
    const intentActions = ["price_inquiry", "demo_requested", "meeting_scheduled"];
    score.intentScore = recent.filter((h) => intentActions.includes(h.action)).reduce((sum, h) => sum + h.points, 0);
    if (score.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(score.lastActivity).getTime()) / (1e3 * 60 * 60 * 24);
      if (daysSinceActivity < 1) {
        score.recencyScore = 20;
      } else if (daysSinceActivity < 3) {
        score.recencyScore = 15;
      } else if (daysSinceActivity < 7) {
        score.recencyScore = 10;
      } else if (daysSinceActivity < 14) {
        score.recencyScore = 5;
      } else {
        score.recencyScore = 0;
      }
    }
  }
  /**
   * 計算熱度等級
   */
  calculateHeatLevel(score) {
    for (const config of HEAT_LEVELS) {
      if (score >= config.minScore && score <= config.maxScore) {
        return config.level;
      }
    }
    return "cold";
  }
  /**
   * 獲取今日行為計數
   */
  getTodayActionCount(contactId, action) {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    const score = this._scores().get(contactId);
    if (!score)
      return 0;
    return score.history.filter((h) => h.action === action && new Date(h.timestamp).toDateString() === today).length;
  }
  /**
   * 獲取最後行為時間
   */
  getLastActionTime(contactId, action) {
    const score = this._scores().get(contactId);
    if (!score)
      return null;
    const lastAction = score.history.find((h) => h.action === action);
    return lastAction?.timestamp || null;
  }
  /**
   * 獲取客戶評分
   */
  getScore(contactId) {
    return this._scores().get(contactId) || null;
  }
  /**
   * 獲取所有評分
   */
  getAllScores() {
    return Array.from(this._scores().values());
  }
  /**
   * 獲取熱門客戶
   */
  getHotLeads(limit = 10) {
    return this.getAllScores().sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
  }
  /**
   * 按熱度等級獲取客戶
   */
  getLeadsByHeatLevel(level) {
    return this.getAllScores().filter((s) => s.heatLevel === level);
  }
  /**
   * 手動調整分數
   */
  adjustScore(contactId, points, reason) {
    const history = {
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      action: "message_sent",
      // 使用通用行為
      points,
      reason: `\u624B\u52D5\u8ABF\u6574: ${reason}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this._globalHistory.update((h) => [history, ...h.slice(0, 999)]);
    this.updateScore(contactId, history);
    this.saveData();
    this.toast.success(`\u8A55\u5206\u5DF2\u8ABF\u6574 ${points > 0 ? "+" : ""}${points} \u5206`);
  }
  /**
   * 更新 AI 分析
   */
  updateAIAnalysis(contactId, analysis) {
    const scores = this._scores();
    const score = scores.get(contactId);
    if (!score)
      return;
    score.aiAnalysis = analysis;
    if (analysis) {
      const aiBonus = Math.round(analysis.purchaseIntent * 0.3 + analysis.urgency * 0.2);
      score.intentScore = Math.max(0, score.intentScore + aiBonus);
    }
    score.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const newScores = new Map(scores);
    newScores.set(contactId, score);
    this._scores.set(newScores);
    this.saveData();
  }
  /**
   * 更新評分規則
   */
  updateRule(ruleId, updates) {
    this._rules.update((rules) => rules.map((r) => r.id === ruleId ? __spreadValues(__spreadValues({}, r), updates) : r));
    this.saveData();
  }
  /**
   * 重置規則為默認值
   */
  resetRules() {
    this._rules.set(DEFAULT_RULES);
    this.saveData();
    this.toast.success("\u8A55\u5206\u898F\u5247\u5DF2\u91CD\u7F6E");
  }
  /**
   * 清除客戶評分
   */
  clearScore(contactId) {
    const scores = new Map(this._scores());
    scores.delete(contactId);
    this._scores.set(scores);
    this.saveData();
  }
  /**
   * 獲取熱度等級配置
   */
  getHeatLevelConfig(level) {
    return HEAT_LEVELS.find((h) => h.level === level) || HEAT_LEVELS[0];
  }
  /**
   * 獲取所有熱度等級配置
   */
  getAllHeatLevelConfigs() {
    return HEAT_LEVELS;
  }
  /**
   * 批量檢查不活躍客戶
   */
  checkInactiveLeads() {
    const now = Date.now();
    const scores = this.getAllScores();
    for (const score of scores) {
      if (!score.lastActivity)
        continue;
      const lastActivityTime = new Date(score.lastActivity).getTime();
      const daysSinceActivity = (now - lastActivityTime) / (1e3 * 60 * 60 * 24);
      const has7d = score.history.some((h) => h.action === "inactive_7d" && now - new Date(h.timestamp).getTime() < 7 * 24 * 60 * 60 * 1e3);
      const has30d = score.history.some((h) => h.action === "inactive_30d" && now - new Date(h.timestamp).getTime() < 30 * 24 * 60 * 60 * 1e3);
      if (daysSinceActivity >= 30 && !has30d) {
        this.recordAction(score.contactId, "inactive_30d");
      } else if (daysSinceActivity >= 7 && !has7d) {
        this.recordAction(score.contactId, "inactive_7d");
      }
    }
  }
  static {
    this.\u0275fac = function LeadScoringService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LeadScoringService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LeadScoringService, factory: _LeadScoringService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LeadScoringService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/state-persistence.service.ts
var STORAGE_KEYS = {
  // 用戶偏好
  USER_PREFERENCES: "user_preferences",
  THEME: "theme",
  LANGUAGE: "language",
  // 會話狀態
  CURRENT_VIEW: "current_view",
  SIDEBAR_COLLAPSED: "sidebar_collapsed",
  // 功能數據
  MARKETING_ANALYTICS: "marketingAnalytics",
  SMART_TIMING: "smartTiming",
  SMART_AUTOMATION: "smartAutomation",
  PLANNER_DRAFT: "plannerDraft",
  // 帳號相關
  ACCOUNTS_CACHE: "accounts_cache",
  SESSION_PATHS: "session_paths",
  // 搜索歷史
  SEARCH_HISTORY: "search_history",
  RECENT_CONTACTS: "recent_contacts",
  // 版本信息
  STORAGE_VERSION: "storage_version"
};
var CURRENT_VERSION = 1;
var MIGRATIONS = {
  // 版本 0 -> 1
  1: (data) => {
    return __spreadProps(__spreadValues({}, data), {
      migratedAt: Date.now()
    });
  }
};
var StatePersistenceService = class _StatePersistenceService {
  constructor() {
    this._stats = signal(null, ...ngDevMode ? [{ debugName: "_stats" }] : []);
    this.stats = this._stats.asReadonly();
    this._available = signal(true, ...ngDevMode ? [{ debugName: "_available" }] : []);
    this.available = this._available.asReadonly();
    this.checkStorageAvailability();
    this.runMigrations();
    this.updateStats();
  }
  // ============ 核心方法 ============
  /**
   * 保存數據
   */
  save(key, data, options) {
    if (!this._available())
      return false;
    try {
      const metadata = {
        key,
        version: options?.version ?? CURRENT_VERSION,
        savedAt: Date.now(),
        expiresAt: options?.ttl ? Date.now() + options.ttl : void 0
      };
      const wrapper = {
        _meta: metadata,
        data
      };
      localStorage.setItem(key, JSON.stringify(wrapper));
      this.updateStats();
      return true;
    } catch (error) {
      console.error(`[StatePersistence] \u4FDD\u5B58\u5931\u6557 (${key}):`, error);
      if (error.name === "QuotaExceededError") {
        this.cleanup();
        try {
          localStorage.setItem(key, JSON.stringify({ data, _meta: { key, version: CURRENT_VERSION, savedAt: Date.now() } }));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }
  /**
   * 讀取數據
   */
  load(key, defaultValue) {
    if (!this._available())
      return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (!stored)
        return defaultValue;
      const wrapper = JSON.parse(stored);
      if (wrapper._meta) {
        if (wrapper._meta.expiresAt && Date.now() > wrapper._meta.expiresAt) {
          this.remove(key);
          return defaultValue;
        }
        if (wrapper._meta.version < CURRENT_VERSION) {
          const migrated = this.migrate(wrapper.data, wrapper._meta.version);
          this.save(key, migrated);
          return migrated;
        }
        return wrapper.data;
      }
      return wrapper;
    } catch (error) {
      console.error(`[StatePersistence] \u8B80\u53D6\u5931\u6557 (${key}):`, error);
      return defaultValue;
    }
  }
  /**
   * 刪除數據
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      this.updateStats();
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 檢查數據是否存在
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  }
  // ============ 批量操作 ============
  /**
   * 批量保存
   */
  saveMultiple(items) {
    let allSuccess = true;
    for (const item of items) {
      if (!this.save(item.key, item.data)) {
        allSuccess = false;
      }
    }
    return allSuccess;
  }
  /**
   * 批量讀取
   */
  loadMultiple(keys) {
    const result = {};
    for (const key of keys) {
      result[key] = this.load(key);
    }
    return result;
  }
  // ============ 用戶偏好 ============
  /**
   * 保存用戶偏好
   */
  savePreference(prefKey, value) {
    const prefs = this.load(STORAGE_KEYS.USER_PREFERENCES, {});
    prefs[prefKey] = value;
    this.save(STORAGE_KEYS.USER_PREFERENCES, prefs);
  }
  /**
   * 讀取用戶偏好
   */
  loadPreference(prefKey, defaultValue) {
    const prefs = this.load(STORAGE_KEYS.USER_PREFERENCES, {});
    return prefs[prefKey] ?? defaultValue;
  }
  // ============ 會話狀態 ============
  /**
   * 保存會話狀態（使用 sessionStorage）
   */
  saveSession(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 讀取會話狀態
   */
  loadSession(key, defaultValue) {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  /**
   * 清除會話狀態
   */
  clearSession() {
    sessionStorage.clear();
  }
  // ============ 清理和維護 ============
  /**
   * 清理過期數據
   */
  cleanup() {
    let cleaned = 0;
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key)
        continue;
      try {
        const stored = localStorage.getItem(key);
        if (!stored)
          continue;
        const wrapper = JSON.parse(stored);
        if (wrapper._meta?.expiresAt && now > wrapper._meta.expiresAt) {
          localStorage.removeItem(key);
          cleaned++;
          i--;
        }
      } catch {
      }
    }
    this.updateStats();
    console.log(`[StatePersistence] \u6E05\u7406\u4E86 ${cleaned} \u500B\u904E\u671F\u9805`);
    return cleaned;
  }
  /**
   * 清理舊數據（按時間）
   */
  cleanupOld(maxAge = 30 * 24 * 60 * 60 * 1e3) {
    let cleaned = 0;
    const cutoff = Date.now() - maxAge;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key)
        continue;
      try {
        const stored = localStorage.getItem(key);
        if (!stored)
          continue;
        const wrapper = JSON.parse(stored);
        if (wrapper._meta?.savedAt && wrapper._meta.savedAt < cutoff) {
          localStorage.removeItem(key);
          cleaned++;
          i--;
        }
      } catch {
      }
    }
    this.updateStats();
    return cleaned;
  }
  /**
   * 清除所有存儲
   */
  clearAll() {
    localStorage.clear();
    this.updateStats();
  }
  // ============ 導入/導出 ============
  /**
   * 導出所有數據
   */
  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key)
        continue;
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
    return JSON.stringify({
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: CURRENT_VERSION,
      data
    }, null, 2);
  }
  /**
   * 導入數據
   */
  importAll(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported.data) {
        console.error("[StatePersistence] \u7121\u6548\u7684\u5C0E\u5165\u683C\u5F0F");
        return false;
      }
      for (const [key, value] of Object.entries(imported.data)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
      this.updateStats();
      return true;
    } catch (error) {
      console.error("[StatePersistence] \u5C0E\u5165\u5931\u6557:", error);
      return false;
    }
  }
  // ============ 內部方法 ============
  /**
   * 檢查存儲可用性
   */
  checkStorageAvailability() {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this._available.set(true);
    } catch {
      this._available.set(false);
      console.warn("[StatePersistence] localStorage \u4E0D\u53EF\u7528");
    }
  }
  /**
   * 運行版本遷移
   */
  runMigrations() {
    const storedVersion = this.load(STORAGE_KEYS.STORAGE_VERSION, 0);
    if (storedVersion !== void 0 && storedVersion < CURRENT_VERSION) {
      console.log(`[StatePersistence] \u904B\u884C\u9077\u79FB: ${storedVersion} -> ${CURRENT_VERSION}`);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key)
          continue;
        try {
          const data = this.load(key);
          if (data) {
            const migrated = this.migrate(data, storedVersion);
            this.save(key, migrated);
          }
        } catch {
        }
      }
      this.save(STORAGE_KEYS.STORAGE_VERSION, CURRENT_VERSION);
    }
  }
  /**
   * 遷移數據
   */
  migrate(data, fromVersion) {
    let result = data;
    for (let v = fromVersion + 1; v <= CURRENT_VERSION; v++) {
      if (MIGRATIONS[v]) {
        result = MIGRATIONS[v](result);
      }
    }
    return result;
  }
  /**
   * 更新存儲統計
   */
  updateStats() {
    let totalSize = 0;
    const byKey = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key)
        continue;
      const value = localStorage.getItem(key);
      const size = new Blob([value || ""]).size;
      totalSize += size;
      byKey.push({ key, size });
    }
    byKey.sort((a, b) => b.size - a.size);
    this._stats.set({
      totalKeys: localStorage.length,
      totalSize,
      byKey
    });
  }
  /**
   * 獲取存儲使用情況
   */
  getUsageInfo() {
    const stats = this._stats();
    if (!stats) {
      return { used: "0 KB", available: "5 MB", percentage: 0 };
    }
    const usedMB = stats.totalSize / (1024 * 1024);
    const availableMB = 5;
    const percentage = usedMB / availableMB * 100;
    return {
      used: usedMB < 1 ? `${(stats.totalSize / 1024).toFixed(1)} KB` : `${usedMB.toFixed(2)} MB`,
      available: `${availableMB} MB`,
      percentage: Math.min(100, percentage)
    };
  }
  static {
    this.\u0275fac = function StatePersistenceService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _StatePersistenceService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _StatePersistenceService, factory: _StatePersistenceService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StatePersistenceService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/ab-testing.service.ts
var ABTestingService = class _ABTestingService {
  constructor() {
    this.persistence = inject(StatePersistenceService);
    this._experiments = signal([], ...ngDevMode ? [{ debugName: "_experiments" }] : []);
    this.experiments = this._experiments.asReadonly();
    this._variantStats = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_variantStats" }] : []);
    this._userAssignments = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_userAssignments" }] : []);
    this.activeExperiments = computed(() => this._experiments().filter((e) => e.status === "running"), ...ngDevMode ? [{ debugName: "activeExperiments" }] : []);
    this.activeTests = this.activeExperiments;
    this.completedExperiments = computed(() => this._experiments().filter((e) => e.status === "completed"), ...ngDevMode ? [{ debugName: "completedExperiments" }] : []);
    this.stats = computed(() => {
      const experiments = this._experiments();
      const completed = this.completedExperiments();
      let totalLift = 0;
      let liftCount = 0;
      completed.forEach((exp) => {
        const result = this.getExperimentResult(exp.id);
        if (result?.recommendedWinner) {
          const winnerStats = result.variantStats.find((s) => s.variantId === result.recommendedWinner);
          if (winnerStats?.uplift) {
            totalLift += winnerStats.uplift;
            liftCount++;
          }
        }
      });
      return {
        total: experiments.length,
        running: this.activeExperiments().length,
        completed: completed.length,
        draft: experiments.filter((e) => e.status === "draft").length,
        avgConversionLift: liftCount > 0 ? totalLift / liftCount : 0
      };
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.STORAGE_KEY = "abTesting";
    this.loadFromStorage();
  }
  // ============ 實驗管理 ============
  /**
   * 創建實驗
   */
  createExperiment(config) {
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    const normalizedVariants = config.variants.map((v, i) => __spreadProps(__spreadValues({}, v), {
      id: `var_${Date.now()}_${i}`,
      weight: Math.round(v.weight / totalWeight * 100)
    }));
    const experiment = {
      id: `exp_${Date.now()}`,
      name: config.name,
      description: config.description,
      status: "draft",
      variants: normalizedVariants,
      controlVariantId: normalizedVariants[0].id,
      primaryMetric: config.primaryMetric,
      secondaryMetrics: config.secondaryMetrics,
      createdAt: /* @__PURE__ */ new Date(),
      sampleSize: config.sampleSize ?? 100,
      minRunDays: config.minRunDays ?? 7,
      confidenceLevel: config.confidenceLevel ?? 0.95,
      autoSelectWinner: config.autoSelectWinner ?? true
    };
    this._experiments.update((exps) => [...exps, experiment]);
    this._variantStats.update((stats) => {
      const newStats = new Map(stats);
      newStats.set(experiment.id, normalizedVariants.map((v) => this.createEmptyStats(v.id)));
      return newStats;
    });
    this.saveToStorage();
    console.log(`[ABTesting] \u5275\u5EFA\u5BE6\u9A57: ${experiment.name}`);
    return experiment;
  }
  /**
   * 開始實驗
   */
  startExperiment(experimentId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== "draft")
      return false;
    this.updateExperiment(experimentId, {
      status: "running",
      startedAt: /* @__PURE__ */ new Date()
    });
    console.log(`[ABTesting] \u958B\u59CB\u5BE6\u9A57: ${experiment.name}`);
    return true;
  }
  /**
   * 暫停實驗
   */
  pauseExperiment(experimentId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== "running")
      return false;
    this.updateExperiment(experimentId, { status: "paused" });
    return true;
  }
  /**
   * 恢復實驗
   */
  resumeExperiment(experimentId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== "paused")
      return false;
    this.updateExperiment(experimentId, { status: "running" });
    return true;
  }
  /**
   * 結束實驗
   */
  endExperiment(experimentId, winnerId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment)
      return false;
    this.updateExperiment(experimentId, {
      status: "completed",
      endedAt: /* @__PURE__ */ new Date(),
      winner: winnerId
    });
    console.log(`[ABTesting] \u7D50\u675F\u5BE6\u9A57: ${experiment.name}, \u512A\u52DD: ${winnerId}`);
    return true;
  }
  /**
   * 獲取實驗
   */
  getExperiment(experimentId) {
    return this._experiments().find((e) => e.id === experimentId);
  }
  /**
   * 更新實驗
   */
  updateExperiment(experimentId, updates) {
    this._experiments.update((exps) => exps.map((e) => e.id === experimentId ? __spreadValues(__spreadValues({}, e), updates) : e));
    this.saveToStorage();
  }
  // ============ 變體分配 ============
  /**
   * 分配變體
   */
  assignVariant(experimentId, userId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== "running")
      return null;
    const existingKey = `${experimentId}_${userId}`;
    const existing = this._userAssignments().get(existingKey);
    if (existing) {
      return experiment.variants.find((v) => v.id === existing.variantId) || null;
    }
    const variant = this.selectVariantByWeight(experiment.variants);
    this._userAssignments.update((assignments) => {
      const newAssignments = new Map(assignments);
      newAssignments.set(existingKey, {
        experimentId,
        variantId: variant.id,
        assignedAt: /* @__PURE__ */ new Date()
      });
      return newAssignments;
    });
    this.saveToStorage();
    return variant;
  }
  /**
   * 根據權重選擇變體
   */
  selectVariantByWeight(variants) {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) {
        return variant;
      }
    }
    return variants[variants.length - 1];
  }
  /**
   * 獲取用戶的變體
   */
  getUserVariant(experimentId, userId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment)
      return null;
    const key = `${experimentId}_${userId}`;
    const assignment = this._userAssignments().get(key);
    if (!assignment)
      return null;
    return experiment.variants.find((v) => v.id === assignment.variantId) || null;
  }
  // ============ 結果記錄 ============
  /**
   * 記錄轉化
   */
  recordConversion(experimentId, userId, data) {
    const variant = this.getUserVariant(experimentId, userId);
    if (!variant)
      return;
    this._variantStats.update((stats) => {
      const newStats = new Map(stats);
      const expStats = newStats.get(experimentId) || [];
      const variantStats = expStats.find((s) => s.variantId === variant.id);
      if (variantStats) {
        variantStats.sampleSize++;
        variantStats.conversions++;
        variantStats.conversionRate = variantStats.conversions / variantStats.sampleSize;
        variantStats.totalRevenue += data.revenue || 0;
        if (data.interestScore !== void 0) {
          variantStats.avgInterestScore = (variantStats.avgInterestScore * (variantStats.sampleSize - 1) + data.interestScore) / variantStats.sampleSize;
        }
        if (data.messageCount !== void 0) {
          variantStats.avgMessageCount = (variantStats.avgMessageCount * (variantStats.sampleSize - 1) + data.messageCount) / variantStats.sampleSize;
        }
      }
      newStats.set(experimentId, expStats);
      return newStats;
    });
    this.saveToStorage();
    this.checkAutoComplete(experimentId);
  }
  /**
   * 記錄曝光（無轉化）
   */
  recordExposure(experimentId, userId) {
    const variant = this.getUserVariant(experimentId, userId);
    if (!variant)
      return;
    this._variantStats.update((stats) => {
      const newStats = new Map(stats);
      const expStats = newStats.get(experimentId) || [];
      const variantStats = expStats.find((s) => s.variantId === variant.id);
      if (variantStats) {
        variantStats.sampleSize++;
        variantStats.conversionRate = variantStats.conversions / variantStats.sampleSize;
      }
      newStats.set(experimentId, expStats);
      return newStats;
    });
    this.saveToStorage();
  }
  // ============ 統計分析 ============
  /**
   * 獲取實驗結果
   */
  getExperimentResult(experimentId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment)
      return null;
    const variantStats = this._variantStats().get(experimentId) || [];
    const controlStats = variantStats.find((s) => s.variantId === experiment.controlVariantId);
    const enrichedStats = variantStats.map((stats) => {
      if (stats.variantId === experiment.controlVariantId) {
        return stats;
      }
      const uplift = controlStats && controlStats.conversionRate > 0 ? (stats.conversionRate - controlStats.conversionRate) / controlStats.conversionRate * 100 : 0;
      const significance = this.calculateSignificance(stats, controlStats);
      return __spreadValues(__spreadProps(__spreadValues({}, stats), {
        uplift
      }), significance);
    });
    const significantWinners = enrichedStats.filter((s) => s.isSignificant && (s.uplift || 0) > 0);
    const runDays = experiment.startedAt ? Math.floor((Date.now() - experiment.startedAt.getTime()) / (1e3 * 60 * 60 * 24)) : 0;
    const totalSampleSize = enrichedStats.reduce((sum, s) => sum + s.sampleSize, 0);
    let recommendation = "";
    let recommendedWinner;
    if (totalSampleSize < (experiment.sampleSize || 100)) {
      recommendation = `\u6A23\u672C\u91CF\u4E0D\u8DB3\uFF0C\u5EFA\u8B70\u7E7C\u7E8C\u6536\u96C6\u6578\u64DA\uFF08\u7576\u524D ${totalSampleSize}/${experiment.sampleSize}\uFF09`;
    } else if (runDays < (experiment.minRunDays || 7)) {
      recommendation = `\u904B\u884C\u6642\u9593\u4E0D\u8DB3\uFF0C\u5EFA\u8B70\u81F3\u5C11\u904B\u884C ${experiment.minRunDays} \u5929`;
    } else if (significantWinners.length === 0) {
      recommendation = "\u66AB\u7121\u7D71\u8A08\u986F\u8457\u7684\u512A\u52DD\u8005\uFF0C\u5EFA\u8B70\u7E7C\u7E8C\u89C0\u5BDF\u6216\u8ABF\u6574\u8B8A\u9AD4";
    } else if (significantWinners.length === 1) {
      recommendedWinner = significantWinners[0].variantId;
      recommendation = `\u5EFA\u8B70\u9078\u64C7\u8B8A\u9AD4 ${this.getVariantName(experiment, recommendedWinner)}\uFF0C\u63D0\u5347 ${significantWinners[0].uplift?.toFixed(1)}%`;
    } else {
      const best = significantWinners.sort((a, b) => (b.uplift || 0) - (a.uplift || 0))[0];
      recommendedWinner = best.variantId;
      recommendation = `\u591A\u500B\u8B8A\u9AD4\u8868\u73FE\u512A\u79C0\uFF0C\u5EFA\u8B70\u9078\u64C7 ${this.getVariantName(experiment, recommendedWinner)}`;
    }
    return {
      experimentId,
      variantStats: enrichedStats,
      overallSampleSize: totalSampleSize,
      runDays,
      hasSignificantWinner: significantWinners.length > 0,
      recommendedWinner,
      recommendation
    };
  }
  /**
   * 計算統計顯著性（簡化版）
   */
  calculateSignificance(variant, control) {
    if (!control || control.sampleSize < 30 || variant.sampleSize < 30) {
      return {};
    }
    const p1 = variant.conversionRate;
    const p2 = control.conversionRate;
    const n1 = variant.sampleSize;
    const n2 = control.sampleSize;
    const pooledP = (variant.conversions + control.conversions) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
    if (se === 0)
      return {};
    const z = (p1 - p2) / se;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const margin = 1.96 * se;
    const diff = p1 - p2;
    return {
      pValue,
      isSignificant: pValue < 0.05,
      confidenceInterval: [diff - margin, diff + margin]
    };
  }
  /**
   * 標準正態分佈 CDF（近似）
   */
  normalCDF(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }
  /**
   * 檢查自動完成
   */
  checkAutoComplete(experimentId) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || !experiment.autoSelectWinner)
      return;
    const result = this.getExperimentResult(experimentId);
    if (!result)
      return;
    if (result.hasSignificantWinner && result.overallSampleSize >= (experiment.sampleSize || 100) && result.runDays >= (experiment.minRunDays || 7)) {
      this.endExperiment(experimentId, result.recommendedWinner);
      console.log(`[ABTesting] \u81EA\u52D5\u9078\u64C7\u512A\u52DD\u8005: ${result.recommendedWinner}`);
    }
  }
  // ============ 輔助方法 ============
  getVariantName(experiment, variantId) {
    return experiment.variants.find((v) => v.id === variantId)?.name || variantId;
  }
  createEmptyStats(variantId) {
    return {
      variantId,
      sampleSize: 0,
      conversions: 0,
      conversionRate: 0,
      totalRevenue: 0,
      avgInterestScore: 0,
      avgResponseTime: 0,
      avgMessageCount: 0
    };
  }
  // ============ 持久化 ============
  saveToStorage() {
    const data = {
      experiments: this._experiments(),
      variantStats: Array.from(this._variantStats().entries()),
      userAssignments: Array.from(this._userAssignments().entries()),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored)
        return;
      const data = JSON.parse(stored);
      if (data.experiments) {
        this._experiments.set(data.experiments.map((e) => __spreadProps(__spreadValues({}, e), {
          createdAt: new Date(e.createdAt),
          startedAt: e.startedAt ? new Date(e.startedAt) : void 0,
          endedAt: e.endedAt ? new Date(e.endedAt) : void 0
        })));
      }
      if (data.variantStats) {
        this._variantStats.set(new Map(data.variantStats));
      }
      if (data.userAssignments) {
        this._userAssignments.set(new Map(data.userAssignments.map((e) => [
          e[0],
          __spreadProps(__spreadValues({}, e[1]), { assignedAt: new Date(e[1].assignedAt) })
        ])));
      }
      console.log("[ABTesting] \u5DF2\u5F9E\u5B58\u5132\u6062\u5FA9\u6578\u64DA");
    } catch (e) {
      console.error("[ABTesting] \u6062\u5FA9\u6578\u64DA\u5931\u6557:", e);
    }
  }
  static {
    this.\u0275fac = function ABTestingService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ABTestingService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ABTestingService, factory: _ABTestingService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ABTestingService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  DEFAULT_TAGS,
  STATUS_OPTIONS,
  UnifiedContactsService,
  LeadScoringService,
  ABTestingService
};
//# sourceMappingURL=chunk-SRBGSWCK.js.map
