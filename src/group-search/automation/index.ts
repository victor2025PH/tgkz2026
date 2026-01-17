/**
 * TG-AI智控王 智能自動化模塊
 * Automation Module Export
 */

// AI 回覆引擎
export { 
  AIReplyEngine,
  ReplyStyle,
  ReplyLanguage,
  ReplyTemplate,
  ConversationContext,
  ConversationMessage,
  AIReplyRequest,
  AIReplyResponse,
  IntentResult,
  SentimentResult,
  ExtractedEntity
} from './ai-reply-engine';

// 意圖分析
export {
  IntentAnalyzer,
  IntentCategory,
  UrgencyLevel,
  MessageAnalysis,
  IntentPattern,
  SentimentWord
} from './intent-analyzer';

// 觸發器系統
export {
  TriggerSystem,
  TriggerEvent,
  ActionType,
  ConditionOperator,
  LogicOperator,
  Condition,
  ConditionGroup,
  TriggerAction,
  Trigger,
  TriggerContext,
  TriggerLog
} from './trigger-system';

// 工作流引擎
export {
  WorkflowEngine,
  NodeType,
  WorkflowStatus,
  ExecutionStatus,
  WorkflowNode,
  Workflow,
  WorkflowVariable,
  WorkflowExecution,
  NodeExecution
} from './workflow-engine';

// 批量操作與自動化橋接
export {
  BatchAutomationBridge,
  BatchJobConfig,
  BatchJobStatus,
  AutomationBatchContext
} from './batch-automation-bridge';
