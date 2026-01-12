# TG-Matrix Session 導入導出優化說明

> **版本**: 1.0.3  
> **更新日期**: 2026年1月11日

---

## 🎯 問題分析

### 原有問題

1. **導出時**：只導出 `.session` 文件，不包含 API ID 和 API Hash
2. **導入時**：無法獲取 API 憑證，導致賬戶無法使用
3. **錯誤提示**：`API ID and API Hash are required`

### 根本原因

Pyrogram 的 `.session` 文件只包含會話認證信息，不包含 API 憑證。每次連接 Telegram 都需要 API ID 和 API Hash，這些信息需要單獨存儲。

---

## ✅ 優化方案

### 新增 TG-Matrix Session 包格式 (`.tgpkg`)

創建了一個新的打包格式，將 session 文件和 API 憑證打包在一起：

```
account.tgpkg (實際上是 ZIP 格式)
├── metadata.json     # API ID, Hash, 設置等
└── session.session   # Pyrogram session 文件
```

### metadata.json 結構

```json
{
  "version": "1.0",
  "created_at": "2026-01-11T12:00:00.000Z",
  "phone": "+8613800138000",
  "api_id": "12345678",
  "api_hash": "abcdef1234567890abcdef1234567890",
  "proxy": "socks5://127.0.0.1:1080",
  "role": "Sender",
  "group": "Group A",
  "daily_send_limit": 50,
  "notes": "備註信息",
  "session_checksum": "sha256..."
}
```

---

## 📦 新增功能

### 1. 單個賬戶導出/導入

**導出（推薦格式）**：
- 選擇賬戶 → 點擊「導出 Session」
- 默認保存為 `.tgpkg` 格式
- 包含完整的 API 憑證和設置

**導入**：
- 點擊「導入 Session」
- 選擇 `.tgpkg` 文件
- 自動創建賬戶並配置，無需輸入 API 憑證

### 2. 批量導出/導入

**批量導出**：
- 選擇多個賬戶 → 點擊「批量導出」
- 保存為 `.tgbatch` 格式
- 包含所有選中賬戶的 session 和憑證

**批量導入**：
- 選擇 `.tgbatch` 文件
- 一次導入多個賬戶

### 3. 舊版 Session 兼容

導入舊版 `.session` 文件時：
- 系統會提示輸入 API ID 和 API Hash
- 輸入後正常導入

---

## 🔧 技術實現

### 後端模塊

**文件**: `backend/session_package.py`

```python
# 創建 Session 包
SessionPackage.create_package(
    session_file_path=session_file,
    api_id="12345678",
    api_hash="abcdef...",
    phone="+8613800138000",
    output_path=Path("account.tgpkg")
)

# 解壓 Session 包
success, message, account_data = SessionPackage.extract_package(
    package_path=Path("account.tgpkg"),
    sessions_dir=SESSIONS_DIR
)

# 批量導出
BatchSessionPackage.create_batch_package(
    accounts_data=accounts_list,
    sessions_dir=SESSIONS_DIR,
    output_path=Path("accounts.tgbatch")
)
```

### 命令處理

- `import-session` - 支持 `.tgpkg`、`.tgbatch`、`.session` 格式
- `export-session` - 默認導出為 `.tgpkg` 格式
- `export-sessions-batch` - 批量導出為 `.tgbatch` 格式

---

## 📋 文件格式對比

| 格式 | 包含 Session | 包含 API 憑證 | 包含設置 | 推薦度 |
|------|-------------|--------------|---------|--------|
| `.tgpkg` | ✅ | ✅ | ✅ | ⭐⭐⭐ 推薦 |
| `.tgbatch` | ✅ (多個) | ✅ | ✅ | ⭐⭐⭐ 批量推薦 |
| `.session` | ✅ | ❌ | ❌ | ⭐ 不推薦 |

---

## 🔐 安全考慮

1. **文件加密**：Session 包使用 ZIP 壓縮，可選加密
2. **完整性驗證**：包含 SHA256 校驗和，防止文件損壞
3. **憑證保護**：API Hash 等敏感信息存儲在包內，不明文顯示

---

## 📖 使用指南

### 場景 1：備份賬戶到其他電腦

1. 在原電腦上：選擇賬戶 → 導出 Session → 保存為 `.tgpkg`
2. 複製 `.tgpkg` 文件到新電腦
3. 在新電腦上：導入 Session → 選擇文件 → 完成

### 場景 2：批量遷移多個賬戶

1. 選擇所有要遷移的賬戶
2. 批量導出 → 保存為 `.tgbatch`
3. 在目標電腦導入 `.tgbatch` 文件

### 場景 3：導入舊版 Session 文件

1. 導入 Session → 選擇 `.session` 文件
2. 系統提示輸入 API ID 和 API Hash
3. 填寫後完成導入

---

## 🔄 遷移建議

如果您有舊的 `.session` 文件：

1. 先使用 API 憑證手動添加賬戶
2. 將 `.session` 文件複製到 `backend/sessions/` 目錄
3. 登錄賬戶驗證
4. 導出為新的 `.tgpkg` 格式備份

---

*文檔更新時間: 2026-01-11*
