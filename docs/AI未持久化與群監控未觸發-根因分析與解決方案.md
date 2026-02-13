# AI 未持久化與群監控未觸發 — 根因分析與解決方案

## 一、問題概述

1. **AI 沒有持久化**：在智能引擎裡配置好本地 AI（已連接、默認）後，一切正常；但切換到其他菜單再回到智能引擎時，頂部又顯示「未配置 AI」，需要重新設置。
2. **群組發送監控詞集無響應**：監控群組、關鍵詞集、觸發規則、儀表盤狀態都顯示正常，但在群裡發包含關鍵詞的消息後，工作日誌沒有響應，「今日匹配」始終為 0，觸發規則與 AI 自動聊天沒有被觸發。

以下為根因分析與對應解決方案（先分析、後方案，不含代碼實現細節）。

---

## 二、AI 未持久化 — 根因分析

### 2.1 兩套數據源並存

系統裡與「AI 是否配置好」相關的數據有兩處：

- **ai_settings 表**：存的是「AI 自動聊天」開關、模式（全自動/半自動）、自動問候/自動回覆等。由智能引擎「引擎概覽」的「保存設置」或開關變更寫入，讀取時按當前登入用戶（tenant）隔離。
- **ai_models 表**：存的是「模型列表」— 本地 AI、雲端模型的端點、是否默認、是否已測試（is_connected）等。智能引擎「模型配置」頁的添加/測試/設為默認都寫這裡，同樣按 user_id 隔離。

而**頂部狀態徽章「AI 已連接」/「未配置 AI」**的判斷邏輯是：

- 僅依賴 **ai_models**：`是否有任意一個模型的 is_connected === true`。
- 不考慮 ai_settings 裡的開關或本地端點。

因此會出現：

- 你只在「引擎概覽」開了「全自動」、或在別處寫入了 **ai_settings**，但**沒有**在「模型配置」裡添加並測試本地 AI（即沒有在 **ai_models** 裡留下 `is_connected=1` 的記錄）→ 徽章會顯示「未配置 AI」。
- 或者：**ai_models 的數據是按 user_id 存的**，但**取數時沒有帶上當前用戶**，導致讀到的是空列表，頁面就認為「沒有已連接的模型」。

### 2.2 何時加載「模型列表」

- 模型列表（決定徽章是否「已連接」）在 **AICenterService 構造時** 延遲約 100ms 調用一次 `loadModelsFromBackend()`，之後**切換菜單再回到智能引擎並不會自動重新拉取**。
- 若**首次加載**時：
  - 處於 Web 模式且該次請求 **未帶上登入用戶（tenant）**，則後端會用 `user_id = ''` 查 ai_models，得到空列表；
  - 或當時尚未登入，也會得到空列表；
- 則前端會一直顯示「未配置 AI」。即便之後在當前頁面添加並測試了本地 AI，列表會刷新、徽章會變「已連接」，但若**之後某次**再次調用 `loadModelsFromBackend()`（例如其他入口觸發刷新）且該次請求又沒有 tenant，空列表會覆蓋當前列表，徽章又會變回「未配置 AI」。

### 2.3 小結：AI「掉線」的本質

- **表現**：切換菜單再回來，AI 又顯示未配置。
- **根因**：  
  1）**展示邏輯只認 ai_models 的「已連接」**，不認 ai_settings 的開關/端點；  
  2）**讀取 ai_models 時若缺少當前用戶上下文**（如 HTTP 請求未帶 tenant），會得到空列表；  
  3）**進入智能引擎時未強制用當前用戶重新拉取一次模型列表**，容易沿用錯誤的「空列表」或舊快取。

---

## 三、AI 未持久化 — 解決方案（思路）

1. **統一「是否已配置 AI」的判斷**  
   - 後端或前端約定：若 **ai_settings 中有有效 local_ai_endpoint**，或 **ai_models 中存在 is_connected 的模型**，任一滿足即視為「已配置」；徽章與權限判斷都按這一套來，避免兩套數據源結論不一致。

