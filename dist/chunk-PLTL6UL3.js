import {
  ElectronIpcService
} from "./chunk-355UGVEO.js";
import {
  ToastService
} from "./chunk-FPLBFLUX.js";
import {
  Injectable,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-Y4VZODST.js";

// src/models/marketing-task.models.ts
var GOAL_TYPE_CONFIG = {
  conversion: {
    icon: "\u{1F4B0}",
    label: "\u4FC3\u9032\u9996\u55AE",
    description: "\u628A\u7336\u8C6B\u4E0D\u6C7A\u7684\u6F5B\u5728\u5BA2\u6236\u8F49\u5316\u70BA\u4ED8\u8CBB\u7528\u6236",
    suggestedRoles: ["expert", "satisfied_customer", "sales"],
    suggestedMode: "hybrid"
  },
  retention: {
    icon: "\u{1F49D}",
    label: "\u633D\u56DE\u6D41\u5931",
    description: "\u633D\u56DE\u5DF2\u6D41\u5931\u7684\u8001\u5BA2\u6236\uFF0C\u8B93\u4ED6\u5011\u91CD\u65B0\u8CFC\u8CB7",
    suggestedRoles: ["callback", "support", "manager"],
    suggestedMode: "hybrid"
  },
  engagement: {
    icon: "\u{1F389}",
    label: "\u793E\u7FA4\u6D3B\u8E8D",
    description: "\u8B93\u793E\u7FA4\u66F4\u6D3B\u8E8D\uFF0C\u589E\u52A0\u7528\u6236\u4E92\u52D5\u548C\u7C98\u6027",
    suggestedRoles: ["newbie", "satisfied_customer", "expert"],
    suggestedMode: "scriptless"
  },
  support: {
    icon: "\u{1F527}",
    label: "\u552E\u5F8C\u670D\u52D9",
    description: "\u9AD8\u6548\u8655\u7406\u5BA2\u6236\u552E\u5F8C\u554F\u984C\uFF0C\u63D0\u5347\u6EFF\u610F\u5EA6",
    suggestedRoles: ["support", "expert", "manager"],
    suggestedMode: "scripted"
  }
};
function createDefaultTask(goalType = "conversion") {
  const config = GOAL_TYPE_CONFIG[goalType];
  return {
    goalType,
    executionMode: config.suggestedMode,
    status: "draft",
    targetCount: 0,
    stats: {
      totalContacts: 0,
      contacted: 0,
      replied: 0,
      converted: 0,
      messagesSent: 0,
      aiCost: 0,
      contactRate: 0,
      replyRate: 0,
      conversionRate: 0
    }
  };
}

// src/services/marketing-task.service.ts
var MarketingTaskService = class _MarketingTaskService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._tasks = signal([], ...ngDevMode ? [{ debugName: "_tasks" }] : []);
    this.tasks = this._tasks.asReadonly();
    this._currentTask = signal(null, ...ngDevMode ? [{ debugName: "_currentTask" }] : []);
    this.currentTask = this._currentTask.asReadonly();
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this.isLoading = this._isLoading.asReadonly();
    this.activeTasks = computed(() => this._tasks().filter((t) => t.status === "running" || t.status === "scheduled"), ...ngDevMode ? [{ debugName: "activeTasks" }] : []);
    this.todayStats = computed(() => {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayTasks = this._tasks().filter((t) => t.createdAt.startsWith(today) || t.startedAt?.startsWith(today));
      return {
        totalTasks: todayTasks.length,
        contacted: todayTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
        converted: todayTasks.reduce((sum, t) => sum + t.stats.converted, 0),
        messagesSent: todayTasks.reduce((sum, t) => sum + t.stats.messagesSent, 0),
        aiCost: todayTasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
      };
    }, ...ngDevMode ? [{ debugName: "todayStats" }] : []);
    this.tasksByGoal = computed(() => {
      const grouped = {
        conversion: [],
        retention: [],
        engagement: [],
        support: []
      };
      this._tasks().forEach((t) => {
        grouped[t.goalType]?.push(t);
      });
      return grouped;
    }, ...ngDevMode ? [{ debugName: "tasksByGoal" }] : []);
    this.overallConversionRate = computed(() => {
      const allTasks = this._tasks().filter((t) => t.stats.contacted > 0);
      if (allTasks.length === 0)
        return 0;
      const totalContacted = allTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
      const totalConverted = allTasks.reduce((sum, t) => sum + t.stats.converted, 0);
      return totalContacted > 0 ? Math.round(totalConverted / totalContacted * 100) : 0;
    }, ...ngDevMode ? [{ debugName: "overallConversionRate" }] : []);
    this.setupIpcListeners();
    this.loadTasks();
  }
  setupIpcListeners() {
    this.ipc.on("marketing-tasks-loaded", (data) => {
      if (data.success && data.tasks) {
        this._tasks.set(data.tasks.map(this.normalizeTask));
      }
      this._isLoading.set(false);
    });
    this.ipc.on("marketing-task-created", (data) => {
      if (data.success && data.task) {
        this._tasks.update((tasks) => [...tasks, this.normalizeTask(data.task)]);
        this.toast.success(`\u4EFB\u52D9\u300C${data.task.name}\u300D\u5275\u5EFA\u6210\u529F`);
      } else {
        this.toast.error(`\u5275\u5EFA\u5931\u6557: ${data.error}`);
      }
    });
    this.ipc.on("marketing-task-updated", (data) => {
      if (data.success && data.task) {
        this._tasks.update((tasks) => tasks.map((t) => t.id === data.task.id ? this.normalizeTask(data.task) : t));
      }
    });
    this.ipc.on("marketing-task-stats", (data) => {
      if (data.taskId && data.stats) {
        this._tasks.update((tasks) => tasks.map((t) => t.id === data.taskId ? __spreadProps(__spreadValues({}, t), { stats: __spreadValues(__spreadValues({}, t.stats), data.stats) }) : t));
      }
    });
    this.ipc.on("marketing-task-deleted", (data) => {
      if (data.success && data.taskId) {
        this._tasks.update((tasks) => tasks.filter((t) => t.id !== data.taskId));
        this.toast.success("\u4EFB\u52D9\u5DF2\u522A\u9664");
      }
    });
  }
  // ============ CRUD 操作 ============
  /**
   * 加載所有任務
   */
  loadTasks() {
    this._isLoading.set(true);
    this.ipc.send("get-marketing-tasks", {});
  }
  /**
   * 創建新任務
   */
  async createTask(params) {
    const task = __spreadProps(__spreadValues(__spreadValues({}, createDefaultTask(params.goalType)), params), {
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return new Promise((resolve) => {
      const cleanup = this.ipc.on("marketing-task-created", (data) => {
        cleanup();
        resolve(data.success ? data.task?.id : null);
      });
      this.ipc.send("create-marketing-task", task);
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 1e4);
    });
  }
  /**
   * 快速創建任務（基於目標類型）
   */
  async quickCreate(goalType, targetUsers) {
    const config = GOAL_TYPE_CONFIG[goalType];
    return this.createTask({
      name: `${config.label} - ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
      goalType,
      executionMode: config.suggestedMode,
      description: config.description,
      roleConfig: config.suggestedRoles.map((roleType) => ({
        roleType,
        roleName: roleType
      }))
    });
  }
  /**
   * 更新任務
   */
  updateTask(taskId, updates) {
    this.ipc.send("update-marketing-task", __spreadValues({ id: taskId }, updates));
  }
  /**
   * 刪除任務
   */
  deleteTask(taskId) {
    this.ipc.send("delete-marketing-task", { id: taskId });
  }
  // ============ 狀態控制 ============
  /**
   * 啟動任務
   */
  startTask(taskId) {
    this.updateTask(taskId, {
      status: "running",
      startedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.ipc.send("start-marketing-task", { id: taskId });
  }
  /**
   * 暫停任務
   */
  pauseTask(taskId) {
    this.updateTask(taskId, { status: "paused" });
    this.ipc.send("pause-marketing-task", { id: taskId });
  }
  /**
   * 恢復任務
   */
  resumeTask(taskId) {
    this.updateTask(taskId, { status: "running" });
    this.ipc.send("resume-marketing-task", { id: taskId });
  }
  /**
   * 完成任務
   */
  completeTask(taskId) {
    this.updateTask(taskId, {
      status: "completed",
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.ipc.send("complete-marketing-task", { id: taskId });
  }
  // ============ 🆕 優化 3-1: 批量操作 ============
  /**
   * 批量啟動任務
   */
  batchStartTasks(taskIds) {
    taskIds.forEach((id) => this.startTask(id));
  }
  /**
   * 批量暫停任務
   */
  batchPauseTasks(taskIds) {
    taskIds.forEach((id) => this.pauseTask(id));
  }
  /**
   * 批量恢復任務
   */
  batchResumeTasks(taskIds) {
    taskIds.forEach((id) => this.resumeTask(id));
  }
  /**
   * 批量完成任務
   */
  batchCompleteTasks(taskIds) {
    taskIds.forEach((id) => this.completeTask(id));
  }
  /**
   * 批量刪除任務
   */
  batchDeleteTasks(taskIds) {
    taskIds.forEach((id) => this.deleteTask(id));
  }
  /**
   * 批量複製任務
   */
  async batchDuplicateTasks(taskIds) {
    const newIds = [];
    for (const taskId of taskIds) {
      const original = this._tasks().find((t) => t.id === taskId);
      if (!original)
        continue;
      const newId = await this.createTask({
        name: `${original.name} (\u8907\u88FD)`,
        description: original.description,
        goalType: original.goalType,
        executionMode: original.executionMode,
        roleConfig: original.roleConfig,
        targetCriteria: original.targetCriteria,
        scheduleConfig: original.scheduleConfig
      });
      if (newId)
        newIds.push(newId);
    }
    return newIds;
  }
  /**
   * 獲取可批量操作的任務
   */
  getBatchOperationTasks(status) {
    if (!status)
      return this._tasks();
    return this._tasks().filter((t) => t.status === status);
  }
  // ============ 目標用戶管理 ============
  /**
   * 添加目標用戶
   */
  addTargets(taskId, targets) {
    this.ipc.send("add-marketing-task-targets", { taskId, targets });
  }
  /**
   * 更新目標狀態
   */
  updateTargetStatus(taskId, targetId, status, outcome) {
    this.ipc.send("update-marketing-task-target", {
      taskId,
      targetId,
      status,
      outcome
    });
  }
  /**
   * 獲取任務目標用戶
   */
  async getTaskTargets(taskId) {
    return new Promise((resolve) => {
      const cleanup = this.ipc.on("marketing-task-targets-loaded", (data) => {
        cleanup();
        resolve(data.success ? data.targets : []);
      });
      this.ipc.send("get-marketing-task-targets", { taskId });
      setTimeout(() => {
        cleanup();
        resolve([]);
      }, 5e3);
    });
  }
  // ============ 角色管理 ============
  /**
   * 分配角色到任務
   */
  assignRole(taskId, roleConfig) {
    this.ipc.send("assign-marketing-task-role", __spreadValues({ taskId }, roleConfig));
  }
  /**
   * 智能匹配角色帳號
   */
  async autoAssignRoles(taskId) {
    return new Promise((resolve) => {
      const cleanup = this.ipc.on("marketing-task-roles-assigned", (data) => {
        cleanup();
        if (data.success) {
          this.toast.success(`\u5DF2\u81EA\u52D5\u5206\u914D ${data.assignedCount} \u500B\u89D2\u8272`);
        }
        resolve(data.success);
      });
      this.ipc.send("auto-assign-marketing-task-roles", { taskId });
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 1e4);
    });
  }
  // ============ 統計查詢 ============
  /**
   * 獲取任務詳細統計
   */
  async getTaskStats(taskId) {
    return new Promise((resolve) => {
      const cleanup = this.ipc.on("marketing-task-stats-loaded", (data) => {
        cleanup();
        resolve(data.success ? data.stats : null);
      });
      this.ipc.send("get-marketing-task-stats", { taskId });
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5e3);
    });
  }
  /**
   * 獲取總體統計
   */
  getOverallStats() {
    const tasks = this._tasks();
    return {
      totalTasks: tasks.length,
      activeTasks: this.activeTasks().length,
      totalContacted: tasks.reduce((sum, t) => sum + t.stats.contacted, 0),
      totalConverted: tasks.reduce((sum, t) => sum + t.stats.converted, 0),
      conversionRate: this.overallConversionRate(),
      totalMessagesSent: tasks.reduce((sum, t) => sum + t.stats.messagesSent, 0),
      totalAiCost: tasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
    };
  }
  // ============ 輔助方法 ============
  /**
   * 標準化任務數據
   */
  normalizeTask(raw) {
    return {
      id: String(raw.id),
      name: raw.name || "\u672A\u547D\u540D\u4EFB\u52D9",
      description: raw.description,
      goalType: raw.goal_type || raw.goalType || "conversion",
      aiConfigId: raw.ai_config_id || raw.aiConfigId,
      executionMode: raw.execution_mode || raw.executionMode || "hybrid",
      status: raw.status || "draft",
      currentStage: raw.current_stage || raw.currentStage,
      targetCount: raw.target_count || raw.targetCount || 0,
      targetCriteria: raw.target_criteria ? JSON.parse(raw.target_criteria) : raw.targetCriteria,
      roleConfig: raw.role_config ? JSON.parse(raw.role_config) : raw.roleConfig,
      scriptId: raw.script_id || raw.scriptId,
      scheduleConfig: raw.schedule_config ? JSON.parse(raw.schedule_config) : raw.scheduleConfig,
      triggerConditions: raw.trigger_conditions ? JSON.parse(raw.trigger_conditions) : raw.triggerConditions,
      stats: {
        totalContacts: raw.stats_total_contacts || raw.stats?.totalContacts || 0,
        contacted: raw.stats_contacted || raw.stats?.contacted || 0,
        replied: raw.stats_replied || raw.stats?.replied || 0,
        converted: raw.stats_converted || raw.stats?.converted || 0,
        messagesSent: raw.stats_messages_sent || raw.stats?.messagesSent || 0,
        aiCost: raw.stats_ai_cost || raw.stats?.aiCost || 0,
        contactRate: 0,
        replyRate: 0,
        conversionRate: 0
      },
      createdAt: raw.created_at || raw.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      startedAt: raw.started_at || raw.startedAt,
      completedAt: raw.completed_at || raw.completedAt,
      updatedAt: raw.updated_at || raw.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: raw.created_by || raw.createdBy
    };
  }
  /**
   * 設置當前查看的任務
   */
  setCurrentTask(task) {
    this._currentTask.set(task);
  }
  /**
   * 根據ID獲取任務
   */
  getTaskById(taskId) {
    return this._tasks().find((t) => t.id === taskId);
  }
  static {
    this.\u0275fac = function MarketingTaskService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MarketingTaskService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MarketingTaskService, factory: _MarketingTaskService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MarketingTaskService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/ai-center/ai-center.models.ts
var DEFAULT_AI_CONFIG = {
  models: [],
  defaultModelId: "",
  modelUsage: {
    intentRecognition: "",
    dailyChat: "",
    multiRoleScript: ""
  },
  conversationStrategy: {
    style: "friendly",
    responseLength: "medium",
    useEmoji: true,
    emojiFrequency: "low",
    language: "zh-TW"
  },
  knowledgeBases: [],
  activeKnowledgeBaseId: "",
  smartRules: [],
  settings: {
    autoLearnFromConversations: false,
    maxDailyBudget: 50,
    fallbackToHuman: true,
    fallbackTimeout: 300,
    debugMode: false
  }
};

// src/ai-center/ai-center.service.ts
var AICenterService = class _AICenterService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.config = signal(DEFAULT_AI_CONFIG, ...ngDevMode ? [{ debugName: "config" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this.isLoading = this._isLoading.asReadonly();
    this.usageStats = signal({
      today: {
        conversations: 0,
        messages: 0,
        intentsRecognized: 0,
        conversions: 0,
        cost: 0,
        avgResponseTime: 0
      },
      weekly: {
        conversations: 0,
        messages: 0,
        intentsRecognized: 0,
        conversions: 0,
        cost: 0,
        conversionRate: 0
      },
      byModel: []
    }, ...ngDevMode ? [{ debugName: "usageStats" }] : []);
    this.models = computed(() => this.config().models, ...ngDevMode ? [{ debugName: "models" }] : []);
    this.defaultModel = computed(() => this.config().models.find((m) => m.id === this.config().defaultModelId), ...ngDevMode ? [{ debugName: "defaultModel" }] : []);
    this.knowledgeBases = computed(() => this.config().knowledgeBases, ...ngDevMode ? [{ debugName: "knowledgeBases" }] : []);
    this.activeKnowledgeBaseId = computed(() => this.config().activeKnowledgeBaseId, ...ngDevMode ? [{ debugName: "activeKnowledgeBaseId" }] : []);
    this.activeKnowledgeBase = computed(() => this.config().knowledgeBases.find((kb) => kb.id === this.config().activeKnowledgeBaseId), ...ngDevMode ? [{ debugName: "activeKnowledgeBase" }] : []);
    this.activeRules = computed(() => this.config().smartRules.filter((r) => r.isActive), ...ngDevMode ? [{ debugName: "activeRules" }] : []);
    this.stats = computed(() => this.usageStats(), ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.strategy = computed(() => this.config().conversationStrategy, ...ngDevMode ? [{ debugName: "strategy" }] : []);
    this.settings = computed(() => this.config().settings, ...ngDevMode ? [{ debugName: "settings" }] : []);
    this.isConnected = computed(() => this.config().models.some((m) => m.isConnected), ...ngDevMode ? [{ debugName: "isConnected" }] : []);
    this._testingModelIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "_testingModelIds" }] : []);
    this.testingModelIds = computed(() => this._testingModelIds(), ...ngDevMode ? [{ debugName: "testingModelIds" }] : []);
    this.localModels = computed(() => this.config().models.filter((m) => m.isLocal), ...ngDevMode ? [{ debugName: "localModels" }] : []);
    this.cloudModels = computed(() => this.config().models.filter((m) => !m.isLocal), ...ngDevMode ? [{ debugName: "cloudModels" }] : []);
    this.modelUsage = computed(() => this.config().modelUsage, ...ngDevMode ? [{ debugName: "modelUsage" }] : []);
    this.setupIpcListeners();
    setTimeout(() => {
      this.loadModelsFromBackend();
      this.loadModelUsageFromBackend();
    }, 100);
  }
  setupIpcListeners() {
    this.ipcService.on("ai-models-list", (data) => {
      if (data.success && data.models) {
        const models = data.models.map((m) => ({
          id: String(m.id),
          provider: m.provider,
          modelName: m.modelName,
          apiKey: m.apiKey || "",
          apiEndpoint: m.apiEndpoint,
          isConnected: m.isConnected,
          lastTestedAt: m.lastTestedAt,
          usageToday: 0,
          costToday: 0,
          // 擴展屬性
          isLocal: m.isLocal,
          displayName: m.displayName
        }));
        this.config.update((c) => __spreadProps(__spreadValues({}, c), {
          models,
          defaultModelId: models.find((m) => m.isDefault)?.id || c.defaultModelId
        }));
        this._isLoading.set(false);
      }
    });
    this.ipcService.on("ai-model-saved", (data) => {
      if (data.success) {
        this.toastService.success(`AI \u6A21\u578B\u5DF2\u4FDD\u5B58: ${data.modelName || data.provider}`);
      } else {
        this.toastService.error(`\u4FDD\u5B58\u5931\u6557: ${data.error}`);
      }
    });
    this.ipcService.on("ai-model-tested", (data) => {
      console.log("[AI] \u6E2C\u8A66\u7D50\u679C:", data);
      if (data.modelId) {
        this._testingModelIds.update((set) => {
          const newSet = new Set(set);
          newSet.delete(String(data.modelId));
          return newSet;
        });
      }
      if (data.isConnected) {
        const latency = data.latencyMs ? `\u5EF6\u9072: ${data.latencyMs}ms` : "";
        const preview = data.responsePreview ? `
\u56DE\u8986: "${data.responsePreview.substring(0, 50)}${data.responsePreview.length > 50 ? "..." : ""}"` : "";
        const models = data.availableModels?.length > 0 ? `
\u53EF\u7528\u6A21\u578B: ${data.availableModels.slice(0, 3).join(", ")}${data.availableModels.length > 3 ? "..." : ""}` : "";
        this.toastService.success(`\u2713 AI \u6A21\u578B ${data.modelName || ""} \u9023\u63A5\u6210\u529F\uFF01
${latency}${preview}${models}`);
      } else {
        this.toastService.error(`\u9023\u63A5\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
      if (data.modelId) {
        this.updateModel(String(data.modelId), {
          isConnected: data.isConnected,
          // 🔧 P0 優化：存儲最後測試時間
          lastTestedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    this.ipcService.on("model-usage-loaded", (data) => {
      console.log("[AI] \u6A21\u578B\u7528\u9014\u5206\u914D\u5DF2\u52A0\u8F09:", data);
      if (data.success && data.usage) {
        this.config.update((c) => __spreadProps(__spreadValues({}, c), {
          modelUsage: {
            intentRecognition: data.usage.intentRecognition || "",
            dailyChat: data.usage.dailyChat || "",
            multiRoleScript: data.usage.multiRoleScript || ""
          }
        }));
      }
    });
    this.ipcService.on("model-usage-saved", (data) => {
      if (data.success) {
        console.log("[AI] \u6A21\u578B\u7528\u9014\u5206\u914D\u5DF2\u4FDD\u5B58");
      } else {
        this.toastService.error(`\u4FDD\u5B58\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipcService.on("knowledge-base-added", (data) => {
      console.log("[AI] \u77E5\u8B58\u5EAB\u5275\u5EFA\u7D50\u679C:", data);
      if (data.success) {
        this.toastService.success(`\u77E5\u8B58\u5EAB\u300C${data.name}\u300D\u5275\u5EFA\u6210\u529F`);
      } else {
        this.toastService.error(`\u5275\u5EFA\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipcService.on("knowledge-item-added", (data) => {
      console.log("[AI] \u77E5\u8B58\u689D\u76EE\u6DFB\u52A0\u7D50\u679C:", data);
      if (data.success) {
        this.toastService.success(`\u77E5\u8B58\u689D\u76EE\u300C${data.title}\u300D\u5DF2\u6DFB\u52A0`);
      } else {
        this.toastService.error(`\u6DFB\u52A0\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipcService.on("ai-knowledge-generated", (data) => {
      console.log("[AI] AI \u751F\u6210\u77E5\u8B58\u5EAB\u7D50\u679C:", data);
      if (data.success && data.items) {
        this.handleGeneratedKnowledge(data.kbId, data.items);
        this.toastService.success(`\u2728 AI \u5DF2\u751F\u6210 ${data.items.length} \u689D\u77E5\u8B58`);
      } else {
        this.toastService.error(`\u751F\u6210\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipcService.on("industry-template-applied", (data) => {
      console.log("[AI] \u884C\u696D\u6A21\u677F\u61C9\u7528\u7D50\u679C:", data);
      if (data.success && data.items) {
        this.handleGeneratedKnowledge(data.kbId, data.items);
        this.toastService.success(`\u{1F4DA} \u5DF2\u61C9\u7528\u300C${data.templateName}\u300D\u6A21\u677F\uFF0C\u6DFB\u52A0 ${data.items.length} \u689D\u77E5\u8B58`);
      } else {
        this.toastService.error(`\u61C9\u7528\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipcService.on("chat-learning-complete", (data) => {
      console.log("[AI] \u804A\u5929\u5B78\u7FD2\u7D50\u679C:", data);
      if (data.success && data.items) {
        this.handleGeneratedKnowledge(data.kbId, data.items);
        this.toastService.success(`\u{1F4AC} \u5F9E\u804A\u5929\u8A18\u9304\u5B78\u7FD2\u4E86 ${data.items.length} \u689D\u77E5\u8B58`);
      } else if (data.success && (!data.items || data.items.length === 0)) {
        this.toastService.info("\u672A\u767C\u73FE\u53EF\u5B78\u7FD2\u7684\u512A\u8CEA\u56DE\u8986");
      } else {
        this.toastService.error(`\u5B78\u7FD2\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
  }
  /**
   * 從後端加載已保存的模型配置
   */
  loadModelsFromBackend() {
    this._isLoading.set(true);
    this.ipcService.send("get-ai-models", {});
  }
  // ========== 模型管理 ==========
  /**
   * 添加新模型（持久化到後端）
   */
  addModel(model) {
    const id = `model_${Date.now()}`;
    const newModel = __spreadProps(__spreadValues({}, model), {
      id,
      isConnected: false,
      usageToday: 0,
      costToday: 0
    });
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      models: [...c.models, newModel]
    }));
    this.ipcService.send("save-ai-model", {
      provider: model.provider,
      modelName: model.modelName,
      displayName: model.displayName || model.modelName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: model.isLocal || false,
      isDefault: model.isDefault || false
    });
    return id;
  }
  /**
   * 添加本地 AI 模型
   */
  addLocalModel(config) {
    return this.addModel({
      provider: "custom",
      modelName: config.modelName,
      displayName: config.displayName || config.modelName,
      apiKey: "",
      // 本地 AI 不需要 API Key
      apiEndpoint: config.apiEndpoint,
      isLocal: true,
      isDefault: config.isDefault
    });
  }
  updateModel(id, updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      models: c.models.map((m) => m.id === id ? __spreadValues(__spreadValues({}, m), updates) : m)
    }));
    if (!isNaN(Number(id))) {
      this.ipcService.send("update-ai-model", __spreadValues({
        id: Number(id)
      }, updates));
    }
  }
  removeModel(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      models: c.models.filter((m) => m.id !== id),
      defaultModelId: c.defaultModelId === id ? "" : c.defaultModelId
    }));
    if (!isNaN(Number(id))) {
      this.ipcService.send("delete-ai-model", { id: Number(id) });
    }
  }
  setDefaultModel(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), { defaultModelId: id }));
    if (!isNaN(Number(id))) {
      this.ipcService.send("set-default-ai-model", { id: Number(id) });
    }
  }
  /**
   * 更新模型用途分配（本地狀態）
   */
  updateModelUsage(updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      modelUsage: __spreadValues(__spreadValues({}, c.modelUsage), updates)
    }));
  }
  /**
   * 保存模型用途分配到後端
   */
  async saveModelUsageToBackend() {
    const usage = this.config().modelUsage;
    console.log("[AI] \u4FDD\u5B58\u6A21\u578B\u7528\u9014\u5206\u914D:", usage);
    this.ipcService.send("save-model-usage", usage);
  }
  /**
   * 從後端加載模型用途分配
   */
  loadModelUsageFromBackend() {
    console.log("[AI] \u52A0\u8F09\u6A21\u578B\u7528\u9014\u5206\u914D...");
    this.ipcService.send("get-model-usage", {});
  }
  /**
   * 測試模型連接（通過後端測試）
   */
  async testModelConnection(id) {
    const model = this.config().models.find((m) => m.id === id);
    if (!model)
      return false;
    if (this._testingModelIds().has(id)) {
      console.log("[AI] \u6A21\u578B\u5DF2\u5728\u6E2C\u8A66\u4E2D\uFF0C\u8DF3\u904E:", id);
      return false;
    }
    this._testingModelIds.update((set) => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
    const extModel = model;
    this.ipcService.send("test-ai-model", {
      id: !isNaN(Number(id)) ? Number(id) : void 0,
      provider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: extModel.isLocal
    });
    setTimeout(() => {
      this._testingModelIds.update((set) => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }, 6e4);
    return true;
  }
  /**
   * 測試本地 AI 連接
   */
  async testLocalAIConnection(endpoint, modelName) {
    this.ipcService.send("test-ai-model", {
      provider: "ollama",
      modelName,
      apiEndpoint: endpoint,
      isLocal: true
    });
    return true;
  }
  // ========== 知識庫管理 ==========
  addKnowledgeBase(name, description = "") {
    const id = `kb_${Date.now()}`;
    const newKB = {
      id,
      name,
      description,
      items: [],
      isDefault: this.config().knowledgeBases.length === 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      knowledgeBases: [...c.knowledgeBases, newKB],
      activeKnowledgeBaseId: c.activeKnowledgeBaseId || id
    }));
    this.ipcService.send("add-knowledge-base", {
      id,
      name,
      description,
      category: "general"
    });
    return id;
  }
  updateKnowledgeBase(id, updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      knowledgeBases: c.knowledgeBases.map((kb) => kb.id === id ? __spreadProps(__spreadValues(__spreadValues({}, kb), updates), { updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) : kb)
    }));
  }
  deleteKnowledgeBase(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      knowledgeBases: c.knowledgeBases.filter((kb) => kb.id !== id),
      activeKnowledgeBaseId: c.activeKnowledgeBaseId === id ? c.knowledgeBases.find((kb) => kb.id !== id)?.id || "" : c.activeKnowledgeBaseId
    }));
  }
  setActiveKnowledgeBase(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), { activeKnowledgeBaseId: id }));
  }
  // 🆕 添加知識條目
  addKnowledgeItem(kbId, item) {
    const itemId = `item_${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newItem = {
      id: itemId,
      title: item.title,
      content: item.content,
      category: item.category || "custom",
      keywords: [],
      priority: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      knowledgeBases: c.knowledgeBases.map((kb) => kb.id === kbId ? __spreadProps(__spreadValues({}, kb), { items: [...kb.items, newItem], updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) : kb)
    }));
    this.ipcService.send("add-knowledge-item", {
      kbId,
      id: itemId,
      title: item.title,
      content: item.content,
      category: item.category || "general"
    });
    return itemId;
  }
  // 🆕 刪除知識條目
  deleteKnowledgeItem(kbId, itemId) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      knowledgeBases: c.knowledgeBases.map((kb) => kb.id === kbId ? __spreadProps(__spreadValues({}, kb), { items: kb.items.filter((i) => i.id !== itemId), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) : kb)
    }));
    this.ipcService.send("delete-knowledge-item", {
      kbId,
      itemId
    });
  }
  // 🆕 AI 自動生成知識庫
  generateKnowledgeBase(kbId, businessDescription) {
    this.ipcService.send("ai-generate-knowledge", {
      kbId,
      businessDescription
    });
  }
  // 🆕 處理 AI 生成的知識條目
  handleGeneratedKnowledge(kbId, items) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newItems = items.map((item, index) => ({
      id: `item_${Date.now()}_${index}`,
      title: item.title,
      content: item.content,
      category: item.category || "custom",
      keywords: [],
      priority: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      knowledgeBases: c.knowledgeBases.map((kb) => kb.id === kbId ? __spreadProps(__spreadValues({}, kb), { items: [...kb.items, ...newItems], updatedAt: now }) : kb)
    }));
  }
  // 🆕 應用行業模板
  applyIndustryTemplate(kbId, templateId) {
    this.ipcService.send("apply-industry-template", {
      kbId,
      templateId
    });
  }
  // 🆕 從聊天記錄學習
  learnFromChatHistory(kbId) {
    this.ipcService.send("learn-from-chat-history", {
      kbId,
      days: 7
      // 最近 7 天
    });
  }
  // ========== 智能規則管理 ==========
  addSmartRule(rule) {
    const id = `rule_${Date.now()}`;
    const newRule = __spreadProps(__spreadValues({}, rule), { id });
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      smartRules: [...c.smartRules, newRule]
    }));
    return id;
  }
  updateSmartRule(id, updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      smartRules: c.smartRules.map((r) => r.id === id ? __spreadValues(__spreadValues({}, r), updates) : r)
    }));
  }
  deleteSmartRule(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      smartRules: c.smartRules.filter((r) => r.id !== id)
    }));
  }
  toggleSmartRule(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      smartRules: c.smartRules.map((r) => r.id === id ? __spreadProps(__spreadValues({}, r), { isActive: !r.isActive }) : r)
    }));
  }
  // ========== 對話策略管理 ==========
  updateConversationStrategy(updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      conversationStrategy: __spreadValues(__spreadValues({}, c.conversationStrategy), updates)
    }));
  }
  /**
   * 🔧 保存對話策略到後端
   */
  async saveConversationStrategyToBackend(strategy) {
    console.log("[AI] \u4FDD\u5B58\u5C0D\u8A71\u7B56\u7565:", strategy);
    this.ipcService.send("save-conversation-strategy", strategy);
    this.updateConversationStrategy({
      style: strategy.style,
      responseLength: strategy.responseLength,
      useEmoji: strategy.useEmoji,
      customPromptPrefix: strategy.customPersona
      // 🔧 FIX: 使用正確的屬性名
    });
    this.toastService.success("\u5C0D\u8A71\u7B56\u7565\u5DF2\u4FDD\u5B58");
  }
  /**
   * 🔧 從後端載入對話策略
   */
  loadConversationStrategyFromBackend() {
    console.log("[AI] \u8F09\u5165\u5C0D\u8A71\u7B56\u7565...");
    this.ipcService.send("get-conversation-strategy", {});
  }
  // ========== 設置管理 ==========
  updateSettings(updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      settings: __spreadValues(__spreadValues({}, c.settings), updates)
    }));
  }
  // ========== AI 核心功能（供其他模塊調用）==========
  /**
   * 識別用戶意圖
   */
  async recognizeIntent(message, context) {
    const keywords = this.extractKeywords(message);
    let intent = "general_chat";
    let confidence = 0.5;
    if (message.includes("\u50F9\u683C") || message.includes("\u591A\u5C11\u9322") || message.includes("\u8CBB\u7528")) {
      intent = "price_inquiry";
      confidence = 0.9;
    } else if (message.includes("\u8CFC\u8CB7") || message.includes("\u4E0B\u55AE") || message.includes("\u600E\u9EBC\u8CB7")) {
      intent = "purchase_intent";
      confidence = 0.95;
    } else if (message.includes("?") || message.includes("\uFF1F") || message.includes("\u4EC0\u9EBC")) {
      intent = "product_question";
      confidence = 0.7;
    }
    this.usageStats.update((s) => __spreadProps(__spreadValues({}, s), {
      today: __spreadProps(__spreadValues({}, s.today), { intentsRecognized: s.today.intentsRecognized + 1 })
    }));
    return { intent, confidence, keywords };
  }
  /**
   * 生成 AI 回覆
   */
  async generateReply(message, context = [], options) {
    const strategy = this.config().conversationStrategy;
    const kb = this.activeKnowledgeBase();
    let reply = `\u611F\u8B1D\u60A8\u7684\u8A0A\u606F\uFF01`;
    if (options?.rolePrompt) {
      reply = `[${options.rolePrompt}] ${reply}`;
    }
    if (strategy.useEmoji) {
      reply += " \u{1F60A}";
    }
    this.usageStats.update((s) => __spreadProps(__spreadValues({}, s), {
      today: __spreadProps(__spreadValues({}, s.today), {
        messages: s.today.messages + 1,
        cost: s.today.cost + 0.01
      })
    }));
    return reply;
  }
  /**
   * 檢查智能規則並執行動作
   */
  async checkAndExecuteRules(intent, confidence, conversationRounds) {
    const activeRules = this.activeRules().sort((a, b) => b.priority - a.priority);
    for (const rule of activeRules) {
      if (rule.triggerIntent !== intent)
        continue;
      const conditions = rule.triggerConditions;
      if (conditions.intentScore && confidence < conditions.intentScore)
        continue;
      if (conditions.conversationRounds && conversationRounds < conditions.conversationRounds)
        continue;
      return rule;
    }
    return null;
  }
  // ========== 輔助方法 ==========
  extractKeywords(text) {
    const words = text.split(/[\s,，。！？!?]+/).filter((w) => w.length > 1);
    return words.slice(0, 5);
  }
  // ========== 導入/導出 ==========
  exportConfig() {
    return JSON.stringify(this.config(), null, 2);
  }
  importConfig(jsonStr) {
    try {
      const config = JSON.parse(jsonStr);
      this.config.set(config);
      return true;
    } catch {
      return false;
    }
  }
  // ========== 重置 ==========
  resetToDefault() {
    this.config.set(DEFAULT_AI_CONFIG);
  }
  static {
    this.\u0275fac = function AICenterService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AICenterService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AICenterService, factory: _AICenterService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AICenterService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/marketing-state.service.ts
var MarketingStateService = class _MarketingStateService {
  constructor() {
    this.taskService = inject(MarketingTaskService);
    this.aiService = inject(AICenterService);
    this.ipc = inject(ElectronIpcService);
    this._aiHostingEnabled = signal(false, ...ngDevMode ? [{ debugName: "_aiHostingEnabled" }] : []);
    this.aiHostingEnabled = this._aiHostingEnabled.asReadonly();
    this._isProcessing = signal(false, ...ngDevMode ? [{ debugName: "_isProcessing" }] : []);
    this.isProcessing = this._isProcessing.asReadonly();
    this._lastSyncTime = signal((/* @__PURE__ */ new Date()).toISOString(), ...ngDevMode ? [{ debugName: "_lastSyncTime" }] : []);
    this.lastSyncTime = this._lastSyncTime.asReadonly();
    this._intentThreshold = signal(70, ...ngDevMode ? [{ debugName: "_intentThreshold" }] : []);
    this.intentThreshold = this._intentThreshold.asReadonly();
    this._maxConcurrentTasks = signal(5, ...ngDevMode ? [{ debugName: "_maxConcurrentTasks" }] : []);
    this.maxConcurrentTasks = this._maxConcurrentTasks.asReadonly();
    this._preferredExecutionMode = signal("hybrid", ...ngDevMode ? [{ debugName: "_preferredExecutionMode" }] : []);
    this.preferredExecutionMode = this._preferredExecutionMode.asReadonly();
    this.unifiedState = computed(() => {
      const taskStats = this.taskService.getOverallStats();
      const aiStats = this.aiService.stats();
      const todayStats = this.taskService.todayStats();
      return {
        // 任務狀態
        activeTasks: taskStats.activeTasks,
        totalTasks: taskStats.totalTasks,
        todayContacted: todayStats.contacted,
        todayConverted: todayStats.converted,
        // AI 狀態
        aiConnected: this.aiService.isConnected(),
        aiHostingEnabled: this._aiHostingEnabled(),
        todayAiCost: aiStats.today.cost,
        todayConversations: aiStats.today.conversations,
        // 協作狀態
        activeCollaborations: taskStats.activeTasks,
        collaborationSuccessRate: taskStats.conversionRate,
        // 系統狀態
        isProcessing: this._isProcessing(),
        lastSyncTime: this._lastSyncTime()
      };
    }, ...ngDevMode ? [{ debugName: "unifiedState" }] : []);
    this.aggregatedStats = computed(() => {
      const taskStats = this.taskService.getOverallStats();
      const tasksByGoal = this.taskService.tasksByGoal();
      const tasks = this.taskService.tasks();
      const byGoalType = {};
      Object.entries(tasksByGoal).forEach(([goalType, goalTasks]) => {
        byGoalType[goalType] = {
          count: goalTasks.length,
          contacted: goalTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
          converted: goalTasks.reduce((sum, t) => sum + t.stats.converted, 0)
        };
      });
      const daily = [];
      for (let i = 6; i >= 0; i--) {
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayTasks = tasks.filter((t) => t.createdAt.startsWith(dateStr) || t.startedAt?.startsWith(dateStr));
        daily.push({
          date: dateStr,
          contacted: dayTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
          converted: dayTasks.reduce((sum, t) => sum + t.stats.converted, 0),
          messages: dayTasks.reduce((sum, t) => sum + t.stats.messagesSent, 0),
          cost: dayTasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
        });
      }
      return {
        totalContacted: taskStats.totalContacted,
        totalConverted: taskStats.totalConverted,
        totalMessagesSent: taskStats.totalMessagesSent,
        totalAiCost: taskStats.totalAiCost,
        overallConversionRate: taskStats.conversionRate,
        daily,
        byGoalType
      };
    }, ...ngDevMode ? [{ debugName: "aggregatedStats" }] : []);
    this.hasActiveTasks = computed(() => this.taskService.activeTasks().length > 0, ...ngDevMode ? [{ debugName: "hasActiveTasks" }] : []);
    this.todaySummary = computed(() => {
      const today = this.taskService.todayStats();
      const aiStats = this.aiService.stats().today;
      return {
        contacted: today.contacted,
        converted: today.converted,
        messagesSent: today.messagesSent,
        conversations: aiStats.conversations,
        aiCost: aiStats.cost,
        conversionRate: today.contacted > 0 ? Math.round(today.converted / today.contacted * 100) : 0
      };
    }, ...ngDevMode ? [{ debugName: "todaySummary" }] : []);
    this.cleanups = [];
    this.initialize();
  }
  initialize() {
    this.loadPersistedState();
    this.cleanups.push(this.ipc.on("ai-hosting-changed", (data) => {
      this._aiHostingEnabled.set(data.enabled);
    }));
    this.cleanups.push(this.ipc.on("marketing-task-started", () => {
      this._isProcessing.set(true);
      this._lastSyncTime.set((/* @__PURE__ */ new Date()).toISOString());
    }));
    this.cleanups.push(this.ipc.on("marketing-task-completed", () => {
      this._isProcessing.set(false);
      this._lastSyncTime.set((/* @__PURE__ */ new Date()).toISOString());
    }));
    this.cleanups.push(this.ipc.on("marketing-task-paused", () => {
      this._isProcessing.set(false);
    }));
  }
  loadPersistedState() {
    const hosting = localStorage.getItem("ai_hosting_enabled");
    if (hosting !== null) {
      this._aiHostingEnabled.set(hosting === "true");
    }
    const threshold = localStorage.getItem("intent_threshold");
    if (threshold) {
      this._intentThreshold.set(parseInt(threshold));
    }
    const maxTasks = localStorage.getItem("max_concurrent_tasks");
    if (maxTasks) {
      this._maxConcurrentTasks.set(parseInt(maxTasks));
    }
    const mode = localStorage.getItem("preferred_execution_mode");
    if (mode && ["scripted", "hybrid", "scriptless"].includes(mode)) {
      this._preferredExecutionMode.set(mode);
    }
  }
  ngOnDestroy() {
    this.cleanups.forEach((cleanup) => cleanup());
  }
  // ============ 狀態操作方法 ============
  /**
   * 設置 AI 托管狀態
   */
  setAiHostingEnabled(enabled) {
    this._aiHostingEnabled.set(enabled);
    localStorage.setItem("ai_hosting_enabled", String(enabled));
    this.ipc.send("set-ai-hosting", { enabled });
  }
  // 🆕 Phase 4-1: 統一設置方法
  /**
   * 設置意向閾值
   */
  setIntentThreshold(threshold) {
    this._intentThreshold.set(threshold);
    localStorage.setItem("intent_threshold", String(threshold));
  }
  /**
   * 設置最大同時任務數
   */
  setMaxConcurrentTasks(count) {
    this._maxConcurrentTasks.set(count);
    localStorage.setItem("max_concurrent_tasks", String(count));
  }
  /**
   * 設置偏好執行模式
   */
  setPreferredExecutionMode(mode) {
    this._preferredExecutionMode.set(mode);
    localStorage.setItem("preferred_execution_mode", mode);
  }
  /**
   * 保存所有設置到後端
   */
  saveSettingsToBackend() {
    this.ipc.send("save-marketing-settings", {
      intentThreshold: this._intentThreshold(),
      maxConcurrentTasks: this._maxConcurrentTasks(),
      preferredExecutionMode: this._preferredExecutionMode(),
      aiHostingEnabled: this._aiHostingEnabled()
    });
  }
  /**
   * 手動觸發狀態同步
   */
  syncState() {
    this.taskService.loadTasks();
    this._lastSyncTime.set((/* @__PURE__ */ new Date()).toISOString());
  }
  /**
   * 獲取快照統計
   */
  getSnapshot() {
    return this.unifiedState();
  }
  /**
   * 快速啟動任務（代理到 MarketingTaskService）
   */
  async quickStartTask(goalType) {
    return this.taskService.quickCreate(goalType);
  }
  /**
   * 檢查是否可以啟動新任務
   */
  canStartNewTask() {
    const maxConcurrent = parseInt(localStorage.getItem("max_concurrent_tasks") || "5");
    return this.taskService.activeTasks().length < maxConcurrent;
  }
  /**
   * 獲取推薦的下一步操作
   */
  getRecommendedAction() {
    const state = this.unifiedState();
    if (!state.aiConnected) {
      return {
        type: "setup",
        description: "\u8ACB\u5148\u914D\u7F6E AI \u6A21\u578B",
        action: () => this.ipc.send("navigate-to", { path: "/ai-center" })
      };
    }
    if (state.activeTasks === 0) {
      return {
        type: "start",
        description: "\u5275\u5EFA\u60A8\u7684\u7B2C\u4E00\u500B\u71DF\u92B7\u4EFB\u52D9",
        action: () => this.ipc.send("navigate-to", { path: "/smart-marketing" })
      };
    }
    if (state.collaborationSuccessRate < 10 && state.totalTasks > 5) {
      return {
        type: "optimize",
        description: "\u8F49\u5316\u7387\u504F\u4F4E\uFF0C\u5EFA\u8B70\u512A\u5316 AI \u4EBA\u683C\u8A2D\u7F6E",
        action: () => this.ipc.send("navigate-to", { path: "/ai-center", query: { tab: "persona" } })
      };
    }
    return null;
  }
  static {
    this.\u0275fac = function MarketingStateService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MarketingStateService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MarketingStateService, factory: _MarketingStateService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MarketingStateService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  GOAL_TYPE_CONFIG,
  MarketingTaskService,
  AICenterService,
  MarketingStateService
};
//# sourceMappingURL=chunk-PLTL6UL3.js.map
