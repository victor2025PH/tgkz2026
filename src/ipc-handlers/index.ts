/**
 * 🔧 Phase 9-1a: IPC Handler Registry
 *
 * Central entry point that delegates to domain-specific IPC handler modules.
 * Each module registers listeners for a specific domain using .call(this) pattern.
 *
 * Domain Split:
 *   core-ipc.ts      (~430 lines) — Connection, loading, monitoring, accounts, auth
 *   data-sync-ipc.ts (~730 lines) — Sessions, initial state, keyword/group/template/lead/funnel
 *   system-ipc.ts    (~430 lines) — System management, queue, analytics, alerts
 *   ai-ipc.ts        (~475 lines) — RAG, memory, batch ops, tags, ads, tracking
 *   resource-ipc.ts  (~720 lines) — Resource discovery, search, join, member extraction
 *   chat-ipc.ts      (~265 lines) — Ollama, local AI, discussion watcher, chat history
 */
import { setupCoreIpcHandlers } from './core-ipc';
import { setupDataSyncIpcHandlers } from './data-sync-ipc';
import { setupSystemIpcHandlers } from './system-ipc';
import { setupAiIpcHandlers } from './ai-ipc';
import { setupResourceIpcHandlers } from './resource-ipc';
import { setupChatIpcHandlers } from './chat-ipc';

export function setupAllIpcHandlers(this: any): void {
  setupCoreIpcHandlers.call(this);
  setupDataSyncIpcHandlers.call(this);
  setupSystemIpcHandlers.call(this);
  setupAiIpcHandlers.call(this);
  setupResourceIpcHandlers.call(this);
  setupChatIpcHandlers.call(this);
}
