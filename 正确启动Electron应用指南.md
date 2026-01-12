# 正确启动 Electron 应用指南

## ⚠️ 关于安全警告

如果你看到 "打开文件 - 安全警告" 对话框，说明你可能**误双击了 `electron.js` 文件**。

**重要：** `electron.js` 文件**不应该直接双击打开**！它需要通过命令行运行。

## ✅ 正确的启动方式

### 方法 1：使用命令行启动（推荐）

1. **打开 PowerShell 或 CMD**
   - 按 `Win + X`，选择 "Windows PowerShell" 或 "终端"
   - 或按 `Win + R`，输入 `powershell`，按 Enter

2. **导航到项目目录**
   ```powershell
   cd C:\tgkz2026
   ```

3. **运行启动命令**
   ```powershell
   npm start
   ```

4. **等待应用启动**
   - Electron 应用窗口会自动打开
   - 终端会显示日志信息

### 方法 2：使用 VS Code 终端（如果你用 VS Code）

1. 在 VS Code 中打开项目文件夹
2. 按 `` Ctrl + ` ``（反引号）打开终端
3. 运行：
   ```bash
   npm start
   ```

## 📋 完整操作流程

### 第一次启动（完整流程）

#### 步骤 1：确保依赖已安装

**检查 Node.js 依赖：**
```powershell
# 在项目根目录执行
npm install
```

**检查 Python 依赖：**
```powershell
# 在项目根目录执行
pip install -r backend/requirements.txt
```

#### 步骤 2：启动应用

```powershell
npm start
```

#### 步骤 3：观察启动过程

**在终端中应该看到：**
```
> tg-matrix@1.0.0 start
> electron .

[Backend] Starting Python backend...
[Backend] Python script: C:\tgkz2026\backend\main.py
[Backend] Event: log-entry
[Backend] Event: initial-state
```

**Electron 应用窗口应该：**
- 自动打开
- 显示 TG-Matrix 界面
- 自动打开开发者工具（开发模式）

#### 步骤 4：验证功能

1. **检查主进程控制台（终端）：**
   - 应该看到 `[Backend]` 开头的日志
   - 应该看到 `[IPC]` 开头的日志

2. **检查渲染进程控制台（应用内 F12）：**
   - 应该看到 `Received initial state from backend`
   - 界面应该显示数据（即使是空的）

3. **测试添加账户：**
   - 点击左侧菜单 "账户管理"
   - 尝试添加一个账户
   - 检查终端是否显示 `[Backend] Sending command: add-account`

## 🚫 如果误点击了"打开"

如果你在安全警告对话框中点击了"打开"：

1. **关闭可能打开的文本编辑器或程序**
   - 如果打开了文本编辑器，直接关闭即可

2. **使用正确的方式启动：**
   - 按照上面的"方法 1"使用命令行启动

3. **解除文件锁定（如果需要）：**
   
   **方法 A：使用 PowerShell 解除锁定**
   ```powershell
   # 在项目根目录执行
   Unblock-File -Path "electron.js"
   Unblock-File -Path "backend\main.py"
   ```
   
   **方法 B：手动解除锁定**
   1. 右键点击 `electron.js` 文件
   2. 选择"属性"
   3. 在底部如果有"解除锁定"按钮，点击它
   4. 点击"确定"

## 🔧 常见问题解决

### 问题 1：npm start 报错 "command not found"

**原因：** Node.js 没有安装或不在 PATH 中

**解决：**
1. 检查 Node.js 是否安装：
   ```powershell
   node --version
   npm --version
   ```
2. 如果未安装，下载安装：https://nodejs.org/

### 问题 2：npm start 报错 "electron not found"

**原因：** 依赖没有安装

**解决：**
```powershell
npm install
```

### 问题 3：Python 后端没有启动

**原因：** Python 不在 PATH 中或依赖未安装

**解决：**
1. 检查 Python：
   ```powershell
   python --version
   ```
2. 安装 Python 依赖：
   ```powershell
   pip install -r backend/requirements.txt
   ```

### 问题 4：应用窗口打开了但显示空白

**原因：** 前端资源没有正确加载

**解决：**
1. 检查 `index.html` 是否存在
2. 检查开发者工具（F12）中的错误
3. 尝试重新运行 `npm start`

## 📝 日常使用流程

### 每次启动应用：

1. **打开终端（PowerShell/CMD）**
2. **进入项目目录：**
   ```powershell
   cd C:\tgkz2026
   ```
3. **启动应用：**
   ```powershell
   npm start
   ```
4. **使用应用**
5. **关闭应用：**
   - 关闭 Electron 窗口
   - 在终端按 `Ctrl + C` 停止进程

### 开发时的最佳实践：

1. **保持终端窗口打开** - 这样可以看到日志
2. **同时打开开发者工具（F12）** - 方便调试前端
3. **修改代码后** - 关闭应用，重新运行 `npm start`

## 🎯 快速参考

### 启动命令
```powershell
cd C:\tgkz2026
npm start
```

### 停止应用
- 关闭 Electron 窗口
- 在终端按 `Ctrl + C`

### 查看日志
- **主进程日志：** 运行 `npm start` 的终端窗口
- **前端日志：** 在应用内按 F12

### 解除文件锁定（如果需要）
```powershell
Unblock-File -Path "electron.js"
Unblock-File -Path "backend\main.py"
```

---

**记住：** 永远使用 `npm start` 命令启动应用，不要直接双击 `electron.js` 文件！

