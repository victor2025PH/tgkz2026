# Telegram 多账号管理系统 - 开发进度文档

## 第一部分：已完成的功能（Done）

### 1. 账号管理功能 ✅

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 账号 CRUD 操作 | ✅ 完成 | `backend/domain/accounts/service.py` |
| 二维码扫码登录 | ✅ 完成 | `backend/qr_auth_manager.py` |
| 账号状态监控（在线/离线/封禁） | ✅ 完成 | `backend/domain/accounts/service.py` |
| 账号分组和标签 | ✅ 完成 | `backend/database.py` (accounts 表) |
| 账号角色分配 | ✅ 完成 | 角色类型：Sender, Receiver 等 |
| 代理管理 | ✅ 完成 | `backend/ip_binding_manager.py` |
| 账号预热系统 | ✅ 完成 | `backend/warmup_manager.py` |
| 健康分数追踪 | ✅ 完成 | `backend/domain/accounts/service.py` |
| 每日发送限制 | ✅ 完成 | accounts 表 daily_send_limit 字段 |
| Session 导入/导出 | ✅ 完成 | `backend/tdata_importer.py`, `session_package.py` |

### 2. 消息处理功能 ✅

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 私信处理器 | ✅ 完成 | `backend/private_message_handler.py` |
| 群消息轮询器 | ✅ 完成 | `backend/group_message_poller.py` |
| 消息队列系统 | ✅ 完成 | `backend/core/message_queue.py` |
| 消息可靠性保障 | ✅ 完成 | `backend/core/message_reliability.py` |
| 智能回复 | ✅ 完成 | `backend/smart_reply.py` |
| AI 自动聊天 | ✅ 完成 | `backend/ai_auto_chat.py` |
| 消息模板管理 | ✅ 完成 | chat_templates 表 |
| 批量消息发送 | ✅ 完成 | `backend/ad_broadcaster.py` |
| 消息调度 | ✅ 完成 | `backend/ad_scheduler.py` |
| 媒体发送 | ✅ 完成 | `backend/telethon_media_sender.py` |

### 3. 多账号沙盒隔离 ✅

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 多租户数据库架构 | ✅ 完成 | `backend/core/tenant_database.py` |
| 租户数据库隔离 | ✅ 完成 | `tenants/tenant_{user_id}.db` |
| 独立 Session 文件 | ✅ 完成 | `backend/config.py` (get_session_path) |
| 设备参数随机化 | ✅ 完成 | `backend/device_fingerprint.py` |
| IP 粘性绑定 | ✅ 完成 | `backend/ip_binding_manager.py` |
| 独立 Pyrogram Client 实例 | ✅ 完成 | `backend/telegram_client.py` |
| 连接池管理 | ✅ 完成 | `backend/core/connection_pool.py` |

### 4. 零配置登录系统 ✅ (NEW)

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 简化添加账号页面 | ✅ 完成 | `src/add-account-simple.component.ts` |
| 平台 API 池管理 | ✅ 完成 | `backend/core/api_pool.py` |
| API 自动分配策略 | ✅ 完成 | `backend/core/api_pool_integration.py` |
| API 池数据库表 | ✅ 完成 | `backend/migrations/0024_add_platform_apis.py` |
| 管理员 API 池管理界面 | ✅ 完成 | `src/admin/api-pool-manager.component.ts` |
| API 池 REST 接口 | ✅ 完成 | `backend/api/api_pool_routes.py` |

**设计原则**：
- 用户无需了解 API 概念
- 像登录微信一样简单：手机号 → 验证码 → 完成
- 平台维护 API 池，自动分配
- 进阶选项保留给技术用户

