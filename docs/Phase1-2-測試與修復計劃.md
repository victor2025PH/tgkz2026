# Phase 1 & Phase 2 測試與修復計劃

## 🎯 建議：先測試修復，再繼續 Phase 3

**原因：**
1. Phase 1 和 Phase 2 的核心功能已開發完成，但可能未經過充分測試
2. 發現了數據庫異步支持問題，可能影響遷移系統
3. 之前存在多個已知問題（數據庫損壞、登錄問題等）
4. 在穩定的基礎上繼續開發 Phase 3 更安全

---

## 🔍 關鍵問題檢查清單

### 1. 數據庫異步支持問題 ⚠️ **高優先級**

**問題：**
- `database.py` 使用同步的 `sqlite3`
- 遷移系統需要 `db._connection` (異步連接)
- 遷移可能無法正常執行

**檢查方法：**
```python
# 檢查 database.py 是否有以下方法：
- async def connect()
- self._connection (aiosqlite 連接)
```

**修復方案：**
- 添加異步數據庫支持，或
- 修改遷移系統使用同步數據庫操作

### 2. Phase 1: QR 登入功能測試

**需要測試：**
- [ ] QR 碼生成是否正常
- [ ] 掃碼後是否能成功登入
- [ ] 2FA 處理是否正常
- [ ] Session 保存是否成功
- [ ] 設備指紋生成是否正確

**測試步驟：**
1. 點擊「掃碼快速登入」按鈕
2. 選擇設備類型（隨機/iOS/Android/Desktop）
3. 可選：輸入代理
4. 生成 QR 碼
5. 使用 Telegram App 掃描
6. 驗證是否成功登入

### 3. Phase 2: IP 粘性功能測試

**需要測試：**
- [ ] IP 綁定是否正常工作
- [ ] IP 失效檢測是否觸發
- [ ] IP 自動更換是否執行
- [ ] 帳號列表是否顯示 IP 綁定信息
- [ ] 設備指紋是否在 UI 中顯示

**測試步驟：**
1. 添加帳號並綁定代理
2. 檢查帳號列表中的「🌐 IP綁定」列
3. 檢查「📱 設備」列是否顯示設備信息
4. 檢查「🔑 API」列是否顯示 API 類型

### 4. 數據庫遷移檢查

**需要檢查：**
- [ ] 遷移 0007 是否成功執行
- [ ] `api_credential_logs` 表是否存在
- [ ] `ip_change_history` 表是否存在
- [ ] `accounts` 表是否有新字段

**檢查方法：**
```sql
-- 檢查表是否存在
SELECT name FROM sqlite_master WHERE type='table' AND name='api_credential_logs';
SELECT name FROM sqlite_master WHERE type='table' AND name='ip_change_history';

-- 檢查 accounts 表字段
PRAGMA table_info(accounts);
```

### 5. 構建錯誤修復 ✅ **已修復**

**已修復：**
- ✅ `qr-login.component.ts` 的 TypeScript 類型錯誤
- ✅ IPC 監聽器清理函數問題

**驗證：**
- [ ] 運行 `ng serve` 確認無編譯錯誤
- [ ] 應用能正常啟動

---

## 🛠️ 修復優先級

### 高優先級（必須修復）

1. **數據庫異步支持**
   - 影響：遷移系統無法正常工作
   - 修復時間：30-60 分鐘

2. **Phase 1 QR 登入測試**
   - 影響：核心功能無法使用
   - 修復時間：取決於發現的問題

3. **Phase 2 IP 綁定測試**
   - 影響：新功能無法驗證
   - 修復時間：取決於發現的問題

### 中優先級（建議修復）

4. **數據庫遷移驗證**
   - 影響：新字段可能不存在
   - 修復時間：15-30 分鐘

5. **UI 顯示驗證**
   - 影響：用戶體驗
   - 修復時間：取決於發現的問題

---

## 📋 測試計劃

### 階段 1: 基礎功能測試（1-2 小時）

1. **應用啟動測試**
   - [ ] 應用能正常啟動
   - [ ] 無構建錯誤
   - [ ] 無運行時錯誤

