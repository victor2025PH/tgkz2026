# TgCrypto 说明

## 什么是 TgCrypto？

`TgCrypto` 是 Pyrogram 的一个可选性能优化库，使用 C 语言实现，可以显著提升加密/解密操作的速度。

## 是否需要安装？

**不是必需的！** Pyrogram 可以在没有 `TgCrypto` 的情况下正常工作，只是性能会稍慢一些。

## 安装失败的原因

`TgCrypto` 需要编译 C 扩展，在 Windows 上需要：
- Microsoft Visual C++ 14.0 或更高版本
- 或者 Microsoft C++ Build Tools

## 安装选项

### 选项 1：不安装（推荐）
- **优点**：无需额外工具，应用可以正常运行
- **缺点**：加密操作速度稍慢（通常不影响正常使用）

### 选项 2：安装 Visual C++ Build Tools
如果您想安装 `TgCrypto` 以获得最佳性能：

1. 下载并安装 Microsoft C++ Build Tools：
   - 访问：https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - 下载并安装 "Build Tools for Visual Studio"
   - 在安装时选择 "C++ build tools" 工作负载

2. 安装完成后，重新运行：
   ```bash
   pip install tgcrypto
   ```

### 选项 3：使用预编译的 wheel（如果可用）
某些情况下，可能有预编译的 wheel 包可用，但通常需要自己编译。

## 当前状态

✅ **应用可以正常运行**，即使没有 `TgCrypto`
⚠️ 您会看到警告信息，但这是正常的，不影响功能

## 建议

对于大多数用户，**不需要安装 `TgCrypto`**。只有在以下情况下才建议安装：
- 需要处理大量消息
- 对性能有极高要求
- 有 Visual C++ Build Tools 环境

