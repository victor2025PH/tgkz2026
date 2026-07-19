/**
 * 🔧 Phase 9-1a: IPC Handler Registry
 *
 * Central entry point that delegates to domain-specific IPC handler modules.
 * Each module registers listeners for a specific domain using .call(this) pattern.
 *
 * Domain Split:
 *   core-ipc.ts      (~480 lines) — Connection, loading, monitoring, accounts, auth, backend status
 *   data-sync-ipc.ts (~730 lines) — Sessions, initial state, keyword/group/template/lead/funnel
 *   system-ipc.ts    (~430 lines) — System management, queue, analytics, alerts
 *   ai-ipc.ts        (~480 lines) — RAG, memory, batch ops, tags, ads, tracking
 *   resource-ipc.ts  (~720 lines) — Resource discovery, search, join, member extraction
 *   chat-ipc.ts      (~255 lines) — Ollama, local AI, discussion watcher, chat history
 *
 * 🎯 精簡獲客模式（Stage 2D）：
 * ai-ipc.ts 與 chat-ipc.ts 逐條追蹤讀取端後確認，兩者絕大多數監聽器所寫入的
 * signal 在目前 UI 中已無任何讀取者（過往重構留下的孤兒代碼），其餘少數真正
 * 影響全局核心功能的監聽器（backend-status / monitoring-status / monitoring-health）
 * 已搬移至 core-ipc.ts 保持無條件註冊。因此這兩個檔案可以整體交由
 * isLeanModeActive() 判斷是否跳過註冊，精簡模式下不會影響 6 大核心功能
 * （儀表板/帳號管理/搜索發現/監控中心/潛在客戶/設定）。
 */
import { setupCoreIpcHandlers } from './core-ipc';
import { setupDataSyncIpcHandlers } from './data-sync-ipc';
import { setupSystemIpcHandlers } from './system-ipc';
import { setupAiIpcHandlers } from './ai-ipc';
import { setupResourceIpcHandlers } from './resource-ipc';
import { setupChatIpcHandlers } from './chat-ipc';
import { isLeanModeActive } from '../utils/lean-mode.util';

export function setupAllIpcHandlers(this: any): void {
  setupCoreIpcHandlers.call(this);
  setupDataSyncIpcHandlers.call(this);
  setupSystemIpcHandlers.call(this);
  setupResourceIpcHandlers.call(this);
  if (!isLeanModeActive()) {
    setupAiIpcHandlers.call(this);
    setupChatIpcHandlers.call(this);
  }
}