2. **數據庫連接測試**
   - [ ] 數據庫能正常連接
   - [ ] 遷移成功執行
   - [ ] 新表已創建

3. **基本功能測試**
   - [ ] 帳號列表能正常顯示
   - [ ] 添加帳號功能正常
   - [ ] 登入功能正常

### 階段 2: Phase 1 功能測試（2-3 小時）

1. **QR 登入測試**
   - [ ] QR 碼生成
   - [ ] 掃碼登入流程
   - [ ] 2FA 處理
   - [ ] Session 保存

2. **設備指紋測試**
   - [ ] 設備指紋生成
   - [ ] 不同平台指紋
   - [ ] 指紋一致性

### 階段 3: Phase 2 功能測試（2-3 小時）

1. **IP 粘性測試**
   - [ ] IP 綁定功能
   - [ ] IP 失效檢測
   - [ ] IP 自動更換
   - [ ] IP 歷史記錄

2. **API 憑據獲取測試**
   - [ ] Playwright 安裝
   - [ ] 憑據獲取流程
   - [ ] 日誌記錄

3. **UI 顯示測試**
   - [ ] 設備指紋列顯示
   - [ ] IP 綁定列顯示
   - [ ] API 類型列顯示

---

## 🔧 快速修復指南

### 修復 1: 數據庫異步支持

**選項 A: 添加異步支持（推薦）**

```python
# 在 database.py 中添加
import aiosqlite

class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._connection: Optional[aiosqlite.Connection] = None
    
    async def connect(self):
        """建立異步連接"""
        self._connection = await aiosqlite.connect(self.db_path)
        self._connection.row_factory = aiosqlite.Row
    
    async def initialize(self):
        """異步初始化"""
        await self.connect()
        # 執行初始化...
```

**選項 B: 修改遷移使用同步操作**

```python
# 在遷移文件中使用同步操作
def up(self, db) -> None:
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE accounts ADD COLUMN ...")
    conn.commit()
    conn.close()
```

### 修復 2: 驗證遷移執行

**檢查遷移狀態：**
```python
# 在 main.py 中添加日誌
migration_manager = get_migration_manager()
if migration_manager:
    status = await migration_manager.status()
    print(f"Current version: {status['current_version']}")
    print(f"Pending migrations: {status['pending_count']}")
```

---

## 📊 測試結果記錄

### 測試環境
- 日期：___________
- 測試人員：___________
- 環境：Windows / macOS / Linux

### Phase 1 測試結果
- QR 登入：✅ / ❌
- 設備指紋：✅ / ❌
- Session 保存：✅ / ❌

### Phase 2 測試結果
- IP 綁定：✅ / ❌
- IP 失效檢測：✅ / ❌
- API 憑據獲取：✅ / ❌
- UI 顯示：✅ / ❌

### 發現的問題
1. _______________________
2. _______________________
3. _______________________

---

## ✅ 完成標準

在繼續 Phase 3 之前，需要確保：

1. ✅ 所有構建錯誤已修復
2. ✅ Phase 1 核心功能（QR 登入）正常工作
3. ✅ Phase 2 核心功能（IP 綁定）正常工作
4. ✅ 數據庫遷移成功執行
5. ✅ UI 顯示正常
6. ✅ 無嚴重運行時錯誤

---

## 🎯 建議行動

**立即執行：**
1. 修復數據庫異步支持問題
2. 驗證遷移是否成功執行
3. 測試 Phase 1 QR 登入功能
4. 測試 Phase 2 IP 綁定功能

**完成後：**
- 記錄所有發現的問題
- 修復關鍵問題
- 確認功能穩定後，再開始 Phase 3

**預計時間：**
- 修復關鍵問題：2-4 小時
- 完整測試：4-6 小時
- **總計：6-10 小時**

---

## 💡 為什麼先測試？

1. **穩定性**：確保現有功能穩定，避免 Phase 3 建立在有問題的基礎上
2. **效率**：先修復問題，避免 Phase 3 開發時被舊問題干擾
3. **信心**：確認 Phase 1 和 Phase 2 可用，再繼續開發更有信心
4. **用戶體驗**：確保用戶能使用已開發的功能