### 4.1 API 池运维系统 ✅ (NEW - Phase 2)

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| API 使用统计服务 | ✅ 完成 | `backend/core/api_stats.py` |
| API 统计仪表板 | ✅ 完成 | `src/admin/api-stats-dashboard.component.ts` |
| API 健康检查服务 | ✅ 完成 | `backend/core/api_health.py` |
| 负载均衡器 | ✅ 完成 | `backend/core/api_health.py` |
| 告警服务 | ✅ 完成 | `backend/core/api_alerts.py` |
| 登录错误处理器 | ✅ 完成 | `backend/core/login_error_handler.py` |
| 登录成功率追踪器 | ✅ 完成 | `backend/core/login_tracker.py` |
| 统一服务管理器 | ✅ 完成 | `backend/core/api_services.py` |
| 统计路由接口 | ✅ 完成 | `backend/api/api_stats_routes.py` |

**运维能力**：
- 实时监控 API 健康状态
- 自动轮换问题 API
- 渐进式恢复策略
- 多级告警系统（信息/警告/严重/紧急）
- 智能错误分类和重试建议
- 登录成功率趋势分析
- 异常模式检测

### 4.2 企业级运维平台 ✅ (NEW - Phase 3)

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 管理员路由集成 | ✅ 完成 | `src/admin/admin.routes.ts` |
| 系统告警管理页面 | ✅ 完成 | `src/admin/system-alerts.component.ts` |
| 实时告警通知组件 | ✅ 完成 | `src/components/alert-notification.component.ts` |
| 数据持久化迁移 | ✅ 完成 | `backend/migrations/0025_add_api_stats_and_alerts.py` |
| 持久化服务 | ✅ 完成 | `backend/core/api_persistence.py` |
| 容量预警系统 | ✅ 完成 | `backend/core/capacity_monitor.py` |
| 运维审计日志 | ✅ 完成 | `backend/core/audit_service.py` |

**企业级能力**：
- 数据持久化：登录记录、告警历史、健康快照
- 容量预警：使用率阈值告警、耗尽时间预测、扩容建议
- 审计日志：全操作追踪、异常检测、安全报告
- 实时通知：多级告警弹窗、自动消失、点击跳转

### 5. 聚合聊天系统 ✅

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 统一 Dispatcher 消息监听 | ✅ 完成 | `backend/telegram_client.py` |
| 消息存储（chat_messages 表） | ✅ 完成 | `backend/database.py` |
| 账号-消息映射（user_id + account_phone） | ✅ 完成 | 多字段关联 |
| WebSocket 实时推送 | ✅ 完成 | `backend/core/realtime.py` |
| 消息索引 | ✅ 完成 | `backend/chat_history_indexer.py` |
| 前端消息展示 UI | ✅ 完成 | `src/group-search/ui/ai-assistant-panel.component.ts` |

### 5. 其他核心功能 ✅

| 功能 | 状态 | 代码位置 |
|------|------|----------|
| 用户认证与授权 | ✅ 完成 | `backend/auth/service.py` |
| 双因素认证 (2FA) | ✅ 完成 | `backend/auth/service.py` |
| OAuth 登录（Google/Telegram） | ✅ 完成 | `backend/auth/oauth_google.py` |
| 钱包系统 | ✅ 完成 | `backend/wallet/` 目录 |
| 订阅与计费 | ✅ 完成 | `backend/core/billing_service.py` |
| 配额管理 | ✅ 完成 | `backend/core/quota_service.py` |
| 使用量追踪 | ✅ 完成 | `backend/core/usage_tracker.py` |
| 管理员面板 | ✅ 完成 | `backend/admin/handlers.py` |
| 国际化支持 | ✅ 完成 | `backend/core/i18n_service.py` |

---

## 第二部分：Bug 与待优化细节（To-Do）

### ✅ 第一阶段已完成 (2026-02-05)

#### 1. ✅ Session 路径隔离 - 已修复
- **问题**: 所有 Session 文件存储在同一目录
- **解决方案**: 实现独立目录结构 `{sessions_dir}/{phone}/session.session`
- **新增文件**: `backend/config.py` - `SandboxConfig` 类
- **改动**:
  - 每个账号现在有独立的目录，包含 `session.session`、`cache/`、`temp/`、`media/`
  - 通过环境变量 `TG_ISOLATED_DIRS=true` 控制（默认启用）

