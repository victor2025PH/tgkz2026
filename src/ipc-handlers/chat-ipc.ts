/**
 * Phase 9-1a: Ollama, local AI, first run, discussion watcher, chat history
 * Extracted from AppComponent.setupIpcListeners()
 *
 * 🔧 精簡獲客模式重構（Stage 2D）：
 * 原本的 'backend-status' / 'monitoring-status' / 'monitoring-health' 三個監聽器
 * 已搬移至 core-ipc.ts（它們服務的是全局後端狀態橫幅與監控狀態，屬於精簡模式也需要的
 * 核心/通用功能，不可與本檔案一起被精簡模式跳過註冊）。
 *
 * 🔧 精簡獲客模式重構（Stage 3 孤兒監聽器清理）：
 * 本檔案剩餘的 22 個監聽器（Ollama/本地 AI/首次運行 5 個、搜索發現關鍵詞 2 個、
 * 討論組監聽 Discussion Watcher 10 個、聊天記錄/Lead 詳情對話框 4 個、告警 1 個），
 * 經兩輪逐條追蹤讀取端後確認全部沒有任何存活的 UI 讀取者：
 *   - Ollama/本地 AI/首次運行：唯一的模板讀取處是已死的首次運行向導
 *     <app-welcome-dialog>（顯示開關 showWelcomeDialog 從未被設為 true，觸發行
 *     已被註解），現行的首次使用引導改由完全獨立、以 localStorage 判斷的
 *     <app-onboarding> 負責，與這些 signal 無關。
 *   - 討論組監聽 Discussion Watcher：全專案無任何組件引用相關 signal 或觸發方法，
 *     對應功能沒有任何 .component.ts/.html 承接。
 *   - 聊天記錄/Lead 詳情對話框：<app-lead-detail-dialog> 表面上模板綁定完好，但
 *     唯一能打開對話框的 openLeadDetailModal() 的所有呼叫者（member-extract-
 *     methods.ts 四處 + startAiChat()）本身都已無任何呼叫者，對話框實際無法打開。
 *   - 告警：this.alerts() 僅被一個同樣無人讀取的 unacknowledgedAlertsCount
 *     computed 消費，真正顯示告警的 <app-alert-notification> 改用獨立的
 *     RealtimeEventsService。
 * 因此本檔案整體已交由 setupAllIpcHandlers 依 isLeanModeActive() 條件跳過註冊；
 * 即使在非精簡模式下，這些監聽器原本也不影響任何可見功能。
 *
 * Stage 3：在確認上述孤兒狀態後，實際刪除全部 22 個監聽器的程式碼本體（而非僅跳過
 * 註冊），本檔案因此瘦身為空殼。保留 setupChatIpcHandlers 函式與 export，僅為維持
 * index.ts 既有呼叫約定不變；被刪除監聽器的完整清單與逐條判斷理由見對應任務記錄。
 */
export function setupChatIpcHandlers(this: any): void {
  // 本檔案原有的 22 個監聽器均已確認為孤兒代碼（見上方檔案頭說明），已於 Stage 3 清理階段刪除。
}