2. **保證讀取 ai_models 時帶上當前用戶**  
   - 所有獲取「我的 AI 模型列表」的接口（如 GET /api/v1/ai/models）必須在**認證/中間件層**解析當前用戶，並把 `user_id` 傳入查詢；Web 模式下要確保帶 cookie/token，且中間件對該路由生效，避免 `user_id` 為空。

3. **進入智能引擎時強制刷新模型列表**  
   - 在智能引擎頁面**每次進入時**（例如路由激活或組件 ngOnInit）調用一次 `loadModelsFromBackend()`，且使用當前登入態（帶 token/cookie），這樣切換菜單再回來會用「當前用戶」重新拉一次列表，避免沿用舊的或空列表。

4. **可選：本地 AI 與 ai_settings 同步**  
   - 若希望「只配了端點就視為已配置」，可在保存「模型配置」時，同步把 default 本地 AI 的 endpoint 寫入 ai_settings（如 local_ai_endpoint），這樣儀表盤、觸發規則等只讀 ai_settings 的邏輯也能一致認為「已配置」。

實施順序建議：先做 2 + 3（保證帶用戶 + 進入頁面刷新），可立刻緩解「切換菜單就掉線」；再做 1（統一判斷）和可選 4，從根本上消除「兩套數據源」帶來的不一致。

---

## 四、群監控未觸發 — 根因分析

### 4.1 鏈路回顧

正常鏈路應為：

1. 監控帳號（角色為「監聽」且在線）已加入某個 Telegram 群；
2. 該群在「監控群組」中，且監控已啟動（儀表盤顯示「運行中」）；
3. 後端用該帳號監聽這些群，收到群消息後與「關鍵詞集」做匹配；
4. 若匹配到關鍵詞，調用 `on_lead_captured(lead_data)`，寫入 Lead、執行問候、**觸發規則**（含 AI 智能对话）、活動等。

你當前現象：配置都齊全，但「今日匹配」為 0，工作日誌無響應 → 要麼**沒有進入「匹配」**，要麼**匹配後回調在錯誤的用戶上下文中執行**，導致寫庫/查規則失敗。

### 4.2 可能原因 1：監控回調沒有「當前用戶」上下文

- `handle_start_monitoring` 是在**當前登入用戶（如 Vivian）的請求上下文中**執行的，此時會從 DB 讀取**該用戶**的監控群組、關鍵詞集，並把 `on_lead_captured` 傳給 Telegram 客戶端。
- 但 **Telegram 收到群消息並觸發關鍵詞匹配時**，是在**異步回調**裡執行的（例如 Pyrogram 的 message handler），此時**已經脫離當時的 HTTP/WebSocket 請求**，後端通常**沒有再設置「當前用戶」**。
- 於是：`on_lead_captured` 內調用的 `db.add_lead`、`get_ai_settings`、`execute_matching_trigger_rules`（內部會查觸發規則、發送帳號等）若依賴 **get_owner_user_id()** 或 **tenant**，在回調裡得到的是**默認值（如 local_user）或空**，而不是「發起監控的 Vivian」。
- 結果：
  - 寫入的 Lead 可能歸屬到錯誤用戶；
  - 查到的觸發規則為空（因為按錯誤用戶篩）；
  - 或讀到的 AI 設置/發送帳號不是 Vivian 的，導致「看起來沒觸發」。

### 4.3 可能原因 2：監控群組 / 帳號 / 關鍵詞未對齊

- **chat_id 與「監控群組」不一致**：後端用群連結解析出 chat_id，若解析結果與 Telegram 實際發來的 chat_id 不一致（例如一個用 username、一個用數字 id），消息會被判定為「不在監控列表中」，從而不做關鍵詞匹配。
- **監控帳號未真正在群內或離線**：若監控號被移出群或掉線，收不到消息，自然不會有匹配。
- **關鍵詞集為空或未綁定**：若當時傳給 `start_monitoring` 的 keyword_sets 為空，或前後端對「綁定到該群的詞集」理解不一致，也會導致 0 匹配。

