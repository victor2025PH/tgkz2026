import {
  AICenterService
} from "./chunk-RUWU7PL6.js";
import {
  AccountManagementService
} from "./chunk-5TVIREIP.js";
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

// src/multi-role/multi-role.models.ts
var ROLE_TYPE_META = {
  expert: {
    icon: "\u{1F468}\u200D\u{1F4BC}",
    label: "\u7522\u54C1\u5C08\u5BB6",
    description: "\u5C08\u696D\u7684\u7522\u54C1\u9867\u554F\uFF0C\u8A73\u7D30\u89E3\u7B54\u554F\u984C",
    defaultStyle: "professional",
    defaultPrompt: "\u4F60\u662F\u4E00\u4F4D\u8CC7\u6DF1\u7522\u54C1\u5C08\u5BB6\uFF0C\u67095\u5E74\u884C\u696D\u7D93\u9A57\u3002\u4F60\u7684\u7279\u9EDE\u662F\u5C08\u696D\u3001\u8010\u5FC3\u3001\u5584\u65BC\u7528\u6848\u4F8B\u8AAA\u660E\u554F\u984C\u3002"
  },
  satisfied_customer: {
    icon: "\u{1F60A}",
    label: "\u6EFF\u610F\u8001\u5BA2\u6236",
    description: "\u771F\u8AA0\u5206\u4EAB\u4F7F\u7528\u9AD4\u9A57\u7684\u8001\u5BA2\u6236",
    defaultStyle: "friendly",
    defaultPrompt: "\u4F60\u662F\u4E00\u4F4D\u4F7F\u7528\u7522\u54C1\u534A\u5E74\u7684\u6EFF\u610F\u5BA2\u6236\u3002\u4F60\u6703\u771F\u8AA0\u5206\u4EAB\u81EA\u5DF1\u7684\u4F7F\u7528\u9AD4\u9A57\uFF0C\u89E3\u7B54\u65B0\u4EBA\u7591\u616E\u3002"
  },
  support: {
    icon: "\u{1F469}\u200D\u{1F4BB}",
    label: "\u5BA2\u670D\u52A9\u7406",
    description: "\u71B1\u60C5\u7684\u5BA2\u670D\uFF0C\u8655\u7406\u8A02\u55AE\u552E\u5F8C",
    defaultStyle: "enthusiastic",
    defaultPrompt: "\u4F60\u662F\u4E00\u4F4D\u71B1\u60C5\u7684\u5BA2\u670D\u52A9\u7406\u3002\u4F60\u5FEB\u901F\u97FF\u61C9\u3001\u89E3\u6C7A\u554F\u984C\uFF0C\u8655\u7406\u8A02\u55AE\u548C\u552E\u5F8C\u652F\u6301\u3002"
  },
  manager: {
    icon: "\u{1F454}",
    label: "\u7D93\u7406",
    description: "\u6709\u6C7A\u7B56\u6B0A\u7684\u7BA1\u7406\u4EBA\u54E1",
    defaultStyle: "professional",
    defaultPrompt: "\u4F60\u662F\u7522\u54C1\u7D93\u7406\uFF0C\u6709\u4E00\u5B9A\u6C7A\u7B56\u6B0A\u3002\u4F60\u53EF\u4EE5\u7D66\u4E88\u7279\u5225\u512A\u60E0\u6216\u505A\u51FA\u627F\u8AFE\u3002"
  },
  newbie: {
    icon: "\u{1F64B}",
    label: "\u597D\u5947\u65B0\u4EBA",
    description: "\u5C0D\u7522\u54C1\u611F\u8208\u8DA3\u7684\u65B0\u7528\u6236",
    defaultStyle: "curious",
    defaultPrompt: "\u4F60\u662F\u4E00\u500B\u5C0D\u7522\u54C1\u611F\u8208\u8DA3\u7684\u65B0\u4EBA\uFF0C\u6703\u554F\u4E00\u4E9B\u57FA\u790E\u554F\u984C\uFF0C\u5F15\u5C0E\u5C08\u5BB6\u89E3\u7B54\u3002"
  },
  hesitant: {
    icon: "\u{1F914}",
    label: "\u7336\u8C6B\u8005",
    description: "\u6709\u9867\u616E\u4F46\u88AB\u8AAA\u670D\u7684\u7528\u6236",
    defaultStyle: "careful",
    defaultPrompt: "\u4F60\u4E00\u958B\u59CB\u6709\u9867\u616E\uFF0C\u4F46\u88AB\u5C08\u5BB6\u548C\u8001\u5BA2\u6236\u8AAA\u670D\u5F8C\u6C7A\u5B9A\u8CFC\u8CB7\uFF0C\u5206\u4EAB\u4F60\u88AB\u8AAA\u670D\u7684\u904E\u7A0B\u3002"
  },
  custom: {
    icon: "\u{1F3AD}",
    label: "\u81EA\u5B9A\u7FA9\u89D2\u8272",
    description: "\u6839\u64DA\u9700\u8981\u81EA\u5B9A\u7FA9\u7684\u89D2\u8272",
    defaultStyle: "friendly",
    defaultPrompt: ""
  }
};
var DEFAULT_MULTI_ROLE_CONFIG = {
  roles: [],
  scripts: [],
  autoGroupSettings: {
    enabled: true,
    nameTemplate: "VIP\u5C08\u5C6C\u670D\u52D9\u7FA4 - {\u5BA2\u6236\u540D}",
    inviteMessageTemplate: "\u70BA\u4E86\u66F4\u597D\u5730\u670D\u52D9\u60A8\uFF0C\u6211\u5011\u7279\u5225\u5EFA\u7ACB\u4E86VIP\u7FA4\uFF0C\u6709\u5C08\u5BB6\u548C\u8001\u7528\u6236\u53EF\u4EE5\u89E3\u7B54\u60A8\u7684\u554F\u984C\uFF01",
    maxConcurrentGroups: 5,
    autoCloseAfterDays: 7
  },
  defaultTriggerConditions: {
    intentScoreThreshold: 70,
    minConversationRounds: 3,
    requirePriceInquiry: false
  },
  aiSettings: {
    useAICenter: true,
    coordinationMode: "sequential",
    maxAIResponseTime: 30
  }
};

