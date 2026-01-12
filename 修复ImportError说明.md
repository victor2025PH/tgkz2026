# 修复 ImportError 问题

## 🐛 问题描述

应用启动时出现以下错误：
```
ImportError: cannot import name 'ConnectionError' from 'pyrogram.errors'
```

## 🔍 问题原因

`error_recovery.py` 中直接导入了 `ConnectionError` 和 `ProxyConnectionError`，但这些类在 Pyrogram 2.0+ 版本中不存在。

Pyrogram 的错误模块中实际使用的是：
- `RpcConnectFailed` - 用于连接错误
- 没有专门的 `ProxyConnectionError` 类

## ✅ 修复方案

已修复 `backend/error_recovery.py`，使用与 `telegram_client.py` 相同的安全导入方式：

```python
# ConnectionError might not exist in all Pyrogram versions
try:
    from pyrogram.errors import ConnectionError as PyrogramConnectionError
except ImportError:
    # Use Python's built-in ConnectionError as fallback
    from builtins import ConnectionError as PyrogramConnectionError

# ProxyConnectionError might not exist in all Pyrogram versions
try:
    from pyrogram.errors import ProxyConnectionError
except ImportError:
    ProxyConnectionError = RpcConnectFailed  # Use RpcConnectFailed as fallback

# UserBanned might not exist in all Pyrogram versions
try:
    from pyrogram.errors import UserBanned
except ImportError:
    UserBanned = UserDeactivated  # Use UserDeactivated as fallback
```

## 🎯 验证结果

✅ 模块导入成功！
✅ 不再出现 ImportError

## 📋 下一步

现在可以正常启动应用了：

```bash
npm start
```

应用应该能够正常启动，不再出现崩溃循环。

---

**修复时间：** 2026-01-02  
**状态：** ✅ 已修复