### 4.4 小結：群監控未觸發的本質

- **最可能的主因**：**Lead 回調在執行時沒有「發起監控的用戶」的租戶上下文**，導致寫 Lead、查觸發規則、讀 AI/發送配置時用錯用戶，表現為「沒有觸發、沒有日誌」。
- **次要可能**：監控群組與實際收到消息的 chat_id 不一致、監控號未在群內或離線、關鍵詞集未正確傳遞或為空。

---

## 五、群監控未觸發 — 解決方案（思路）

1. **在啟動監控時綁定「監控所屬用戶」**  
   - 在 `handle_start_monitoring` 中取得當前 `owner_user_id`（或 tenant），並在調用 `start_monitoring(..., on_lead_captured=...)` 時，**把該 user_id 一併傳入**（或通過閉包綁定），而不是讓回調「從當前請求上下文」讀取（因為回調執行時已無請求上下文）。

2. **在 on_lead_captured 開頭注入租戶**  
   - 在 `on_lead_captured(lead_data)` 的**最開始**，根據「該次監控所屬的 user_id」調用 `set_current_tenant(tenant)`（或等價的設置當前用戶的 API），在 **finally** 中再 `clear_current_tenant`，確保整段 Lead 寫入、問候、觸發規則、活動執行都在**正確用戶**下進行。這樣 `get_owner_user_id()`、觸發規則查詢、ai_settings、發送帳號都會對應到發起監控的用戶。

3. **排查 chat_id 與群組配置一致性**  
   - 在後端日誌中確認：收到群消息時列印的 `chat_id` 與「監控群組」解析得到的 chat_id 是否一致；若存在 username 與數字 id 的差異，需在解析或比較時統一處理（例如都轉成數字 id 再比）。

4. **確認監控號與關鍵詞集**  
   - 確認監控帳號在目標群內且在線；確認傳給 `start_monitoring` 的 keyword_sets 非空且包含你在群裡發送的那幾個詞；必要時在日誌中打印「監控中的 chat_id 列表」與「當前關鍵詞列表」，便於對照。

實施順序建議：**優先做 1 + 2**（回調內帶上並設置監控所屬用戶），這是解決「配置都對卻不觸發」的最關鍵一步；再結合 3、4 做一輪日誌排查，確認沒有 chat_id/群組/詞集遺漏。

---

## 六、總結對照表

| 現象 | 根因要點 | 解決方向 |
|------|----------|----------|
| 切換菜單後 AI 顯示「未配置」 | 1）徽章只認 ai_models 的 is_connected；2）讀 ai_models 時可能缺 tenant 導致空列表；3）進入智能引擎未強制按當前用戶刷新列表 | 統一「已配置」判斷；保證接口帶用戶；進入頁面強制刷新模型列表 |
| 群裡發關鍵詞無匹配、無觸發 | 1）on_lead_captured 執行時無租戶，寫 Lead/查規則/AI 用錯用戶；2）chat_id 或監控號/詞集可能未對齊 | 啟動監控時綁定 user_id，回調開頭 set_current_tenant；排查 chat_id 與詞集 |

按上述順序實施後，再配合既有「群聊未監控與 AI 未自動回覆」排查說明（監控群組、監聽/發送帳號、關鍵詞內容等）做一次完整自檢，即可系統性解決這兩類問題。

---

## 七、本輪實施結果與優化

### 7.1 已實施內容

