/**
 * Phase 9-1a: RAG, memory, batch ops, tags, ads, tracking, campaign automation
 * Extracted from AppComponent.setupIpcListeners()
 *
 * 🔧 精簡獲客模式重構（Stage 2D → Stage 3 孤兒監聽器清理）：
 * 本檔案原有 71 個監聽器（RAG 知識庫 8 個、向量記憶 7 個、批量操作/標籤 7 個、
 * 廣告發送系統 16 個、用戶追蹤系統 13 個、營銷活動協調器 11 個、多角色協作 9 個），
 * 經兩輪逐條追蹤讀取端（signal 的所有讀取位置：模板綁定 + 其他 .ts 文件的有意義讀取）
 * 後確認，全部屬於過往重構留下的孤兒代碼：
 *   - RAG / 向量記憶：對應的新版 RagService / VectorMemoryService 已完全獨立實作
 *     （不同的 signal、不同的 IPC 事件名），舊版觸發方法與 signal 均無讀取者。
 *   - 批量操作/標籤、廣告發送、用戶追蹤：新版 leads-view.component.ts /
 *     AdSystemService / UserTrackingService 均未使用這些舊 signal，對應的舊版
 *     UI 入口（openBatchOperationMenu 等）也已無任何模板呼叫。
 *   - 營銷活動協調器、多角色協作：對應側邊欄項目已改由 Angular Router 導向獨立組件
 *     （/automation、/role-library 等），舊 signal 不再被任何畫面顯示。
 * 因此本檔案整體已交由 setupAllIpcHandlers 依 isLeanModeActive() 條件跳過註冊；
 * 即使在非精簡模式下，這些監聽器原本也不影響任何可見功能。
 *
 * Stage 3：在確認上述孤兒狀態後，實際刪除全部 71 個監聽器的程式碼本體（而非僅跳過
 * 註冊），本檔案因此瘦身為空殼。保留 setupAiIpcHandlers 函式與 export，僅為維持
 * index.ts 既有呼叫約定不變；被刪除監聽器的完整清單與逐條判斷理由見對應任務記錄。
 */
export function setupAiIpcHandlers(this: any): void {
  // 本檔案原有的 71 個監聽器均已確認為孤兒代碼（見上方檔案頭說明），已於 Stage 3 清理階段刪除。
}