#### 2. ✅ 强制代理绑定 - 已修复
- **问题**: 账号可以无代理运行
- **解决方案**: 添加 `TG_REQUIRE_PROXY` 环境变量配置
- **改动**:
  - 当 `REQUIRE_PROXY=true` 时，无代理的账号将拒绝启动
  - 返回明确的错误码 `PROXY_REQUIRED`

#### 3. ✅ 文件/缓存隔离 - 已修复
- **问题**: Pyrogram 使用共享 workdir
- **解决方案**: 每账号使用独立的 workdir
- **改动**:
  - `telegram_client.py` 现在使用 `account_workdir` 而非共享目录
  - 自动创建 `cache/`、`temp/`、`media/` 子目录

#### 4. ✅ 设备指纹持久化 - 已修复
- **问题**: 指纹每次重新计算
- **解决方案**: 添加指纹哈希和版本追踪
- **新增**:
  - `fingerprint_hash`、`fingerprint_version`、`fingerprint_created_at` 字段
  - `create_persistent_fingerprint()` 方法验证并持久化指纹
  - 数据库迁移 `0022_add_fingerprint_tracking.py`

#### 5. ✅ 并发客户端配置化 - 已修复
- **问题**: 硬编码 `MAX_CONCURRENT_CLIENTS = 5`
- **解决方案**: 通过 `TG_MAX_CONCURRENT_CLIENTS` 环境变量配置
- **默认值**: 10（可根据服务器性能调整）

#### 6. ✅ 沙盒验证服务 - 新增
- **新增文件**: `backend/core/sandbox_validator.py`
- **功能**:
  - 验证账号的沙盒隔离状态
  - 检测设备指纹完整性
  - 检查代理配置
  - 检测 IP 关联风险（同 IP 多账号警告）

### 🔒 新增配置选项

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `TG_SANDBOX_STRICT` | `false` | 启用严格沙盒模式 |
| `TG_REQUIRE_PROXY` | `false` | 强制要求代理 |
| `TG_ISOLATED_DIRS` | `true` | 使用独立目录结构 |
| `TG_PERSIST_FINGERPRINT` | `true` | 持久化设备指纹 |
| `TG_MAX_ACCOUNTS_PER_IP` | `3` | 每 IP 最大账号数 |
| `TG_MAX_CONCURRENT_CLIENTS` | `10` | 最大并发客户端数 |
| `TG_PROXY_FAILURE_THRESHOLD` | `3` | 代理失败重试阈值 |

### ✅ 第二阶段已完成 (2026-02-05) - 核心服务优化

#### 1. ✅ 账号连接池管理器 - 已实现
- **新增文件**: `backend/core/account_pool.py`
- **功能**:
  - Hot/Warm/Cold 三级分层管理
  - 智能账号提升/降级策略
  - 基于优先级的账号选择
  - 连接质量追踪
  - 冷却期管理
  - 后台维护任务

| 层级 | 用途 | 默认限制 |
|------|------|----------|
| Hot | 活跃高优先级账号，即时可用 | 5 |
| Warm | 预热账号，需要时提升到 Hot | 20 |
| Cold | 休眠账号，需要重新连接 | 无限制 |

#### 2. ✅ 错误恢复服务 - 已实现
- **新增文件**: `backend/core/error_recovery.py`
- **功能**:
  - 智能错误分类（网络/代理/认证/限流/会话/封禁等）
  - 自动恢复策略（重试/延时/切换代理/重连/冷却等）
  - 错误历史记录
  - 健康评分影响
  - 事件通知

| 错误类型 | 恢复策略 |
|----------|----------|
| 网络错误 | 指数退避重试 |
| 代理失败 | 切换代理 |
| FloodWait | 冷却期等待 |
| 会话失效 | 重新认证 |
| 账号封禁 | 禁用账号 |

#### 3. ✅ 消息聚合器增强 - 已实现
- **新增文件**: `backend/core/message_aggregator.py`
- **功能**:
  - 统一消息收集（多账号）
  - WebSocket 消息确认机制 (`ack_id`)
  - 离线消息队列
  - 用户订阅管理
  - 消息状态追踪（PENDING/DELIVERED/CONFIRMED/FAILED/EXPIRED）
  - 消息过期清理

