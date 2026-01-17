/**
 * TG-AI智控王 AI 模塊導出
 * AI Module Export
 */

// 知識庫
export { 
  KnowledgeBaseService, 
  KnowledgeDocument, 
  DocumentChunk, 
  SearchResult,
  KnowledgeStats 
} from './knowledge-base.service';

// 多模型提供者
export { 
  ModelProviderService, 
  ModelConfig, 
  ModelProvider,
  ModelCapability,
  ChatMessage, 
  ChatRequest, 
  ChatResponse,
  StreamChunk,
  FunctionDefinition 
} from './model-provider.service';

// 對話記憶
export { 
  ConversationMemoryService, 
  Conversation, 
  ConversationMessage,
  UserProfile,
  UserFact,
  MemoryContext 
} from './conversation-memory.service';
