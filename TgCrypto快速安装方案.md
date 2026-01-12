# TgCrypto 快速安装方案（解决编译错误）

## 🚨 您遇到的问题

```
error: Microsoft Visual C++ 14.0 or greater is required
```

这是因为 TgCrypto 需要编译 C++ 扩展，但系统缺少 Visual C++ 编译器。

---

## ✅ 解决方案（按推荐顺序）

### 方案 1：使用预编译版本（最简单，推荐）⭐

**不需要安装 Visual C++，直接尝试安装预编译的 wheel 文件：**

```bash
# 在项目目录执行
cd C:\tgkz2026

# 方法 1：强制使用预编译版本
pip install --only-binary :all: TgCrypto

# 如果方法 1 失败，尝试方法 2
pip install --prefer-binary TgCrypto

# 如果方法 2 也失败，尝试方法 3（指定 Python 版本）
pip install TgCrypto --only-binary :all: --python-version 313
```

**如果成功，您会看到：**
```
Successfully installed TgCrypto-1.2.5
```

**验证安装：**
```bash
python -c "import TgCrypto; print('✅ 安装成功！版本:', TgCrypto.__version__)"
```

---

### 方案 2：安装 Visual C++ Build Tools（完整解决方案）

如果方案 1 失败，需要安装编译工具。

#### 步骤 1：下载 Visual Studio Build Tools

1. 访问：https://visualstudio.microsoft.com/downloads/
2. 滚动到页面底部
3. 找到 "Tools for Visual Studio" 部分
4. 点击 **"Build Tools for Visual Studio"** 下载

#### 步骤 2：安装 Build Tools

1. 运行下载的安装程序（`vs_buildtools.exe`）
2. 在 "工作负载" 标签页中：
   - ✅ 勾选 **"使用 C++ 的桌面开发"**（Desktop development with C++）
   - 或至少勾选 **"C++ build tools"**
3. 在右侧的 "安装详细信息" 中，确保包含：
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
   - ✅ Windows 10/11 SDK（最新版本）
4. 点击 **"安装"**
5. 等待安装完成（可能需要 10-30 分钟，取决于网络速度）

#### 步骤 3：重启计算机

**重要：** 安装完成后，**必须重启计算机**，否则编译器可能无法识别。

#### 步骤 4：重新安装 TgCrypto

重启后：

```bash
cd C:\tgkz2026
pip install TgCrypto
```

---

### 方案 3：跳过安装（最简单，但性能较慢）

**如果不想安装 Visual C++ Build Tools，可以跳过 TgCrypto：**

- ✅ 应用仍然可以正常工作
- ⚠️ 只是性能会慢一些（加密操作速度）
- ✅ 不影响功能

**跳过安装后：**
- 应用会显示警告：`TgCrypto is missing!`
- 可以忽略这个警告
- 所有功能正常，只是速度稍慢

---

## 🎯 推荐操作流程

### 快速尝试（5 分钟）

```bash
# 1. 进入项目目录
cd C:\tgkz2026

# 2. 尝试安装预编译版本
pip install --only-binary :all: TgCrypto

# 3. 验证
python -c "import TgCrypto; print('✅ 成功！')"
```

**如果成功 → 完成！**  
**如果失败 → 继续下面的步骤**

---

### 完整安装（30-60 分钟）

1. **下载 Visual Studio Build Tools**
   - 访问：https://visualstudio.microsoft.com/downloads/
   - 下载 "Build Tools for Visual Studio"

2. **安装 Build Tools**
   - 运行安装程序
   - 选择 "使用 C++ 的桌面开发"
   - 点击安装

3. **重启计算机**（必须！）

4. **重新安装 TgCrypto**
   ```bash
   cd C:\tgkz2026
   pip install TgCrypto
   ```

---

## 📋 验证安装成功

安装完成后，运行：

```bash
python -c "import TgCrypto; print('✅ TgCrypto 安装成功！版本:', TgCrypto.__version__)"
```

如果显示版本号（如 `1.2.5`），说明安装成功。

然后重启应用，如果不再显示 `TgCrypto is missing!` 警告，说明一切正常。

---

## 💡 重要提示

1. **TgCrypto 是可选的：** 不安装也能正常工作，只是性能会慢一些
2. **如果方案 1 失败：** 通常是因为没有对应您 Python 版本的预编译 wheel
3. **如果不想安装 Visual C++：** 可以直接跳过，应用功能不受影响
4. **性能影响：** 不安装 TgCrypto，加密操作会慢 50-70%，但功能完全正常

---

## 🔗 相关链接

- Visual Studio Build Tools 下载：https://visualstudio.microsoft.com/downloads/
- TgCrypto GitHub：https://github.com/pyrogram/tgcrypto
- Pyrogram 文档：https://docs.pyrogram.org/topics/speedups

---

**建议：** 先尝试方案 1（预编译版本），如果失败且您需要最佳性能，再考虑方案 2（安装 Visual C++ Build Tools）。

