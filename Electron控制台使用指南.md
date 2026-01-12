# Electron 控制台使用指南

## 📖 什么是 Electron 控制台？

Electron 应用有两个不同的控制台，它们显示不同类型的信息：

### 1. **主进程控制台（Main Process Console）**
- **位置：** 运行 `npm start` 的终端/命令行窗口
- **作用：** 显示 Electron 主进程（Node.js）的日志
- **包含：** Python 后端启动日志、IPC 通信日志、错误信息

### 2. **渲染进程控制台（Renderer Process Console）**
- **位置：** Electron 应用窗口内的开发者工具
- **作用：** 显示前端（Angular）的日志
- **包含：** JavaScript 错误、前端调试信息、前端接收到的数据

## 🔍 如何打开控制台

### 方法 1：主进程控制台（最重要 - 查看 Python 后端日志）

**这个控制台就是运行 `npm start` 的终端窗口！**

1. **打开方式：**
   - 在项目根目录运行 `npm start` 的 PowerShell/CMD 窗口
   - 这个窗口会一直显示主进程的日志

2. **显示的内容：**
   ```
   > tg-matrix@1.0.0 start
   > electron .
   
   [Backend] Starting Python backend...
   [Backend] Python script: C:\tgkz2026\backend\main.py
   [Backend] Event: log-entry
   [Backend] Event: initial-state
   [IPC] Received: get-initial-state
   [Backend] Sending command: get-initial-state
   ```

3. **重要性：**
   - ✅ 查看 Python 后端是否启动
   - ✅ 查看后端发送的事件
   - ✅ 查看前端发送的命令
   - ✅ 查看错误信息

### 方法 2：渲染进程控制台（前端调试）

**这是 Electron 应用窗口内的开发者工具**

#### 打开方式：

**方式 A：快捷键（推荐）**
- 按 `F12` 键
- 或按 `Ctrl + Shift + I`（Windows/Linux）
- 或按 `Cmd + Option + I`（Mac）

**方式 B：菜单**
1. 在 Electron 应用窗口中，点击顶部菜单
2. 选择 "View"（查看） → "Toggle Developer Tools"（切换开发者工具）

**方式 C：代码中自动打开**
- 在开发模式下，`electron.js` 中已经设置了自动打开：
  ```javascript
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  ```
- 所以运行 `npm start` 时应该会自动打开

#### 控制台界面：

开发者工具会显示在应用窗口的底部或右侧，包含多个标签页：

1. **Console（控制台）标签页：**
   - 显示 JavaScript 日志
   - 显示 `console.log()` 输出
   - 显示错误和警告

2. **Network（网络）标签页：**
   - 显示网络请求（如果有）

3. **Sources（源代码）标签页：**
   - 可以设置断点调试

4. **Elements（元素）标签页：**
   - 查看 HTML DOM 结构

## 📊 两个控制台的对比

| 特性 | 主进程控制台 | 渲染进程控制台 |
|------|------------|--------------|
| **位置** | 运行 `npm start` 的终端 | Electron 应用窗口内 |
| **打开方式** | 自动显示（终端窗口） | F12 或 Ctrl+Shift+I |
| **显示内容** | Node.js/Electron 主进程日志 | 前端 JavaScript 日志 |
| **Python 后端日志** | ✅ 显示 | ❌ 不显示 |
| **IPC 通信日志** | ✅ 显示 | ❌ 不显示 |
| **前端 JavaScript 日志** | ❌ 不显示 | ✅ 显示 |
| **前端接收的数据** | ❌ 不显示 | ✅ 显示 |

## 🔍 实际使用示例

### 场景 1：检查 Python 后端是否启动

**查看位置：** 主进程控制台（运行 `npm start` 的终端）

**应该看到：**
```
[Backend] Starting Python backend...
[Backend] Python script: C:\tgkz2026\backend\main.py
[Backend] Event: log-entry
```

**如果没有看到：**
- 检查 Python 是否在 PATH 中
- 检查 `backend/main.py` 文件是否存在
- 查看是否有错误信息

### 场景 2：检查前端是否收到数据

**查看位置：** 渲染进程控制台（F12 打开的开发者工具）

**应该看到：**
```javascript
Received initial state from backend: {accounts: Array(0), ...}
```

**如果没有看到：**
- 检查主进程控制台是否有错误
- 检查 IPC 通信是否正常

### 场景 3：调试前端功能

**查看位置：** 渲染进程控制台（F12）

**可以：**
- 查看 JavaScript 错误
- 使用 `console.log()` 调试
- 检查变量值
- 设置断点

### 场景 4：调试后端通信

**查看位置：** 主进程控制台（终端）

**应该看到：**
```
[IPC] Received: add-account
[Backend] Sending command: add-account
[Backend] Event: accounts-updated
```

## 🛠️ 实用技巧

### 技巧 1：同时查看两个控制台

1. **主进程控制台：** 保持运行 `npm start` 的终端窗口打开
2. **渲染进程控制台：** 在 Electron 应用中按 F12

这样你可以同时看到：
- 后端发生了什么（主进程控制台）
- 前端发生了什么（渲染进程控制台）

### 技巧 2：过滤日志

**在主进程控制台中：**
- 查找 `[Backend]` 开头的日志查看后端相关
- 查找 `[IPC]` 开头的日志查看通信相关

**在渲染进程控制台中：**
- 使用过滤器（Filter）输入关键词
- 可以过滤错误、警告等

### 技巧 3：清除控制台

**主进程控制台：**
- 在终端中按 `Ctrl + L`（Windows）或 `Cmd + K`（Mac）

**渲染进程控制台：**
- 点击控制台左上角的清除按钮（🚫）
- 或按 `Ctrl + L`

## 🐛 常见问题

### Q1: 我看不到主进程控制台

**A:** 主进程控制台就是运行 `npm start` 的终端窗口。确保：
- 终端窗口没有被关闭
- 终端窗口没有被最小化
- 滚动查看历史日志

### Q2: 我按 F12 没有反应

**A:** 尝试：
1. 确保 Electron 应用窗口是活动窗口（点击一下）
2. 尝试 `Ctrl + Shift + I`
3. 检查 `electron.js` 中是否禁用了开发者工具

### Q3: 开发者工具打开了但看不到内容

**A:** 
1. 点击 "Console" 标签页
2. 确保没有过滤掉所有日志
3. 尝试刷新应用（关闭后重新运行 `npm start`）

### Q4: 如何查看 Python 后端的详细错误？

**A:** 
- 查看主进程控制台中的 `[Backend] Error:` 开头的日志
- 这些是 Python 的 stderr 输出

## 📝 快速参考

### 打开主进程控制台
```bash
# 在项目根目录运行
npm start
# 终端窗口就是主进程控制台
```

### 打开渲染进程控制台
1. 启动 Electron 应用（`npm start`）
2. 在应用窗口中按 `F12`
3. 或按 `Ctrl + Shift + I`

### 查看 Python 后端日志
- **位置：** 主进程控制台（运行 `npm start` 的终端）
- **查找：** `[Backend]` 开头的日志

### 查看前端日志
- **位置：** 渲染进程控制台（F12 打开的开发者工具）
- **标签页：** Console

---

**提示：** 开发时建议同时打开两个控制台，这样可以全面了解应用的运行状态！