#### 4. ✅ 监控指标服务 - 已实现
- **新增文件**: `backend/core/metrics_service.py`
- **功能**:
  - Prometheus 格式指标导出
  - 多种指标类型（Counter/Gauge/Histogram/Summary）
  - 告警规则引擎
  - 系统资源监控（CPU/内存/进程）
  - 服务指标收集（账号池/消息聚合/错误恢复）
  - 仪表盘数据聚合

#### 5. ✅ 数据库 Schema 扩展 - 已实现
- **新增文件**: `backend/migrations/0023_add_pool_management.py`
- **更新文件**: `backend/core/tenant_schema.py`
- **新增字段**:
  - `pool_tier` - 连接池层级
  - `pool_state` - 池状态
  - `pool_priority` - 优先级
  - `connection_quality` - 连接质量
  - `consecutive_failures` - 连续失败次数
  - `cooldown_until` - 冷却期结束时间
  - `cooldown_reason` - 冷却原因
  - `last_active_at` - 最后活跃时间
  - `last_message_at` - 最后消息时间
  - `messages_today` - 今日消息数
  - `messages_today_date` - 消息计数日期

#### 6. ✅ 服务初始化器 - 已实现
- **新增文件**: `backend/core/services_init.py`
- **功能**:
  - 统一服务初始化入口
  - 服务间依赖注入
  - 健康检查端点
  - 优雅关闭支持
  - 仪表盘数据聚合

### 🟢 剩余低优先级任务

#### 7. 增加 CLI 支持
- **问题**: 没有命令行界面查看聚合消息
- **建议**: 添加 CLI 工具用于调试和监控

#### 8. 消息去重增强
- **当前实现**: 使用 `{phone}:{chat_id}:{message_id}` 作为 key
- **建议**: 添加 TTL 和滑动窗口去重

#### 9. 前端仪表盘集成
- **建议**: 集成监控指标到前端 UI

---

## 第三部分：AI 接入接口设计方案

### 现有 AI 基础设施

目前系统已有以下 AI 相关组件：

| 组件 | 文件位置 | 功能 |
|------|----------|------|
| AI 自动聊天服务 | `backend/ai_auto_chat.py` | 基于规则的自动回复 |
| RAG 系统 | `backend/telegram_rag_system.py` | 检索增强生成 |
| 上下文管理器 | `backend/core/ai_context.py` | AI 上下文管理 |
| 知识学习器 | `backend/knowledge_learner.py` | 从对话中学习 |
| 预测分析 | `backend/predictive_analytics.py` | 用户行为预测 |
| AI 知识库表 | `ai_knowledge_base` | 知识存储 |
| AI 策略表 | `ai_strategies` | AI 策略配置 |
| AI 设置表 | `ai_settings` | AI 参数设置 |

### 推荐接口设计

#### 1. AI 服务抽象层

```python
# backend/ai/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, AsyncGenerator

class AIProvider(ABC):
    """AI 服务提供者抽象基类"""
    
    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """同步聊天补全"""
        pass
    
    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """流式聊天补全"""
        pass
    
    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """文本嵌入向量化"""
        pass
```

#### 2. 多 AI 提供商支持

```python
# backend/ai/providers/

# OpenAI 实现
class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, base_url: str = None):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

# Claude 实现
class ClaudeProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = AsyncAnthropic(api_key=api_key)

# 本地模型实现 (Ollama)
class OllamaProvider(AIProvider):
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
```

#### 3. AI 管理服务

```python
# backend/ai/manager.py

class AIManager:
    """AI 服务管理器"""
    
    def __init__(self):
        self.providers: Dict[str, AIProvider] = {}
        self.default_provider: Optional[str] = None
    
    def register_provider(self, name: str, provider: AIProvider):
        """注册 AI 提供者"""
        self.providers[name] = provider
    
    async def generate_reply(
        self,
        message: str,
        context: ConversationContext,
        provider: Optional[str] = None
    ) -> str:
        """生成智能回复"""
        pass
    
    async def analyze_intent(self, message: str) -> Intent:
        """意图识别"""
        pass
    
    async def sentiment_analysis(self, message: str) -> Sentiment:
        """情感分析"""
        pass
```

