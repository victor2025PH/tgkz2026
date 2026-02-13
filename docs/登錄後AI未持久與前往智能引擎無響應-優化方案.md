# 登錄後 AI 未持久、前往智能引擎無響應、超時提示與每用戶獨立設置 — 優化方案

## 一、現象與訴求

1. **配置好 AI 模型後，關閉網頁再次登錄**：仍彈出「没有配置AI模型」，需重新設置。
2. **點擊「前往智能引擎」按鈕**：沒有響應，沒有跳轉到智能引擎設置頁。
3. **「操作超時」提示**：出現「操作 (get-collab-stats) 操作超時」「操作 (get-role-stats) 操作超時」等，需明確含義與可選優化。
4. **每用戶獨立且長期**：智能 AI 模型設置應對當前用戶長期有效，只要不改變設置就保留；每個用戶的 AI 設置相互獨立。

---

## 二、根因與對應優化

### 2.1 登錄後仍提示「没有配置AI模型」

**根因要點：**

- **加載時機**：登錄後首屏或儀表盤在 **認證尚未完全生效**（cookie/token 未帶上或未就緒）時就請求了「模型列表 / 模型用途 / get-system-status」，後端按未認證或錯誤 user 返回空，前端 `aiConnected` / `isConnected` 為 false，表現為「未配置 AI」。
- **數據源不一致**：儀表盤與各處「未配置 AI」判斷依賴 `marketing-state.service` 的 `state.aiConnected` 或 `ai-center.service` 的 `isConnected`；若這些狀態在登錄後未被「用當前用戶重新拉取」的結果更新，會沿用空/舊緩存。
- **未在關鍵入口強刷**：進入智能引擎時雖會拉取模型與用途，但儀表盤或首屏的「是否有 AI」狀態可能來自更早的一次請求（未帶當前用戶），且之後沒有在登錄成功後延遲再拉一次。

**優化要點：**

| 方向 | 做法 |
|------|------|
| 拉取時機 | 登錄成功後延遲 200–300ms 再請求「模型列表 + 模型用途 + get-system-status」，確保請求帶上當前登入態。 |
| 關鍵入口強刷 | 進入儀表盤、智能引擎時，用當前用戶強制拉取一次 AI 配置（模型列表、model_usage、get-system-status），不依賴首屏緩存。 |
| 狀態一致 | 所有「未配置 AI」判斷統一數據源：建議以 get-system-status 的 `ai.canReply` / 模型用途為準，並在登錄後與進入上述頁面時更新 `marketing-state` 與 `ai-center` 的 isConnected/aiConnected。 |
| 後端 | 所有讀取 ai_models、ai_settings（含 model_usage）的接口必須在認證中間件中解析 **當前 user_id**，並只返回/寫入該用戶數據。 |

---

### 2.2 「前往智能引擎」按鈕無響應、不跳轉

**根因：**

- 儀表盤「前往智能引擎」調用 `navigateTo('ai-engine')`，在 viewMap 中映射為 `aiCenter`，僅調用 **NavBridgeService.navigateTo('aiCenter')**。
- NavBridge 只更新 **currentView** 信號，並同步到 UnifiedNavService；**AppComponent 中監聽 NavBridge 的 effect 只把 navView 同步為本地 currentView**，**沒有調用 Router.navigate**。
- 在 **Web 模式**下，主內容由 **RouterOutlet** 根據當前 URL 渲染；URL 未變則仍停留在儀表盤路由，因此按鈕「沒反應」。

**優化（代碼層面）：**

- 在 **AppComponent** 中，當 effect 監聽到 **NavBridge.currentView()** 變化並同步到本地 currentView 時，若該 view 在 **VIEW_ROUTE_MAP** 中有對應 path，應同時執行 **router.navigate([path])**，使 URL 與出口切換到智能引擎頁（如 `/ai-engine`）。
- 儀表盤 viewMap 中建議將 `'ai-engine'` 映射為 **`'ai-engine'`**（與路由 key 一致），以便 VIEW_ROUTE_MAP 直接命中 `/ai-engine`。

**本輪已實施**：儀表盤 viewMap 改為 `'ai-engine'` / `'ai-center'` → `'ai-engine'`；AppComponent 的 NavBridge 同步 effect 中在設置 currentView 後增加 `router.navigate([VIEW_ROUTE_MAP[navView]])`。點擊「前往智能引擎」會正確跳轉到智能引擎設置頁。