| 項目 | 實施方式 | 文件/位置 |
|------|----------|-----------|
| **群監控回調租戶注入** | 在 `handle_start_monitoring` 中取得 `_monitoring_owner_user_id`（get_owner_user_id），在 `on_lead_captured` 開頭 `set_current_tenant(TenantContext(user_id=...))`，在 `finally` 中 `clear_current_tenant(token)` | `backend/domain/automation/monitoring_handlers_impl.py` |
| **智能引擎進入時刷新模型** | 在智能引擎組件 `ngOnInit` 中 `setTimeout(() => this.aiService.loadModelsFromBackend(), 200)` | `src/ai-center/ai-center.component.ts` |
| **統一「已配置」判斷** | 後端 GET `/api/v1/ai/models` 返回 `aiConfigured`：任一模型 `is_connected` 或 `ai_settings.local_ai_endpoint` 非空即為 true；前端 `isConnected` = 模型有已連接 \|\| `_aiConfiguredFromBackend` | `backend/api/business_routes_mixin.py`（get_ai_models_api）、`src/ai-center/ai-center.service.ts`、`src/ai-center/ai-settings.service.ts`（getModelsWithMeta） |
| **GET 模型列表無 tenant 時回退** | `get_ai_models_api` 中若 `request.tenant` 為空，則用 `get_owner_user_id()` 作為 user_id，兼容 Electron/未帶認證的請求 | `backend/api/business_routes_mixin.py` |
| **加載模型改用帶 meta 的接口** | `loadModelsFromBackend()` 改為調用 `getModelsWithMeta()`，寫入 `_aiConfiguredFromBackend`，保證徽章與後端一致 | `src/ai-center/ai-center.service.ts` |

### 7.2 在方案基礎上的細化與優化

- **回調內整段 try/finally 包住租戶**：方案只說「回調開頭 set、finally clear」，實施時將**整段** `on_lead_captured` 邏輯（含原有 try/except）都放在「設租戶後的 try」內，並在**最外層**增加 `finally` 清理 token，避免異常或提前 return 導致租戶未清理。
- **後端直接算 aiConfigured、一次請求搞定**：未採用「前端再請求 get-ai-settings 再合併」；改為在 GET 模型列表時後端順帶查 `get_ai_settings()`，計算 `aiConfigured` 並隨 `data` 一起返回，減少往返與前端邏輯。
- **IPC 路徑未改動**：REST 成功時用 `getModelsWithMeta` 並寫入 `_aiConfiguredFromBackend`；REST 失敗走 IPC 時仍用原有 `ai-models-list`，徽章依賴模型列表中的 `isConnected`，行為與之前一致。

### 7.3 小結

- **AI 持久化**：進入智能引擎必刷新模型列表 + 後端統一算並返回 `aiConfigured` + 前端徽章同時認「模型已連接」與「後端已配置」，切換菜單後不再誤顯示「未配置 AI」。
- **群監控觸發**：Lead 回調全程在「發起監控的用戶」租戶下執行，Lead 寫入、問候、觸發規則、活動、AI 設置與發送帳號均按該用戶，群內關鍵詞匹配後應能正常觸發並寫入日誌。

---

## 八、下一階段建議

1. **驗證與日誌**  
   - 在 Web 多用戶環境下：切換用戶後進入智能引擎，確認徽章與模型列表是否為當前用戶；在群內發送已綁定關鍵詞，查看後端日誌是否出現「監控所屬用戶(回調將注入): xxx」「KEYWORD MATCHED」「CAPTURING LEAD」及後續觸發規則日誌。  
   - 若仍 0 匹配：對照 `[監控群消息] chat_id=... 監控中=true/false` 與監控群組解析出的 chat_id，必要時增強日誌（例如打印監控中的 chat_id 集合與當前消息 chat_id）。

2. **可選：chat_id 統一**  
   - 若日誌顯示「監控中=false」且群確已在監控列表中，可排查「監控群組」解析得到的 chat_id（如從 t.me/xxx 解析）與 Pyrogram 回調中的 `message.chat.id` 是否一致；必要時在解析或比較處統一為數字 id 或 username，避免因類型/格式差異導致未匹配。

3. **可選：模型配置與 ai_settings 雙寫**  
   - 若希望「僅在模型配置頁添加並設默認本地 AI、不點測試」也讓儀表盤/觸發規則認為已配置，可在保存默認本地 AI 模型時同步寫入 `ai_settings.local_ai_endpoint`，與現有 `ai_models` 雙寫，保證只讀 ai_settings 的邏輯也能一致。
