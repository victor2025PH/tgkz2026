# TG-AI智控王 打包說明

## 快速開始

### 一鍵完整打包

```bash
npm run dist:full
```

此命令會自動執行以下步驟：
1. 清理舊的構建文件
2. 下載 VC++ 運行時（如果不存在）
3. 編譯 Python 後端為 exe
4. 編譯 Angular 前端
5. 清理敏感文件
6. 生成 Windows 安裝程序

### 分步打包

```bash
# 1. 下載 VC++ 運行時
npm run download:vcredist

# 2. 編譯後端
npm run build:backend-exe

# 3. 編譯前端
npm run build:prod

# 4. 生成安裝程序
npm run dist:win
```

## 打包前檢查清單

- [ ] 確認版本號已更新 (`package.json`)
- [ ] 確認 Python 環境已安裝 (3.8+)
- [ ] 確認 Node.js 環境已安裝 (18+)
- [ ] 確認沒有敏感文件（.session, .db, .env）
- [ ] 確認 `build-resources/icon.ico` 存在

## 輸出文件

打包完成後，安裝程序位於：
```
release/TG-AI智控王-2.1.0-Setup.exe
```

## 依賴說明

### Visual C++ 運行時
- 文件：`build-resources/vc_redist.x64.exe`
- 下載地址：https://aka.ms/vs/17/release/vc_redist.x64.exe
- 安裝程序會自動檢測並安裝

### Python 後端
- 使用 PyInstaller 編譯為獨立 exe
- 包含所有 Python 依賴（Pyrogram, Telethon, ChromaDB 等）
- 輸出：`backend-exe/tg-matrix-backend.exe`

## 常見問題

### Q: 打包失敗 "Python 未安裝"
確保 Python 3.8+ 已安裝且在 PATH 中。

### Q: 打包失敗 "找不到模塊"
運行 `pip install -r backend/requirements.txt` 安裝所有依賴。

### Q: 安裝後提示缺少 DLL
確保 VC++ 運行時已正確安裝。可手動運行 `vc_redist.x64.exe`。

### Q: 打包後程序無法啟動
檢查 `release/` 目錄中的 `.log` 文件查看錯誤信息。

## 文件結構

```
build-scripts/
├── README.md                 # 本文件
├── package-full.js          # 完整打包腳本
├── download-vcredist.js     # VC++ 下載腳本
└── build-backend-exe.py     # 後端編譯腳本

build-resources/
├── icon.ico                 # 應用圖標
├── installer.nsh            # NSIS 安裝腳本
└── vc_redist.x64.exe        # VC++ 運行時（需下載）
```
