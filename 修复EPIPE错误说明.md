# 修复 EPIPE 错误说明 ✅

## 问题描述

应用运行时出现以下错误：

```
Error: write EPIPE
at RequestManager.retryRequest (C:\tgkz2026\electron.js:136:29)
```

## 问题原因

**EPIPE (Broken Pipe) 错误**表示尝试向一个已关闭的管道写入数据。

在这个场景中：
- Python 后端进程可能已经关闭或崩溃
- Python 进程的 stdin 管道已经关闭
- 但 RequestManager 仍在尝试重试请求并写入 stdin

**触发场景：**
1. Python 进程意外退出
2. 应用启动时 Python 进程还未完全初始化
3. 网络或系统问题导致进程终止
4. 超时重试时，进程已经关闭

## 解决方案

在 `sendToPython` 和 `retryRequest` 方法中添加了以下保护措施：

### 1. 检查进程状态

```javascript
if (!pythonProcess || pythonProcess.killed) {
    console.error('[Backend] Python process not running');
    return null;
}
```

### 2. 检查 stdin 可写性

```javascript
if (!pythonProcess.stdin || pythonProcess.stdin.destroyed || pythonProcess.stdin.writableEnded) {
    console.error('[Backend] Python stdin is not writable');
    return null;
}
```

### 3. 异常处理

```javascript
try {
    const result = pythonProcess.stdin.write(message, (error) => {
        if (error) {
            console.error('[Backend] Error sending command:', error);
            // 清理请求
            requestManager.pendingRequests.delete(requestId);
        }
    });
} catch (error) {
    console.error('[Backend] Exception while sending command:', error);
    // 清理请求
    requestManager.pendingRequests.delete(requestId);
    return null;
}
```

### 4. 自动清理失败的请求

如果写入失败，自动从 `pendingRequests` 中删除请求，避免重复尝试。

## 修复内容

### sendToPython 函数

- ✅ 添加 stdin 可写性检查
- ✅ 添加 try-catch 异常处理
- ✅ 写入失败时自动清理请求
- ✅ 检查写入结果（buffer full 情况）

### retryRequest 方法

- ✅ 添加 stdin 可写性检查
- ✅ 添加 try-catch 异常处理
- ✅ 进程或 stdin 不可用时自动清理请求
- ✅ 更详细的错误日志

## 预期效果

1. **不再出现 EPIPE 错误**
   - 在写入前检查管道状态
   - 捕获并处理异常

2. **更好的错误处理**
   - 详细的错误日志
   - 自动清理失败的请求

3. **更稳定的运行**
   - 避免重复尝试已失效的请求
   - 进程重启后可以正常工作

## 验证

修复后，即使 Python 进程关闭或重启，应用也不会因为 EPIPE 错误而崩溃，而是会：
- 记录错误日志
- 清理相关请求
- 继续正常运行

如果 Python 进程重启，新的请求可以正常发送。