---

### 2.3 「操作超時」提示的含義與可選優化

**含義：**

- 提示來自 **core-ipc**（或等價的 Web 請求超時邏輯）：當前端發起的某次 **命令請求**（如 `get-collab-stats`、`get-role-stats`）在設定的 **超時時間內未收到後端響應** 時，會彈出「操作 (xxx) 操作超時，後端可能仍在處理，請稍候片刻後點「刷新」查看最新結果」。
- 即：**該次請求超時**，不代表功能永久失敗；後端可能仍在處理，或因負載/網絡導致響應慢。

**可選優化：**

| 方向 | 做法 |
|------|------|
| 超時時間 | 對統計類、耗時較長的接口（如 get-collab-stats、get-role-stats）適當 **增大前端超時時間**，減少正常慢響應被誤判為超時。 |
| 後端 | 對上述接口做 **緩存** 或 **優化查詢**，縮短響應時間，降低超時概率。 |
| 用戶提示 | 保持當前溫和文案（「後端可能仍在處理，請稍候後點刷新」），必要時在「協作監控中心」等頁面提供 **手動刷新** 按鈕，便於用戶在超時後重試。 |

---

### 2.4 每用戶獨立且長期的 AI 設置

**需求：**

- 智能 AI 模型設置對 **當前用戶** 長期有效；只要不主動改設置，再次登錄仍應保留。
- **每個用戶的 AI 設置相互獨立**（多租戶/多用戶下 A 的配置不影響 B）。

**要點：**

| 層面 | 做法 |
|------|------|
| 存儲 | 後端 **ai_models**、**ai_settings**（含 model_usage）均按 **user_id** 存儲與查詢；寫入、更新、刪除時都帶當前登入 user_id。 |
| 讀取 | 所有「我的 AI 配置」接口在認證後 **僅返回當前 user_id 的數據**；不讀取其他用戶或全局未隔離的鍵。 |
| 前端 | 登錄後及進入智能引擎/儀表盤時，用 **當前用戶** 拉取配置，不沿用其他用戶或空緩存；保存時明確寫入當前用戶（已由後端根據 token 解析 user_id 即可）。 |

按上述實施後，「長期有效」依賴於後端按 user 持久化 + 登錄後/關鍵入口用當前用戶拉取；「每用戶獨立」由後端按 user_id 隔離與前端不混用緩存共同保證。

---

## 三、實施優先級建議

| 優先級 | 內容 | 預期效果 |
|--------|------|----------|
| P0 | 修復「前往智能引擎」：NavBridge 同步時觸發 Router.navigate，儀表盤 viewMap 使用 'ai-engine' | 按鈕可正常跳轉至智能引擎設置頁 |
| P0 | 登錄成功後延遲再拉 AI 配置；進入儀表盤/智能引擎時用當前用戶強刷模型與用途 | 登錄後不再誤報「未配置 AI」；設置長期有效 |
| P1 | 統一「未配置 AI」判斷數據源（get-system-status / ai_can_reply），並在拉取後更新 marketing-state 與 ai-center | 各處提示一致、準確 |
| P2 | 超時：對 get-collab-stats / get-role-stats 適當增大超時或後端優化/緩存 | 減少超時提示、體驗更好 |

---

## 四、小結

- **登錄後仍提示未配置**：主要因加載時機（認證未就緒）與未在關鍵入口用當前用戶強刷；通過「登錄後延遲拉取 + 入口強刷 + 後端按 user_id」可解決。
- **前往智能引擎無響應**：因 Web 下僅更新 currentView 未觸發 Router.navigate；在 AppComponent 的 NavBridge 同步 effect 中增加 router.navigate 即可修復。
- **超時**：表示該次請求在規定時間內未收到後端響應；可通過增大超時或後端優化/緩存改善。
- **每用戶獨立長期**：後端按 user_id 存讀 + 前端登錄後與關鍵頁用當前用戶拉取、不混用緩存，即可滿足。

本方案與《AI未真正啟用與登錄重置-優化方案》中的持久化、model_usage、ai_can_reply 等一併實施，可系統性解決「配置不持久、按鈕不跳轉、超時困惑、每用戶獨立」等問題。
