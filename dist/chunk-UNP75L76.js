import {
  UnifiedContactsService
} from "./chunk-UTR72ISQ.js";
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

// src/services/automation-workflow.service.ts
var DEFAULT_INTEREST_SIGNALS = {
  price_inquiry: ["\u591A\u5C11\u9322", "\u4EC0\u9EBC\u50F9\u683C", "\u50F9\u683C", "\u8CBB\u7528", "\u6536\u8CBB", "\u600E\u9EBC\u6536", "\u5831\u50F9"],
  product_detail: ["\u600E\u9EBC\u7528", "\u6709\u4EC0\u9EBC\u529F\u80FD", "\u8A73\u7D30\u4ECB\u7D39", "\u4E86\u89E3\u4E00\u4E0B", "\u80FD\u505A\u4EC0\u9EBC"],
  purchase_intent: ["\u600E\u9EBC\u8CB7", "\u5728\u54EA\u8CB7", "\u6211\u8981", "\u6211\u60F3\u8CB7", "\u4E0B\u55AE", "\u4ED8\u6B3E", "\u8CFC\u8CB7"],
  positive_feedback: ["\u4E0D\u932F", "\u633A\u597D", "\u53EF\u4EE5", "\u884C", "\u597D\u7684", "\u611F\u8208\u8DA3"],
  comparison: ["\u6BD4", "\u5C0D\u6BD4", "\u5340\u5225", "\u5DEE\u5225", "\u54EA\u500B\u597D"]
};
var DEFAULT_WORKFLOW = {
  id: "default_marketing",
  name: "\u667A\u80FD\u71DF\u92B7\u5DE5\u4F5C\u6D41",
  enabled: false,
  trigger: {
    type: "keyword_match",
    minIntentScore: 60,
    cooldownMinutes: 1440,
    // 24小時
    excludeContacted: true,
    excludeBlacklist: true
  },
  steps: [
    { id: "evaluate", type: "evaluate", name: "\u7528\u6236\u8A55\u4F30", config: {}, nextOnSuccess: "plan" },
    { id: "plan", type: "plan", name: "AI \u7B56\u5283", config: {}, nextOnSuccess: "private_chat" },
    { id: "private_chat", type: "private_chat", name: "\u79C1\u804A\u5354\u4F5C", config: {}, nextOnSuccess: "detect_interest" },
    { id: "detect_interest", type: "detect_interest", name: "\u8208\u8DA3\u6AA2\u6E2C", config: {}, nextOnSuccess: "create_group", nextOnFail: "record" },
    { id: "create_group", type: "create_group", name: "\u81EA\u52D5\u5EFA\u7FA4", config: {}, nextOnSuccess: "group_marketing" },
    { id: "group_marketing", type: "group_marketing", name: "\u7D44\u7FA4\u71DF\u92B7", config: {}, nextOnSuccess: "record" },
    { id: "record", type: "record", name: "\u8A18\u9304\u7D50\u679C", config: {} }
  ],
  config: {
    marketingGoal: "\u4FC3\u9032\u6210\u4EA4",
    roleCount: "auto",
    accountSelection: "auto",
    firstContactDelay: { min: 5, max: 15 },
    interestSignals: ["price_inquiry", "purchase_intent", "positive_feedback"]
  },
  stats: {
    totalTriggers: 0,
    todayTriggers: 0,
    activeExecutions: 0,
    conversions: 0
  },
  createdAt: /* @__PURE__ */ new Date(),
  updatedAt: /* @__PURE__ */ new Date()
};
var AutomationWorkflowService = class _AutomationWorkflowService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.contacts = inject(UnifiedContactsService);
    this.STORAGE_KEY = "automationWorkflows";
    this._workflows = signal([DEFAULT_WORKFLOW], ...ngDevMode ? [{ debugName: "_workflows" }] : []);
    this.workflows = this._workflows.asReadonly();
    this._executions = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_executions" }] : []);
    this.executions = computed(() => Array.from(this._executions().values()), ...ngDevMode ? [{ debugName: "executions" }] : []);
    this.activeExecutionCount = computed(() => this.executions().filter((e) => e.status === "running" || e.status === "pending").length, ...ngDevMode ? [{ debugName: "activeExecutionCount" }] : []);
    this.userCooldowns = /* @__PURE__ */ new Map();
    this.ipcCleanups = [];
    this.loadFromStorage();
    this.setupEventListeners();
    console.log("[AutomationWorkflow] \u670D\u52D9\u5DF2\u521D\u59CB\u5316");
  }
  // ============ 事件監聽 ============
  setupEventListeners() {
    const cleanup1 = this.ipc.on("keyword-matched", (data) => {
      this.handleKeywordMatch(data);
    });
    this.ipcCleanups.push(cleanup1);
    const cleanup2 = this.ipc.on("lead-captured", (data) => {
      this.handleLeadCaptured(data);
    });
    this.ipcCleanups.push(cleanup2);
    const cleanup3 = this.ipc.on("private-message-received", (data) => {
      this.handlePrivateMessage(data);
    });
    this.ipcCleanups.push(cleanup3);
    const cleanup4 = this.ipc.on("collaboration-session-completed", (data) => {
      this.handleSessionCompleted(data);
    });
    this.ipcCleanups.push(cleanup4);
  }
  // ============ 事件處理 ============
  /**
   * 處理關鍵詞匹配事件
   */
  handleKeywordMatch(data) {
    console.log("[AutomationWorkflow] \u6536\u5230\u95DC\u9375\u8A5E\u5339\u914D:", data);
    const enabledWorkflows = this._workflows().filter((w) => w.enabled && w.trigger.type === "keyword_match");
    if (enabledWorkflows.length === 0) {
      console.log("[AutomationWorkflow] \u7121\u555F\u7528\u7684\u5DE5\u4F5C\u6D41\uFF0C\u8DF3\u904E");
      return;
    }
    for (const workflow of enabledWorkflows) {
      this.tryTriggerWorkflow(workflow, data);
    }
  }
  /**
   * 嘗試觸發工作流
   */
  async tryTriggerWorkflow(workflow, userData) {
    const userId = userData.userId;
    if (this.isUserInCooldown(userId, workflow.trigger.cooldownMinutes || 1440)) {
      console.log(`[AutomationWorkflow] \u7528\u6236 ${userId} \u5728\u51B7\u537B\u671F\u5167\uFF0C\u8DF3\u904E`);
      return;
    }
    const existingExecution = this.executions().find((e) => e.targetUserId === userId && (e.status === "running" || e.status === "pending"));
    if (existingExecution) {
      console.log(`[AutomationWorkflow] \u7528\u6236 ${userId} \u5DF2\u6709\u9032\u884C\u4E2D\u7684\u5DE5\u4F5C\u6D41\uFF0C\u8DF3\u904E`);
      return;
    }
    const intentScore = this.evaluateUserIntent(userData);
    const minScore = workflow.trigger.minIntentScore || 60;
    if (intentScore < minScore) {
      console.log(`[AutomationWorkflow] \u7528\u6236\u610F\u5411\u5206 ${intentScore} < ${minScore}\uFF0C\u8DF3\u904E`);
      return;
    }
    const execution = this.createExecution(workflow, userData, intentScore);
    this.userCooldowns.set(userId, /* @__PURE__ */ new Date());
    this.updateWorkflowStats(workflow.id, "trigger");
    this.toast.success(`\u{1F680} \u81EA\u52D5\u89F8\u767C\u5DE5\u4F5C\u6D41\uFF1A${workflow.name}`);
    console.log(`[AutomationWorkflow] \u958B\u59CB\u57F7\u884C\u5DE5\u4F5C\u6D41: ${workflow.name}\uFF0C\u76EE\u6A19\u7528\u6236: ${userData.username || userId}`);
    const delay = this.getRandomDelay(workflow.config.firstContactDelay);
    console.log(`[AutomationWorkflow] \u5C07\u5728 ${delay} \u79D2\u5F8C\u958B\u59CB\u57F7\u884C`);
    setTimeout(() => {
      this.executeWorkflow(execution.id);
    }, delay * 1e3);
  }
  /**
   * 處理用戶捕獲事件
   */
  handleLeadCaptured(data) {
    console.log("[AutomationWorkflow] \u6536\u5230\u7528\u6236\u6355\u7372\u4E8B\u4EF6:", data);
  }
  /**
   * 處理私聊消息（興趣信號檢測）
   */
  handlePrivateMessage(data) {
    if (!data.fromUser)
      return;
    const execution = this.executions().find((e) => e.targetUserId === data.userId && e.status === "running" && e.currentStep === "private_chat");
    if (!execution)
      return;
    const signal2 = this.detectInterestSignal(data.message);
    if (signal2) {
      console.log(`[AutomationWorkflow] \u6AA2\u6E2C\u5230\u8208\u8DA3\u4FE1\u865F:`, signal2);
      this.updateExecutionStep(execution.id, "detect_interest", {
        status: "success",
        data: signal2,
        timestamp: /* @__PURE__ */ new Date()
      });
      if (signal2.type === "purchase_intent" || signal2.type === "price_inquiry") {
        this.toast.info(`\u{1F3AF} \u6AA2\u6E2C\u5230\u8CFC\u8CB7\u610F\u5411\uFF01\u6E96\u5099\u81EA\u52D5\u5EFA\u7FA4...`);
        this.advanceToStep(execution.id, "create_group");
      }
    }
  }
  /**
   * 處理協作會話完成
   */
  handleSessionCompleted(data) {
    const execution = this.executions().find((e) => e.sessionId === data.sessionId);
    if (execution) {
      this.updateExecution(execution.id, {
        outcome: data.outcome,
        status: "completed",
        completedAt: /* @__PURE__ */ new Date()
      });
      if (data.outcome === "converted") {
        this.updateWorkflowStats(execution.workflowId, "conversion");
      }
    }
  }
  // ============ 工作流執行 ============
  /**
   * 執行工作流
   */
  async executeWorkflow(executionId) {
    const execution = this._executions().get(executionId);
    if (!execution)
      return;
    const workflow = this._workflows().find((w) => w.id === execution.workflowId);
    if (!workflow)
      return;
    this.updateExecution(executionId, { status: "running" });
    const currentStep = workflow.steps.find((s) => s.id === execution.currentStep);
    if (!currentStep)
      return;
    console.log(`[AutomationWorkflow] \u57F7\u884C\u6B65\u9A5F: ${currentStep.name}`);
    try {
      const result = await this.executeStep(execution, currentStep, workflow);
      this.updateExecutionStep(executionId, currentStep.id, result);
      const nextStepId = result.status === "success" ? currentStep.nextOnSuccess : currentStep.nextOnFail;
      if (nextStepId) {
        this.advanceToStep(executionId, nextStepId);
      } else {
        this.updateExecution(executionId, {
          status: "completed",
          completedAt: /* @__PURE__ */ new Date()
        });
        console.log(`[AutomationWorkflow] \u5DE5\u4F5C\u6D41\u57F7\u884C\u5B8C\u6210: ${executionId}`);
      }
    } catch (error) {
      console.error(`[AutomationWorkflow] \u6B65\u9A5F\u57F7\u884C\u5931\u6557:`, error);
      this.updateExecutionStep(executionId, currentStep.id, {
        status: "failed",
        error: error.message,
        timestamp: /* @__PURE__ */ new Date()
      });
      this.updateExecution(executionId, { status: "failed" });
    }
  }
  /**
   * 執行單個步驟
   */
  async executeStep(execution, step, workflow) {
    switch (step.type) {
      case "evaluate":
        return { status: "success", timestamp: /* @__PURE__ */ new Date() };
      case "plan":
        return await this.executeAiPlanStep(execution, workflow);
      case "private_chat":
        return await this.executePrivateChatStep(execution, workflow);
      case "detect_interest":
        return { status: "success", timestamp: /* @__PURE__ */ new Date() };
      case "create_group":
        return await this.executeCreateGroupStep(execution, workflow);
      case "group_marketing":
        return await this.executeGroupMarketingStep(execution, workflow);
      case "record":
        return this.executeRecordStep(execution);
      default:
        return { status: "skipped", timestamp: /* @__PURE__ */ new Date() };
    }
  }
  /**
   * 執行 AI 策劃步驟
   */
  async executeAiPlanStep(execution, workflow) {
    return new Promise((resolve) => {
      const goal = workflow.config.marketingGoal || "\u4FC3\u9032\u6210\u4EA4";
      console.log(`[AutomationWorkflow] \u8ABF\u7528 AI \u7B56\u5283\uFF0C\u76EE\u6A19: ${goal}`);
      this.ipc.send("multi-role:ai-plan", {
        goal,
        targetUsers: [{
          id: execution.targetUserId,
          username: execution.targetUserName
        }],
        autoExecute: true,
        workflowExecutionId: execution.id
      });
      const cleanup = this.ipc.on("multi-role:ai-plan-result", (data) => {
        cleanup();
        if (data.success) {
          this.updateExecution(execution.id, { aiPlanResult: data });
          resolve({ status: "success", data, timestamp: /* @__PURE__ */ new Date() });
        } else {
          resolve({ status: "failed", error: data.error, timestamp: /* @__PURE__ */ new Date() });
        }
      });
      setTimeout(() => {
        cleanup();
        resolve({ status: "failed", error: "\u7B56\u5283\u8D85\u6642", timestamp: /* @__PURE__ */ new Date() });
      }, 6e4);
    });
  }
  /**
   * 執行私聊協作步驟
   */
  async executePrivateChatStep(execution, workflow) {
    console.log(`[AutomationWorkflow] \u958B\u59CB\u79C1\u804A\u5354\u4F5C\uFF0C\u76EE\u6A19\u7528\u6236: ${execution.targetUserName}`);
    this.ipc.send("multi-role:start-private-collaboration", {
      targetUserId: execution.targetUserId,
      targetUserName: execution.targetUserName,
      aiPlanResult: execution.aiPlanResult,
      workflowExecutionId: execution.id
    });
    return { status: "success", timestamp: /* @__PURE__ */ new Date() };
  }
  /**
   * 執行建群步驟
   */
  async executeCreateGroupStep(execution, workflow) {
    return new Promise((resolve) => {
      const groupName = (workflow.config.groupNameTemplate || "VIP \u670D\u52D9\u7FA4 - {user}").replace("{user}", execution.targetUserName);
      console.log(`[AutomationWorkflow] \u81EA\u52D5\u5EFA\u7FA4: ${groupName}`);
      this.ipc.send("multi-role:auto-create-group", {
        groupName,
        targetUserId: execution.targetUserId,
        workflowExecutionId: execution.id
      });
      const cleanup = this.ipc.on("multi-role:group-created", (data) => {
        cleanup();
        if (data.success) {
          this.updateExecution(execution.id, { groupId: data.groupId });
          this.toast.success(`\u2705 \u5DF2\u81EA\u52D5\u5275\u5EFA\u7FA4\u7D44: ${groupName}`);
          resolve({ status: "success", data, timestamp: /* @__PURE__ */ new Date() });
        } else {
          resolve({ status: "failed", error: data.error, timestamp: /* @__PURE__ */ new Date() });
        }
      });
      setTimeout(() => {
        cleanup();
        resolve({ status: "failed", error: "\u5EFA\u7FA4\u8D85\u6642", timestamp: /* @__PURE__ */ new Date() });
      }, 12e4);
    });
  }
  /**
   * 執行組群營銷步驟
   */
  async executeGroupMarketingStep(execution, workflow) {
    if (!execution.groupId) {
      return { status: "skipped", timestamp: /* @__PURE__ */ new Date() };
    }
    console.log(`[AutomationWorkflow] \u958B\u59CB\u7D44\u7FA4\u71DF\u92B7\uFF0C\u7FA4\u7D44: ${execution.groupId}`);
    this.ipc.send("multi-role:start-group-collaboration", {
      groupId: execution.groupId,
      aiPlanResult: execution.aiPlanResult,
      workflowExecutionId: execution.id
    });
    return { status: "success", timestamp: /* @__PURE__ */ new Date() };
  }
  /**
   * 執行記錄步驟
   */
  executeRecordStep(execution) {
    console.log(`[AutomationWorkflow] \u8A18\u9304\u57F7\u884C\u7D50\u679C:`, execution);
    return { status: "success", timestamp: /* @__PURE__ */ new Date() };
  }
  // ============ 輔助方法 ============
  /**
   * 評估用戶意向分
   */
  evaluateUserIntent(userData) {
    let score = 50;
    const message = userData.messagePreview?.toLowerCase() || "";
    if (message.includes("\u50F9\u683C") || message.includes("\u591A\u5C11\u9322"))
      score += 20;
    if (message.includes("\u600E\u9EBC\u8CB7") || message.includes("\u8CFC\u8CB7"))
      score += 25;
    if (message.includes("\u4E86\u89E3") || message.includes("\u4ECB\u7D39"))
      score += 10;
    if (message.includes("\u6025") || message.includes("\u99AC\u4E0A"))
      score += 15;
    return Math.min(100, score);
  }
  /**
   * 檢測興趣信號（關鍵詞匹配）
   */
  detectInterestSignal(message) {
    const lowerMessage = message.toLowerCase();
    for (const [type, keywords] of Object.entries(DEFAULT_INTEREST_SIGNALS)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          return {
            type,
            keyword,
            confidence: 0.8,
            message,
            detectedAt: /* @__PURE__ */ new Date()
          };
        }
      }
    }
    return null;
  }
  /**
   * 🆕 Phase2: AI 增強興趣信號檢測
   * 使用 AI 分析消息語義，識別更複雜的購買意向
   */
  async detectInterestSignalWithAI(message, conversationHistory = []) {
    const quickMatch = this.detectInterestSignal(message);
    if (quickMatch && quickMatch.confidence >= 0.8) {
      return quickMatch;
    }
    return new Promise((resolve) => {
      const context = conversationHistory.slice(-5).join("\n");
      this.ipc.send("ai:analyze-interest", {
        message,
        context,
        analysisType: "interest_signal"
      });
      const cleanup = this.ipc.on("ai:analyze-interest-result", (data) => {
        cleanup();
        if (data.success && data.hasInterest) {
          resolve({
            type: this.mapAISignalType(data.signalType),
            keyword: data.keyPhrase || message.substring(0, 20),
            confidence: data.confidence || 0.7,
            message,
            detectedAt: /* @__PURE__ */ new Date()
          });
        } else {
          resolve(null);
        }
      });
      setTimeout(() => {
        cleanup();
        resolve(quickMatch);
      }, 5e3);
    });
  }
  /**
   * 映射 AI 信號類型
   */
  mapAISignalType(aiType) {
    const mapping = {
      "price": "price_inquiry",
      "buying": "purchase_intent",
      "positive": "positive_feedback",
      "detail": "product_detail",
      "compare": "comparison"
    };
    return mapping[aiType] || "positive_feedback";
  }
  /**
   * 🆕 Phase2: 分析對話階段
   * 判斷當前對話處於哪個銷售階段
   */
  analyzeConversationStage(messages) {
    const userMessages = messages.filter((m) => m.fromUser).map((m) => m.text.toLowerCase());
    const lastUserMessage = userMessages[userMessages.length - 1] || "";
    if (this.containsAny(lastUserMessage, ["\u600E\u9EBC\u4ED8\u6B3E", "\u4E0B\u55AE", "\u8CFC\u8CB7", "\u4ED8\u9322", "\u8F49\u5E33"])) {
      return { stage: "purchase", confidence: 0.9, nextAction: "\u63D0\u4F9B\u4ED8\u6B3E\u65B9\u5F0F" };
    }
    if (this.containsAny(lastUserMessage, ["\u591A\u5C11\u9322", "\u50F9\u683C", "\u512A\u60E0", "\u6298\u6263", "\u4FBF\u5B9C"])) {
      return { stage: "intent", confidence: 0.85, nextAction: "\u5831\u50F9\u4E26\u5F37\u8ABF\u50F9\u503C" };
    }
    if (this.containsAny(lastUserMessage, ["\u6709\u4EC0\u9EBC", "\u80FD\u505A\u4EC0\u9EBC", "\u529F\u80FD", "\u8A73\u7D30", "\u4E86\u89E3"])) {
      return { stage: "consideration", confidence: 0.8, nextAction: "\u8A73\u7D30\u4ECB\u7D39\u7522\u54C1" };
    }
    if (this.containsAny(lastUserMessage, ["\u4E0D\u932F", "\u53EF\u4EE5", "\u633A\u597D", "\u611F\u8208\u8DA3"])) {
      return { stage: "interest", confidence: 0.7, nextAction: "\u6316\u6398\u9700\u6C42" };
    }
    return { stage: "awareness", confidence: 0.6, nextAction: "\u5EFA\u7ACB\u4FE1\u4EFB" };
  }
  /**
   * 輔助：檢查是否包含任一關鍵詞
   */
  containsAny(text, keywords) {
    return keywords.some((k) => text.includes(k));
  }
  /**
   * 🆕 Phase2: 計算轉化概率
   */
  calculateConversionProbability(execution) {
    let probability = 0.3;
    const stepResults = execution.stepResults;
    if (stepResults["plan"]?.status === "success") {
      probability += 0.1;
    }
    if (stepResults["private_chat"]?.status === "success") {
      probability += 0.15;
    }
    if (stepResults["detect_interest"]?.status === "success") {
      probability += 0.25;
      const signal2 = stepResults["detect_interest"]?.data;
      if (signal2?.type === "purchase_intent" || signal2?.type === "price_inquiry") {
        probability += 0.15;
      }
    }
    if (stepResults["create_group"]?.status === "success") {
      probability += 0.1;
    }
    return Math.min(0.95, probability);
  }
  /**
   * 檢查用戶是否在冷卻期
   */
  isUserInCooldown(userId, cooldownMinutes) {
    const lastTrigger = this.userCooldowns.get(userId);
    if (!lastTrigger)
      return false;
    const cooldownMs = cooldownMinutes * 60 * 1e3;
    return Date.now() - lastTrigger.getTime() < cooldownMs;
  }
  /**
   * 獲取隨機延遲
   */
  getRandomDelay(range) {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }
  /**
   * 創建執行實例
   */
  createExecution(workflow, userData, intentScore) {
    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflow.id,
      targetUserId: userData.userId,
      targetUserName: userData.username || userData.firstName || "User",
      currentStep: workflow.steps[0].id,
      status: "pending",
      stepResults: {},
      startedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this._executions.update((map) => {
      const newMap = new Map(map);
      newMap.set(execution.id, execution);
      return newMap;
    });
    return execution;
  }
  /**
   * 更新執行實例
   */
  updateExecution(id, updates) {
    this._executions.update((map) => {
      const newMap = new Map(map);
      const execution = newMap.get(id);
      if (execution) {
        newMap.set(id, __spreadProps(__spreadValues(__spreadValues({}, execution), updates), { updatedAt: /* @__PURE__ */ new Date() }));
      }
      return newMap;
    });
  }
  /**
   * 更新執行步驟結果
   */
  updateExecutionStep(executionId, stepId, result) {
    this._executions.update((map) => {
      const newMap = new Map(map);
      const execution = newMap.get(executionId);
      if (execution) {
        newMap.set(executionId, __spreadProps(__spreadValues({}, execution), {
          stepResults: __spreadProps(__spreadValues({}, execution.stepResults), { [stepId]: result }),
          updatedAt: /* @__PURE__ */ new Date()
        }));
      }
      return newMap;
    });
  }
  /**
   * 推進到下一步
   */
  advanceToStep(executionId, nextStepId) {
    this.updateExecution(executionId, { currentStep: nextStepId });
    setTimeout(() => {
      this.executeWorkflow(executionId);
    }, 1e3);
  }
  /**
   * 更新工作流統計
   */
  updateWorkflowStats(workflowId, type) {
    this._workflows.update((workflows) => workflows.map((w) => {
      if (w.id !== workflowId)
        return w;
      return __spreadProps(__spreadValues({}, w), {
        stats: __spreadProps(__spreadValues({}, w.stats), {
          totalTriggers: w.stats.totalTriggers + (type === "trigger" ? 1 : 0),
          todayTriggers: w.stats.todayTriggers + (type === "trigger" ? 1 : 0),
          conversions: w.stats.conversions + (type === "conversion" ? 1 : 0),
          lastTriggeredAt: type === "trigger" ? /* @__PURE__ */ new Date() : w.stats.lastTriggeredAt
        }),
        updatedAt: /* @__PURE__ */ new Date()
      });
    }));
    this.saveToStorage();
  }
  // ============ 公開 API ============
  /**
   * 啟用/禁用工作流
   */
  toggleWorkflow(id, enabled) {
    this._workflows.update((workflows) => workflows.map((w) => w.id === id ? __spreadProps(__spreadValues({}, w), { enabled, updatedAt: /* @__PURE__ */ new Date() }) : w));
    this.saveToStorage();
    this.toast.success(enabled ? "\u2705 \u5DE5\u4F5C\u6D41\u5DF2\u555F\u7528" : "\u23F8\uFE0F \u5DE5\u4F5C\u6D41\u5DF2\u66AB\u505C");
  }
  /**
   * 手動觸發工作流（用於測試）
   */
  manualTrigger(workflowId, targetUser) {
    const workflow = this._workflows().find((w) => w.id === workflowId);
    if (!workflow) {
      this.toast.error("\u627E\u4E0D\u5230\u5DE5\u4F5C\u6D41");
      return;
    }
    this.tryTriggerWorkflow(workflow, __spreadProps(__spreadValues({}, targetUser), {
      messagePreview: "\u624B\u52D5\u89F8\u767C",
      manual: true
    }));
  }
  /**
   * 取消執行
   */
  cancelExecution(id) {
    this.updateExecution(id, { status: "cancelled", completedAt: /* @__PURE__ */ new Date() });
    this.toast.info("\u5DF2\u53D6\u6D88\u5DE5\u4F5C\u6D41\u57F7\u884C");
  }
  /**
   * 獲取執行詳情
   */
  getExecution(id) {
    return this._executions().get(id);
  }
  // ============ 持久化 ============
  saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._workflows()));
    } catch (e) {
      console.error("[AutomationWorkflow] \u4FDD\u5B58\u5931\u6557:", e);
    }
  }
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const workflows = JSON.parse(saved);
        this._workflows.set(workflows.map((w) => __spreadProps(__spreadValues({}, w), {
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt),
          stats: __spreadProps(__spreadValues({}, w.stats), {
            lastTriggeredAt: w.stats.lastTriggeredAt ? new Date(w.stats.lastTriggeredAt) : void 0
          })
        })));
      }
    } catch (e) {
      console.error("[AutomationWorkflow] \u8F09\u5165\u5931\u6557:", e);
    }
  }
  /**
   * 清理
   */
  destroy() {
    this.ipcCleanups.forEach((cleanup) => cleanup());
  }
  static {
    this.\u0275fac = function AutomationWorkflowService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AutomationWorkflowService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AutomationWorkflowService, factory: _AutomationWorkflowService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AutomationWorkflowService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

// src/services/marketing-analytics.service.ts
var MarketingAnalyticsService = class _MarketingAnalyticsService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this._sessions = signal([], ...ngDevMode ? [{ debugName: "_sessions" }] : []);
    this._userProfiles = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_userProfiles" }] : []);
    this._roleComboStats = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_roleComboStats" }] : []);
    this.sessions = this._sessions.asReadonly();
    this.userProfiles = computed(() => Array.from(this._userProfiles().values()), ...ngDevMode ? [{ debugName: "userProfiles" }] : []);
    this.roleComboStats = computed(() => Array.from(this._roleComboStats().values()), ...ngDevMode ? [{ debugName: "roleComboStats" }] : []);
    this.totalStats = computed(() => {
      const sessions = this._sessions();
      const conversions = sessions.filter((s) => s.outcome === "converted").length;
      return {
        totalSessions: sessions.length,
        conversions,
        conversionRate: sessions.length > 0 ? conversions / sessions.length * 100 : 0,
        avgInterestScore: this.calcAverage(sessions.map((s) => s.interestScore)),
        avgEngagementScore: this.calcAverage(sessions.map((s) => s.engagementScore)),
        totalRevenue: sessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
      };
    }, ...ngDevMode ? [{ debugName: "totalStats" }] : []);
    this.todayStats = computed(() => {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todaySessions = this._sessions().filter((s) => s.startTime.toISOString().split("T")[0] === today);
      const conversions = todaySessions.filter((s) => s.outcome === "converted").length;
      return {
        sessions: todaySessions.length,
        conversions,
        conversionRate: todaySessions.length > 0 ? conversions / todaySessions.length * 100 : 0,
        revenue: todaySessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
      };
    }, ...ngDevMode ? [{ debugName: "todayStats" }] : []);
    this.topRoleCombos = computed(() => {
      const stats = Array.from(this._roleComboStats().values());
      return stats.filter((s) => s.totalSessions >= 3).sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5);
    }, ...ngDevMode ? [{ debugName: "topRoleCombos" }] : []);
    this.STORAGE_KEY = "marketingAnalytics";
    this.loadFromStorage();
    this.initializeListeners();
  }
  /**
   * 初始化監聽器
   */
  initializeListeners() {
    this.ipc.on("collaboration:session-ended", (data) => {
      this.recordSession(data);
    });
    this.ipc.on("collaboration:user-message", (data) => {
      this.updateUserProfile(data.userId, data.message);
    });
  }
  // ============ 會話記錄 ============
  /**
   * 記錄營銷會話
   */
  recordSession(data) {
    const roleCombo = this.createRoleCombo(data.roles);
    const userMessages = data.messages.filter((m) => m.isUser);
    const roleMessages = data.messages.filter((m) => !m.isUser);
    const session = {
      id: data.sessionId,
      startTime: data.messages[0]?.timestamp || /* @__PURE__ */ new Date(),
      endTime: data.messages[data.messages.length - 1]?.timestamp,
      targetUserId: data.targetUserId,
      targetUserName: data.targetUserName,
      roleCombo,
      totalMessages: data.messages.length,
      userMessages: userMessages.length,
      roleMessages: roleMessages.length,
      avgResponseTime: this.calcAvgResponseTime(data.messages),
      stagesReached: data.stagesReached,
      finalStage: data.finalStage,
      outcome: data.outcome,
      conversionValue: data.conversionValue,
      interestScore: data.interestScore,
      engagementScore: this.calcEngagementScore(data.messages),
      tags: this.extractSessionTags(data)
    };
    this._sessions.update((sessions) => [...sessions, session]);
    this.updateRoleComboStats(roleCombo, session);
    this.saveToStorage();
    console.log(`[Analytics] \u8A18\u9304\u6703\u8A71: ${session.id}, \u7D50\u679C: ${session.outcome}`);
    return session;
  }
  /**
   * 創建角色組合標識
   */
  createRoleCombo(roles) {
    const sortedRoles = [...roles].sort((a, b) => a.roleId.localeCompare(b.roleId));
    const hash = sortedRoles.map((r) => r.roleType).join("_");
    const name = sortedRoles.map((r) => r.roleName).join(" + ");
    return {
      id: `combo_${hash}`,
      name,
      roles: sortedRoles,
      hash
    };
  }
  /**
   * 更新角色組合統計
   */
  updateRoleComboStats(combo, session) {
    const statsMap = this._roleComboStats();
    const existing = statsMap.get(combo.id);
    const isConversion = session.outcome === "converted";
    if (existing) {
      const newTotal = existing.totalSessions + 1;
      const newConversions = existing.conversions + (isConversion ? 1 : 0);
      const updated = __spreadProps(__spreadValues({}, existing), {
        totalSessions: newTotal,
        conversions: newConversions,
        conversionRate: newConversions / newTotal * 100,
        avgInterestScore: (existing.avgInterestScore * existing.totalSessions + session.interestScore) / newTotal,
        avgEngagementScore: (existing.avgEngagementScore * existing.totalSessions + session.engagementScore) / newTotal,
        avgMessageCount: (existing.avgMessageCount * existing.totalSessions + session.totalMessages) / newTotal,
        lastUsed: /* @__PURE__ */ new Date()
      });
      updated.trend = session.interestScore > existing.avgInterestScore ? "up" : session.interestScore < existing.avgInterestScore ? "down" : "stable";
      this._roleComboStats.update((m) => {
        const newMap = new Map(m);
        newMap.set(combo.id, updated);
        return newMap;
      });
    } else {
      const newStats = {
        comboId: combo.id,
        comboName: combo.name,
        roles: combo.roles.map((r) => r.roleName),
        totalSessions: 1,
        conversions: isConversion ? 1 : 0,
        conversionRate: isConversion ? 100 : 0,
        avgInterestScore: session.interestScore,
        avgEngagementScore: session.engagementScore,
        avgSessionDuration: 0,
        avgMessageCount: session.totalMessages,
        stageReachRates: {},
        trend: "stable",
        lastUsed: /* @__PURE__ */ new Date()
      };
      this._roleComboStats.update((m) => {
        const newMap = new Map(m);
        newMap.set(combo.id, newStats);
        return newMap;
      });
    }
  }
  // ============ 用戶畫像 ============
  /**
   * 更新用戶畫像
   */
  updateUserProfile(userId, message) {
    const existing = this._userProfiles().get(userId);
    const msgLength = message.length;
    const lengthCategory = msgLength < 20 ? "short" : msgLength > 100 ? "long" : "medium";
    const interests = this.extractInterests(message);
    const painPoints = this.extractPainPoints(message);
    const objections = this.extractObjections(message);
    if (existing) {
      const updated = __spreadProps(__spreadValues({}, existing), {
        totalMessages: existing.totalMessages + 1,
        interests: [.../* @__PURE__ */ new Set([...existing.interests, ...interests])].slice(0, 10),
        painPoints: [.../* @__PURE__ */ new Set([...existing.painPoints, ...painPoints])].slice(0, 5),
        objections: [.../* @__PURE__ */ new Set([...existing.objections, ...objections])].slice(0, 5),
        lastContactTime: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      updated.messageLength = lengthCategory;
      this._userProfiles.update((m) => {
        const newMap = new Map(m);
        newMap.set(userId, updated);
        return newMap;
      });
    } else {
      const newProfile = {
        userId,
        responseSpeed: "normal",
        messageLength: lengthCategory,
        activeHours: [(/* @__PURE__ */ new Date()).getHours()],
        interests,
        painPoints,
        objections,
        intentLevel: "unknown",
        pricesSensitivity: "medium",
        totalSessions: 1,
        totalMessages: 1,
        lastContactTime: /* @__PURE__ */ new Date(),
        tags: [],
        updatedAt: /* @__PURE__ */ new Date()
      };
      this._userProfiles.update((m) => {
        const newMap = new Map(m);
        newMap.set(userId, newProfile);
        return newMap;
      });
    }
    this.saveToStorage();
  }
  /**
   * 提取興趣點
   */
  extractInterests(message) {
    const interests = [];
    const lowerMsg = message.toLowerCase();
    const keywords = {
      "\u652F\u4ED8": "\u652F\u4ED8\u89E3\u6C7A\u65B9\u6848",
      "\u6536\u6B3E": "\u6536\u6B3E\u670D\u52D9",
      "\u8DE8\u5883": "\u8DE8\u5883\u696D\u52D9",
      "\u8CBB\u7387": "\u50F9\u683C\u654F\u611F",
      "\u5B89\u5168": "\u5B89\u5168\u9700\u6C42",
      "\u901F\u5EA6": "\u6548\u7387\u9700\u6C42",
      "\u7A69\u5B9A": "\u7A69\u5B9A\u6027\u9700\u6C42"
    };
    Object.entries(keywords).forEach(([key, interest]) => {
      if (lowerMsg.includes(key)) {
        interests.push(interest);
      }
    });
    return interests;
  }
  /**
   * 提取痛點
   */
  extractPainPoints(message) {
    const painPoints = [];
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes("\u8CB4") || lowerMsg.includes("\u8CBB\u7387\u9AD8")) {
      painPoints.push("\u8CBB\u7387\u554F\u984C");
    }
    if (lowerMsg.includes("\u6162") || lowerMsg.includes("\u7B49\u5F85")) {
      painPoints.push("\u6548\u7387\u554F\u984C");
    }
    if (lowerMsg.includes("\u64D4\u5FC3") || lowerMsg.includes("\u98A8\u96AA")) {
      painPoints.push("\u5B89\u5168\u9867\u616E");
    }
    if (lowerMsg.includes("\u8907\u96DC") || lowerMsg.includes("\u9EBB\u7169")) {
      painPoints.push("\u64CD\u4F5C\u8907\u96DC");
    }
    return painPoints;
  }
  /**
   * 提取異議
   */
  extractObjections(message) {
    const objections = [];
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes("\u4E0D\u9700\u8981") || lowerMsg.includes("\u4E0D\u7528")) {
      objections.push("\u7121\u9700\u6C42");
    }
    if (lowerMsg.includes("\u518D\u8003\u616E") || lowerMsg.includes("\u518D\u8AAA")) {
      objections.push("\u9700\u8981\u8003\u616E");
    }
    if (lowerMsg.includes("\u592A\u8CB4") || lowerMsg.includes("\u4FBF\u5B9C")) {
      objections.push("\u50F9\u683C\u7570\u8B70");
    }
    if (lowerMsg.includes("\u4E0D\u4FE1") || lowerMsg.includes("\u9A19")) {
      objections.push("\u4FE1\u4EFB\u554F\u984C");
    }
    return objections;
  }
  /**
   * 獲取用戶畫像
   */
  getUserProfile(userId) {
    return this._userProfiles().get(userId);
  }
  // ============ 報表生成 ============
  /**
   * 生成日報
   */
  generateDailyReport(date) {
    const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const sessions = this._sessions().filter((s) => s.startTime.toISOString().split("T")[0] === targetDate);
    const conversions = sessions.filter((s) => s.outcome === "converted");
    const uniqueUsers = new Set(sessions.map((s) => s.targetUserId));
    const accountUsage = /* @__PURE__ */ new Map();
    sessions.forEach((s) => {
      s.roleCombo.roles.forEach((r) => {
        const existing = accountUsage.get(r.accountPhone) || { sessions: 0, messages: 0 };
        existing.sessions++;
        existing.messages += s.roleMessages / s.roleCombo.roles.length;
        accountUsage.set(r.accountPhone, existing);
      });
    });
    const comboStats = /* @__PURE__ */ new Map();
    sessions.forEach((s) => {
      const existing = comboStats.get(s.roleCombo.id) || { name: s.roleCombo.name, conversions: 0, total: 0 };
      existing.total++;
      if (s.outcome === "converted")
        existing.conversions++;
      comboStats.set(s.roleCombo.id, existing);
    });
    const stages = ["opening", "building_trust", "discovering_needs", "presenting_value", "handling_objections", "closing", "follow_up"];
    const stageCounts = stages.map((stage) => ({
      stage,
      count: sessions.filter((s) => s.stagesReached.includes(stage)).length
    }));
    return {
      date: targetDate,
      totalSessions: sessions.length,
      newUsers: uniqueUsers.size,
      activeUsers: uniqueUsers.size,
      conversions: conversions.length,
      conversionRate: sessions.length > 0 ? conversions.length / sessions.length * 100 : 0,
      totalRevenue: sessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0),
      totalMessages: sessions.reduce((sum, s) => sum + s.totalMessages, 0),
      avgResponseTime: this.calcAverage(sessions.map((s) => s.avgResponseTime)),
      accountUsage: Array.from(accountUsage.entries()).map(([phone, stats]) => __spreadValues({
        phone
      }, stats)),
      topRoleCombos: Array.from(comboStats.values()).sort((a, b) => b.conversions - a.conversions).slice(0, 5).map((c) => ({
        comboName: c.name,
        conversions: c.conversions,
        rate: c.total > 0 ? c.conversions / c.total * 100 : 0
      })),
      funnel: stageCounts.map((sc, idx) => ({
        stage: sc.stage,
        count: sc.count,
        rate: sessions.length > 0 ? sc.count / sessions.length * 100 : 0
      }))
    };
  }
  /**
   * 生成週期對比
   */
  generatePeriodComparison(days = 7) {
    const now = /* @__PURE__ */ new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1e3);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1e3);
    const currentSessions = this._sessions().filter((s) => s.startTime >= currentStart && s.startTime < now);
    const previousSessions = this._sessions().filter((s) => s.startTime >= previousStart && s.startTime < currentStart);
    const current = {
      sessions: currentSessions.length,
      conversions: currentSessions.filter((s) => s.outcome === "converted").length,
      revenue: currentSessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
    };
    const previous = {
      sessions: previousSessions.length,
      conversions: previousSessions.filter((s) => s.outcome === "converted").length,
      revenue: previousSessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
    };
    return {
      current,
      previous,
      changes: {
        sessions: previous.sessions > 0 ? (current.sessions - previous.sessions) / previous.sessions * 100 : 0,
        conversions: previous.conversions > 0 ? (current.conversions - previous.conversions) / previous.conversions * 100 : 0,
        revenue: previous.revenue > 0 ? (current.revenue - previous.revenue) / previous.revenue * 100 : 0
      }
    };
  }
  // ============ 推薦功能 ============
  /**
   * 推薦角色組合
   */
  recommendRoleCombo(targetProfile) {
    const stats = Array.from(this._roleComboStats().values());
    if (stats.length === 0)
      return null;
    let sorted = stats.filter((s) => s.totalSessions >= 2).sort((a, b) => b.conversionRate - a.conversionRate);
    if (targetProfile) {
    }
    return sorted[0] || null;
  }
  // ============ 輔助方法 ============
  calcAverage(values) {
    if (values.length === 0)
      return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  calcAvgResponseTime(messages) {
    let totalTime = 0;
    let count = 0;
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].isUser && !messages[i - 1].isUser) {
        totalTime += new Date(messages[i].timestamp).getTime() - new Date(messages[i - 1].timestamp).getTime();
        count++;
      }
    }
    return count > 0 ? totalTime / count : 0;
  }
  calcEngagementScore(messages) {
    const userMsgs = messages.filter((m) => m.isUser);
    if (userMsgs.length === 0)
      return 0;
    let score = 0;
    score += Math.min(userMsgs.length * 10, 40);
    const avgLength = userMsgs.reduce((sum, m) => sum + m.content.length, 0) / userMsgs.length;
    score += Math.min(avgLength / 5, 30);
    const questions = userMsgs.filter((m) => m.content.includes("?") || m.content.includes("\uFF1F")).length;
    score += Math.min(questions * 10, 30);
    return Math.min(score, 100);
  }
  extractSessionTags(data) {
    const tags = [];
    if (data.outcome === "converted")
      tags.push("\u6210\u4EA4");
    if (data.interestScore >= 80)
      tags.push("\u9AD8\u610F\u5411");
    if (data.stagesReached.includes("closing"))
      tags.push("\u5230\u9054\u6210\u4EA4\u968E\u6BB5");
    return tags;
  }
  // ============ 持久化 ============
  saveToStorage() {
    const data = {
      sessions: this._sessions(),
      userProfiles: Array.from(this._userProfiles().entries()),
      roleComboStats: Array.from(this._roleComboStats().entries()),
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
      if (data.sessions) {
        const sessions = data.sessions.map((s) => __spreadProps(__spreadValues({}, s), {
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : void 0
        }));
        this._sessions.set(sessions);
      }
      if (data.userProfiles) {
        const map = new Map(data.userProfiles.map((e) => [
          e[0],
          __spreadProps(__spreadValues({}, e[1]), { updatedAt: new Date(e[1].updatedAt), lastContactTime: e[1].lastContactTime ? new Date(e[1].lastContactTime) : void 0 })
        ]));
        this._userProfiles.set(map);
      }
      if (data.roleComboStats) {
        const map = new Map(data.roleComboStats.map((e) => [
          e[0],
          __spreadProps(__spreadValues({}, e[1]), { lastUsed: new Date(e[1].lastUsed) })
        ]));
        this._roleComboStats.set(map);
      }
      console.log("[Analytics] \u5DF2\u5F9E\u5B58\u5132\u6062\u5FA9\u6578\u64DA");
    } catch (e) {
      console.error("[Analytics] \u6062\u5FA9\u6578\u64DA\u5931\u6557:", e);
    }
  }
  /**
   * 清除所有數據
   */
  clearAllData() {
    this._sessions.set([]);
    this._userProfiles.set(/* @__PURE__ */ new Map());
    this._roleComboStats.set(/* @__PURE__ */ new Map());
    localStorage.removeItem(this.STORAGE_KEY);
    console.log("[Analytics] \u5DF2\u6E05\u9664\u6240\u6709\u6578\u64DA");
  }
  /**
   * 導出數據
   */
  exportData() {
    return JSON.stringify({
      sessions: this._sessions(),
      userProfiles: Array.from(this._userProfiles().entries()),
      roleComboStats: Array.from(this._roleComboStats().entries()),
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2);
  }
  static {
    this.\u0275fac = function MarketingAnalyticsService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MarketingAnalyticsService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MarketingAnalyticsService, factory: _MarketingAnalyticsService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MarketingAnalyticsService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  AutomationWorkflowService,
  MarketingAnalyticsService
};
//# sourceMappingURL=chunk-UNP75L76.js.map
