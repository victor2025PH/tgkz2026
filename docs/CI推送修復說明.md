# CI 修復已提交，推送 403 的處理方式

## 已完成的修改

- **原因**：CI 日誌顯示 `ModuleNotFoundError: No module named 'jwt'`。導入任意 `admin.xxx` 時會執行 `admin/__init__.py`，其中會 `from .handlers import ...`，而 `handlers` 依賴 **PyJWT**。
- **修改**：在 `.github/workflows/ci.yml` 的 **Test** 和 **Lint** 步驟中已加入 `PyJWT` 依賴。
- **本地**：已提交為 `d0f7aa1`，訊息：`fix(ci): 安裝 PyJWT 以修復 admin/__init__ 導入 handlers 時的 jwt 依賴`。

## 推送時出現 403 的原因

`git push origin main` 回傳 **403 Permission denied**，通常是當前使用的 GitHub 憑證**沒有寫入權限**。

- 若用 **Fine-grained PAT** 登錄 `gh`：預設可能只有讀權限，需要為該倉庫開啟 **Contents: Read and write**。
- 若用 **Classic PAT**：需要勾選 **repo**（含讀寫）。

## 請你本地執行的步驟

### 方式一：給現有 Fine-grained Token 加上寫權限（推薦）

1. 打開：<https://github.com/settings/tokens?type=beta>
2. 找到你用來登錄 `gh` 的 token（例如 `cursor20260206`），點進 **Edit**。
3. 在 **Repository access** 中選中倉庫 `victor2025PH/tgkz2026`（或選 "All repositories"）。
4. 在 **Permissions** 裡找到 **Repository permissions**：
   - **Contents** 改為 **Read and write**。
5. 保存（Save）。
6. 在項目目錄執行：
   ```bash
   cd d:\tgkz2026
   git push origin main
   ```

### 方式二：改用 Classic PAT（有 repo 權限）

1. 打開：<https://github.com/settings/tokens/new>
2. 勾選 **repo**，生成新 token 並複製。
3. 重新用 token 登錄 gh：
   ```bash
   gh auth login
   ```
   選擇 GitHub.com → HTTPS → 選 **Paste an authentication token**，貼上剛複製的 token。
4. 再執行：
   ```bash
   gh auth setup-git
   git push origin main
   ```

### 方式三：用 SSH 推送（若你已配置 SSH key）

```bash
cd d:\tgkz2026
git remote set-url origin git@github.com:victor2025PH/tgkz2026.git
git push origin main
```

---

完成上述任一方式並成功 `git push` 後，GitHub Actions 會用更新後的 ci.yml 跑 CI，預期可通過。