// src/ai-provider.service.ts
var AI_PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "\u2728",
    description: "\u8C37\u6B4C\u6700\u65B0 AI \u6A21\u578B\uFF0C\u5FEB\u901F\u4E14\u591A\u8A9E\u8A00\u652F\u6301",
    requiresApiKey: true,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "\u5F37\u5927\u7684\u591A\u6A21\u614B\u6A21\u578B",
        contextLength: 2e6,
        pricePerMToken: 3.5,
        capabilities: ["text", "vision", "code", "reasoning"]
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        description: "\u5FEB\u901F\u9AD8\u6548\u7684\u8F15\u91CF\u6A21\u578B",
        contextLength: 1e6,
        pricePerMToken: 0.075,
        capabilities: ["text", "vision", "code"]
      },
      {
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash (\u5BE6\u9A57)",
        description: "\u6700\u65B0\u5BE6\u9A57\u7248\u672C",
        contextLength: 1e6,
        pricePerMToken: 0,
        capabilities: ["text", "vision", "code", "reasoning"]
      }
    ]
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "\u{1F916}",
    description: "ChatGPT \u80CC\u5F8C\u7684 AI \u6A21\u578B",
    requiresApiKey: true,
    baseUrl: "https://api.openai.com/v1",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "\u6700\u65B0\u65D7\u8266\u6A21\u578B",
        contextLength: 128e3,
        pricePerMToken: 5,
        capabilities: ["text", "vision", "code", "reasoning"]
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "\u7D93\u6FDF\u5BE6\u60E0\u7684\u5C0F\u578B\u6A21\u578B",
        contextLength: 128e3,
        pricePerMToken: 0.15,
        capabilities: ["text", "vision", "code"]
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "\u9AD8\u6027\u80FD\u6A21\u578B",
        contextLength: 128e3,
        pricePerMToken: 10,
        capabilities: ["text", "vision", "code", "reasoning"]
      },
      {
        id: "o1-preview",
        name: "o1 Preview",
        description: "\u6DF1\u5EA6\u63A8\u7406\u6A21\u578B",
        contextLength: 128e3,
        pricePerMToken: 15,
        capabilities: ["text", "code", "reasoning", "math"]
      }
    ]
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    icon: "\u{1F9E0}",
    description: "\u5B89\u5168\u53EF\u9760\u7684 AI \u52A9\u624B",
    requiresApiKey: true,
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        description: "\u6700\u4F73\u7D9C\u5408\u6027\u80FD",
        contextLength: 2e5,
        pricePerMToken: 3,
        capabilities: ["text", "vision", "code", "reasoning"]
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "\u6700\u5F37\u63A8\u7406\u80FD\u529B",
        contextLength: 2e5,
        pricePerMToken: 15,
        capabilities: ["text", "vision", "code", "reasoning"]
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "\u5FEB\u901F\u8F15\u91CF",
        contextLength: 2e5,
        pricePerMToken: 0.25,
        capabilities: ["text", "vision", "code"]
      }
    ]
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "\u{1F50D}",
    description: "\u9AD8\u6027\u50F9\u6BD4\u7684\u4E2D\u570B AI \u6A21\u578B",
    requiresApiKey: true,
    baseUrl: "https://api.deepseek.com",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        description: "\u901A\u7528\u5C0D\u8A71\u6A21\u578B",
        contextLength: 64e3,
        pricePerMToken: 0.14,
        capabilities: ["text", "code"]
      },
      {
        id: "deepseek-coder",
        name: "DeepSeek Coder",
        description: "\u5C08\u696D\u7DE8\u7A0B\u6A21\u578B",
        contextLength: 64e3,
        pricePerMToken: 0.14,
        capabilities: ["code", "text"]
      }
    ]
  },
  {
    id: "ollama",
    name: "Ollama (\u672C\u5730)",
    icon: "\u{1F999}",
    description: "\u672C\u5730\u904B\u884C\uFF0C\u5B8C\u5168\u96B1\u79C1",
    requiresApiKey: false,
    baseUrl: "http://localhost:11434",
    models: [
      {
        id: "llama3.2",
        name: "Llama 3.2",
        description: "Meta \u6700\u65B0\u958B\u6E90\u6A21\u578B",
        contextLength: 128e3,
        capabilities: ["text", "code"]
      },
      {
        id: "qwen2.5",
        name: "Qwen 2.5",
        description: "\u963F\u91CC\u901A\u7FA9\u5343\u554F",
        contextLength: 128e3,
        capabilities: ["text", "code", "reasoning"]
      },
      {
        id: "mistral",
        name: "Mistral",
        description: "\u6B50\u6D32\u958B\u6E90\u6A21\u578B",
        contextLength: 32e3,
        capabilities: ["text", "code"]
      },
      {
        id: "codellama",
        name: "Code Llama",
        description: "\u5C08\u696D\u7DE8\u7A0B\u6A21\u578B",
        contextLength: 16e3,
        capabilities: ["code"]
      }
    ]
  }
];
var AIProviderService = class _AIProviderService {
  constructor() {
    this._config = signal({
      provider: "gemini",
      model: "gemini-1.5-flash",
      apiKey: "",
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      systemPrompt: ""
    }, ...ngDevMode ? [{ debugName: "_config" }] : []);
    this.config = this._config.asReadonly();
    this._isConnected = signal(false, ...ngDevMode ? [{ debugName: "_isConnected" }] : []);
    this.isConnected = this._isConnected.asReadonly();
    this._usage = signal({
      totalTokens: 0,
      totalCalls: 0,
      totalCost: 0
    }, ...ngDevMode ? [{ debugName: "_usage" }] : []);
    this.usage = this._usage.asReadonly();
    this.providers = AI_PROVIDERS;
    this.currentProvider = computed(() => AI_PROVIDERS.find((p) => p.id === this._config().provider), ...ngDevMode ? [{ debugName: "currentProvider" }] : []);
    this.currentModel = computed(() => this.currentProvider()?.models.find((m) => m.id === this._config().model), ...ngDevMode ? [{ debugName: "currentModel" }] : []);
    this.availableModels = computed(() => this.currentProvider()?.models || [], ...ngDevMode ? [{ debugName: "availableModels" }] : []);
    this.loadConfig();
  }
  /**
   * 設置配置
   */
  setConfig(config) {
    this._config.update((c) => __spreadValues(__spreadValues({}, c), config));
    this.saveConfig();
  }
  /**
   * 切換提供商
   */
  setProvider(providerId) {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    if (provider) {
      this.setConfig({
        provider: providerId,
        model: provider.models[0]?.id || "",
        baseUrl: provider.baseUrl
      });
    }
  }
  /**
   * 切換模型
   */
  setModel(modelId) {
    this.setConfig({ model: modelId });
  }
  /**
   * 測試連接
   */
  async testConnection() {
    try {
      const response = await this.chat([
        { role: "user", content: 'Hello, please respond with "OK".' }
      ]);
      if (response.content) {
        this._isConnected.set(true);
        return { success: true, message: "\u9023\u63A5\u6210\u529F\uFF01" };
      }
      return { success: false, message: "\u7121\u97FF\u61C9" };
    } catch (error) {
      this._isConnected.set(false);
      return { success: false, message: error.message || "\u9023\u63A5\u5931\u6557" };
    }
  }
  /**
   * 發送聊天請求
   */
  async chat(messages, options) {
    const config = __spreadValues(__spreadValues({}, this._config()), options);
    if (!config.baseUrl || config.baseUrl.startsWith("/")) {
      const provider = AI_PROVIDERS.find((p) => p.id === config.provider);
      if (provider?.baseUrl) {
        config.baseUrl = provider.baseUrl;
        console.log(`[AIProvider] \u4F7F\u7528\u63D0\u4F9B\u5546\u9ED8\u8A8D baseUrl: ${config.baseUrl}`);
      }
    }
    if (!config.baseUrl) {
      throw new Error(`\u672A\u914D\u7F6E ${config.provider} \u7684 API \u7AEF\u9EDE`);
    }
    if (config.provider !== "ollama" && !config.apiKey) {
      throw new Error(`\u672A\u914D\u7F6E ${config.provider} \u7684 API Key`);
    }
    console.log(`[AIProvider] \u8ABF\u7528 ${config.provider}/${config.model}, baseUrl: ${config.baseUrl}`);
    switch (config.provider) {
      case "gemini":
        return this.chatGemini(messages, config);
      case "openai":
        return this.chatOpenAI(messages, config);
      case "claude":
        return this.chatClaude(messages, config);
      case "deepseek":
        return this.chatDeepSeek(messages, config);
      case "ollama":
        return this.chatOllama(messages, config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
  /**
   * 流式聊天
   */
  async *chatStream(messages, options) {
    const config = __spreadValues(__spreadValues({}, this._config()), options);
    const response = await this.chat(messages, options);
    const words = response.content.split("");
    for (const word of words) {
      yield word;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  // ============ 提供商特定實現 ============
  async chatGemini(messages, config) {
    const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
    console.log(`[AIProvider] Gemini URL: ${url.replace(config.apiKey, "***")}`);
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));
    const systemInstruction = messages.find((m) => m.role === "system");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : void 0,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          topP: config.topP
        }
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[AIProvider] Gemini \u8FD4\u56DE\u975E JSON \u97FF\u61C9:`, text.substring(0, 200));
      throw new Error(`Gemini API \u8FD4\u56DE\u932F\u8AA4\u683C\u5F0F (${response.status}): \u53EF\u80FD\u662F URL \u914D\u7F6E\u932F\u8AA4`);
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    this.updateUsage(data.usageMetadata?.promptTokenCount || 0, data.usageMetadata?.candidatesTokenCount || 0, config);
    return {
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      model: config.model,
      finishReason: data.candidates?.[0]?.finishReason || "stop"
    };
  }
  async chatOpenAI(messages, config) {
    const url = `${config.baseUrl}/chat/completions`;
    console.log(`[AIProvider] OpenAI URL: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[AIProvider] OpenAI \u8FD4\u56DE\u975E JSON \u97FF\u61C9:`, text.substring(0, 200));
      throw new Error(`OpenAI API \u8FD4\u56DE\u932F\u8AA4\u683C\u5F0F (${response.status}): \u53EF\u80FD\u662F URL \u914D\u7F6E\u932F\u8AA4`);
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    this.updateUsage(data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, config);
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: config.model,
      finishReason: data.choices?.[0]?.finish_reason || "stop"
    };
  }
  async chatClaude(messages, config) {
    const url = `${config.baseUrl}/messages`;
    console.log(`[AIProvider] Claude URL: ${url}`);
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[AIProvider] Claude \u8FD4\u56DE\u975E JSON \u97FF\u61C9:`, text.substring(0, 200));
      throw new Error(`Claude API \u8FD4\u56DE\u932F\u8AA4\u683C\u5F0F (${response.status}): \u53EF\u80FD\u662F URL \u914D\u7F6E\u932F\u8AA4`);
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    this.updateUsage(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0, config);
    return {
      content,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      model: config.model,
      finishReason: data.stop_reason || "stop"
    };
  }
  async chatDeepSeek(messages, config) {
    const url = `${config.baseUrl}/chat/completions`;
    console.log(`[AIProvider] DeepSeek URL: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error(`[AIProvider] DeepSeek \u8FD4\u56DE\u975E JSON \u97FF\u61C9:`, text.substring(0, 200));
      throw new Error(`DeepSeek API \u8FD4\u56DE\u932F\u8AA4\u683C\u5F0F (${response.status}): \u53EF\u80FD\u662F URL \u914D\u7F6E\u932F\u8AA4`);
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    this.updateUsage(data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, config);
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: config.model,
      finishReason: data.choices?.[0]?.finish_reason || "stop"
    };
  }
  async chatOllama(messages, config) {
    const url = `${config.baseUrl || "http://localhost:11434"}/api/chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
          top_p: config.topP
        },
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error("Ollama connection failed. Make sure Ollama is running.");
    }
    const data = await response.json();
    const content = data.message?.content || "";
    return {
      content,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      model: config.model,
      finishReason: "stop"
    };
  }
  // ============ 輔助方法 ============
  updateUsage(promptTokens, completionTokens, config) {
    const model = this.currentModel();
    const cost = model?.pricePerMToken ? (promptTokens + completionTokens) / 1e6 * model.pricePerMToken : 0;
    this._usage.update((u) => ({
      totalTokens: u.totalTokens + promptTokens + completionTokens,
      totalCalls: u.totalCalls + 1,
      totalCost: u.totalCost + cost
    }));
  }
  loadConfig() {
    try {
      const stored = localStorage.getItem("tg-matrix-ai-config");
      if (stored) {
        this._config.set(JSON.parse(stored));
      }
      const usage = localStorage.getItem("tg-matrix-ai-usage");
      if (usage) {
        this._usage.set(JSON.parse(usage));
      }
    } catch (e) {
      console.error("Failed to load AI config:", e);
    }
  }
  saveConfig() {
    try {
      localStorage.setItem("tg-matrix-ai-config", JSON.stringify(this._config()));
      localStorage.setItem("tg-matrix-ai-usage", JSON.stringify(this._usage()));
    } catch (e) {
      console.error("Failed to save AI config:", e);
    }
  }
  /**
   * 重置使用統計
   */
  resetUsage() {
    this._usage.set({
      totalTokens: 0,
      totalCalls: 0,
      totalCost: 0
    });
    this.saveConfig();
  }
  /**
   * 估算文本 token 數（粗略估算）
   */
  estimateTokens(text) {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }
  static {
    this.\u0275fac = function AIProviderService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AIProviderService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AIProviderService, factory: _AIProviderService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AIProviderService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/ai-center/intent-recognition.service.ts
var INTENT_RECOGNITION_PROMPT = `\u4F60\u662F\u4E00\u500B\u5C08\u696D\u7684\u92B7\u552E\u610F\u5716\u5206\u6790\u5C08\u5BB6\u3002\u5206\u6790\u7528\u6236\u6D88\u606F\u4E26\u8B58\u5225\u5176\u610F\u5716\u3002

\u8ACB\u6309\u4EE5\u4E0B JSON \u683C\u5F0F\u56DE\u8986\uFF08\u4E0D\u8981\u5305\u542B\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\uFF09\uFF1A
{
  "intent": "\u610F\u5716\u985E\u578B",
  "confidence": 0.0-1.0,
  "subIntents": ["\u5B50\u610F\u57161", "\u5B50\u610F\u57162"],
  "keywords": ["\u95DC\u9375\u8A5E1", "\u95DC\u9375\u8A5E2"],
  "sentiment": "positive/neutral/negative",
  "urgency": "low/medium/high",
  "suggestedAction": "\u5EFA\u8B70\u7684\u4E0B\u4E00\u6B65\u52D5\u4F5C"
}

\u610F\u5716\u985E\u578B\u5FC5\u9808\u662F\u4EE5\u4E0B\u4E4B\u4E00\uFF1A
- purchase_intent: \u6709\u8CFC\u8CB7\u610F\u5411\uFF08\u8A62\u554F\u5982\u4F55\u8CFC\u8CB7\u3001\u4E0B\u55AE\u3001\u4ED8\u6B3E\u7B49\uFF09
- price_inquiry: \u8A62\u554F\u50F9\u683C\uFF08\u591A\u5C11\u9322\u3001\u8CBB\u7528\u3001\u512A\u60E0\u7B49\uFF09
- product_question: \u7522\u54C1\u554F\u984C\uFF08\u529F\u80FD\u3001\u7279\u6027\u3001\u4F7F\u7528\u65B9\u6CD5\u7B49\uFF09
- complaint: \u62B1\u6028\u6216\u4E0D\u6EFF
- general_chat: \u4E00\u822C\u804A\u5929
- negative_sentiment: \u8CA0\u9762\u60C5\u7DD2
- high_value: \u9AD8\u50F9\u503C\u5BA2\u6236\u4FE1\u865F
- urgent: \u7DCA\u6025\u9700\u6C42`;
var IntentRecognitionService = class _IntentRecognitionService {
  constructor() {
    this.aiProvider = inject(AIProviderService);
    this.conversations = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "conversations" }] : []);
    this.cache = /* @__PURE__ */ new Map();
    this.CACHE_TTL = 6e4;
  }
  /**
   * 識別用戶意圖
   */
  async recognizeIntent(message, userId, includeContext = true) {
    const cacheKey = this.getCacheKey(message, userId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    const messages = [
      { role: "system", content: INTENT_RECOGNITION_PROMPT }
    ];
    if (userId && includeContext) {
      const context = this.getContext(userId);
      if (context && context.messages.length > 0) {
        const recentMessages = context.messages.slice(-5);
        messages.push({
          role: "user",
          content: `\u5C0D\u8A71\u6B77\u53F2\uFF1A
${recentMessages.map((m) => `[${m.role}]: ${m.content}`).join("\n")}

\u8ACB\u5206\u6790\u6700\u65B0\u6D88\u606F\u7684\u610F\u5716\u3002`
        });
      }
    }
    messages.push({ role: "user", content: `\u7528\u6236\u6D88\u606F\uFF1A${message}` });
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: 0.3,
        // 較低溫度以獲得更穩定的結果
        maxTokens: 500
      });
      const result = this.parseIntentResponse(response.content, message);
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      if (userId) {
        this.updateContext(userId, message, "user", result);
      }
      return result;
    } catch (error) {
      console.error("Intent recognition failed:", error);
      return this.fallbackRecognition(message);
    }
  }
  /**
   * 解析 AI 回覆
   */
  parseIntentResponse(response, originalMessage) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: this.validateIntent(parsed.intent),
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          subIntents: parsed.subIntents || [],
          keywords: parsed.keywords || [],
          sentiment: parsed.sentiment || "neutral",
          urgency: parsed.urgency || "medium",
          suggestedAction: parsed.suggestedAction || "",
          rawAnalysis: response
        };
      }
    } catch (e) {
      console.warn("Failed to parse intent response:", e);
    }
    return this.fallbackRecognition(originalMessage);
  }
  /**
   * 驗證意圖類型
   */
  validateIntent(intent) {
    const validIntents = [
      "purchase_intent",
      "price_inquiry",
      "product_question",
      "complaint",
      "general_chat",
      "negative_sentiment",
      "high_value",
      "urgent"
    ];
    if (validIntents.includes(intent)) {
      return intent;
    }
    return "general_chat";
  }
  /**
   * 基於規則的回退識別
   */
  fallbackRecognition(message) {
    const lowerMessage = message.toLowerCase();
    let intent = "general_chat";
    let confidence = 0.5;
    let sentiment = "neutral";
    let urgency = "medium";
    const keywords = [];
    const purchaseKeywords = ["\u8CFC\u8CB7", "\u4E0B\u55AE", "\u8CB7", "\u600E\u9EBC\u8CB7", "\u4ED8\u6B3E", "\u8A02\u8CFC", "buy", "purchase", "order"];
    if (purchaseKeywords.some((k) => lowerMessage.includes(k))) {
      intent = "purchase_intent";
      confidence = 0.85;
      urgency = "high";
      keywords.push(...purchaseKeywords.filter((k) => lowerMessage.includes(k)));
    }
    const priceKeywords = ["\u50F9\u683C", "\u591A\u5C11\u9322", "\u8CBB\u7528", "\u50F9\u9322", "\u512A\u60E0", "\u6298\u6263", "price", "cost", "discount"];
    if (priceKeywords.some((k) => lowerMessage.includes(k))) {
      intent = "price_inquiry";
      confidence = 0.8;
      keywords.push(...priceKeywords.filter((k) => lowerMessage.includes(k)));
    }
    const questionKeywords = ["\u600E\u9EBC", "\u5982\u4F55", "\u4EC0\u9EBC", "\u80FD\u4E0D\u80FD", "\u53EF\u4EE5", "\u529F\u80FD", "how", "what", "can"];
    if (questionKeywords.some((k) => lowerMessage.includes(k))) {
      if (intent === "general_chat") {
        intent = "product_question";
        confidence = 0.7;
      }
      keywords.push(...questionKeywords.filter((k) => lowerMessage.includes(k)));
    }
    const negativeKeywords = ["\u4E0D\u597D", "\u5DEE", "\u721B", "\u9A19", "\u5783\u573E", "\u9000\u6B3E", "bad", "terrible", "refund"];
    if (negativeKeywords.some((k) => lowerMessage.includes(k))) {
      sentiment = "negative";
      if (negativeKeywords.filter((k) => lowerMessage.includes(k)).length >= 2) {
        intent = "negative_sentiment";
        confidence = 0.8;
      }
    }
    const positiveKeywords = ["\u597D", "\u68D2", "\u8B9A", "\u8B1D\u8B1D", "\u611F\u8B1D", "great", "thanks", "good"];
    if (positiveKeywords.some((k) => lowerMessage.includes(k))) {
      sentiment = "positive";
    }
    const urgentKeywords = ["\u6025", "\u99AC\u4E0A", "\u7ACB\u523B", "\u73FE\u5728", "urgent", "immediately", "now", "asap"];
    if (urgentKeywords.some((k) => lowerMessage.includes(k))) {
      urgency = "high";
      if (intent === "general_chat") {
        intent = "urgent";
        confidence = 0.75;
      }
    }
    return {
      intent,
      confidence,
      subIntents: [],
      keywords,
      sentiment,
      urgency,
      suggestedAction: this.getSuggestedAction(intent)
    };
  }
  /**
   * 獲取建議動作
   */
  getSuggestedAction(intent) {
    const actions = {
      purchase_intent: "\u63D0\u4F9B\u8CFC\u8CB7\u93C8\u63A5\u6216\u806F\u7E6B\u65B9\u5F0F\uFF0C\u6E96\u5099\u4FC3\u6210\u4EA4\u6613",
      price_inquiry: "\u63D0\u4F9B\u50F9\u683C\u4FE1\u606F\u548C\u512A\u60E0\u65B9\u6848",
      product_question: "\u8A73\u7D30\u89E3\u7B54\u7522\u54C1\u76F8\u95DC\u554F\u984C",
      complaint: "\u8868\u9054\u6B49\u610F\uFF0C\u4E86\u89E3\u5177\u9AD4\u554F\u984C\uFF0C\u63D0\u4F9B\u89E3\u6C7A\u65B9\u6848",
      general_chat: "\u53CB\u597D\u56DE\u61C9\uFF0C\u5617\u8A66\u5F15\u5C0E\u5230\u7522\u54C1\u8A71\u984C",
      negative_sentiment: "\u8F49\u4EBA\u5DE5\u8655\u7406\uFF0C\u907F\u514D\u81EA\u52D5\u56DE\u8986",
      high_value: "\u91CD\u9EDE\u8DDF\u9032\uFF0C\u63D0\u4F9BVIP\u670D\u52D9",
      urgent: "\u512A\u5148\u8655\u7406\uFF0C\u5FEB\u901F\u56DE\u61C9"
    };
    return actions[intent] || "\u7E7C\u7E8C\u5C0D\u8A71";
  }
  /**
   * 緩存鍵生成
   */
  getCacheKey(message, userId) {
    return `${userId || "anonymous"}_${message.substring(0, 100)}`;
  }
  // ========== 對話上下文管理 ==========
  /**
   * 獲取對話上下文
   */
  getContext(userId) {
    return this.conversations().get(userId);
  }
  /**
   * 創建新對話
   */
  createContext(userId) {
    const context = {
      id: `conv_${Date.now()}`,
      userId,
      messages: [],
      currentStage: "initial",
      intentHistory: [],
      totalScore: 0,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.conversations.update((map) => {
      const newMap = new Map(map);
      newMap.set(userId, context);
      return newMap;
    });
    return context;
  }
  /**
   * 更新對話上下文
   */
  updateContext(userId, message, role, intent) {
    let context = this.conversations().get(userId);
    if (!context) {
      context = this.createContext(userId);
    }
    const newMessage = {
      role,
      content: message,
      timestamp: /* @__PURE__ */ new Date(),
      intent
    };
    if (intent && role === "user") {
      context.intentHistory.push(intent.intent);
      context.totalScore += this.getIntentScore(intent);
      context.currentStage = this.determineStage(context);
    }
    context.messages.push(newMessage);
    context.updatedAt = /* @__PURE__ */ new Date();
    this.conversations.update((map) => {
      const newMap = new Map(map);
      newMap.set(userId, __spreadValues({}, context));
      return newMap;
    });
  }
  /**
   * 獲取意圖評分
   */
  getIntentScore(intent) {
    const scores = {
      purchase_intent: 30,
      price_inquiry: 20,
      product_question: 10,
      high_value: 25,
      urgent: 15,
      general_chat: 5,
      complaint: -10,
      negative_sentiment: -20
    };
    const baseScore = scores[intent.intent] || 0;
    return Math.round(baseScore * intent.confidence);
  }
  /**
   * 確定對話階段
   */
  determineStage(context) {
    const { totalScore, intentHistory } = context;
    if (intentHistory.includes("purchase_intent")) {
      return "closing";
    }
    if (intentHistory.includes("price_inquiry")) {
      return "negotiating";
    }
    if (totalScore >= 30 || intentHistory.includes("high_value")) {
      return "interested";
    }
    if (context.messages.length > 2) {
      return "exploring";
    }
    return "initial";
  }
  /**
   * 清除對話上下文
   */
  clearContext(userId) {
    this.conversations.update((map) => {
      const newMap = new Map(map);
      newMap.delete(userId);
      return newMap;
    });
  }
  /**
   * 獲取用戶意向評分
   */
  getIntentScore4User(userId) {
    const context = this.conversations().get(userId);
    return context?.totalScore || 0;
  }
  /**
   * 檢查是否應該轉人工
   */
  shouldHandoffToHuman(userId) {
    const context = this.conversations().get(userId);
    if (!context)
      return false;
    if (context.currentStage === "closing")
      return true;
    if (context.intentHistory.includes("negative_sentiment"))
      return true;
    if (context.intentHistory.includes("complaint"))
      return true;
    if (context.totalScore >= 50)
      return true;
    return false;
  }
  static {
    this.\u0275fac = function IntentRecognitionService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _IntentRecognitionService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _IntentRecognitionService, factory: _IntentRecognitionService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(IntentRecognitionService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/ai-center/conversation-engine.service.ts
var buildSystemPrompt = (config) => {
  let prompt = "";
  if (config.rolePrompt) {
    prompt += config.rolePrompt + "\n\n";
  } else {
    prompt += `\u4F60\u662F\u4E00\u4F4D\u5C08\u696D\u7684\u92B7\u552E\u9867\u554F\uFF0C\u540D\u53EB${config.roleName || "\u5C0F\u52A9\u624B"}\u3002`;
  }
  const styleInstructions = {
    professional: "\u4FDD\u6301\u5C08\u696D\u3001\u6B63\u5F0F\u7684\u8A9E\u8ABF\uFF0C\u4F7F\u7528\u884C\u696D\u8853\u8A9E\uFF0C\u6CE8\u91CD\u908F\u8F2F\u548C\u6578\u64DA\u3002",
    friendly: "\u4FDD\u6301\u53CB\u597D\u3001\u89AA\u5207\u7684\u8A9E\u8ABF\uFF0C\u50CF\u670B\u53CB\u4E00\u6A23\u4EA4\u6D41\uFF0C\u8B93\u5BA2\u6236\u611F\u5230\u8212\u9069\u3002",
    casual: "\u4F7F\u7528\u8F15\u9B06\u3001\u96A8\u610F\u7684\u8A9E\u8ABF\uFF0C\u53EF\u4EE5\u958B\u9069\u7576\u7684\u73A9\u7B11\uFF0C\u71DF\u9020\u8F15\u9B06\u6C1B\u570D\u3002",
    enthusiastic: "\u4FDD\u6301\u71B1\u60C5\u3001\u7A4D\u6975\u7684\u8A9E\u8ABF\uFF0C\u8868\u73FE\u51FA\u5C0D\u7522\u54C1\u548C\u5BA2\u6236\u7684\u71B1\u611B\u3002",
    direct: "\u76F4\u63A5\u3001\u7C21\u6F54\u5730\u56DE\u7B54\u554F\u984C\uFF0C\u4E0D\u7E5E\u5F4E\u5B50\uFF0C\u9AD8\u6548\u6E9D\u901A\u3002"
  };
  prompt += styleInstructions[config.style] + "\n\n";
  const lengthInstructions = {
    short: "\u56DE\u8986\u8981\u7C21\u77ED\u7CBE\u7149\uFF0C\u901A\u5E381-2\u53E5\u8A71\u3002",
    medium: "\u56DE\u8986\u9069\u4E2D\uFF0C\u901A\u5E383-5\u53E5\u8A71\uFF0C\u5305\u542B\u5FC5\u8981\u7684\u4FE1\u606F\u3002",
    long: "\u53EF\u4EE5\u8A73\u7D30\u56DE\u8986\uFF0C\u5305\u542B\u5145\u5206\u7684\u89E3\u91CB\u548C\u4F8B\u5B50\u3002"
  };
  prompt += lengthInstructions[config.responseLength] + "\n\n";
  if (config.emojiFrequency !== "none") {
    const emojiInstructions = {
      low: "\u53EF\u4EE5\u5076\u723E\u4F7F\u7528\u8868\u60C5\u7B26\u865F\uFF0C\u4F46\u8981\u7BC0\u5236\u3002",
      medium: "\u9069\u7576\u4F7F\u7528\u8868\u60C5\u7B26\u865F\u4F86\u589E\u52A0\u89AA\u548C\u529B\u3002",
      high: "\u5927\u91CF\u4F7F\u7528\u8868\u60C5\u7B26\u865F\uFF0C\u8B93\u5C0D\u8A71\u66F4\u6D3B\u6F51\u3002"
    };
    prompt += emojiInstructions[config.emojiFrequency] + "\n\n";
  } else {
    prompt += "\u4E0D\u8981\u4F7F\u7528\u4EFB\u4F55\u8868\u60C5\u7B26\u865F\u3002\n\n";
  }
  if (config.businessContext) {
    prompt += `\u696D\u52D9\u80CC\u666F\uFF1A
${config.businessContext}

`;
  }
  prompt += `\u91CD\u8981\u898F\u5247\uFF1A
1. \u6C38\u9060\u4E0D\u8981\u8AAA\u81EA\u5DF1\u662F AI \u6216\u6A5F\u5668\u4EBA
2. \u4E0D\u8981\u4F7F\u7528 markdown \u683C\u5F0F
3. \u76F4\u63A5\u56DE\u8986\uFF0C\u4E0D\u8981\u52A0\u4EFB\u4F55\u524D\u7DB4\u5982"\u56DE\u8986\uFF1A"
4. \u5982\u679C\u4E0D\u78BA\u5B9A\uFF0C\u53EF\u4EE5\u8AAA"\u8B93\u6211\u78BA\u8A8D\u4E00\u4E0B"\u800C\u4E0D\u662F\u7DE8\u9020\u4FE1\u606F
5. \u4FDD\u6301\u5C0D\u8A71\u81EA\u7136\u6D41\u66A2`;
  return prompt;
};
var ConversationEngineService = class _ConversationEngineService {
  constructor() {
    this.aiProvider = inject(AIProviderService);
    this.intentService = inject(IntentRecognitionService);
    this.aiCenter = inject(AICenterService);
    this.stats = signal({
      totalConversations: 0,
      totalReplies: 0,
      avgResponseTime: 0,
      handoffCount: 0,
      conversionCount: 0
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.conversationStats = this.stats.asReadonly();
  }
  /**
   * 生成智能回覆
   */
  async generateReply(userMessage, config) {
    const startTime = Date.now();
    const intent = await this.intentService.recognizeIntent(userMessage, config.userId, true);
    const triggeredRules = await this.checkSmartRules(intent, config.userId);
    const handoffCheck = this.checkHandoff(intent, triggeredRules, config.userId);
    const strategy = this.aiCenter.strategy();
    let knowledgeContext = "";
    let knowledgeUsed = false;
    if (config.useKnowledgeBase !== false) {
      const kb = this.aiCenter.activeKnowledgeBase();
      if (kb) {
        knowledgeContext = this.buildKnowledgeContext(kb, userMessage, intent);
        knowledgeUsed = knowledgeContext.length > 0;
      }
    }
    const systemPrompt = buildSystemPrompt({
      style: config.styleOverride || strategy.style,
      roleName: config.roleName,
      rolePrompt: config.rolePrompt,
      businessContext: knowledgeContext,
      emojiFrequency: strategy.emojiFrequency,
      responseLength: strategy.responseLength
    });
    const messages = [
      { role: "system", content: systemPrompt }
    ];
    const context = this.intentService.getContext(config.userId);
    if (context && context.messages.length > 0) {
      const recentMessages = context.messages.slice(-6);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        });
      }
    }
    messages.push({ role: "user", content: userMessage });
    let replyContent = "";
    let tokensUsed = 0;
    let modelUsed = "";
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: config.temperature ?? strategy.style === "casual" ? 0.8 : 0.7,
        maxTokens: config.maxTokens ?? (strategy.responseLength === "long" ? 500 : 200)
      });
      replyContent = response.content;
      tokensUsed = response.usage.totalTokens;
      modelUsed = response.model;
    } catch (error) {
      console.error("Failed to generate reply:", error);
      replyContent = this.getFallbackReply(intent);
    }
    replyContent = this.postProcessReply(replyContent, intent, config);
    this.intentService.updateContext(config.userId, replyContent, "assistant");
    const delay = this.calculateDelay(replyContent, intent);
    const processingTime = Date.now() - startTime;
    this.updateStats(processingTime, handoffCheck.shouldHandoff);
    return {
      content: replyContent,
      intent,
      shouldHandoff: handoffCheck.shouldHandoff,
      handoffReason: handoffCheck.reason,
      triggeredRules,
      suggestedFollowUp: this.getSuggestedFollowUp(intent),
      delay,
      metadata: {
        modelUsed,
        tokensUsed,
        processingTime,
        knowledgeUsed
      }
    };
  }
  /**
   * 多角色對話生成
   */
  async generateMultiRoleReply(userMessage, roleConfig, config) {
    return this.generateReply(userMessage, __spreadProps(__spreadValues({}, config), {
      roleName: roleConfig.roleName,
      rolePrompt: roleConfig.rolePrompt
    }));
  }
  /**
   * 檢查智能規則
   */
  async checkSmartRules(intent, userId) {
    const rules = this.aiCenter.activeRules();
    const triggered = [];
    const context = this.intentService.getContext(userId);
    const conversationRounds = context?.messages.filter((m) => m.role === "user").length || 0;
    for (const rule of rules) {
      if (rule.triggerIntent !== intent.intent)
        continue;
      if (rule.triggerConditions.intentScore && intent.confidence < rule.triggerConditions.intentScore)
        continue;
      if (rule.triggerConditions.conversationRounds && conversationRounds < rule.triggerConditions.conversationRounds)
        continue;
      if (rule.triggerConditions.keywordMatch) {
        const hasKeyword = rule.triggerConditions.keywordMatch.some((kw) => intent.keywords.includes(kw));
        if (!hasKeyword)
          continue;
      }
      triggered.push(rule);
    }
    return triggered.sort((a, b) => b.priority - a.priority);
  }
  /**
   * 檢查是否需要轉人工
   */
  checkHandoff(intent, triggeredRules, userId) {
    const handoffRule = triggeredRules.find((r) => r.actions.notifyHuman);
    if (handoffRule) {
      return {
        shouldHandoff: true,
        reason: `\u898F\u5247\u89F8\u767C\uFF1A${handoffRule.name}`
      };
    }
    if (intent.intent === "purchase_intent" && intent.confidence > 0.8) {
      return {
        shouldHandoff: true,
        reason: "\u9AD8\u8CFC\u8CB7\u610F\u5411\uFF0C\u5EFA\u8B70\u4EBA\u5DE5\u8DDF\u9032"
      };
    }
    if (intent.intent === "negative_sentiment" || intent.sentiment === "negative") {
      return {
        shouldHandoff: true,
        reason: "\u8CA0\u9762\u60C5\u7DD2\uFF0C\u9700\u8981\u4EBA\u5DE5\u8655\u7406"
      };
    }
    if (this.intentService.shouldHandoffToHuman(userId)) {
      return {
        shouldHandoff: true,
        reason: "\u5C0D\u8A71\u5206\u6790\u5EFA\u8B70\u8F49\u4EBA\u5DE5"
      };
    }
    return { shouldHandoff: false };
  }
  /**
   * 構建知識庫上下文
   */
  buildKnowledgeContext(kb, message, intent) {
    if (!kb || !kb.items || kb.items.length === 0)
      return "";
    const relevantItems = kb.items.filter((item) => {
      if (!item.isActive)
        return false;
      if (intent.intent === "price_inquiry" && item.category === "sales")
        return true;
      if (intent.intent === "product_question" && item.category === "product")
        return true;
      if (intent.intent === "complaint" && item.category === "objection")
        return true;
      if (item.keywords && item.keywords.length > 0) {
        return item.keywords.some((kw) => message.toLowerCase().includes(kw.toLowerCase()));
      }
      return false;
    }).slice(0, 3);
    if (relevantItems.length === 0)
      return "";
    return "\u76F8\u95DC\u7522\u54C1\u77E5\u8B58\uFF1A\n" + relevantItems.map((item) => `- ${item.title}\uFF1A${item.content}`).join("\n");
  }
  /**
   * 後處理回覆
   */
  postProcessReply(content, intent, config) {
    let processed = content.trim();
    processed = processed.replace(/^(回覆[：:]\s*|Reply[：:]\s*)/i, "");
    processed = processed.replace(/\*\*/g, "");
    processed = processed.replace(/\*/g, "");
    processed = processed.replace(/`/g, "");
    processed = processed.replace(/#{1,6}\s/g, "");
    if (config.userName) {
      if (Math.random() < 0.3 && !processed.includes(config.userName)) {
        processed = `${config.userName}\uFF0C${processed}`;
      }
    }
    return processed;
  }
  /**
   * 獲取回退回覆
   */
  getFallbackReply(intent) {
    const fallbacks = {
      purchase_intent: [
        "\u611F\u8B1D\u60A8\u7684\u8208\u8DA3\uFF01\u8ACB\u554F\u60A8\u60F3\u4E86\u89E3\u54EA\u500B\u65B9\u6848\u5462\uFF1F",
        "\u592A\u597D\u4E86\uFF01\u6211\u53EF\u4EE5\u70BA\u60A8\u8A73\u7D30\u4ECB\u7D39\u8CFC\u8CB7\u6D41\u7A0B\u3002"
      ],
      price_inquiry: [
        "\u95DC\u65BC\u50F9\u683C\uFF0C\u6211\u5011\u6709\u591A\u7A2E\u65B9\u6848\u53EF\u4EE5\u9078\u64C7\uFF0C\u65B9\u4FBF\u544A\u8A34\u6211\u60A8\u7684\u9700\u6C42\u55CE\uFF1F",
        "\u50F9\u683C\u65B9\u9762\uFF0C\u6211\u53EF\u4EE5\u6839\u64DA\u60A8\u7684\u9700\u6C42\u7D66\u51FA\u6700\u9069\u5408\u7684\u65B9\u6848\u3002"
      ],
      product_question: [
        "\u9019\u662F\u500B\u597D\u554F\u984C\uFF01\u8B93\u6211\u70BA\u60A8\u8A73\u7D30\u8AAA\u660E\u3002",
        "\u611F\u8B1D\u60A8\u7684\u8A62\u554F\uFF0C\u6211\u4F86\u70BA\u60A8\u89E3\u7B54\u3002"
      ],
      complaint: [
        "\u975E\u5E38\u62B1\u6B49\u7D66\u60A8\u5E36\u4F86\u4E0D\u4FBF\uFF0C\u8B93\u6211\u4E86\u89E3\u4E00\u4E0B\u5177\u9AD4\u60C5\u6CC1\u3002",
        "\u6211\u7406\u89E3\u60A8\u7684\u5FC3\u60C5\uFF0C\u8ACB\u544A\u8A34\u6211\u5177\u9AD4\u554F\u984C\uFF0C\u6211\u6703\u76E1\u529B\u5E6B\u60A8\u89E3\u6C7A\u3002"
      ],
      general_chat: [
        "\u611F\u8B1D\u60A8\u7684\u8A0A\u606F\uFF01\u6709\u4EC0\u9EBC\u6211\u53EF\u4EE5\u5E6B\u60A8\u7684\u55CE\uFF1F",
        "\u60A8\u597D\uFF01\u8ACB\u554F\u6709\u4EC0\u9EBC\u554F\u984C\u60F3\u4E86\u89E3\u55CE\uFF1F"
      ],
      negative_sentiment: [
        "\u6211\u7406\u89E3\u60A8\u7684\u5FC3\u60C5\u3002\u8ACB\u554F\u5177\u9AD4\u662F\u4EC0\u9EBC\u554F\u984C\u5462\uFF1F",
        "\u611F\u8B1D\u60A8\u7684\u53CD\u994B\uFF0C\u6211\u5011\u6703\u8A8D\u771F\u5C0D\u5F85\u3002"
      ],
      high_value: [
        "\u611F\u8B1D\u60A8\u7684\u4FE1\u4EFB\uFF01\u6211\u6703\u70BA\u60A8\u63D0\u4F9B\u6700\u597D\u7684\u670D\u52D9\u3002",
        "\u975E\u5E38\u9AD8\u8208\u70BA\u60A8\u670D\u52D9\uFF01"
      ],
      urgent: [
        "\u6536\u5230\uFF0C\u6211\u99AC\u4E0A\u70BA\u60A8\u8655\u7406\uFF01",
        "\u597D\u7684\uFF0C\u6211\u7ACB\u523B\u5E6B\u60A8\u89E3\u6C7A\uFF01"
      ]
    };
    const options = fallbacks[intent.intent] || fallbacks.general_chat;
    return options[Math.floor(Math.random() * options.length)];
  }
  /**
   * 獲取建議的跟進話術
   */
  getSuggestedFollowUp(intent) {
    const followUps = {
      price_inquiry: "\u53EF\u4EE5\u554F\u5BA2\u6236\u7684\u5177\u9AD4\u9700\u6C42\u548C\u9810\u7B97",
      product_question: "\u53EF\u4EE5\u554F\u5BA2\u6236\u662F\u5426\u9084\u6709\u5176\u4ED6\u554F\u984C",
      purchase_intent: "\u53EF\u4EE5\u63D0\u4F9B\u4ED8\u6B3E\u65B9\u5F0F\u548C\u512A\u60E0\u4FE1\u606F"
    };
    return followUps[intent.intent];
  }
  /**
   * 計算回覆延遲
   */
  calculateDelay(content, intent) {
    let baseDelay = 30 + Math.random() * 30;
    const charCount = content.length;
    const typingTime = charCount * 0.1;
    if (intent.urgency === "high") {
      baseDelay = 10 + Math.random() * 10;
    }
    return Math.round(baseDelay + typingTime);
  }
  /**
   * 更新統計
   */
  updateStats(processingTime, isHandoff) {
    this.stats.update((s) => ({
      totalConversations: s.totalConversations,
      totalReplies: s.totalReplies + 1,
      avgResponseTime: (s.avgResponseTime * s.totalReplies + processingTime) / (s.totalReplies + 1),
      handoffCount: s.handoffCount + (isHandoff ? 1 : 0),
      conversionCount: s.conversionCount
    }));
  }
  /**
   * 開始新對話
   */
  startConversation(userId) {
    this.intentService.createContext(userId);
    this.stats.update((s) => __spreadProps(__spreadValues({}, s), {
      totalConversations: s.totalConversations + 1
    }));
  }
  /**
   * 結束對話
   */
  endConversation(userId, converted = false) {
    this.intentService.clearContext(userId);
    if (converted) {
      this.stats.update((s) => __spreadProps(__spreadValues({}, s), {
        conversionCount: s.conversionCount + 1
      }));
    }
  }
  /**
   * 獲取對話上下文
   */
  getConversation(userId) {
    return this.intentService.getContext(userId);
  }
  /**
   * 獲取用戶意向評分
   */
  getUserIntentScore(userId) {
    return this.intentService.getIntentScore4User(userId);
  }
  static {
    this.\u0275fac = function ConversationEngineService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ConversationEngineService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ConversationEngineService, factory: _ConversationEngineService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ConversationEngineService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/multi-role/multi-role.service.ts
var MultiRoleService = class _MultiRoleService {
  constructor() {
    this.aiCenter = inject(AICenterService);
    this.conversationEngine = inject(ConversationEngineService);
    this.ipc = inject(ElectronIpcService);
    this.config = signal(DEFAULT_MULTI_ROLE_CONFIG, ...ngDevMode ? [{ debugName: "config" }] : []);
    this.activeGroups = signal([], ...ngDevMode ? [{ debugName: "activeGroups" }] : []);
    this.roles = computed(() => this.config().roles, ...ngDevMode ? [{ debugName: "roles" }] : []);
    this.scripts = computed(() => this.config().scripts, ...ngDevMode ? [{ debugName: "scripts" }] : []);
    this.activeGroupCount = computed(() => this.activeGroups().filter((g) => g.status === "running").length, ...ngDevMode ? [{ debugName: "activeGroupCount" }] : []);
    this.availableRoles = computed(() => this.config().roles.filter((r) => r.isActive && r.boundAccountId), ...ngDevMode ? [{ debugName: "availableRoles" }] : []);
    this.roleTypeMeta = ROLE_TYPE_META;
  }
  // ========== 角色管理 ==========
  addRole(roleData) {
    const id = `role_${Date.now()}`;
    const roleType = roleData.type || "custom";
    const meta = ROLE_TYPE_META[roleType];
    const newRole = {
      id,
      name: roleData.name || meta.label,
      type: roleType,
      boundAccountId: roleData.boundAccountId,
      boundAccountPhone: roleData.boundAccountPhone,
      personality: {
        description: roleData.personality?.description || meta.description,
        speakingStyle: roleData.personality?.speakingStyle || meta.defaultStyle,
        traits: roleData.personality?.traits || [],
        background: roleData.personality?.background
      },
      aiConfig: __spreadValues({
        useGlobalAI: true,
        customPrompt: meta.defaultPrompt,
        responseLength: "medium",
        emojiFrequency: "low",
        typingSpeed: "medium"
      }, roleData.aiConfig),
      responsibilities: roleData.responsibilities || [],
      isActive: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      roles: [...c.roles, newRole]
    }));
    this.ipc.send("multi-role-add-role", newRole);
    return id;
  }
  updateRole(id, updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      roles: c.roles.map((r) => r.id === id ? __spreadProps(__spreadValues(__spreadValues({}, r), updates), { updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) : r)
    }));
    this.ipc.send("multi-role-update-role", __spreadValues({ id }, updates));
  }
  deleteRole(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      roles: c.roles.filter((r) => r.id !== id)
    }));
    this.ipc.send("multi-role-delete-role", { id });
  }
  bindAccountToRole(roleId, accountId, accountPhone) {
    this.updateRole(roleId, {
      boundAccountId: accountId,
      boundAccountPhone: accountPhone
    });
  }
  unbindAccountFromRole(roleId) {
    this.updateRole(roleId, {
      boundAccountId: void 0,
      boundAccountPhone: void 0
    });
  }
  // ========== 劇本管理 ==========
  addScript(scriptData) {
    const id = `script_${Date.now()}`;
    const newScript = {
      id,
      name: scriptData.name || "\u65B0\u5287\u672C",
      description: scriptData.description || "",
      scenario: scriptData.scenario || "custom",
      requiredRoles: scriptData.requiredRoles || ["expert", "satisfied_customer"],
      minRoleCount: scriptData.minRoleCount || 2,
      stages: scriptData.stages || [],
      stats: {
        useCount: 0,
        successCount: 0,
        avgDuration: 0,
        conversionRate: 0
      },
      isActive: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      scripts: [...c.scripts, newScript]
    }));
    this.ipc.send("multi-role-add-script", newScript);
    return id;
  }
  updateScript(id, updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      scripts: c.scripts.map((s) => s.id === id ? __spreadProps(__spreadValues(__spreadValues({}, s), updates), { updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) : s)
    }));
    this.ipc.send("multi-role-update-script", __spreadValues({ id }, updates));
  }
  deleteScript(id) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      scripts: c.scripts.filter((s) => s.id !== id)
    }));
    this.ipc.send("multi-role-delete-script", { id });
  }
  addStageToScript(scriptId, stage) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      scripts: c.scripts.map((s) => {
        if (s.id !== scriptId)
          return s;
        return __spreadProps(__spreadValues({}, s), {
          stages: [...s.stages, stage],
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      })
    }));
  }
  // ========== 協作群組管理 ==========
  /**
   * 創建協作群組（自動建群）
   */
  async createCollaborationGroup(params) {
    const script = this.config().scripts.find((s) => s.id === params.scriptId);
    if (!script)
      return null;
    const roles = this.config().roles.filter((r) => params.roleIds.includes(r.id));
    if (roles.length < script.minRoleCount)
      return null;
    const runningCount = this.activeGroups().filter((g) => g.status === "creating" || g.status === "inviting" || g.status === "running").length;
    if (runningCount >= this.config().autoGroupSettings.maxConcurrentGroups) {
      return null;
    }
    const settings = this.config().autoGroupSettings;
    const groupTitle = settings.nameTemplate.replace("{\u5BA2\u6236\u540D}", params.targetCustomer.firstName || params.targetCustomer.username || "VIP\u5BA2\u6236");
    const newGroup = {
      id: `collab_${Date.now()}`,
      groupTitle,
      targetCustomer: params.targetCustomer,
      participants: roles.map((r) => ({
        roleId: r.id,
        roleName: r.name,
        accountId: r.boundAccountId,
        accountPhone: r.boundAccountPhone
      })),
      scriptId: params.scriptId,
      scriptName: script.name,
      status: "creating",
      messagesSent: 0,
      customerMessages: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.activeGroups.update((groups) => [...groups, newGroup]);
    return newGroup;
  }
  updateGroupStatus(groupId, status) {
    this.activeGroups.update((groups) => groups.map((g) => g.id === groupId ? __spreadProps(__spreadValues({}, g), { status }) : g));
  }
  completeGroup(groupId, outcome) {
    this.activeGroups.update((groups) => groups.map((g) => g.id === groupId ? __spreadProps(__spreadValues({}, g), {
      status: "completed",
      outcome,
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
    }) : g));
  }
  // ========== 劇本執行 ==========
  /**
   * 開始執行劇本
   */
  async startScriptExecution(groupId) {
    const group = this.activeGroups().find((g) => g.id === groupId);
    if (!group || group.status !== "running")
      return false;
    const script = this.config().scripts.find((s) => s.id === group.scriptId);
    if (!script || script.stages.length === 0)
      return false;
    this.activeGroups.update((groups) => groups.map((g) => g.id === groupId ? __spreadProps(__spreadValues({}, g), {
      currentStageId: script.stages[0].id,
      currentStageOrder: 0
    }) : g));
    return true;
  }
  /**
   * 執行劇本階段
   */
  async executeStage(group, stage) {
    const roles = this.config().roles;
    for (const message of stage.messages) {
      const role = roles.find((r) => r.id === message.roleId);
      if (!role)
        continue;
      let delay = message.timing.delayAfterPrevious;
      if (message.timing.randomDelay) {
        const { min, max } = message.timing.randomDelay;
        delay += Math.floor(Math.random() * (max - min + 1)) + min;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * 1e3));
      let content;
      if (message.content.type === "text") {
        content = message.content.text || "";
        if (message.content.variables) {
          content = content.replace("{\u5BA2\u6236\u540D}", group.targetCustomer.firstName || group.targetCustomer.username || "VIP\u5BA2\u6236").replace("{\u7FA4\u540D}", group.groupTitle);
        }
      } else if (message.content.type === "ai_generate") {
        const replyResult = await this.conversationEngine.generateMultiRoleReply(message.content.aiPrompt || "\u8ACB\u6839\u64DA\u7576\u524D\u5C0D\u8A71\u4E0A\u4E0B\u6587\u751F\u6210\u5408\u9069\u7684\u56DE\u8986", {
          roleId: role.id,
          roleName: role.name,
          rolePrompt: role.aiConfig.customPrompt || "",
          personality: role.personality.description
        }, {
          userId: group.targetCustomer.id,
          userName: group.targetCustomer.firstName || group.targetCustomer.username,
          sourceGroup: group.telegramGroupId || group.id
        });
        content = replyResult.content;
      } else {
        content = message.content.text || "";
      }
      console.log(`[MultiRole] ${role.name}: ${content}`);
      this.activeGroups.update((groups) => groups.map((g) => g.id === group.id ? __spreadProps(__spreadValues({}, g), {
        messagesSent: g.messagesSent + 1
      }) : g));
    }
  }
  // ========== 設置管理 ==========
  updateAutoGroupSettings(updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      autoGroupSettings: __spreadValues(__spreadValues({}, c.autoGroupSettings), updates)
    }));
  }
  updateTriggerConditions(updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      defaultTriggerConditions: __spreadValues(__spreadValues({}, c.defaultTriggerConditions), updates)
    }));
  }
  updateAISettings(updates) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      aiSettings: __spreadValues(__spreadValues({}, c.aiSettings), updates)
    }));
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
    this.config.set(DEFAULT_MULTI_ROLE_CONFIG);
    this.activeGroups.set([]);
  }
  static {
    this.\u0275fac = function MultiRoleService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MultiRoleService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MultiRoleService, factory: _MultiRoleService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MultiRoleService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/multi-role/dynamic-script-engine.service.ts
var PRIVATE_CHAT_MAX_ROLES = 1;
var DynamicScriptEngineService = class _DynamicScriptEngineService {
  /**
   * 🔧 Phase 4: 強制更新執行狀態（觸發 UI 刷新）
   */
  forceUpdateExecution(execution) {
    this._currentExecution.set(__spreadValues({}, execution));
    this.persistExecution(execution);
  }
  /**
   * 🔧 Phase 4: 持久化執行狀態到數據庫
   */
  persistExecution(execution) {
    try {
      this.ipc.send("ai-execution:save", {
        id: execution.id,
        executionType: execution.chatScenario || "private",
        status: execution.status,
        mode: execution.mode,
        goal: execution.goal,
        targetUsers: JSON.stringify(execution.targetUsers || []),
        roleAccounts: JSON.stringify(execution.accountMatches || []),
        groupId: execution.groupConfig?.groupId,
        groupName: execution.groupConfig?.groupId ? `\u7FA4\u7D44 ${execution.groupConfig.groupId}` : void 0,
        messageHistory: JSON.stringify(execution.messageHistory || []),
        stats: JSON.stringify(execution.stats || {})
      });
    } catch (error) {
      console.warn("[DynamicEngine] \u6301\u4E45\u5316\u57F7\u884C\u72C0\u614B\u5931\u6557:", error);
    }
  }
  /**
   * 🔧 Phase 4: 從數據庫恢復執行狀態
   */
  async restoreExecutions() {
    try {
      console.log("[DynamicEngine] \u{1F504} \u5617\u8A66\u6062\u5FA9\u57F7\u884C\u72C0\u614B...");
      const result = await this.ipc.invoke("ai-execution:get-active");
      if (result && result.executions && result.executions.length > 0) {
        console.log(`[DynamicEngine] \u627E\u5230 ${result.executions.length} \u500B\u6D3B\u8E8D\u57F7\u884C`);
        for (const saved of result.executions) {
          const execution = {
            id: saved.id,
            status: saved.status === "running" ? "executing" : saved.status,
            goal: saved.goal || "",
            mode: saved.mode || "hybrid",
            chatScenario: saved.executionType || "private",
            targetUsers: JSON.parse(saved.targetUsers || "[]"),
            accountMatches: JSON.parse(saved.roleAccounts || "[]"),
            messageHistory: JSON.parse(saved.messageHistory || "[]"),
            stats: JSON.parse(saved.stats || "{}"),
            intent: {
              type: "sales_conversion",
              confidence: 80,
              goal: saved.goal || "",
              targetAudience: "\u6F5B\u5728\u5BA2\u6236",
              urgency: "medium",
              suggestedDuration: "1-2\u9031"
            },
            strategy: {
              id: "restored_strategy",
              name: "\u6062\u5FA9\u7B56\u7565",
              description: "\u5F9E\u6578\u64DA\u5EAB\u6062\u5FA9\u7684\u57F7\u884C\u7B56\u7565",
              phases: [],
              adjustmentRules: [],
              constraints: {
                maxDailyMessages: 20,
                maxConsecutiveFromSameRole: 3,
                minIntervalSeconds: 30,
                maxIntervalSeconds: 300,
                activeHours: { start: 8, end: 22 },
                toneGuidelines: ["\u53CB\u597D", "\u5C08\u696D"],
                forbiddenTopics: []
              }
            },
            roles: [],
            groupConfig: saved.groupId ? { groupId: saved.groupId, chatScenario: "group" } : void 0
          };
          this._currentExecution.set(execution);
          this._executions.update((list) => [execution, ...list.filter((e) => e.id !== execution.id)]);
          console.log(`[DynamicEngine] \u2705 \u5DF2\u6062\u5FA9\u57F7\u884C: ${execution.id}`);
        }
        this.toast.info(`\u{1F504} \u5DF2\u6062\u5FA9 ${result.executions.length} \u500B\u9032\u884C\u4E2D\u7684\u4EFB\u52D9`);
      } else {
        console.log("[DynamicEngine] \u6C92\u6709\u9700\u8981\u6062\u5FA9\u7684\u57F7\u884C");
      }
    } catch (error) {
      console.warn("[DynamicEngine] \u6062\u5FA9\u57F7\u884C\u72C0\u614B\u5931\u6557:", error);
    }
  }
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.multiRoleService = inject(MultiRoleService);
    this.accountService = inject(AccountManagementService);
    this._currentExecution = signal(null, ...ngDevMode ? [{ debugName: "_currentExecution" }] : []);
    this.currentExecution = computed(() => this._currentExecution(), ...ngDevMode ? [{ debugName: "currentExecution" }] : []);
    this._executions = signal([], ...ngDevMode ? [{ debugName: "_executions" }] : []);
    this.executions = computed(() => this._executions(), ...ngDevMode ? [{ debugName: "executions" }] : []);
    this._isProcessing = signal(false, ...ngDevMode ? [{ debugName: "_isProcessing" }] : []);
    this.isProcessing = computed(() => this._isProcessing(), ...ngDevMode ? [{ debugName: "isProcessing" }] : []);
    this._executionMode = signal("hybrid", ...ngDevMode ? [{ debugName: "_executionMode" }] : []);
    this.executionMode = computed(() => this._executionMode(), ...ngDevMode ? [{ debugName: "executionMode" }] : []);
    this._accountMatches = signal([], ...ngDevMode ? [{ debugName: "_accountMatches" }] : []);
    this.accountMatches = computed(() => this._accountMatches(), ...ngDevMode ? [{ debugName: "accountMatches" }] : []);
    this.queueProgress = computed(() => {
      const exec = this._currentExecution();
      if (!exec?.queue)
        return null;
      return {
        total: exec.queue.totalUsers,
        processed: exec.queue.processedUsers,
        current: exec.queue.currentUser,
        pending: exec.queue.pendingUsers.length,
        completed: exec.queue.completedUsers,
        progress: exec.queue.totalUsers > 0 ? Math.round(exec.queue.processedUsers / exec.queue.totalUsers * 100) : 0
      };
    }, ...ngDevMode ? [{ debugName: "queueProgress" }] : []);
    this.analysisInterval = 10;
    this.defaultScriptlessConfig = {
      enabled: false,
      maxTurns: 50,
      autoAdjustInterval: 10,
      targetConversionSignals: ["\u600E\u9EBC\u8CB7", "\u5728\u54EA\u8CB7", "\u591A\u5C11\u9322", "\u60F3\u8CB7", "\u4E0B\u55AE", "\u4ED8\u6B3E"],
      exitConditions: {
        maxSilenceMinutes: 60,
        negativeThreshold: 30,
        successSignals: ["\u8CB7\u4E86", "\u5DF2\u4ED8\u6B3E", "\u6210\u4EA4", "\u8B1D\u8B1D", "\u6536\u5230"]
      }
    };
    this.intentTemplates = {
      sales_conversion: {
        // 🔧 擴展關鍵詞：增加更多營銷相關詞彙
        keywords: [
          "\u6210\u4EA4",
          "\u8CFC\u8CB7",
          "\u4E0B\u55AE",
          "\u4ED8\u8CBB",
          "\u8F49\u5316",
          "\u8CB7",
          "\u8A02\u55AE",
          "\u4ED8\u6B3E",
          "\u71DF\u92B7",
          "\u92B7\u552E",
          "\u63A8\u5EE3",
          "\u652F\u4ED8",
          "\u4EE3\u6536",
          "\u4EE3\u4ED8",
          "\u7522\u54C1",
          "\u670D\u52D9",
          "\u5BA2\u6236",
          "\u7528\u6236",
          "\u8208\u8DA3",
          "\u5408\u4F5C",
          "\u696D\u52D9",
          "\u958B\u767C",
          "\u62D3\u5C55",
          "\u7C3D\u7D04"
        ],
        description: "\u4FC3\u9032\u6F5B\u5728\u5BA2\u6236\u5B8C\u6210\u8CFC\u8CB7",
        defaultRoles: [
          {
            id: "friendly_member",
            name: "\u71B1\u5FC3\u7FA4\u53CB",
            icon: "\u{1F604}",
            type: "atmosphere",
            purpose: "\u6D3B\u8E8D\u6C23\u6C1B\uFF0C\u81EA\u7136\u5F15\u5165\u8A71\u984C",
            personality: "\u71B1\u60C5\u958B\u6717\uFF0C\u611B\u5206\u4EAB\uFF0C\u597D\u5947\u5FC3\u5F37",
            speakingStyle: "\u53E3\u8A9E\u5316\uFF0C\u5E36\u8868\u60C5\u7B26\u865F\uFF0C\u50CF\u670B\u53CB\u804A\u5929",
            entryTiming: "\u958B\u5834\u548C\u6C23\u6C1B\u51B7\u5834\u6642",
            sampleMessages: [
              "\u5927\u5BB6\u65E9\u5B89\uFF01\u4ECA\u5929\u5929\u6C23\u771F\u597D\uFF5E",
              "\u54C8\u54C8\u9019\u500B\u6709\u610F\u601D\uFF0C\u6211\u4E5F\u9047\u5230\u904E",
              "\u5C0D\u4E86\uFF0C\u6700\u8FD1\u6709\u4EBA\u7528\u904EXX\u55CE\uFF1F\u60F3\u807D\u807D\u610F\u898B"
            ]
          },
          {
            id: "loyal_customer",
            name: "\u8001\u7528\u6236",
            icon: "\u2764\uFE0F",
            type: "endorsement",
            purpose: "\u5206\u4EAB\u771F\u5BE6\u4F7F\u7528\u9AD4\u9A57\uFF0C\u5EFA\u7ACB\u4FE1\u4EFB",
            personality: "\u771F\u8AA0\u53EF\u9760\uFF0C\u6A02\u65BC\u52A9\u4EBA",
            speakingStyle: "\u5E73\u5BE6\u81EA\u7136\uFF0C\u5206\u4EAB\u500B\u4EBA\u7D93\u6B77",
            entryTiming: "\u8A71\u984C\u8F49\u5230\u7522\u54C1\u76F8\u95DC\u6642",
            sampleMessages: [
              "\u6211\u7528\u4E86\u5927\u6982\u4E09\u500B\u6708\u5427\uFF0C\u611F\u89BA\u9084\u4E0D\u932F",
              "\u4E00\u958B\u59CB\u4E5F\u662F\u670B\u53CB\u63A8\u85A6\u7684\uFF0C\u6C92\u60F3\u5230\u771F\u7684\u597D\u7528",
              "\u8AAA\u5BE6\u8A71\u525B\u958B\u59CB\u4E5F\u6709\u9EDE\u7336\u8C6B\uFF0C\u5F8C\u4F86\u89BA\u5F97\u503C\u5F97"
            ]
          },
          {
            id: "sales_expert",
            name: "\u9867\u554F\u5C08\u5BB6",
            icon: "\u{1F4BC}",
            type: "professional",
            purpose: "\u5C08\u696D\u89E3\u7B54\uFF0C\u4FC3\u6210\u6210\u4EA4",
            personality: "\u5C08\u696D\u53EF\u9760\uFF0C\u8010\u5FC3\u7D30\u7DFB",
            speakingStyle: "\u5C08\u696D\u4F46\u4E0D\u751F\u786C\uFF0C\u6709\u89AA\u548C\u529B",
            entryTiming: "\u5BA2\u6236\u8868\u73FE\u51FA\u660E\u78BA\u8208\u8DA3\u6642",
            sampleMessages: [
              "\u9019\u500B\u554F\u984C\u554F\u5F97\u597D\uFF0C\u6211\u4F86\u8A73\u7D30\u8AAA\u660E\u4E00\u4E0B",
              "\u6839\u64DA\u60A8\u7684\u9700\u6C42\uFF0C\u6211\u5EFA\u8B70...",
              "\u73FE\u5728\u6B63\u597D\u6709\u6D3B\u52D5\uFF0C\u53EF\u4EE5\u4E86\u89E3\u4E00\u4E0B"
            ]
          }
        ],
        defaultPhases: [
          {
            id: "phase_1",
            name: "\u6C1B\u570D\u71DF\u9020",
            duration: "1-2\u5929",
            goal: "\u5EFA\u7ACB\u5B58\u5728\u611F\uFF0C\u6D3B\u8E8D\u7FA4\u6C23\u6C1B",
            tactics: ["\u65E5\u5E38\u554F\u5019", "\u5206\u4EAB\u8DA3\u4E8B", "\u53C3\u8207\u8A0E\u8AD6"],
            rolesFocus: ["friendly_member"],
            successIndicators: ["\u7FA4\u6D3B\u8E8D\u5EA6\u63D0\u5347", "\u6709\u4EBA\u56DE\u8986\u4E92\u52D5"]
          },
          {
            id: "phase_2",
            name: "\u8A71\u984C\u5F15\u5165",
            duration: "1-2\u5929",
            goal: "\u81EA\u7136\u5F15\u5165\u7522\u54C1\u76F8\u95DC\u8A71\u984C",
            tactics: ["\u5834\u666F\u5206\u4EAB", "\u75DB\u9EDE\u8A0E\u8AD6", "\u7D93\u9A57\u4EA4\u6D41"],
            rolesFocus: ["friendly_member", "loyal_customer"],
            successIndicators: ["\u76EE\u6A19\u5BA2\u6236\u53C3\u8207\u8A0E\u8AD6", "\u63D0\u53CA\u7522\u54C1\u76F8\u95DC\u9700\u6C42"]
          },
          {
            id: "phase_3",
            name: "\u50F9\u503C\u5C55\u793A",
            duration: "1-2\u5929",
            goal: "\u5C55\u793A\u7522\u54C1\u50F9\u503C\uFF0C\u5EFA\u7ACB\u4FE1\u4EFB",
            tactics: ["\u4F7F\u7528\u9AD4\u9A57\u5206\u4EAB", "\u6548\u679C\u898B\u8B49", "\u5C08\u696D\u89E3\u7B54"],
            rolesFocus: ["loyal_customer", "sales_expert"],
            successIndicators: ["\u5BA2\u6236\u8A62\u554F\u8A73\u60C5", "\u8208\u8DA3\u5EA6\u4E0A\u5347"]
          },
          {
            id: "phase_4",
            name: "\u4FC3\u6210\u6210\u4EA4",
            duration: "\u9748\u6D3B",
            goal: "\u628A\u63E1\u6642\u6A5F\uFF0C\u4FC3\u6210\u8CFC\u8CB7",
            tactics: ["\u512A\u60E0\u544A\u77E5", "\u9650\u6642\u523A\u6FC0", "\u7570\u8B70\u8655\u7406"],
            rolesFocus: ["sales_expert"],
            successIndicators: ["\u5BA2\u6236\u8A62\u50F9", "\u9054\u6210\u8CFC\u8CB7"]
          }
        ]
      },
      churn_recovery: {
        keywords: ["\u6D41\u5931", "\u633D\u56DE", "\u56DE\u4F86", "\u518D\u6B21", "\u91CD\u65B0", "\u8001\u5BA2\u6236", "\u7E8C\u8CBB"],
        description: "\u633D\u56DE\u6D41\u5931\u6216\u6C89\u9ED8\u7684\u8001\u5BA2\u6236",
        defaultRoles: [
          {
            id: "callback_agent",
            name: "\u56DE\u8A2A\u5C08\u54E1",
            icon: "\u{1F4DE}",
            type: "care",
            purpose: "\u771F\u8AA0\u95DC\u61F7\uFF0C\u4E86\u89E3\u96E2\u958B\u539F\u56E0",
            personality: "\u6EAB\u6696\u771F\u8AA0\uFF0C\u5584\u65BC\u50BE\u807D",
            speakingStyle: "\u89AA\u5207\u95DC\u61F7\uFF0C\u4E0D\u6025\u8E81",
            entryTiming: "\u958B\u5834",
            sampleMessages: [
              "\u597D\u4E45\u6C92\u806F\u7E6B\u4E86\uFF0C\u6700\u8FD1\u600E\u9EBC\u6A23\uFF1F",
              "\u60F3\u8D77\u60A8\u4E86\uFF0C\u7279\u610F\u4F86\u554F\u5019\u4E00\u4E0B",
              "\u4E4B\u524D\u7528\u8457\u9084\u9806\u5229\u55CE\uFF1F\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u5FD9\u7684\uFF1F"
            ]
          },
          {
            id: "customer_success",
            name: "\u5BA2\u6236\u6210\u529F",
            icon: "\u{1F3AF}",
            type: "solution",
            purpose: "\u89E3\u6C7A\u554F\u984C\uFF0C\u5C55\u793A\u6539\u9032",
            personality: "\u5C08\u696D\u8CA0\u8CAC\uFF0C\u7A4D\u6975\u4E3B\u52D5",
            speakingStyle: "\u554F\u984C\u5C0E\u5411\uFF0C\u63D0\u4F9B\u65B9\u6848",
            entryTiming: "\u5BA2\u6236\u8AAA\u51FA\u96E2\u958B\u539F\u56E0\u5F8C",
            sampleMessages: [
              "\u611F\u8B1D\u60A8\u7684\u53CD\u994B\uFF0C\u9019\u500B\u554F\u984C\u6211\u5011\u5DF2\u7D93\u512A\u5316\u4E86",
              "\u91DD\u5C0D\u9019\u500B\u60C5\u6CC1\uFF0C\u6211\u5011\u73FE\u5728\u6709\u65B0\u7684\u89E3\u6C7A\u65B9\u6848",
              "\u4F86\uFF0C\u6211\u5E6B\u60A8\u770B\u770B\u73FE\u5728\u600E\u9EBC\u8655\u7406\u6700\u597D"
            ]
          },
          {
            id: "vip_manager",
            name: "VIP\u7D93\u7406",
            icon: "\u{1F451}",
            type: "retention",
            purpose: "\u9AD8\u5C64\u51FA\u9762\uFF0C\u8AA0\u610F\u633D\u7559",
            personality: "\u6709\u6B0A\u5A01\u4F46\u89AA\u548C\uFF0C\u8AA0\u610F\u5341\u8DB3",
            speakingStyle: "\u6B63\u5F0F\u4F46\u4E0D\u751F\u786C\uFF0C\u5C55\u73FE\u8AA0\u610F",
            entryTiming: "\u9700\u8981\u7279\u5225\u512A\u60E0\u6216\u6C7A\u7B56\u6642",
            sampleMessages: [
              "\u6211\u662FVIP\u7D93\u7406\uFF0C\u7279\u610F\u4F86\u8DDF\u60A8\u804A\u804A",
              "\u60A8\u662F\u6211\u5011\u7684\u91CD\u8981\u5BA2\u6236\uFF0C\u9019\u500B\u512A\u60E0\u662F\u5C08\u9580\u70BA\u60A8\u7533\u8ACB\u7684",
              "\u6709\u4EC0\u9EBC\u9867\u616E\u90FD\u53EF\u4EE5\u8AAA\uFF0C\u6211\u5011\u4E00\u5B9A\u76E1\u529B\u89E3\u6C7A"
            ]
          }
        ],
        defaultPhases: [
          { id: "phase_1", name: "\u95DC\u61F7\u56DE\u8A2A", duration: "1\u5929", goal: "\u771F\u8AA0\u554F\u5019\uFF0C\u4E86\u89E3\u8FD1\u6CC1", tactics: ["\u554F\u5019", "\u95DC\u5FC3", "\u50BE\u807D"], rolesFocus: ["callback_agent"], successIndicators: ["\u5BA2\u6236\u56DE\u8986", "\u8AAA\u51FA\u96E2\u958B\u539F\u56E0"] },
          { id: "phase_2", name: "\u554F\u984C\u89E3\u6C7A", duration: "1-2\u5929", goal: "\u91DD\u5C0D\u554F\u984C\u63D0\u4F9B\u65B9\u6848", tactics: ["\u554F\u984C\u78BA\u8A8D", "\u65B9\u6848\u63D0\u4F9B", "\u6539\u9032\u8AAA\u660E"], rolesFocus: ["customer_success"], successIndicators: ["\u5BA2\u6236\u8A8D\u53EF\u6539\u9032", "\u9858\u610F\u518D\u8A66"] },
          { id: "phase_3", name: "\u8AA0\u610F\u633D\u7559", duration: "\u9748\u6D3B", goal: "\u63D0\u4F9B\u512A\u60E0\uFF0C\u4FC3\u6210\u56DE\u6B78", tactics: ["\u5C08\u5C6C\u512A\u60E0", "VIP\u5F85\u9047", "\u627F\u8AFE\u4FDD\u969C"], rolesFocus: ["vip_manager"], successIndicators: ["\u5BA2\u6236\u540C\u610F\u56DE\u6B78", "\u7E8C\u8CBB\u6210\u529F"] }
        ]
      },
      community_activation: {
        keywords: ["\u6D3B\u8E8D", "\u793E\u7FA4", "\u6C23\u6C1B", "\u4E92\u52D5", "\u8A0E\u8AD6", "\u51B7\u6E05", "\u5E36\u52D5"],
        description: "\u63D0\u5347\u793E\u7FA4\u6D3B\u8E8D\u5EA6\u548C\u7528\u6236\u7C98\u6027",
        defaultRoles: [
          {
            id: "community_host",
            name: "\u793E\u7FA4\u7BA1\u5BB6",
            icon: "\u{1F3E0}",
            type: "host",
            purpose: "\u767C\u8D77\u8A71\u984C\uFF0C\u7DAD\u8B77\u79E9\u5E8F",
            personality: "\u71B1\u60C5\u8CA0\u8CAC\uFF0C\u6709\u7D44\u7E54\u80FD\u529B",
            speakingStyle: "\u89AA\u5207\u6709\u5E8F\uFF0C\u5F15\u5C0E\u8A0E\u8AD6",
            entryTiming: "\u958B\u5834\u548C\u8A71\u984C\u8F49\u63DB\u6642",
            sampleMessages: [
              "\u65E9\u5B89\u5404\u4F4D\uFF01\u65B0\u7684\u4E00\u5929\u958B\u59CB\u4E86\uFF5E",
              "\u4ECA\u5929\u4F86\u804A\u804AXXX\uFF0C\u5927\u5BB6\u600E\u9EBC\u770B\uFF1F",
              "\u611F\u8B1D\u5206\u4EAB\uFF01\u9084\u6709\u5176\u4ED6\u60F3\u6CD5\u55CE\uFF1F"
            ]
          },
          {
            id: "active_member_1",
            name: "\u6D3B\u8E8D\u7FA4\u53CBA",
            icon: "\u{1F917}",
            type: "participant",
            purpose: "\u7A4D\u6975\u4E92\u52D5\uFF0C\u5E36\u52D5\u6C23\u6C1B",
            personality: "\u5916\u5411\u6D3B\u6F51\uFF0C\u611B\u5206\u4EAB",
            speakingStyle: "\u8F15\u9B06\u96A8\u610F\uFF0C\u591A\u7528\u8868\u60C5",
            entryTiming: "\u8A71\u984C\u767C\u8D77\u5F8C\u7A4D\u6975\u97FF\u61C9",
            sampleMessages: [
              "\u9019\u500B\u8A71\u984C\u6211\u6709\u8A71\u8AAA\uFF01",
              "\u54C8\u54C8\u78BA\u5BE6\u662F\u9019\u6A23",
              "\u6211\u4E5F\u6709\u985E\u4F3C\u7684\u7D93\u6B77\uFF5E"
            ]
          },
          {
            id: "active_member_2",
            name: "\u6D3B\u8E8D\u7FA4\u53CBB",
            icon: "\u{1F60E}",
            type: "participant",
            purpose: "\u88DC\u5145\u89C0\u9EDE\uFF0C\u5EF6\u7E8C\u8A0E\u8AD6",
            personality: "\u5E7D\u9ED8\u98A8\u8DA3\uFF0C\u898B\u89E3\u7368\u5230",
            speakingStyle: "\u6709\u8DA3\u6709\u6599\uFF0C\u5076\u723E\u6296\u6A5F\u9748",
            entryTiming: "\u8A0E\u8AD6\u9032\u884C\u4E2D\u88DC\u5145",
            sampleMessages: [
              "\u6A13\u4E0A\u8AAA\u5F97\u5C0D\uFF0C\u6211\u88DC\u5145\u4E00\u9EDE",
              "\u63DB\u500B\u89D2\u5EA6\u60F3\u60F3...",
              "\u9019\u8B93\u6211\u60F3\u8D77\u4E00\u500B\u6709\u610F\u601D\u7684\u4E8B"
            ]
          },
          {
            id: "opinion_leader",
            name: "\u610F\u898B\u9818\u8896",
            icon: "\u{1F3A4}",
            type: "expert",
            purpose: "\u8F38\u51FA\u50F9\u503C\uFF0C\u7E3D\u7D50\u89C0\u9EDE",
            personality: "\u5C08\u696D\u6B0A\u5A01\uFF0C\u6709\u6DF1\u5EA6",
            speakingStyle: "\u6709\u898B\u5730\uFF0C\u80FD\u7E3D\u7D50\u63D0\u5347",
            entryTiming: "\u8A0E\u8AD6\u9700\u8981\u7E3D\u7D50\u6216\u5347\u83EF\u6642",
            sampleMessages: [
              "\u770B\u4E86\u5927\u5BB6\u7684\u8A0E\u8AD6\uFF0C\u6211\u4F86\u7E3D\u7D50\u4E00\u4E0B",
              "\u9019\u500B\u554F\u984C\u7684\u95DC\u9375\u5728\u65BC...",
              "\u5206\u4EAB\u4E00\u500B\u6211\u7684\u601D\u8003\u6846\u67B6"
            ]
          }
        ],
        defaultPhases: [
          { id: "phase_1", name: "\u8A71\u984C\u767C\u8D77", duration: "\u6301\u7E8C", goal: "\u767C\u8D77\u6709\u50F9\u503C\u7684\u8A0E\u8AD6\u8A71\u984C", tactics: ["\u71B1\u9EDE\u8A71\u984C", "\u7D93\u9A57\u5206\u4EAB", "\u554F\u984C\u8A0E\u8AD6"], rolesFocus: ["community_host"], successIndicators: ["\u6709\u4EBA\u53C3\u8207\u8A0E\u8AD6"] },
          { id: "phase_2", name: "\u4E92\u52D5\u97FF\u61C9", duration: "\u6301\u7E8C", goal: "\u5E36\u52D5\u8A0E\u8AD6\u6C1B\u570D", tactics: ["\u7A4D\u6975\u56DE\u8986", "\u88DC\u5145\u89C0\u9EDE", "\u8868\u9054\u8A8D\u540C"], rolesFocus: ["active_member_1", "active_member_2"], successIndicators: ["\u591A\u4EBA\u53C3\u8207", "\u8A0E\u8AD6\u6DF1\u5165"] },
          { id: "phase_3", name: "\u50F9\u503C\u8F38\u51FA", duration: "\u9069\u6642", goal: "\u7E3D\u7D50\u8A0E\u8AD6\u50F9\u503C", tactics: ["\u89C0\u9EDE\u7E3D\u7D50", "\u7D93\u9A57\u63D0\u7149", "\u77E5\u8B58\u5206\u4EAB"], rolesFocus: ["opinion_leader"], successIndicators: ["\u7372\u5F97\u8A8D\u53EF", "\u88AB\u6536\u85CF\u8F49\u767C"] }
        ]
      },
      customer_support: {
        keywords: ["\u552E\u5F8C", "\u554F\u984C", "\u6295\u8A34", "\u6545\u969C", "\u4E0D\u6EFF", "\u89E3\u6C7A", "\u8655\u7406", "\u9000"],
        description: "\u9AD8\u6548\u8655\u7406\u5BA2\u6236\u552E\u5F8C\u554F\u984C",
        defaultRoles: [
          {
            id: "cs_agent",
            name: "\u5BA2\u670D\u5C08\u54E1",
            icon: "\u{1F3A7}",
            type: "frontline",
            purpose: "\u5FEB\u901F\u97FF\u61C9\uFF0C\u8A18\u9304\u554F\u984C",
            personality: "\u8010\u5FC3\u7D30\u7DFB\uFF0C\u614B\u5EA6\u597D",
            speakingStyle: "\u79AE\u8C8C\u5C08\u696D\uFF0C\u8868\u9054\u6B49\u610F",
            entryTiming: "\u554F\u984C\u51FA\u73FE\u6642\u7ACB\u5373\u97FF\u61C9",
            sampleMessages: [
              "\u60A8\u597D\uFF0C\u975E\u5E38\u62B1\u6B49\u7D66\u60A8\u5E36\u4F86\u4E0D\u4FBF\uFF01",
              "\u8ACB\u554F\u5177\u9AD4\u662F\u4EC0\u9EBC\u554F\u984C\u5462\uFF1F\u6211\u4F86\u5E6B\u60A8\u8655\u7406",
              "\u6211\u5DF2\u7D93\u8A18\u9304\u4E0B\u4F86\u4E86\uFF0C\u99AC\u4E0A\u70BA\u60A8\u8DDF\u9032"
            ]
          },
          {
            id: "tech_support",
            name: "\u6280\u8853\u652F\u6301",
            icon: "\u{1F527}",
            type: "technical",
            purpose: "\u6280\u8853\u6392\u67E5\uFF0C\u89E3\u6C7A\u554F\u984C",
            personality: "\u5C08\u696D\u56B4\u8B39\uFF0C\u908F\u8F2F\u6E05\u6670",
            speakingStyle: "\u6280\u8853\u5C08\u696D\u4F46\u6613\u61C2",
            entryTiming: "\u9700\u8981\u6280\u8853\u89E3\u7B54\u6642",
            sampleMessages: [
              "\u6839\u64DA\u60A8\u63CF\u8FF0\u7684\u60C5\u6CC1\uFF0C\u8ACB\u60A8\u5617\u8A66\u4EE5\u4E0B\u6B65\u9A5F",
              "\u9019\u500B\u554F\u984C\u6211\u4F86\u770B\u4E00\u4E0B\uFF0C\u7A0D\u7B49",
              "\u627E\u5230\u539F\u56E0\u4E86\uFF0C\u662F\u56E0\u70BAXXX\uFF0C\u89E3\u6C7A\u65B9\u6848\u662F..."
            ]
          },
          {
            id: "satisfaction_manager",
            name: "\u6EFF\u610F\u5EA6\u7D93\u7406",
            icon: "\u{1F60A}",
            type: "recovery",
            purpose: "\u78BA\u8A8D\u6EFF\u610F\uFF0C\u88DC\u511F\u633D\u56DE",
            personality: "\u6EAB\u6696\u771F\u8AA0\uFF0C\u6709\u8AA0\u610F",
            speakingStyle: "\u771F\u8AA0\u9053\u6B49\uFF0C\u7A4D\u6975\u88DC\u511F",
            entryTiming: "\u554F\u984C\u89E3\u6C7A\u5F8C",
            sampleMessages: [
              "\u554F\u984C\u89E3\u6C7A\u4E86\u55CE\uFF1F\u7D66\u60A8\u9020\u6210\u4E0D\u4FBF\u771F\u7684\u5F88\u62B1\u6B49",
              "\u70BA\u8868\u6B49\u610F\uFF0C\u6211\u5011\u70BA\u60A8\u7533\u8ACB\u4E86\u4E00\u4EFD\u5C0F\u79AE\u7269",
              "\u4EE5\u5F8C\u6709\u4EFB\u4F55\u554F\u984C\u90FD\u53EF\u4EE5\u96A8\u6642\u627E\u6211"
            ]
          }
        ],
        defaultPhases: [
          { id: "phase_1", name: "\u5FEB\u901F\u97FF\u61C9", duration: "\u7ACB\u5373", goal: "\u7B2C\u4E00\u6642\u9593\u97FF\u61C9\uFF0C\u5B89\u64AB\u60C5\u7DD2", tactics: ["\u8868\u9054\u6B49\u610F", "\u78BA\u8A8D\u554F\u984C", "\u8868\u793A\u91CD\u8996"], rolesFocus: ["cs_agent"], successIndicators: ["\u5BA2\u6236\u60C5\u7DD2\u7DE9\u548C"] },
          { id: "phase_2", name: "\u554F\u984C\u89E3\u6C7A", duration: "\u76E1\u5FEB", goal: "\u6392\u67E5\u4E26\u89E3\u6C7A\u554F\u984C", tactics: ["\u6280\u8853\u6392\u67E5", "\u63D0\u4F9B\u65B9\u6848", "\u78BA\u8A8D\u89E3\u6C7A"], rolesFocus: ["tech_support"], successIndicators: ["\u554F\u984C\u89E3\u6C7A"] },
          { id: "phase_3", name: "\u6EFF\u610F\u78BA\u8A8D", duration: "\u554F\u984C\u89E3\u6C7A\u5F8C", goal: "\u78BA\u8A8D\u6EFF\u610F\uFF0C\u9069\u7576\u88DC\u511F", tactics: ["\u78BA\u8A8D\u6EFF\u610F", "\u88DC\u511F\u633D\u56DE", "\u5EFA\u7ACB\u597D\u611F"], rolesFocus: ["satisfaction_manager"], successIndicators: ["\u5BA2\u6236\u6EFF\u610F", "\u597D\u8A55\u53CD\u994B"] }
        ]
      },
      brand_promotion: {
        keywords: ["\u63A8\u5EE3", "\u54C1\u724C", "\u5BA3\u50B3", "\u77E5\u540D\u5EA6", "\u66DD\u5149", "\u50B3\u64AD"],
        description: "\u63D0\u5347\u54C1\u724C\u77E5\u540D\u5EA6\u548C\u597D\u611F\u5EA6",
        defaultRoles: [
          {
            id: "brand_ambassador",
            name: "\u54C1\u724C\u5927\u4F7F",
            icon: "\u{1F3C6}",
            type: "promotion",
            purpose: "\u50B3\u64AD\u54C1\u724C\u50F9\u503C",
            personality: "\u5C08\u696D\u81EA\u4FE1\uFF0C\u6709\u611F\u67D3\u529B",
            speakingStyle: "\u7A4D\u6975\u6B63\u9762\uFF0C\u6709\u865F\u53EC\u529B",
            entryTiming: "\u54C1\u724C\u76F8\u95DC\u8A71\u984C",
            sampleMessages: ["\u9019\u500B\u54C1\u724C\u6211\u4E00\u76F4\u95DC\u6CE8\uFF0C\u7406\u5FF5\u5F88\u597D", "\u4ED6\u5011\u5BB6\u7684\u54C1\u8CEA\u78BA\u5BE6\u6C92\u8A71\u8AAA"]
          }
        ],
        defaultPhases: [
          { id: "phase_1", name: "\u54C1\u724C\u66DD\u5149", duration: "\u6301\u7E8C", goal: "\u81EA\u7136\u50B3\u64AD\u54C1\u724C", tactics: ["\u50F9\u503C\u5206\u4EAB", "\u6545\u4E8B\u8B1B\u8FF0"], rolesFocus: ["brand_ambassador"], successIndicators: ["\u88AB\u8A0E\u8AD6", "\u597D\u8A55"] }
        ]
      },
      lead_nurturing: {
        keywords: ["\u57F9\u80B2", "\u6F5B\u5BA2", "\u8DDF\u9032", "\u9810\u71B1", "\u6559\u80B2"],
        description: "\u57F9\u80B2\u6F5B\u5728\u5BA2\u6236\uFF0C\u63D0\u5347\u8CFC\u8CB7\u610F\u9858",
        defaultRoles: [
          {
            id: "content_sharer",
            name: "\u5167\u5BB9\u9054\u4EBA",
            icon: "\u{1F4DA}",
            type: "education",
            purpose: "\u5206\u4EAB\u6709\u50F9\u503C\u5167\u5BB9",
            personality: "\u77E5\u8B58\u8C50\u5BCC\uFF0C\u6A02\u65BC\u5206\u4EAB",
            speakingStyle: "\u6709\u6599\u6709\u8DA3\uFF0C\u4E0D\u8AAA\u6559",
            entryTiming: "\u6301\u7E8C",
            sampleMessages: ["\u5206\u4EAB\u4E00\u500B\u5F88\u6709\u7528\u7684\u65B9\u6CD5", "\u9019\u7BC7\u6587\u7AE0\u5BEB\u5F97\u592A\u597D\u4E86"]
          }
        ],
        defaultPhases: [
          { id: "phase_1", name: "\u50F9\u503C\u8F38\u51FA", duration: "\u6301\u7E8C", goal: "\u901A\u904E\u5167\u5BB9\u5EFA\u7ACB\u4FE1\u4EFB", tactics: ["\u77E5\u8B58\u5206\u4EAB", "\u6848\u4F8B\u5206\u6790"], rolesFocus: ["content_sharer"], successIndicators: ["\u88AB\u95DC\u6CE8", "\u4E3B\u52D5\u8A62\u554F"] }
        ]
      },
      custom: {
        keywords: [],
        description: "\u81EA\u5B9A\u7FA9\u76EE\u6A19",
        // 🔧 修復: custom 類型使用通用銷售角色作為默認值，避免空角色問題
        defaultRoles: [
          {
            id: "account_manager",
            name: "\u5BA2\u6236\u7D93\u7406",
            icon: "\u{1F4BC}",
            type: "account_manager",
            purpose: "\u4E86\u89E3\u9700\u6C42\uFF0C\u5EFA\u7ACB\u95DC\u4FC2",
            personality: "\u5C08\u696D\u53CB\u597D\uFF0C\u5584\u65BC\u50BE\u807D",
            speakingStyle: "\u5C08\u696D\u4F46\u4E0D\u751F\u786C\uFF0C\u50CF\u670B\u53CB\u822C\u4EA4\u6D41",
            entryTiming: "\u9996\u6B21\u63A5\u89F8\u548C\u91CD\u8981\u7BC0\u9EDE",
            sampleMessages: [
              "\u60A8\u597D\uFF01\u6211\u662F\u60A8\u7684\u5C08\u5C6C\u5BA2\u6236\u7D93\u7406",
              "\u8ACB\u554F\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u5230\u60A8\u7684\u55CE\uFF1F",
              "\u6709\u4EFB\u4F55\u554F\u984C\u90FD\u53EF\u4EE5\u96A8\u6642\u554F\u6211"
            ]
          },
          {
            id: "solution_expert",
            name: "\u65B9\u6848\u5C08\u5BB6",
            icon: "\u{1F4CB}",
            type: "professional",
            purpose: "\u63D0\u4F9B\u5C08\u696D\u65B9\u6848\u548C\u5EFA\u8B70",
            personality: "\u5C08\u696D\u6B0A\u5A01\uFF0C\u6709\u6DF1\u5EA6",
            speakingStyle: "\u6E05\u6670\u7C21\u6F54\uFF0C\u91CD\u9EDE\u7A81\u51FA",
            entryTiming: "\u5BA2\u6236\u6709\u5177\u9AD4\u9700\u6C42\u6642",
            sampleMessages: [
              "\u6839\u64DA\u60A8\u7684\u60C5\u6CC1\uFF0C\u6211\u5EFA\u8B70...",
              "\u9019\u500B\u65B9\u6848\u53EF\u4EE5\u6EFF\u8DB3\u60A8\u7684\u9700\u6C42",
              "\u8B93\u6211\u4F86\u8A73\u7D30\u8AAA\u660E\u4E00\u4E0B"
            ]
          }
        ],
        defaultPhases: [
          { id: "phase_1", name: "\u4E86\u89E3\u9700\u6C42", duration: "1-2\u5929", goal: "\u5EFA\u7ACB\u806F\u7E6B\uFF0C\u4E86\u89E3\u5BA2\u6236\u9700\u6C42", tactics: ["\u958B\u5834\u554F\u5019", "\u9700\u6C42\u6316\u6398"], rolesFocus: ["account_manager"], successIndicators: ["\u5BA2\u6236\u56DE\u8986", "\u8AAA\u51FA\u9700\u6C42"] },
          { id: "phase_2", name: "\u63D0\u4F9B\u65B9\u6848", duration: "1-2\u5929", goal: "\u6839\u64DA\u9700\u6C42\u63D0\u4F9B\u5B9A\u5236\u65B9\u6848", tactics: ["\u65B9\u6848\u4ECB\u7D39", "\u50F9\u503C\u8AAA\u660E"], rolesFocus: ["solution_expert"], successIndicators: ["\u5BA2\u6236\u8A8D\u53EF", "\u8A62\u554F\u7D30\u7BC0"] },
          { id: "phase_3", name: "\u4FC3\u6210\u8F49\u5316", duration: "\u9748\u6D3B", goal: "\u89E3\u7B54\u7591\u616E\uFF0C\u4FC3\u6210\u6210\u4EA4", tactics: ["\u7570\u8B70\u8655\u7406", "\u512A\u60E0\u4FC3\u55AE"], rolesFocus: ["account_manager"], successIndicators: ["\u5BA2\u6236\u540C\u610F", "\u6210\u4EA4"] }
        ]
      }
    };
    this.conversionSignals = {
      // 高意向信號（80分+）
      high: ["\u600E\u9EBC\u8CB7", "\u591A\u5C11\u9322", "\u50F9\u683C", "\u4ED8\u6B3E", "\u4E0B\u55AE", "\u60F3\u8CB7", "\u8CFC\u8CB7", "\u8A02\u8CFC", "\u4ED8\u8CBB", "\u652F\u4ED8"],
      // 中意向信號（50-80分）
      medium: ["\u6709\u8208\u8DA3", "\u60F3\u4E86\u89E3", "\u4ECB\u7D39\u4E00\u4E0B", "\u8A73\u7D30\u8AAA\u8AAA", "\u767C\u7D66\u6211", "\u6709\u4EC0\u9EBC\u512A\u60E0", "\u600E\u9EBC\u4F7F\u7528"],
      // 正面信號（30-50分）
      positive: ["\u4E0D\u932F", "\u633A\u597D", "\u6709\u9053\u7406", "\u53EF\u4EE5", "\u597D\u7684", "\u8B1D\u8B1D", "\u611F\u8B1D"],
      // 負面信號（減分）
      negative: ["\u4E0D\u9700\u8981", "\u4E0D\u7528\u4E86", "\u4E0D\u611F\u8208\u8DA3", "\u5225\u6253\u64FE", "\u53D6\u95DC", "\u62C9\u9ED1", "\u9A37\u64FE"],
      // 成交信號（確認轉化）
      converted: ["\u8CB7\u4E86", "\u5DF2\u4ED8\u6B3E", "\u4ED8\u597D\u4E86", "\u4E0B\u55AE\u4E86", "\u6210\u4EA4", "\u8A02\u597D\u4E86"]
    };
    this.setupMessageAnalysisListener();
  }
  // ============ 🆕 消息分析監聽 ============
  /**
   * 設置消息分析監聯（每 N 條消息自動分析）
   */
  setupMessageAnalysisListener() {
    this.ipc.on("collab:new-message", async (data) => {
      const execution = this._currentExecution();
      if (!execution || execution.status !== "running")
        return;
      const newMessage = {
        role: data.role || "customer",
        content: data.content,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isFromCustomer: data.isFromCustomer ?? true
      };
      execution.messageHistory = [...execution.messageHistory || [], newMessage];
      this._currentExecution.set(__spreadValues({}, execution));
      const messageCount = execution.messageHistory?.length || 0;
      if (messageCount > 0 && messageCount % this.analysisInterval === 0) {
        console.log(`[DynamicEngine] \u89F8\u767C\u7B2C ${execution.stats.analysisCount + 1} \u6B21\u5206\u6790 (${messageCount} \u689D\u6D88\u606F)`);
        await this.performDynamicAnalysis(execution);
      }
      if (execution.mode === "scriptless" && data.isFromCustomer) {
        await this.checkConversionSignals(execution, data.content);
      }
    });
    this.ipc.on("collab:customer-reply", async (data) => {
      const execution = this._currentExecution();
      if (!execution)
        return;
      execution.stats.responsesReceived++;
      this._currentExecution.set(__spreadValues({}, execution));
      if (execution.conversionFunnel?.currentStage === "contact") {
        this.updateConversionStage(execution, "response", data.content);
      }
    });
  }
  // ============ 🆕 智能帳號匹配 ============
  /**
   * P0: 智能匹配帳號到角色
   * 根據帳號特徵自動選擇最適合的角色
   */
  async smartMatchAccountsToRoles(recommendedRoles, targetIntent) {
    return this.smartMatchAccountsToRolesEnhanced(recommendedRoles, targetIntent, {});
  }
  /**
   * 🆕 P0: 增強版智能匹配（支持降級策略）
   * - allowMultiRole: 允許一號多角
   * - allowOffline: 允許匹配離線帳號
   */
  async smartMatchAccountsToRolesEnhanced(recommendedRoles, targetIntent, options) {
    const { allowMultiRole = false, allowOffline = false } = options;
    const accounts = this.accountService.accounts();
    const onlineAccounts = accounts.filter((a) => a.status === "Online");
    const rolePriority = { "AI": 1, "Sender": 2, "Listener": 3 };
    let availableAccounts = onlineAccounts.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
    console.log(`[DynamicEngine] \u{1F50D} Phase 3 \u5E33\u865F\u7BE9\u9078: \u5728\u7DDA ${onlineAccounts.length} \u500B, \u5168\u90E8\u53EF\u7528\u65BC\u591A\u89D2\u8272`);
    console.log(`[DynamicEngine] \u{1F50D} \u53EF\u7528\u5E33\u865F\u660E\u7D30:`, availableAccounts.map((a) => `${a.phone}(${a.role})`));
    if (availableAccounts.length === 0 && allowOffline) {
      availableAccounts = accounts.filter((a) => a.status === "Offline" && !a.status.toLowerCase().includes("error") && !a.status.toLowerCase().includes("banned"));
      if (availableAccounts.length > 0) {
        console.log("[DynamicEngine] \u964D\u7D1A: \u4F7F\u7528\u96E2\u7DDA\u5E33\u865F\uFF08\u9700\u8981\u5148\u9023\u7DDA\uFF09");
      }
    }
    if (availableAccounts.length === 0) {
      console.log("[DynamicEngine] \u7121\u53EF\u7528\u5E33\u865F");
      return [];
    }
    const matches = [];
    const usedAccounts = /* @__PURE__ */ new Set();
    const accountUsageCount = /* @__PURE__ */ new Map();
    const strictOneAccountOneRole = !allowMultiRole;
    if (strictOneAccountOneRole) {
      console.log("[DynamicEngine] \u{1F512} \u56B4\u683C\u6A21\u5F0F\uFF1A\u4E00\u5E33\u865F\u4E00\u89D2\u8272");
    }
    for (const role of recommendedRoles) {
      let bestMatch = null;
      for (const account of availableAccounts) {
        if (strictOneAccountOneRole && usedAccounts.has(account.id)) {
          console.log(`[DynamicEngine] \u23ED\uFE0F \u8DF3\u904E\u5DF2\u4F7F\u7528\u5E33\u865F: ${account.phone}`);
          continue;
        }
        const usageCount = accountUsageCount.get(account.id) || 0;
        const usagePenalty = usageCount * 20;
        const { score, reasons } = this.calculateAccountRoleMatch(account, role, targetIntent);
        const adjustedScore = Math.max(0, score - usagePenalty);
        if (!bestMatch || adjustedScore > bestMatch.score) {
          bestMatch = { account, score: adjustedScore, reasons };
        }
      }
      if (bestMatch && bestMatch.score >= 10) {
        usedAccounts.add(bestMatch.account.id);
        accountUsageCount.set(bestMatch.account.id, (accountUsageCount.get(bestMatch.account.id) || 0) + 1);
        const features = this.analyzeAccountFeatures(bestMatch.account);
        const usageCount = accountUsageCount.get(bestMatch.account.id) || 1;
        matches.push({
          accountId: bestMatch.account.id,
          accountPhone: bestMatch.account.phone,
          accountName: bestMatch.account.name || bestMatch.account.phone,
          roleId: role.id,
          roleName: role.name,
          roleIcon: role.icon,
          matchScore: bestMatch.score,
          matchReasons: usageCount > 1 ? [...bestMatch.reasons, `\u4E00\u865F\u591A\u89D2 (${usageCount} \u89D2\u8272)`] : bestMatch.reasons,
          accountFeatures: features
        });
      } else if (bestMatch) {
        console.log(`[DynamicEngine] \u26A1 \u5F37\u5236\u5206\u914D\u4F4E\u5206\u5E33\u865F: ${bestMatch.account.phone} (\u5206\u6578: ${bestMatch.score})`);
        usedAccounts.add(bestMatch.account.id);
        accountUsageCount.set(bestMatch.account.id, (accountUsageCount.get(bestMatch.account.id) || 0) + 1);
        matches.push({
          accountId: bestMatch.account.id,
          accountPhone: bestMatch.account.phone,
          accountName: bestMatch.account.name || bestMatch.account.phone,
          roleId: role.id,
          roleName: role.name,
          roleIcon: role.icon,
          matchScore: bestMatch.score,
          matchReasons: [...bestMatch.reasons, "\u5F37\u5236\u5206\u914D(\u5206\u6578\u8F03\u4F4E)"],
          accountFeatures: this.analyzeAccountFeatures(bestMatch.account)
        });
      } else if (allowMultiRole && availableAccounts.length > 0) {
        const fallbackAccount = availableAccounts[0];
        accountUsageCount.set(fallbackAccount.id, (accountUsageCount.get(fallbackAccount.id) || 0) + 1);
        const usageCount = accountUsageCount.get(fallbackAccount.id) || 1;
        matches.push({
          accountId: fallbackAccount.id,
          accountPhone: fallbackAccount.phone,
          accountName: fallbackAccount.name || fallbackAccount.phone,
          roleId: role.id,
          roleName: role.name,
          roleIcon: role.icon,
          matchScore: 30,
          matchReasons: ["\u81EA\u52D5\u5206\u914D", `\u4E00\u865F\u591A\u89D2 (${usageCount} \u89D2\u8272)`],
          accountFeatures: this.analyzeAccountFeatures(fallbackAccount)
        });
      }
    }
    this._accountMatches.set(matches);
    const excludedAccounts = accounts.filter((a) => a.status === "Online" && !matches.some((m) => m.accountId === a.id));
    console.log("[DynamicEngine] \u2705 \u667A\u80FD\u5339\u914D\u7D50\u679C:", matches.length, "\u500B\u5E33\u865F");
    matches.forEach((m) => {
      console.log(`  - ${m.accountPhone} \u2192 ${m.roleName} (\u5206\u6578: ${m.matchScore})`);
    });
    if (excludedAccounts.length > 0) {
      console.log("[DynamicEngine] \u26A0\uFE0F \u672A\u4F7F\u7528\u7684\u5728\u7DDA\u5E33\u865F:", excludedAccounts.length, "\u500B");
      excludedAccounts.forEach((a) => {
        const reason = a.role === "Listener" ? "\u76E3\u63A7\u865F(\u4FDD\u7559\u7528\u65BC\u76E3\u63A7)" : usedAccounts.has(a.id) ? "\u5DF2\u5206\u914D\u5176\u4ED6\u89D2\u8272" : "\u5339\u914D\u5206\u6578\u4E0D\u8DB3";
        console.log(`  - ${a.phone} (${a.role}): ${reason}`);
      });
    }
    return matches;
  }
  /**
   * 計算帳號與角色的匹配度
   */
  calculateAccountRoleMatch(account, role, intent) {
    let score = 50;
    const reasons = [];
    if (account.status === "Online") {
      score += 10;
      reasons.push("\u5E33\u865F\u5728\u7DDA");
    }
    const nameStyle = this.analyzeNameStyle(account.name);
    const roleStyle = this.getRoleExpectedStyle(role.type);
    if (nameStyle === roleStyle) {
      score += 20;
      reasons.push(`\u540D\u7A31\u98A8\u683C\u5339\u914D (${nameStyle})`);
    } else if (nameStyle === "neutral") {
      score += 10;
      reasons.push("\u540D\u7A31\u98A8\u683C\u4E2D\u6027\uFF0C\u9069\u61C9\u6027\u5F37");
    }
    if (role.type === "professional" && this.looksLikeProfessional(account)) {
      score += 15;
      reasons.push("\u5E33\u865F\u770B\u8D77\u4F86\u5C08\u696D");
    }
    if (role.type === "endorsement" && this.looksLikeFriendly(account)) {
      score += 15;
      reasons.push("\u5E33\u865F\u770B\u8D77\u4F86\u89AA\u548C");
    }
    if (role.type === "atmosphere" && this.looksLikeCasual(account)) {
      score += 15;
      reasons.push("\u5E33\u865F\u770B\u8D77\u4F86\u8F15\u9B06");
    }
    return { score: Math.min(100, score), reasons };
  }
  /**
   * 分析帳號特徵
   */
  analyzeAccountFeatures(account) {
    const nameStyle = this.analyzeNameStyle(account.name);
    return {
      profileStyle: nameStyle,
      activityLevel: "medium",
      // TODO: 從歷史數據計算
      successRate: 0,
      // TODO: 從歷史數據計算
      responseRate: 0
      // TODO: 從歷史數據計算
    };
  }
  /**
   * 分析名稱風格
   */
  analyzeNameStyle(name) {
    const fullName = (name || "").toLowerCase();
    const professionalIndicators = ["manager", "director", "expert", "consultant", "\u7D93\u7406", "\u9867\u554F", "\u5C08\u5BB6", "\u7E3D\u76E3"];
    if (professionalIndicators.some((ind) => fullName.includes(ind))) {
      return "professional";
    }
    const friendlyIndicators = ["\u5C0F", "\u963F", "\u54E5", "\u59D0", "\u5BF6", "\u840C", "happy", "sunny", "sweet"];
    if (friendlyIndicators.some((ind) => fullName.includes(ind))) {
      return "friendly";
    }
    const casualIndicators = ["cool", "chill", "\u61F6", "\u96A8", "random", "just"];
    if (casualIndicators.some((ind) => fullName.includes(ind))) {
      return "casual";
    }
    return "neutral";
  }
  /**
   * 獲取角色期望的帳號風格
   */
  getRoleExpectedStyle(roleType) {
    const styleMap = {
      "professional": "professional",
      "endorsement": "friendly",
      "atmosphere": "casual",
      "care": "friendly",
      "solution": "professional",
      "retention": "professional",
      "host": "friendly",
      "participant": "casual",
      "expert": "professional"
    };
    return styleMap[roleType] || "neutral";
  }
  looksLikeProfessional(account) {
    const name = (account.name || "").toLowerCase();
    return name.includes("manager") || name.includes("\u7D93\u7406") || name.includes("\u9867\u554F") || name.includes("director") || name.includes("\u7E3D\u76E3");
  }
  looksLikeFriendly(account) {
    const name = (account.name || "").toLowerCase();
    return name.includes("\u5C0F") || name.includes("\u963F") || name.includes("\u59D0") || name.includes("happy") || name.includes("sunny");
  }
  looksLikeCasual(account) {
    const name = (account.name || "").toLowerCase();
    return name.includes("cool") || name.includes("chill") || name.length <= 3;
  }
  // ============ 核心方法 ============
  /**
   * 設置執行模式
   */
  setExecutionMode(mode) {
    this._executionMode.set(mode);
    console.log("[DynamicEngine] \u57F7\u884C\u6A21\u5F0F\u8A2D\u7F6E\u70BA:", mode);
  }
  /**
   * 一句話啟動：解析用戶意圖並生成執行計劃（增強版）
   * @param userInput 用戶輸入的目標
   * @param mode 執行模式
   * @param targetUsers 目標用戶列表（可選）
   * @param options 額外選項（群聊協作配置）
   */
  async startFromOnePhrase(userInput, mode = "hybrid", targetUsers, options) {
    if (!userInput.trim()) {
      this.toast.error("\u8ACB\u8F38\u5165\u60A8\u7684\u76EE\u6A19");
      return null;
    }
    this._isProcessing.set(true);
    this._executionMode.set(mode);
    const chatScenario = options?.chatScenario || "private";
    console.log(`[DynamicEngine] \u555F\u52D5\u6A21\u5F0F: ${mode}, \u5834\u666F: ${chatScenario}`);
    try {
      const intent = await this.analyzeIntent(userInput);
      const strategy = this.generateStrategy(intent);
      let roles = this.recommendRoles(intent);
      console.log("[DynamicEngine] \u{1F50D} \u63A8\u85A6\u89D2\u8272:", roles?.length, roles);
      const isPrivateChat = !targetUsers || targetUsers.length <= 1;
      if (isPrivateChat) {
        console.log("[DynamicEngine] \u{1F512} \u79C1\u804A\u6A21\u5F0F\uFF1A\u9650\u5236\u70BA\u55AE\u4E00\u89D2\u8272");
        roles = roles.slice(0, PRIVATE_CHAT_MAX_ROLES);
        this.toast.info("\u{1F4AC} \u79C1\u804A\u6A21\u5F0F\uFF1A\u4F7F\u7528\u55AE\u4E00\u89D2\u8272\u8207\u76EE\u6A19\u7528\u6236\u5C0D\u8A71");
      }
      const accountMatches = await this.smartMatchAccountsToRoles(roles, intent);
      console.log("[DynamicEngine] \u{1F50D} \u5E33\u865F\u5339\u914D\u7D50\u679C:", accountMatches?.length, accountMatches);
      if (accountMatches.length < roles.length) {
        const shortage = roles.length - accountMatches.length;
        console.warn(`[DynamicEngine] \u26A0\uFE0F \u5E33\u865F\u4E0D\u8DB3\uFF1A\u9700\u8981 ${roles.length} \u500B\uFF0C\u53EA\u6709 ${accountMatches.length} \u500B`);
        this.toast.warning(`\u26A0\uFE0F \u5E33\u865F\u4E0D\u8DB3\uFF01\u9700\u8981\u518D\u767B\u5165 ${shortage} \u500B\u5E33\u865F\u624D\u80FD\u5B8C\u6574\u57F7\u884C\u591A\u89D2\u8272\u5354\u4F5C`);
        if (!isPrivateChat && accountMatches.length === 0) {
          this.toast.error("\u274C \u6C92\u6709\u53EF\u7528\u5E33\u865F\uFF0C\u7121\u6CD5\u555F\u52D5\u3002\u8ACB\u5148\u6DFB\u52A0\u4E26\u767B\u5165\u5E33\u865F\u3002");
          return null;
        }
        roles = roles.slice(0, Math.max(1, accountMatches.length));
      }
      const rolesWithAccounts = roles.map((role) => {
        const match = accountMatches.find((m) => m.roleId === role.id);
        if (match) {
          return __spreadProps(__spreadValues({}, role), { accountId: match.accountId, accountPhone: match.accountPhone });
        }
        return role;
      });
      const formattedTargetUsers = targetUsers?.map((u) => ({
        id: u.telegramId || u.id,
        telegramId: u.telegramId || u.id,
        // 🔧 確保後端可以匹配
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        intentScore: u.intentScore,
        source: u.source
      }));
      if (formattedTargetUsers && formattedTargetUsers.length > 0) {
        console.log("[DynamicEngine] \u{1F3AF} \u683C\u5F0F\u5316\u76EE\u6A19\u7528\u6236:");
        formattedTargetUsers.forEach((u) => {
          console.log(`  - ${u.firstName || u.username || "unknown"}: id=${u.id}, telegramId=${u.telegramId}`);
        });
      }
      const targetUserIds = formattedTargetUsers?.map((u) => String(u.id)) || [];
      const queueConfig = targetUserIds.length > 0 ? {
        totalUsers: targetUserIds.length,
        processedUsers: 0,
        currentUserIndex: 0,
        currentUser: formattedTargetUsers?.[0] ? {
          id: String(formattedTargetUsers[0].id),
          name: formattedTargetUsers[0].firstName || formattedTargetUsers[0].username || String(formattedTargetUsers[0].id),
          startTime: (/* @__PURE__ */ new Date()).toISOString()
        } : void 0,
        completedUsers: [],
        pendingUsers: targetUserIds.slice(1)
        // 第一個已在處理，其餘待處理
      } : void 0;
      const execution = {
        id: `exec_${Date.now()}`,
        status: "planning",
        goal: userInput,
        intent,
        strategy,
        roles: rolesWithAccounts,
        mode,
        accountMatches,
        targetUsers: formattedTargetUsers,
        scriptlessConfig: mode === "scriptless" ? __spreadProps(__spreadValues({}, this.defaultScriptlessConfig), { enabled: true }) : void 0,
        conversionFunnel: {
          currentStage: "contact",
          stageHistory: [{ stage: "contact", enteredAt: (/* @__PURE__ */ new Date()).toISOString(), messageCount: 0 }],
          keyMoments: []
        },
        queue: queueConfig,
        // 🆕 添加隊列
        // 🔧 群聊協作：添加群聊配置
        groupConfig: chatScenario === "group" ? {
          groupId: options?.groupId,
          roleAccounts: options?.roleAccounts,
          chatScenario: "group"
        } : void 0,
        chatScenario,
        // 🔧 群聊協作：記錄場景類型
        stats: {
          startTime: (/* @__PURE__ */ new Date()).toISOString(),
          messagesSent: 0,
          responsesReceived: 0,
          currentPhase: 0,
          interestScore: 0,
          lastAnalysis: null,
          analysisCount: 0,
          rolesSwitchCount: 0,
          autoAdjustments: 0
        },
        messageHistory: []
      };
      this._currentExecution.set(execution);
      this._executions.update((list) => [execution, ...list]);
      this.persistExecution(execution);
      const modeLabel = mode === "scriptless" ? "\u7121\u5287\u672C" : mode === "scripted" ? "\u5287\u672C" : "\u6DF7\u5408";
      const targetCount = formattedTargetUsers?.length || 0;
      this.toast.success(`AI \u5DF2\u7406\u89E3\u60A8\u7684\u76EE\u6A19\uFF0C${modeLabel}\u6A21\u5F0F\u6E96\u5099\u5C31\u7DD2\uFF0C\u5339\u914D\u4E86 ${accountMatches.length} \u500B\u5E33\u865F${targetCount > 0 ? `\uFF0C\u76EE\u6A19 ${targetCount} \u500B\u7528\u6236` : ""}`);
      if (formattedTargetUsers && formattedTargetUsers.length > 0) {
        setTimeout(() => {
          this.beginPrivateChatExecution(execution);
        }, 1500);
      }
      return execution;
    } catch (error) {
      this.toast.error("\u7B56\u5283\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66");
      console.error("[DynamicEngine] Start failed:", error);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }
  /**
   * 使用 AI 營銷助手策略啟動（完整策略數據）
   */
  async startWithMarketingStrategy(userGoal, marketingStrategy) {
    this._isProcessing.set(true);
    try {
      console.log("[DynamicEngine] \u63A5\u6536 AI \u71DF\u92B7\u7B56\u7565:", marketingStrategy);
      const intent = {
        type: "sales_conversion",
        confidence: 90,
        // 來自 AI 營銷助手，置信度高
        goal: `\u5728${marketingStrategy.industry}\u884C\u696D\uFF0C\u4FC3\u9032${marketingStrategy.targetAudience}\u6210\u4EA4`,
        targetAudience: marketingStrategy.targetAudience,
        productType: marketingStrategy.industry,
        urgency: "medium",
        suggestedDuration: "3-5\u5929"
      };
      const strategy = this.generateEnhancedStrategy(intent, marketingStrategy);
      const roles = this.recommendRoles(intent);
      const execution = {
        id: `exec_${Date.now()}`,
        status: "planning",
        goal: userGoal,
        intent,
        strategy,
        roles,
        mode: "hybrid",
        stats: {
          startTime: (/* @__PURE__ */ new Date()).toISOString(),
          messagesSent: 0,
          responsesReceived: 0,
          currentPhase: 0,
          interestScore: 0,
          lastAnalysis: null,
          analysisCount: 0,
          rolesSwitchCount: 0,
          autoAdjustments: 0
        },
        // 保存原始營銷策略用於執行
        marketingData: marketingStrategy
      };
      this._currentExecution.set(execution);
      this._executions.update((list) => [execution, ...list]);
      this.toast.success("\u{1F916} AI \u5DF2\u6574\u5408\u71DF\u92B7\u7B56\u7565\uFF0C\u6E96\u5099\u57F7\u884C\u6700\u512A\u65B9\u6848\uFF01");
      return execution;
    } catch (error) {
      this.toast.error("\u7B56\u7565\u6574\u5408\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66");
      console.error("[DynamicEngine] Marketing strategy start failed:", error);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }
  /**
   * 生成增強版策略（使用 AI 營銷助手數據）
   */
  generateEnhancedStrategy(intent, marketingData) {
    const baseStrategy = this.generateStrategy(intent);
    return __spreadProps(__spreadValues({}, baseStrategy), {
      name: `${marketingData.industry} - AI \u71DF\u92B7\u7B56\u7565`,
      description: `\u91DD\u5C0D\u300C${marketingData.targetAudience}\u300D\u7684\u667A\u80FD\u71DF\u92B7\u7B56\u7565\uFF0C\u4F7F\u7528\u95DC\u9375\u8A5E\uFF1A${marketingData.keywords.highIntent.slice(0, 3).join("\u3001")}`,
      // 將消息模板注入到策略中
      messageTemplates: marketingData.messageTemplates,
      keywords: marketingData.keywords
    });
  }
  /**
   * 解析用戶意圖
   */
  async analyzeIntent(userInput) {
    const input = userInput.toLowerCase();
    let matchedType = "custom";
    let maxScore = 0;
    for (const [type, template2] of Object.entries(this.intentTemplates)) {
      const score = template2.keywords.filter((kw) => input.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        matchedType = type;
      }
    }
    const template = this.intentTemplates[matchedType];
    return {
      type: matchedType,
      confidence: Math.min(95, 50 + maxScore * 15),
      goal: matchedType === "custom" ? userInput : template.description,
      targetAudience: this.extractTargetAudience(input),
      productType: this.extractProductType(input),
      urgency: this.determineUrgency(input),
      suggestedDuration: this.suggestDuration(matchedType)
    };
  }
  /**
   * 生成動態策略
   */
  generateStrategy(intent) {
    const template = this.intentTemplates[intent.type];
    return {
      id: `strategy_${Date.now()}`,
      name: `${intent.goal} - \u52D5\u614B\u7B56\u7565`,
      description: `AI \u6839\u64DA\u300C${intent.goal}\u300D\u81EA\u52D5\u751F\u6210\u7684\u52D5\u614B\u57F7\u884C\u7B56\u7565`,
      phases: template.defaultPhases,
      adjustmentRules: this.generateAdjustmentRules(intent),
      constraints: {
        maxDailyMessages: 50,
        maxConsecutiveFromSameRole: 3,
        minIntervalSeconds: 60,
        maxIntervalSeconds: 300,
        activeHours: { start: 9, end: 22 },
        toneGuidelines: ["\u53CB\u597D\u81EA\u7136", "\u4E0D\u904E\u5EA6\u63A8\u92B7", "\u50CF\u670B\u53CB\u804A\u5929"],
        forbiddenTopics: ["\u653F\u6CBB", "\u654F\u611F\u8A71\u984C"]
      }
    };
  }
  /**
   * 推薦角色
   */
  recommendRoles(intent) {
    const template = this.intentTemplates[intent.type];
    return template.defaultRoles;
  }
  /**
   * 生成調整規則
   */
  generateAdjustmentRules(intent) {
    return [
      {
        trigger: "\u5BA2\u6236\u60C5\u7DD2\u8CA0\u9762",
        condition: { type: "sentiment", threshold: 30 },
        action: "\u66AB\u505C\u63A8\u92B7\uFF0C\u5207\u63DB\u5230\u95DC\u61F7\u6A21\u5F0F"
      },
      {
        trigger: "\u5BA2\u6236\u8A62\u554F\u50F9\u683C",
        condition: { type: "keyword", keywords: ["\u591A\u5C11\u9322", "\u50F9\u683C", "\u8CBB\u7528", "\u8CB4\u4E0D\u8CB4"] },
        action: "\u9019\u662F\u6210\u4EA4\u4FE1\u865F\uFF01\u5F15\u5165\u92B7\u552E\u5C08\u5BB6"
      },
      {
        trigger: "\u5BA2\u6236\u63D0\u5230\u7AF6\u54C1",
        condition: { type: "keyword", keywords: ["\u5176\u4ED6", "\u5225\u5BB6", "\u7AF6\u54C1", "\u5C0D\u6BD4"] },
        action: "\u5F15\u5165\u5C0D\u6BD4\u5206\u6790\uFF0C\u7A81\u51FA\u512A\u52E2"
      },
      {
        trigger: "\u5C0D\u8A71\u6C89\u9ED8",
        condition: { type: "silence", threshold: 3600 },
        action: "\u767C\u8D77\u65B0\u8A71\u984C\u6216\u63DB\u89D2\u8272\u6D3B\u8E8D"
      },
      {
        trigger: "\u8208\u8DA3\u5EA6\u4E0A\u5347",
        condition: { type: "interest", threshold: 70 },
        action: "\u53EF\u4EE5\u958B\u59CB\u50F9\u503C\u5C55\u793A\u548C\u4FC3\u55AE"
      }
    ];
  }
  /**
   * 實時分析對話（每N條消息調用一次）
   */
  async analyzeConversation(messages) {
    const customerMessages = messages.filter((m) => m.isFromCustomer);
    const responseRate = messages.length > 0 ? customerMessages.length / messages.length * 100 : 0;
    const sentiment = this.analyzeSentiment(customerMessages);
    const interests = this.extractInterests(customerMessages);
    const readinessScore = this.calculateReadiness(customerMessages, sentiment);
    const suggestions = this.generateSuggestions(sentiment, readinessScore, interests);
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      messageCount: messages.length,
      userProfile: {
        engagementLevel: responseRate > 50 ? "high" : responseRate > 20 ? "medium" : "low",
        sentiment,
        interests,
        objections: this.extractObjections(customerMessages),
        readinessScore
      },
      conversationQuality: {
        responseRate,
        avgResponseTime: 0,
        // 需要時間戳計算
        topicEngagement: {}
      },
      suggestions
    };
  }
  /**
   * 生成下一條消息（動態編劇）
   */
  async generateNextMessage(execution) {
    if (!execution.strategy || execution.roles.length === 0)
      return null;
    const lastAnalysis = execution.stats.lastAnalysis;
    const currentPhase = execution.strategy.phases[execution.stats.currentPhase];
    const suitableRoles = currentPhase?.rolesFocus || [];
    const role = execution.roles.find((r) => suitableRoles.includes(r.id)) || execution.roles[0];
    let messageType = "casual";
    if (lastAnalysis) {
      if (lastAnalysis.userProfile.readinessScore > 70) {
        messageType = "close";
      } else if (lastAnalysis.userProfile.objections.length > 0) {
        messageType = "objection_handling";
      } else if (lastAnalysis.userProfile.engagementLevel === "high") {
        messageType = "value";
      }
    }
    const content = role.sampleMessages[Math.floor(Math.random() * role.sampleMessages.length)];
    return { role, content, type: messageType };
  }
  /**
   * 生成話題建議
   */
  generateTopicSuggestions() {
    const now = /* @__PURE__ */ new Date();
    const hour = now.getHours();
    const suggestions = [];
    if (hour >= 6 && hour < 10) {
      suggestions.push({
        type: "casual",
        content: "\u65E9\u5B89\u554F\u5019\uFF0C\u804A\u804A\u4ECA\u5929\u7684\u8A08\u5283",
        context: "\u65E9\u6668\u9069\u5408\u8F15\u9B06\u554F\u5019",
        suitableRoles: ["friendly_member", "community_host"]
      });
    } else if (hour >= 11 && hour < 13) {
      suggestions.push({
        type: "life",
        content: "\u5348\u9910\u8A71\u984C\uFF0C\u804A\u804A\u7F8E\u98DF",
        context: "\u5348\u9910\u6642\u9593\u8A71\u984C",
        suitableRoles: ["active_member_1", "active_member_2"]
      });
    } else if (hour >= 18 && hour < 20) {
      suggestions.push({
        type: "casual",
        content: "\u4E0B\u73ED\u8A71\u984C\uFF0C\u804A\u804A\u4ECA\u5929\u7684\u8DA3\u4E8B",
        context: "\u665A\u9593\u8F15\u9B06\u804A\u5929",
        suitableRoles: ["friendly_member"]
      });
    }
    suggestions.push({
      type: "news",
      content: "\u6700\u8FD1\u7684\u71B1\u9EDE\u65B0\u805E\u8A0E\u8AD6",
      context: "\u53EF\u4EE5\u7D50\u5408\u7522\u54C1\u5834\u666F",
      suitableRoles: ["opinion_leader", "community_host"]
    });
    return suggestions;
  }
  // ============ 🆕 P2: 轉化追蹤增強 ============
  /**
   * 獲取轉化漏斗統計
   */
  getConversionFunnelStats() {
    const executions = this._executions();
    const stageCounts = {
      "contact": 0,
      "response": 0,
      "interest": 0,
      "intent": 0,
      "conversion": 0
    };
    const stageTimings = {
      "contact": [],
      "response": [],
      "interest": [],
      "intent": [],
      "conversion": []
    };
    const keyMomentCounts = {};
    for (const exec of executions) {
      if (!exec.conversionFunnel)
        continue;
      stageCounts[exec.conversionFunnel.currentStage]++;
      const history = exec.conversionFunnel.stageHistory;
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const next = history[i + 1];
        const duration = new Date(next.enteredAt).getTime() - new Date(current.enteredAt).getTime();
        stageTimings[current.stage]?.push(duration / 1e3 / 60);
      }
      for (const moment of exec.conversionFunnel.keyMoments) {
        keyMomentCounts[moment.trigger] = (keyMomentCounts[moment.trigger] || 0) + 1;
      }
    }
    const stages = ["contact", "response", "interest", "intent", "conversion"];
    const total = executions.length || 1;
    let cumulativeCount = total;
    const funnelData = stages.map((stage) => {
      const count = stageCounts[stage];
      const rate = Math.round(cumulativeCount / total * 100);
      cumulativeCount = cumulativeCount - count + stageCounts[stage];
      return { stage, count, rate };
    });
    const avgTimePerStage = {};
    for (const [stage, times] of Object.entries(stageTimings)) {
      avgTimePerStage[stage] = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    }
    const topKeyMoments = Object.entries(keyMomentCounts).map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    return {
      totalExecutions: executions.length,
      funnelData,
      avgTimePerStage,
      topKeyMoments
    };
  }
  /**
   * 記錄關鍵時刻
   */
  recordKeyMoment(executionId, message, trigger) {
    const execution = this._executions().find((e) => e.id === executionId);
    if (!execution || !execution.conversionFunnel)
      return;
    execution.conversionFunnel.keyMoments.push({
      message,
      trigger,
      stage: execution.conversionFunnel.currentStage,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    this._executions.update((list) => list.map((e) => e.id === executionId ? execution : e));
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(__spreadValues({}, execution));
    }
    console.log(`[DynamicEngine] \u8A18\u9304\u95DC\u9375\u6642\u523B: ${trigger} - ${message.substring(0, 30)}...`);
  }
  /**
   * 獲取執行詳情報表
   */
  getExecutionReport(executionId) {
    const execution = this._executions().find((e) => e.id === executionId);
    if (!execution)
      return null;
    const startTime = new Date(execution.stats.startTime);
    const endTime = execution.status === "completed" ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / 1e3 / 60);
    const roleMessages = {};
    const roleResponses = {};
    for (const msg of execution.messageHistory || []) {
      if (!msg.isFromCustomer) {
        roleMessages[msg.role] = (roleMessages[msg.role] || 0) + 1;
      }
    }
    const rolePerformance = execution.roles.map((role) => ({
      roleId: role.id,
      roleName: role.name,
      messageCount: roleMessages[role.id] || 0,
      responseRate: roleMessages[role.id] > 0 ? Math.round((roleResponses[role.id] || 0) / roleMessages[role.id] * 100) : 0
    }));
    const funnelProgress = (execution.conversionFunnel?.stageHistory || []).map((stage, i, arr) => {
      const nextStage = arr[i + 1];
      const duration = nextStage ? Math.round((new Date(nextStage.enteredAt).getTime() - new Date(stage.enteredAt).getTime()) / 1e3 / 60) : 0;
      return {
        stage: stage.stage,
        enteredAt: stage.enteredAt,
        duration: duration > 0 ? `${duration} \u5206\u9418` : "\u9032\u884C\u4E2D"
      };
    });
    let outcome = "\u9032\u884C\u4E2D";
    if (execution.status === "completed") {
      const finalStage = execution.conversionFunnel?.currentStage;
      if (finalStage === "conversion") {
        outcome = "\u2705 \u8F49\u5316\u6210\u529F";
      } else if (execution.stats.interestScore < 30) {
        outcome = "\u274C \u672A\u8F49\u5316 - \u8208\u8DA3\u5EA6\u4F4E";
      } else {
        outcome = "\u23F8\uFE0F \u672A\u8F49\u5316 - \u5F85\u8DDF\u9032";
      }
    }
    return {
      summary: {
        goal: execution.goal,
        mode: execution.mode,
        duration: durationMinutes > 60 ? `${Math.floor(durationMinutes / 60)} \u5C0F\u6642 ${durationMinutes % 60} \u5206\u9418` : `${durationMinutes} \u5206\u9418`,
        messagesSent: execution.stats.messagesSent,
        responsesReceived: execution.stats.responsesReceived,
        analysisCount: execution.stats.analysisCount,
        finalInterestScore: execution.stats.interestScore,
        outcome
      },
      rolePerformance,
      funnelProgress,
      keyMoments: execution.conversionFunnel?.keyMoments || [],
      aiAdjustments: []
      // TODO: 從執行歷史提取
    };
  }
  /**
   * 獲取所有執行的統計摘要
   */
  getOverallStats() {
    const executions = this._executions();
    const completed = executions.filter((e) => e.status === "completed");
    const converted = completed.filter((e) => e.conversionFunnel?.currentStage === "conversion");
    const totalMessages = executions.reduce((sum, e) => sum + e.stats.messagesSent, 0);
    const totalInterest = executions.reduce((sum, e) => sum + e.stats.interestScore, 0);
    const modeCount = {};
    for (const e of executions) {
      modeCount[e.mode] = (modeCount[e.mode] || 0) + 1;
    }
    const goalCount = {};
    for (const e of executions) {
      const goal = e.goal.substring(0, 20);
      goalCount[goal] = (goalCount[goal] || 0) + 1;
    }
    return {
      totalExecutions: executions.length,
      completedExecutions: completed.length,
      conversionRate: completed.length > 0 ? Math.round(converted.length / completed.length * 100) : 0,
      avgMessagesPerExecution: executions.length > 0 ? Math.round(totalMessages / executions.length) : 0,
      avgInterestScore: executions.length > 0 ? Math.round(totalInterest / executions.length) : 0,
      modeDistribution: Object.entries(modeCount).map(([mode, count]) => ({ mode, count })),
      topGoals: Object.entries(goalCount).map(([goal, count]) => ({ goal, count })).sort((a, b) => b.count - a.count).slice(0, 5)
    };
  }
  // ============ 輔助方法 ============
  extractTargetAudience(input) {
    if (input.includes("\u7FA4"))
      return "\u7FA4\u6210\u54E1";
    if (input.includes("\u5BA2\u6236"))
      return "\u6F5B\u5728\u5BA2\u6236";
    if (input.includes("\u8001"))
      return "\u8001\u5BA2\u6236";
    return "\u76EE\u6A19\u7528\u6236";
  }
  extractProductType(input) {
    if (input.includes("\u8AB2\u7A0B") || input.includes("\u6559\u80B2"))
      return "\u6559\u80B2\u8AB2\u7A0B";
    if (input.includes("\u7522\u54C1"))
      return "\u5BE6\u9AD4\u7522\u54C1";
    if (input.includes("\u670D\u52D9"))
      return "\u670D\u52D9\u985E";
    return "\u7522\u54C1/\u670D\u52D9";
  }
  determineUrgency(input) {
    if (input.includes("\u99AC\u4E0A") || input.includes("\u7ACB\u5373") || input.includes("\u4ECA\u5929"))
      return "high";
    if (input.includes("\u76E1\u5FEB") || input.includes("\u9019\u9031"))
      return "medium";
    return "low";
  }
  suggestDuration(type) {
    const durations = {
      sales_conversion: "3-7\u5929",
      churn_recovery: "1-3\u5929",
      community_activation: "\u6301\u7E8C\u9032\u884C",
      customer_support: "\u5373\u6642\u8655\u7406",
      brand_promotion: "\u6301\u7E8C\u9032\u884C",
      lead_nurturing: "2-4\u9031",
      custom: "\u6839\u64DA\u60C5\u6CC1\u8ABF\u6574"
    };
    return durations[type];
  }
  analyzeSentiment(messages) {
    const text = messages.map((m) => m.content).join(" ");
    const positiveWords = ["\u597D", "\u68D2", "\u559C\u6B61", "\u8B1D\u8B1D", "\u611F\u8B1D", "\u8B9A", "\u4E0D\u932F"];
    const negativeWords = ["\u4E0D\u597D", "\u5DEE", "\u5931\u671B", "\u751F\u6C23", "\u6295\u8A34", "\u9000", "\u721B"];
    const positiveCount = positiveWords.filter((w) => text.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => text.includes(w)).length;
    if (positiveCount > negativeCount)
      return "positive";
    if (negativeCount > positiveCount)
      return "negative";
    return "neutral";
  }
  extractInterests(messages) {
    const interests = [];
    const text = messages.map((m) => m.content).join(" ");
    if (text.includes("\u50F9\u683C") || text.includes("\u591A\u5C11\u9322"))
      interests.push("\u50F9\u683C\u654F\u611F");
    if (text.includes("\u6548\u679C") || text.includes("\u6709\u7528\u55CE"))
      interests.push("\u6548\u679C\u95DC\u6CE8");
    if (text.includes("\u600E\u9EBC\u7528") || text.includes("\u4F7F\u7528"))
      interests.push("\u4F7F\u7528\u65B9\u6CD5");
    return interests;
  }
  extractObjections(messages) {
    const objections = [];
    const text = messages.map((m) => m.content).join(" ");
    if (text.includes("\u592A\u8CB4") || text.includes("\u8CB4\u4E86"))
      objections.push("\u50F9\u683C\u9867\u616E");
    if (text.includes("\u6C92\u7528") || text.includes("\u4E0D\u9700\u8981"))
      objections.push("\u9700\u6C42\u4E0D\u660E\u78BA");
    if (text.includes("\u8003\u616E") || text.includes("\u518D\u8AAA"))
      objections.push("\u6C7A\u7B56\u7336\u8C6B");
    return objections;
  }
  calculateReadiness(messages, sentiment) {
    let score = 30;
    const text = messages.map((m) => m.content).join(" ");
    if (text.includes("\u600E\u9EBC\u8CB7") || text.includes("\u5728\u54EA\u8CB7"))
      score += 30;
    if (text.includes("\u591A\u5C11\u9322") || text.includes("\u50F9\u683C"))
      score += 20;
    if (text.includes("\u6709\u6D3B\u52D5\u55CE") || text.includes("\u512A\u60E0"))
      score += 15;
    if (sentiment === "positive")
      score += 10;
    if (text.includes("\u4E0D\u9700\u8981") || text.includes("\u4E0D\u7528\u4E86"))
      score -= 20;
    if (sentiment === "negative")
      score -= 15;
    return Math.max(0, Math.min(100, score));
  }
  generateSuggestions(sentiment, readiness, interests) {
    let nextAction = "continue";
    let recommendedRole = "friendly_member";
    let topicSuggestion = "\u7E7C\u7E8C\u8F15\u9B06\u804A\u5929";
    let toneAdjustment = "\u4FDD\u6301\u53CB\u597D";
    let reasoning = "\u5C0D\u8A71\u9032\u884C\u6B63\u5E38";
    if (readiness > 70) {
      nextAction = "close";
      recommendedRole = "sales_expert";
      topicSuggestion = "\u7522\u54C1\u50F9\u503C\u548C\u512A\u60E0";
      toneAdjustment = "\u53EF\u4EE5\u66F4\u76F4\u63A5";
      reasoning = "\u5BA2\u6236\u6E96\u5099\u5EA6\u9AD8\uFF0C\u53EF\u4EE5\u4FC3\u55AE";
    } else if (sentiment === "negative") {
      nextAction = "pause";
      recommendedRole = "cs_agent";
      topicSuggestion = "\u95DC\u5FC3\u548C\u50BE\u807D";
      toneAdjustment = "\u66F4\u52A0\u6EAB\u548C\u8010\u5FC3";
      reasoning = "\u5BA2\u6236\u60C5\u7DD2\u8CA0\u9762\uFF0C\u9700\u8981\u95DC\u61F7";
    } else if (interests.includes("\u50F9\u683C\u654F\u611F")) {
      nextAction = "escalate";
      recommendedRole = "sales_expert";
      topicSuggestion = "\u50F9\u503C\u512A\u5148\uFF0C\u518D\u8AC7\u50F9\u683C";
      reasoning = "\u5BA2\u6236\u95DC\u6CE8\u50F9\u683C\uFF0C\u9700\u8981\u5F37\u8ABF\u50F9\u503C";
    }
    return { nextAction, recommendedRole, topicSuggestion, toneAdjustment, reasoning };
  }
  // ============ 🆕 動態分析閉環 ============
  /**
   * P1: 執行動態分析（每 N 條消息觸發）
   */
  async performDynamicAnalysis(execution) {
    if (!execution.messageHistory || execution.messageHistory.length === 0)
      return;
    console.log("[DynamicEngine] \u57F7\u884C\u52D5\u614B\u5206\u6790...");
    const recentMessages = execution.messageHistory.slice(-this.analysisInterval);
    const analysis = await this.analyzeConversation(recentMessages);
    execution.stats.lastAnalysis = analysis;
    execution.stats.analysisCount++;
    execution.stats.interestScore = analysis.userProfile.readinessScore;
    const adjustment = this.makeAutoAdjustment(execution, analysis);
    if (adjustment.shouldAdjust) {
      execution.stats.autoAdjustments++;
      this.toast.info(`\u{1F4CA} \u7B2C ${execution.stats.analysisCount} \u6B21\u5206\u6790: ${adjustment.reason}`);
      this.ipc.send("ai-team:adjust-strategy", {
        executionId: execution.id,
        adjustment
      });
    }
    this.updateFunnelFromAnalysis(execution, analysis);
    this._currentExecution.set(__spreadValues({}, execution));
    this._executions.update((list) => list.map((e) => e.id === execution.id ? execution : e));
  }
  /**
   * 自動調整決策
   */
  makeAutoAdjustment(execution, analysis) {
    const { suggestions, userProfile } = analysis;
    if (userProfile.readinessScore > 70 && execution.strategy) {
      const nextPhase = Math.min(execution.stats.currentPhase + 1, execution.strategy.phases.length - 1);
      if (nextPhase > execution.stats.currentPhase) {
        return {
          shouldAdjust: true,
          action: "advance_phase",
          reason: `\u5BA2\u6236\u8208\u8DA3\u5EA6 ${userProfile.readinessScore}%\uFF0C\u63A8\u9032\u5230\u4FC3\u55AE\u968E\u6BB5`,
          newPhase: nextPhase
        };
      }
    }
    if (userProfile.sentiment === "negative") {
      return {
        shouldAdjust: true,
        action: "switch_role",
        reason: "\u5BA2\u6236\u60C5\u7DD2\u8CA0\u9762\uFF0C\u5207\u63DB\u5230\u95DC\u61F7\u6A21\u5F0F",
        newRole: "cs_agent"
      };
    }
    if (userProfile.engagementLevel === "low" && execution.stats.messagesSent > 5) {
      return {
        shouldAdjust: true,
        action: "activate_atmosphere",
        reason: "\u4E92\u52D5\u5EA6\u4F4E\uFF0C\u5F15\u5165\u6D3B\u8E8D\u89D2\u8272",
        newRole: "friendly_member"
      };
    }
    if (userProfile.objections.includes("\u50F9\u683C\u9867\u616E")) {
      return {
        shouldAdjust: true,
        action: "handle_objection",
        reason: "\u5BA2\u6236\u6709\u50F9\u683C\u9867\u616E\uFF0C\u5F15\u5165\u5C08\u5BB6\u8655\u7406",
        newRole: "sales_expert"
      };
    }
    return { shouldAdjust: false, action: "continue", reason: "\u4FDD\u6301\u7576\u524D\u7B56\u7565" };
  }
  /**
   * 根據分析更新轉化漏斗
   */
  updateFunnelFromAnalysis(execution, analysis) {
    if (!execution.conversionFunnel)
      return;
    const { readinessScore, interests } = analysis.userProfile;
    const currentStage = execution.conversionFunnel.currentStage;
    if (currentStage === "response" && interests.length > 0) {
      this.updateConversionStage(execution, "interest", "\u5BA2\u6236\u8868\u73FE\u51FA\u8208\u8DA3");
    } else if (currentStage === "interest" && readinessScore > 60) {
      this.updateConversionStage(execution, "intent", "\u5BA2\u6236\u6709\u8CFC\u8CB7\u610F\u5411");
    } else if (currentStage === "intent" && readinessScore > 85) {
      this.updateConversionStage(execution, "conversion", "\u5373\u5C07\u6210\u4EA4");
    }
  }
  /**
   * 更新轉化階段
   */
  updateConversionStage(execution, newStage, trigger) {
    if (!execution.conversionFunnel)
      return;
    const messageCount = execution.messageHistory?.length || 0;
    execution.conversionFunnel.currentStage = newStage;
    execution.conversionFunnel.stageHistory.push({
      stage: newStage,
      enteredAt: (/* @__PURE__ */ new Date()).toISOString(),
      messageCount
    });
    execution.conversionFunnel.keyMoments.push({
      message: trigger,
      trigger: `\u9032\u5165 ${newStage} \u968E\u6BB5`,
      stage: newStage,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`[DynamicEngine] \u8F49\u5316\u6F0F\u6597: ${newStage}`, trigger);
  }
  /**
   * 🆕 P1: 檢測轉化信號
   */
  detectConversionSignal(message) {
    const lowerMsg = message.toLowerCase();
    for (const keyword of this.conversionSignals.converted) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: "converted", matchedKeyword: keyword, score: 100 };
      }
    }
    for (const keyword of this.conversionSignals.high) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: "high", matchedKeyword: keyword, score: 85 };
      }
    }
    for (const keyword of this.conversionSignals.medium) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: "medium", matchedKeyword: keyword, score: 60 };
      }
    }
    for (const keyword of this.conversionSignals.positive) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: "positive", matchedKeyword: keyword, score: 40 };
      }
    }
    for (const keyword of this.conversionSignals.negative) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: "negative", matchedKeyword: keyword, score: -30 };
      }
    }
    return { hasSignal: false, signalType: null, matchedKeyword: null, score: 0 };
  }
  /**
   * 🆕 P1: 處理轉化信號
   */
  handleConversionSignal(execution, customerData, signal2) {
    console.log("[DynamicEngine] \u{1F3AF} \u8F49\u5316\u4FE1\u865F:", signal2);
    if (execution.conversionFunnel) {
      execution.conversionFunnel.keyMoments.push({
        message: customerData.text,
        trigger: `${signal2.signalType}: ${signal2.matchedKeyword}`,
        stage: signal2.signalType || "unknown",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    switch (signal2.signalType) {
      case "converted":
        this.toast.success(`\u{1F389} \u5BA2\u6236 ${customerData.firstName || "\u7528\u6236"} \u5DF2\u6210\u4EA4\uFF01`);
        this.updateConversionStage(execution, "conversion", customerData.text);
        if (this.completeCurrentUser) {
          this.completeCurrentUser("converted");
        }
        break;
      case "high":
        this.toast.success(`\u{1F3AF} \u9AD8\u8F49\u5316\u4FE1\u865F\uFF01${customerData.firstName || "\u7528\u6236"}: "${signal2.matchedKeyword}"`);
        this.updateConversionStage(execution, "intent", customerData.text);
        this.ipc.send("ai-team:conversion-signal", {
          executionId: execution.id,
          userId: customerData.userId,
          userName: customerData.firstName || customerData.username,
          signal: signal2.matchedKeyword,
          signalType: signal2.signalType,
          score: signal2.score
        });
        break;
      case "medium":
        this.updateConversionStage(execution, "interest", customerData.text);
        break;
      case "positive":
        if (execution.conversionFunnel?.currentStage === "contact") {
          this.updateConversionStage(execution, "response", customerData.text);
        }
        break;
      case "negative":
        this.toast.warning(`\u26A0\uFE0F \u5BA2\u6236 ${customerData.firstName || "\u7528\u6236"} \u8868\u9054\u4E86\u62D2\u7D55\u610F\u5411`);
        break;
    }
    this._currentExecution.set(__spreadValues({}, execution));
  }
  /**
   * 🆕 更新意向評分
   */
  updateIntentScore(execution, message) {
    const signal2 = this.detectConversionSignal(message);
    if (signal2.score !== 0) {
      execution.stats.interestScore = Math.max(0, Math.min(100, (execution.stats.interestScore || 0) + signal2.score));
      this._currentExecution.set(__spreadValues({}, execution));
    }
  }
  /**
   * 檢查轉化信號（無劇本模式）- 舊版兼容
   */
  async checkConversionSignals(execution, customerMessage) {
    if (!execution.scriptlessConfig)
      return;
    const lowerMsg = customerMessage.toLowerCase();
    const hasConversionSignal = execution.scriptlessConfig.targetConversionSignals.some((signal2) => lowerMsg.includes(signal2));
    if (hasConversionSignal) {
      console.log("[DynamicEngine] \u6AA2\u6E2C\u5230\u8F49\u5316\u4FE1\u865F:", customerMessage);
      execution.conversionFunnel?.keyMoments.push({
        message: customerMessage,
        trigger: "\u8F49\u5316\u4FE1\u865F",
        stage: "conversion_signal",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      this.ipc.send("ai-team:conversion-signal", {
        executionId: execution.id,
        signal: customerMessage,
        recommendedRole: "sales_expert"
      });
      this.toast.success("\u{1F3AF} \u6AA2\u6E2C\u5230\u8F49\u5316\u4FE1\u865F\uFF01\u6B63\u5728\u5B89\u6392\u92B7\u552E\u5C08\u5BB6\u8DDF\u9032...");
    }
    const hasSuccessSignal = execution.scriptlessConfig.exitConditions.successSignals.some((signal2) => lowerMsg.includes(signal2));
    if (hasSuccessSignal) {
      console.log("[DynamicEngine] \u6AA2\u6E2C\u5230\u6210\u529F\u4FE1\u865F:", customerMessage);
      this.updateConversionStage(execution, "conversion", customerMessage);
      this.toast.success("\u{1F389} \u606D\u559C\uFF01\u5BA2\u6236\u5DF2\u8F49\u5316\u6210\u529F\uFF01");
    }
    this._currentExecution.set(__spreadValues({}, execution));
  }
  // ============ 🆕 無劇本模式對話生成 ============
  /**
   * P0: 無劇本模式 - AI 自主生成下一條對話
   */
  async generateScriptlessMessage(execution) {
    if (execution.mode !== "scriptless" || !execution.scriptlessConfig?.enabled) {
      return null;
    }
    const lastAnalysis = execution.stats.lastAnalysis;
    const messageHistory = execution.messageHistory || [];
    const currentPhase = execution.stats.currentPhase;
    const selectedRole = this.selectRoleForScriptless(execution, lastAnalysis);
    if (!selectedRole)
      return null;
    const prompt = this.buildScriptlessPrompt(execution, selectedRole, messageHistory);
    return new Promise((resolve) => {
      this.ipc.send("ai-team:generate-scriptless-message", {
        executionId: execution.id,
        roleId: selectedRole.id,
        roleName: selectedRole.name,
        rolePersonality: selectedRole.personality,
        roleSpeakingStyle: selectedRole.speakingStyle,
        prompt,
        context: {
          goal: execution.goal,
          intent: execution.intent,
          messageCount: messageHistory.length,
          interestScore: execution.stats.interestScore,
          currentStage: execution.conversionFunnel?.currentStage
        }
      });
      this.ipc.once("ai-team:scriptless-message-generated", (data) => {
        if (data.executionId === execution.id) {
          resolve({
            roleId: selectedRole.id,
            roleName: selectedRole.name,
            content: data.content,
            reasoning: data.reasoning || "\u6839\u64DA\u4E0A\u4E0B\u6587\u81EA\u52D5\u751F\u6210"
          });
        } else {
          resolve(null);
        }
      });
      setTimeout(() => resolve(null), 3e4);
    });
  }
  /**
   * 為無劇本模式選擇角色
   */
  selectRoleForScriptless(execution, analysis) {
    if (execution.roles.length === 0)
      return null;
    if (analysis?.suggestions.recommendedRole) {
      const recommended = execution.roles.find((r) => r.id === analysis.suggestions.recommendedRole);
      if (recommended)
        return recommended;
    }
    const recentRoles = (execution.messageHistory || []).slice(-3).filter((m) => !m.isFromCustomer).map((m) => m.role);
    const lastRole = recentRoles[recentRoles.length - 1];
    const sameRoleCount = recentRoles.filter((r) => r === lastRole).length;
    if (sameRoleCount >= 3) {
      const otherRoles = execution.roles.filter((r) => r.id !== lastRole);
      if (otherRoles.length > 0) {
        return otherRoles[Math.floor(Math.random() * otherRoles.length)];
      }
    }
    const stage = execution.conversionFunnel?.currentStage;
    if (stage === "interest" || stage === "intent") {
      const expert = execution.roles.find((r) => r.type === "professional");
      if (expert)
        return expert;
    }
    return execution.roles[0];
  }
  /**
   * 構建無劇本模式 Prompt
   */
  buildScriptlessPrompt(execution, role, messageHistory) {
    const recentMessages = messageHistory.slice(-20);
    const historyText = recentMessages.map((m) => `${m.isFromCustomer ? "\u3010\u5BA2\u6236\u3011" : `\u3010${m.role}\u3011`}: ${m.content}`).join("\n");
    const stage = execution.conversionFunnel?.currentStage || "contact";
    const stageGoals = {
      "contact": "\u5EFA\u7ACB\u806F\u7E6B\uFF0C\u81EA\u7136\u958B\u5834",
      "response": "\u4FDD\u6301\u4E92\u52D5\uFF0C\u4E86\u89E3\u9700\u6C42",
      "interest": "\u6DF1\u5165\u4ECB\u7D39\uFF0C\u5F37\u8ABF\u50F9\u503C",
      "intent": "\u8655\u7406\u7570\u8B70\uFF0C\u63A8\u52D5\u6C7A\u7B56",
      "conversion": "\u4FC3\u6210\u6210\u4EA4\uFF0C\u78BA\u8A8D\u8A02\u55AE"
    };
    return `\u4F60\u662F ${role.name}\uFF0C${role.personality}\u3002

\u3010\u8AAA\u8A71\u98A8\u683C\u3011
${role.speakingStyle}

\u3010\u7576\u524D\u76EE\u6A19\u3011
${execution.goal}

\u3010\u7576\u524D\u968E\u6BB5\u3011
${stage} - ${stageGoals[stage] || "\u7E7C\u7E8C\u5C0D\u8A71"}

\u3010\u5BA2\u6236\u8208\u8DA3\u5EA6\u3011
${execution.stats.interestScore}/100

\u3010\u5C0D\u8A71\u6B77\u53F2\u3011
${historyText || "\uFF08\u66AB\u7121\u5C0D\u8A71\uFF09"}

\u3010\u4EFB\u52D9\u3011
\u4F5C\u70BA ${role.name}\uFF0C\u6839\u64DA\u4E0A\u4E0B\u6587\u751F\u6210\u4E00\u689D\u81EA\u7136\u7684\u56DE\u8986\u3002
- \u4FDD\u6301\u89D2\u8272\u4EBA\u8A2D
- \u63A8\u9032\u5C0D\u8A71\u76EE\u6A19
- \u4E0D\u8981\u751F\u786C\u63A8\u92B7
- \u50CF\u771F\u4EBA\u804A\u5929\u4E00\u6A23\u81EA\u7136
- \u55AE\u689D\u6D88\u606F\u4E0D\u8D85\u904E 100 \u5B57

\u8ACB\u76F4\u63A5\u8F38\u51FA\u6D88\u606F\u5167\u5BB9\uFF0C\u4E0D\u8981\u6709\u4EFB\u4F55\u524D\u7DB4\u6216\u89E3\u91CB\uFF1A`;
  }
  // ============ 執行控制 ============
  /**
   * 確認並開始執行
   */
  confirmAndStart(executionId) {
    const execution = this._executions().find((e) => e.id === executionId);
    if (!execution)
      return false;
    execution.status = "running";
    this._currentExecution.set(execution);
    this._executions.update((list) => list.map((e) => e.id === executionId ? execution : e));
    this.toast.success("AI \u5718\u968A\u5DF2\u958B\u59CB\u5DE5\u4F5C\uFF01");
    this.startBackendExecution(execution);
    return true;
  }
  /**
   * 🆕 P0: 開始私聊轉化執行
   * 自動發送首條消息給目標用戶
   * 🔧 Phase 7: 修復為並行發送給所有目標用戶
   */
  beginPrivateChatExecution(execution) {
    if (!execution.targetUsers || execution.targetUsers.length === 0) {
      this.toast.warning("\u6C92\u6709\u76EE\u6A19\u7528\u6236\uFF0C\u7121\u6CD5\u958B\u59CB\u79C1\u804A");
      return;
    }
    execution.status = "running";
    this._currentExecution.set(__spreadValues({}, execution));
    console.log("[DynamicEngine] \u{1F680} \u958B\u59CB\u79C1\u804A\u57F7\u884C:", {
      executionId: execution.id,
      targetUsers: execution.targetUsers.length,
      mode: execution.mode,
      roles: execution.roles?.length
    });
    this.startBackendExecution(execution);
    this.sendFirstMessageToAllUsers(execution);
    this.toast.success(`\u{1F680} \u958B\u59CB\u79C1\u804A\u8F49\u5316\uFF01\u76EE\u6A19\uFF1A${execution.targetUsers.length} \u4EBA`);
  }
  /**
   * 🔧 Phase 7: 並行發送首條消息給所有目標用戶
   */
  async sendFirstMessageToAllUsers(execution) {
    const targetUsers = execution.targetUsers || [];
    const accountMatches = execution.accountMatches || [];
    if (targetUsers.length === 0) {
      console.log("[DynamicEngine] \u7121\u76EE\u6A19\u7528\u6236");
      return;
    }
    if (accountMatches.length === 0) {
      this.toast.error("\u7121\u53EF\u7528\u5E33\u865F\u767C\u9001\u6D88\u606F");
      return;
    }
    console.log(`[DynamicEngine] \u{1F504} \u4E26\u884C\u767C\u9001\u9996\u689D\u6D88\u606F\u7D66 ${targetUsers.length} \u500B\u76EE\u6A19\u7528\u6236`);
    for (let i = 0; i < targetUsers.length; i++) {
      const targetUser = targetUsers[i];
      const accountMatch = accountMatches[i % accountMatches.length];
      const userName = targetUser.firstName || targetUser.username || targetUser.id;
      console.log(`[DynamicEngine] \u{1F4E4} \u767C\u9001\u7D66\u7528\u6236 ${i + 1}/${targetUsers.length}: ${userName}`);
      this.sendFirstMessageToUser(execution, targetUser, accountMatch, i);
      if (i < targetUsers.length - 1) {
        await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
      }
    }
    this.toast.info(`\u{1F4E4} \u5DF2\u767C\u9001\u9996\u689D\u6D88\u606F\u7D66 ${targetUsers.length} \u500B\u76EE\u6A19\u7528\u6236`);
  }
  /**
   * 🔧 Phase 7: 發送首條消息給指定用戶
   */
  async sendFirstMessageToUser(execution, targetUser, accountMatch, userIndex) {
    const userName = targetUser.firstName || targetUser.username || targetUser.id;
    const targetUserId = targetUser.telegramId || targetUser.id;
    const firstMessage = await this.generateFirstTouchMessage(execution, {
      id: targetUserId,
      name: userName
    });
    if (firstMessage) {
      this.ipc.send("ai-team:send-private-message", {
        executionId: execution.id,
        accountId: accountMatch.accountId,
        accountPhone: accountMatch.accountPhone,
        roleId: accountMatch.roleId,
        roleName: accountMatch.roleName,
        targetUserId,
        targetUserName: userName,
        content: firstMessage,
        isFirstTouch: true,
        userIndex
      });
      if (!execution.messageHistory)
        execution.messageHistory = [];
      execution.messageHistory.push({
        role: accountMatch.roleName,
        content: firstMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isFromCustomer: false
      });
      execution.stats.messagesSent++;
      this._currentExecution.set(__spreadValues({}, execution));
      console.log(`[DynamicEngine] \u2713 \u9996\u689D\u6D88\u606F\u5DF2\u767C\u9001\u7D66 ${userName}:`, firstMessage.substring(0, 50) + "...");
    }
  }
  /**
   * 🆕 P0: 發送首條觸達消息
   */
  async sendFirstMessage(execution) {
    const currentUser = execution.queue?.currentUser;
    if (!currentUser) {
      console.log("[DynamicEngine] \u7121\u7576\u524D\u76EE\u6A19\u7528\u6236");
      return;
    }
    const firstRole = execution.roles?.[0];
    const firstMatch = execution.accountMatches?.find((m) => m.roleId === firstRole?.id) || execution.accountMatches?.[0];
    if (!firstMatch) {
      this.toast.error("\u7121\u53EF\u7528\u5E33\u865F\u767C\u9001\u6D88\u606F");
      return;
    }
    const firstMessage = await this.generateFirstTouchMessage(execution, currentUser);
    if (firstMessage) {
      this.ipc.send("ai-team:send-private-message", {
        executionId: execution.id,
        accountId: firstMatch.accountId,
        accountPhone: firstMatch.accountPhone,
        roleId: firstMatch.roleId,
        roleName: firstMatch.roleName,
        targetUserId: currentUser.id,
        targetUserName: currentUser.name,
        content: firstMessage,
        isFirstTouch: true
      });
      if (!execution.messageHistory)
        execution.messageHistory = [];
      execution.messageHistory.push({
        role: firstMatch.roleName,
        content: firstMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isFromCustomer: false
      });
      execution.stats.messagesSent++;
      this._currentExecution.set(__spreadValues({}, execution));
      console.log("[DynamicEngine] \u9996\u689D\u6D88\u606F\u5DF2\u767C\u9001:", firstMessage.substring(0, 50) + "...");
    }
  }
  /**
   * 🆕 P0: 生成首次觸達消息
   */
  async generateFirstTouchMessage(execution, targetUser) {
    if (execution.marketingData?.messageTemplates?.firstTouch) {
      return execution.marketingData.messageTemplates.firstTouch.replace("{name}", targetUser.name).replace("{goal}", execution.goal);
    }
    return new Promise((resolve) => {
      const prompt = `\u4F60\u662F\u4E00\u500B\u5C08\u696D\u7684\u5BA2\u6236\u7D93\u7406\uFF0C\u9700\u8981\u4E3B\u52D5\u806F\u7E6B\u4E00\u4F4D\u6F5B\u5728\u5BA2\u6236\u3002

\u76EE\u6A19\uFF1A${execution.goal}
\u5BA2\u6236\u540D\u7A31\uFF1A${targetUser.name}

\u8ACB\u751F\u6210\u4E00\u689D\u7C21\u77ED\u3001\u53CB\u597D\u3001\u81EA\u7136\u7684\u9996\u6B21\u554F\u5019\u6D88\u606F\u3002\u8981\u6C42\uFF1A
1. \u4E0D\u8981\u592A\u92B7\u552E\u5316\uFF0C\u50CF\u670B\u53CB\u4E00\u6A23\u6253\u62DB\u547C
2. \u53EF\u4EE5\u63D0\u53CA\u5C0D\u65B9\u53EF\u80FD\u611F\u8208\u8DA3\u7684\u8A71\u984C
3. \u7C21\u77ED\uFF081-2\u53E5\u8A71\uFF09
4. \u5F15\u8D77\u5C0D\u65B9\u56DE\u8986\u7684\u8208\u8DA3

\u76F4\u63A5\u8F38\u51FA\u6D88\u606F\u5167\u5BB9\uFF1A`;
      this.ipc.send("ai:generate-text", {
        prompt,
        maxTokens: 100,
        callback: "ai-team:first-message-generated"
      });
      const timeout = setTimeout(() => {
        const defaultMessage = `\u60A8\u597D\uFF01\u6211\u662F${execution.roles?.[0]?.name || "\u5BA2\u6236\u7D93\u7406"}\uFF0C\u6CE8\u610F\u5230\u60A8\u53EF\u80FD\u5C0D\u6211\u5011\u7684\u670D\u52D9\u611F\u8208\u8DA3\uFF0C\u65B9\u4FBF\u804A\u804A\u55CE\uFF1F`;
        resolve(defaultMessage);
      }, 5e3);
      const cleanup = this.ipc.on("ai-team:first-message-generated", (data) => {
        clearTimeout(timeout);
        cleanup();
        resolve(data.text || `\u60A8\u597D\uFF01\u8ACB\u554F\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u60A8\u7684\u55CE\uFF1F`);
      });
    });
  }
  /**
   * 啟動後端 AI 執行任務（增強版）
   */
  startBackendExecution(execution) {
    console.log("[DynamicEngine] \u555F\u52D5\u5F8C\u7AEF\u57F7\u884C:", execution.id, "\u6A21\u5F0F:", execution.mode);
    console.log("[DynamicEngine] \u{1F50D} \u8ABF\u8A66 - roles:", execution.roles?.length, execution.roles);
    console.log("[DynamicEngine] \u{1F50D} \u8ABF\u8A66 - accountMatches:", execution.accountMatches?.length, execution.accountMatches);
    console.log("[DynamicEngine] \u{1F50D} \u8ABF\u8A66 - targetUsers:", execution.targetUsers?.length);
    this.ipc.send("ai-team:start-execution", {
      executionId: execution.id,
      goal: execution.goal,
      intent: execution.intent,
      strategy: execution.strategy,
      roles: execution.roles,
      marketingData: execution.marketingData,
      // 🆕 新增參數
      mode: execution.mode,
      accountMatches: execution.accountMatches,
      scriptlessConfig: execution.scriptlessConfig,
      analysisInterval: this.analysisInterval,
      targetUsers: execution.targetUsers
      // 🆕 目標用戶列表
    });
    this.setupExecutionListeners(execution.id);
    if (execution.mode === "scriptless") {
      this.startScriptlessLoop(execution);
    }
  }
  /**
   * 🆕 啟動無劇本模式對話循環
   */
  async startScriptlessLoop(execution) {
    console.log("[DynamicEngine] \u555F\u52D5\u7121\u5287\u672C\u6A21\u5F0F\u5C0D\u8A71\u5FAA\u74B0");
    const firstMessage = await this.generateScriptlessMessage(execution);
    if (firstMessage) {
      this.ipc.send("ai-team:send-scriptless-message", {
        executionId: execution.id,
        roleId: firstMessage.roleId,
        content: firstMessage.content
      });
      execution.stats.messagesSent++;
      this._currentExecution.set(__spreadValues({}, execution));
    }
  }
  /**
   * 設置執行監聽器
   */
  setupExecutionListeners(executionId) {
    this.ipc.on("ai-team:message-sent", (data) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          messagesSent: data.totalSent
        });
      }
    });
    this.ipc.on("ai-team:response-received", (data) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          responsesReceived: data.totalResponses,
          interestScore: data.interestScore
        });
      }
    });
    this.ipc.on("ai-team:phase-changed", (data) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          currentPhase: data.phase
        });
        this.toast.info(`\u{1F4CA} \u9032\u5165\u968E\u6BB5 ${data.phase + 1}: ${data.phaseName}`);
      }
    });
    this.ipc.on("ai-team:execution-completed", (data) => {
      if (data.executionId === executionId) {
        this.updateExecutionStatus(executionId, "completed");
        this.toast.success(`\u{1F389} \u4EFB\u52D9\u5B8C\u6210\uFF01\u767C\u9001 ${data.totalSent} \u689D\u6D88\u606F\uFF0C\u6536\u5230 ${data.totalResponses} \u500B\u56DE\u8986`);
      }
    });
    this.ipc.on("ai-team:customer-reply", async (data) => {
      if (data.executionId === executionId) {
        console.log("[DynamicEngine] \u6536\u5230\u5BA2\u6236\u56DE\u8986:", data.firstName, data.text?.substring(0, 50));
        this.updateExecutionStats(executionId, {
          responsesReceived: data.totalResponses
        });
        const execution = this._currentExecution();
        if (execution) {
          if (!execution.messageHistory)
            execution.messageHistory = [];
          execution.messageHistory.push({
            role: "customer",
            content: data.text,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            isFromCustomer: true
          });
          this._currentExecution.set(__spreadValues({}, execution));
          const signalResult = this.detectConversionSignal(data.text);
          if (signalResult.hasSignal) {
            this.handleConversionSignal(execution, data, signalResult);
          }
          this.updateIntentScore(execution, data.text);
        }
        this.toast.info(`\u{1F4AC} \u5BA2\u6236 ${data.firstName || data.username} \u56DE\u8986\u4E86\u6D88\u606F`);
      }
    });
    this.ipc.on("ai-team:trigger-next-message", async (data) => {
      if (data.executionId === executionId) {
        console.log("[DynamicEngine] \u89F8\u767C\u4E0B\u4E00\u689D\u6D88\u606F:", data.customerName);
        const execution = this._currentExecution();
        if (!execution || execution.status !== "running")
          return;
        if (execution.mode === "scripted")
          return;
        const thinkDelay = 15e3 + Math.random() * 3e4;
        console.log(`[DynamicEngine] \u64EC\u4EBA\u5316\u5EF6\u9072 ${(thinkDelay / 1e3).toFixed(1)} \u79D2\u5F8C\u56DE\u8986`);
        await new Promise((resolve) => setTimeout(resolve, thinkDelay));
        const currentExec = this._currentExecution();
        if (!currentExec || currentExec.status !== "running")
          return;
        const messageCount = currentExec.messageHistory?.length || 0;
        if (messageCount > 0 && messageCount % this.analysisInterval === 0) {
          await this.performDynamicAnalysis(currentExec);
        }
        const selectedRole = this.selectRoleForAutoReply(currentExec, data.customerMessage);
        const match = currentExec.accountMatches?.find((m) => m.roleId === selectedRole?.id) || currentExec.accountMatches?.[0];
        if (!match) {
          console.log("[DynamicEngine] \u7121\u53EF\u7528\u5E33\u865F\u767C\u9001\u56DE\u8986");
          return;
        }
        const nextMessage = await this.generateScriptlessMessage(currentExec);
        if (nextMessage) {
          this.ipc.send("ai-team:send-private-message", {
            executionId: currentExec.id,
            accountId: match.accountId,
            accountPhone: match.accountPhone,
            roleId: match.roleId,
            roleName: match.roleName,
            targetUserId: data.customerId,
            targetUserName: data.customerName,
            content: nextMessage.content,
            isFirstTouch: false
          });
          if (!currentExec.messageHistory)
            currentExec.messageHistory = [];
          currentExec.messageHistory.push({
            role: match.roleName,
            content: nextMessage.content,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            isFromCustomer: false
          });
          currentExec.stats.messagesSent++;
          this._currentExecution.set(__spreadValues({}, currentExec));
        }
      }
    });
    this.ipc.on("ai-team:private-message-sent", (data) => {
      if (data.executionId === executionId && data.success) {
        console.log("[DynamicEngine] \u2705 \u79C1\u804A\u767C\u9001\u6210\u529F:", data.targetUserName);
      }
    });
  }
  /**
   * 🆕 智能選擇回覆角色
   */
  selectRoleForAutoReply(execution, customerMessage) {
    const roles = execution.roles || [];
    if (roles.length === 0)
      return void 0;
    if (roles.length === 1)
      return roles[0];
    const lowerMsg = customerMessage?.toLowerCase() || "";
    if (lowerMsg.includes("\u591A\u5C11\u9322") || lowerMsg.includes("\u50F9\u683C") || lowerMsg.includes("\u8CB7") || lowerMsg.includes("\u4ED8\u6B3E")) {
      return roles.find((r) => r.name.includes("\u670D\u52D9") || r.name.includes("\u5C08\u54E1")) || roles[0];
    }
    if (lowerMsg.includes("\u600E\u9EBC") || lowerMsg.includes("\u5982\u4F55") || lowerMsg.includes("\u4EC0\u9EBC")) {
      return roles.find((r) => r.name.includes("\u5C08\u5BB6") || r.name.includes("\u9867\u554F")) || roles[0];
    }
    const recentRoles = (execution.messageHistory || []).filter((m) => !m.isFromCustomer).slice(-3).map((m) => m.role);
    const lastRole = recentRoles[recentRoles.length - 1];
    const availableRoles = roles.filter((r) => r.name !== lastRole);
    return availableRoles.length > 0 ? availableRoles[Math.floor(Math.random() * availableRoles.length)] : roles[0];
  }
  /**
   * 更新執行統計
   */
  updateExecutionStats(executionId, updates) {
    const execution = this._executions().find((e) => e.id === executionId);
    if (!execution)
      return;
    execution.stats = __spreadValues(__spreadValues({}, execution.stats), updates);
    this._executions.update((list) => list.map((e) => e.id === executionId ? execution : e));
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(execution);
    }
  }
  /**
   * 暫停執行
   */
  pauseExecution(executionId) {
    return this.updateExecutionStatus(executionId, "paused");
  }
  /**
   * 恢復執行
   */
  resumeExecution(executionId) {
    return this.updateExecutionStatus(executionId, "running");
  }
  /**
   * 停止執行
   */
  stopExecution(executionId) {
    return this.updateExecutionStatus(executionId, "completed");
  }
  updateExecutionStatus(executionId, status) {
    const execution = this._executions().find((e) => e.id === executionId);
    if (!execution)
      return false;
    execution.status = status;
    this._executions.update((list) => list.map((e) => e.id === executionId ? execution : e));
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(execution);
    }
    return true;
  }
  // ============ 🆕 任務隊列管理 ============
  /**
   * 標記當前用戶完成並移動到下一個
   */
  completeCurrentUser(result) {
    const execution = this._currentExecution();
    if (!execution?.queue?.currentUser)
      return false;
    const currentUser = execution.queue.currentUser;
    const startTime = new Date(currentUser.startTime).getTime();
    const duration = Math.round((Date.now() - startTime) / 1e3);
    execution.queue.completedUsers.push({
      id: currentUser.id,
      name: currentUser.name,
      result,
      messagesExchanged: execution.messageHistory?.length || 0,
      duration
    });
    execution.queue.processedUsers++;
    this.ipc.send("ai-team:user-completed", {
      executionId: execution.id,
      userId: currentUser.id,
      result,
      duration
    });
    return this.moveToNextUser();
  }
  /**
   * 移動到隊列中的下一個用戶
   */
  moveToNextUser() {
    const execution = this._currentExecution();
    if (!execution?.queue || !execution.targetUsers)
      return false;
    const nextUserId = execution.queue.pendingUsers.shift();
    if (!nextUserId) {
      this.toast.success(`\u{1F389} \u6240\u6709 ${execution.queue.totalUsers} \u500B\u76EE\u6A19\u7528\u6236\u8655\u7406\u5B8C\u7562\uFF01`);
      execution.queue.currentUser = void 0;
      this._currentExecution.set(__spreadValues({}, execution));
      this.ipc.send("ai-team:queue-completed", {
        executionId: execution.id,
        stats: {
          total: execution.queue.totalUsers,
          completed: execution.queue.completedUsers.length,
          results: this.calculateQueueResults(execution.queue.completedUsers)
        }
      });
      return false;
    }
    const nextUser = execution.targetUsers.find((u) => String(u.id) === nextUserId);
    if (!nextUser)
      return false;
    execution.queue.currentUserIndex++;
    execution.queue.currentUser = {
      id: nextUserId,
      name: nextUser.firstName || nextUser.username || nextUserId,
      startTime: (/* @__PURE__ */ new Date()).toISOString()
    };
    execution.messageHistory = [];
    execution.conversionFunnel = {
      currentStage: "contact",
      stageHistory: [{ stage: "contact", enteredAt: (/* @__PURE__ */ new Date()).toISOString(), messageCount: 0 }],
      keyMoments: []
    };
    this._currentExecution.set(__spreadValues({}, execution));
    this.ipc.send("ai-team:next-user", {
      executionId: execution.id,
      userId: nextUserId,
      userName: execution.queue.currentUser.name,
      userIndex: execution.queue.currentUserIndex,
      remaining: execution.queue.pendingUsers.length
    });
    this.toast.info(`\u{1F4CB} \u958B\u59CB\u8655\u7406\u7B2C ${execution.queue.currentUserIndex + 1}/${execution.queue.totalUsers} \u500B\u7528\u6236\uFF1A${execution.queue.currentUser.name}`);
    return true;
  }
  /**
   * 跳過當前用戶
   */
  skipCurrentUser() {
    return this.completeCurrentUser("no_response");
  }
  /**
   * 計算隊列結果統計
   */
  calculateQueueResults(completedUsers) {
    const results = {
      converted: 0,
      interested: 0,
      neutral: 0,
      rejected: 0,
      no_response: 0
    };
    completedUsers.forEach((u) => {
      if (results[u.result] !== void 0) {
        results[u.result]++;
      }
    });
    return results;
  }
  static {
    this.\u0275fac = function DynamicScriptEngineService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _DynamicScriptEngineService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _DynamicScriptEngineService, factory: _DynamicScriptEngineService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DynamicScriptEngineService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  ROLE_TYPE_META,
  AIProviderService,
  IntentRecognitionService,
  ConversationEngineService,
  MultiRoleService,
  DynamicScriptEngineService
};
//# sourceMappingURL=chunk-UU2EWNBQ.js.map