#### 4. 消息处理集成点

```python
# backend/private_message_handler.py

async def handle_private_message(client, message):
    # 现有逻辑...
    
    # AI 集成点
    if ai_config.auto_reply_enabled:
        # 获取对话上下文
        context = await context_manager.get_context(user_id)
        
        # 生成 AI 回复
        ai_reply = await ai_manager.generate_reply(
            message=message.text,
            context=context,
            provider=ai_config.default_provider
        )
        
        # 发送回复
        if ai_reply and should_send(ai_reply, context):
            await send_with_humanize(client, message.chat.id, ai_reply)
```

#### 5. 数据库扩展

```sql
-- 新增 AI 相关表

-- AI 提供者配置
CREATE TABLE ai_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,          -- 'openai', 'claude', 'ollama'
    api_key TEXT,                        -- 加密存储
    base_url TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI 对话日志
CREATE TABLE ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_phone TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    input_message TEXT,
    output_message TEXT,
    provider TEXT,
    model TEXT,
    tokens_used INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI 性能指标
CREATE TABLE ai_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    metric_name TEXT NOT NULL,           -- 'response_time', 'success_rate', 'tokens_per_message'
    metric_value REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. API 端点

```
POST /api/v1/ai/providers              # 添加 AI 提供者
GET  /api/v1/ai/providers              # 列出 AI 提供者
PUT  /api/v1/ai/providers/{id}         # 更新 AI 提供者
DELETE /api/v1/ai/providers/{id}       # 删除 AI 提供者

POST /api/v1/ai/test                   # 测试 AI 连接
POST /api/v1/ai/generate               # 手动生成回复
GET  /api/v1/ai/conversations          # 获取 AI 对话历史
GET  /api/v1/ai/metrics                # 获取 AI 使用指标

PUT  /api/v1/ai/settings               # 更新 AI 设置
GET  /api/v1/ai/settings               # 获取 AI 设置
```

### 下一步开发建议

1. **第一阶段**: ✅ 已完成 - 沙盒隔离优化
   - ✅ 实现独立目录结构
   - ✅ 强制代理绑定选项
   - ✅ 设备指纹持久化
   - ✅ 沙盒验证服务

2. **第二阶段**: AI 基础设施（下一步）
   - 实现 AIProvider 抽象层
   - 添加 OpenAI/Claude/Ollama 提供者
   - 创建 AI 管理服务
   - 添加 API 端点

   **具体实现步骤**:
   ```
   1. 创建 backend/ai/ 目录结构
      - backend/ai/__init__.py
      - backend/ai/base.py          # AIProvider 抽象基类
      - backend/ai/manager.py       # AI 管理服务
      - backend/ai/providers/
          - __init__.py
          - openai_provider.py
          - claude_provider.py
          - ollama_provider.py
   
   2. 实现数据库表
      - ai_providers 表
      - ai_conversations 表
      - ai_metrics 表
   
   3. 添加 API 端点
      - POST /api/v1/ai/providers
      - GET /api/v1/ai/providers
      - POST /api/v1/ai/test
      - POST /api/v1/ai/generate
   ```

3. **第三阶段**: AI 集成
   - 消息处理器集成点
   - 对话上下文增强（使用现有 RAG 系统）
   - 智能回复优化
   - 回复时机控制

4. **第四阶段**: AI 高级功能
   - 意图识别（购买意向、问题咨询、投诉等）
   - 情感分析（积极、消极、中性）
   - 个性化回复策略
   - A/B 测试框架

---

## 附录：关键代码位置索引

### 沙盒隔离相关（已优化）

| 功能 | 文件 | 说明 |
|------|------|------|
| 沙盒配置类 | `backend/config.py` | `SandboxConfig` 类 - 所有隔离配置 |
| Session 路径生成 | `backend/config.py` | `SandboxConfig.get_session_path()` |
| 账号目录管理 | `backend/config.py` | `SandboxConfig.ensure_account_dirs()` |
| 沙盒验证服务 | `backend/core/sandbox_validator.py` | 验证账号隔离状态 |
| 设备指纹生成 | `backend/device_fingerprint.py` | 包含持久化方法 |
| 指纹持久化迁移 | `backend/migrations/0022_add_fingerprint_tracking.py` | 新增字段 |
| 代理强制检查 | `backend/telegram_client.py` | 登录时检查 `REQUIRE_PROXY` |
| 隔离 workdir | `backend/telegram_client.py` | 使用 `account_workdir` |
| 租户数据库管理 | `backend/core/tenant_database.py` | 用户级别隔离 |
| IP 绑定管理 | `backend/ip_binding_manager.py` | 代理粘性绑定 |

### 聚合聊天相关

| 功能 | 文件 | 说明 |
|------|------|------|
| 消息处理器 | `backend/private_message_handler.py` | 私信处理 |
| 群消息处理 | `backend/telegram_client.py` | 群消息监控 |
| 消息存储 | `backend/database.py` | `chat_messages` 表 |
| 实时推送 | `backend/core/realtime.py` | WebSocket 服务 |
| 消息索引 | `backend/chat_history_indexer.py` | RAG 索引 |
| 前端展示 | `src/group-search/ui/ai-assistant-panel.component.ts` | UI 组件 |

### 新增文件清单（全部优化）

```
backend/
├── config.py                              # 新增 SandboxConfig 类
├── device_fingerprint.py                  # 新增持久化方法
├── telegram_client.py                     # 更新隔离逻辑
├── core/
│   ├── sandbox_validator.py               # 新增 - 沙盒验证服务
│   ├── account_pool.py                    # 新增 - 连接池管理器
│   ├── error_recovery.py                  # 新增 - 错误恢复服务
│   ├── message_aggregator.py              # 新增 - 消息聚合器
│   ├── metrics_service.py                 # 新增 - 监控指标服务
│   ├── services_init.py                   # 新增 - 服务初始化器
│   └── tenant_schema.py                   # 更新 - 新增池管理字段
├── migrations/
│   ├── 0022_add_fingerprint_tracking.py   # 新增 - 指纹追踪字段
│   └── 0023_add_pool_management.py        # 新增 - 连接池管理字段
└── ...
```

---

## 第四部分：下一阶段实施计划

### Phase 2: AI 服务深度集成 (建议下一步)

由于 AI 服务已经实现，下一步重点是将现有 AI 能力与新的核心服务集成：

#### 1. AI 与账号池集成
- AI 回复任务使用 `AccountPoolManager.select_account_for_task()` 选择最优账号
- 根据账号健康度和使用情况智能分配 AI 任务

#### 2. AI 错误处理集成
- AI 服务错误纳入 `ErrorRecoveryService` 统一处理
- AI 请求失败时自动切换提供商

#### 3. AI 消息聚合集成
- AI 生成的回复通过 `MessageAggregator` 统一推送
- 支持 AI 回复状态的实时追踪

#### 4. AI 监控集成
- AI 使用量纳入 `MetricsService` 监控
- 添加 AI 专用告警规则（成功率、延迟、配额）

### Phase 3: 前端 UI 集成

#### 1. 监控仪表盘
- 实时显示连接池状态（Hot/Warm/Cold）
- 账号健康度可视化
- 错误恢复历史

#### 2. 消息聚合 UI
- 消息确认状态显示
- 离线消息提示
- 账号筛选

#### 3. 系统告警
- 实时告警通知
- 告警历史查看
- 告警规则配置

### Phase 4: 性能优化与测试

#### 1. 负载测试
- 多账号并发测试
- 消息吞吐量测试
- 错误恢复压力测试

#### 2. 性能调优
- 连接池参数优化
- 消息队列性能
- 数据库查询优化

---

*文档生成时间: 2026-02-05*
*第一阶段优化完成: 沙盒隔离*
*第二阶段优化完成: 核心服务*
*下一阶段: AI 服务集成*
