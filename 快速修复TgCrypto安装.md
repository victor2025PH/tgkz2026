# 快速修复 TgCrypto 安装问题

## 🎯 问题原因

您安装的是 **Visual Studio IDE**，但编译 Python C++ 扩展需要 **C++ 编译工具**。

**解决方案：在现有 Visual Studio 中添加 C++ 工具**

---

## ✅ 快速修复步骤（5-10 分钟）

### 步骤 1：打开 Visual Studio Installer

1. **按 `Win + S`**（Windows 键 + S）
2. 输入 **"Visual Studio Installer"**
3. 打开 **Visual Studio Installer**

### 步骤 2：修改现有安装

1. 在 Visual Studio Installer 中，找到您已安装的 Visual Studio（可能是 2022 或 2026）
2. 点击 **"修改"** 按钮（Modify）

### 步骤 3：添加 C++ 工作负载

1. 选择 **"工作负载"** 标签页（Workloads）
2. ✅ 勾选 **"使用 C++ 的桌面开发"**（Desktop development with C++）
3. 在右侧详情中，确保包含：
   - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools**（或最新版本）
   - ✅ **Windows 10/11 SDK**（最新版本）
4. 点击右下角的 **"修改"** 按钮
5. 等待安装完成（可能需要 5-15 分钟，取决于网络速度）

### 步骤 4：重启计算机

**⚠️ 非常重要：安装完成后，必须重启计算机！**

编译器路径需要重启后才能生效。

### 步骤 5：验证并安装

重启后，打开 PowerShell：

```powershell
# 1. 检查编译器是否可用
where cl

# 如果显示路径（如 C:\Program Files\...\cl.exe），说明成功
# 如果没有输出，继续下一步

# 2. 进入项目目录
cd C:\tgkz2026

# 3. 安装 TgCrypto
pip install TgCrypto
```

---

## 🔍 如果方案 1 不行，尝试方案 2

### 方案 2：使用开发者命令提示符

如果您已经安装了 Visual Studio IDE，可以尝试使用它的开发者命令提示符：

1. **按 `Win + S`**，搜索 **"Developer Command Prompt"**
2. 选择 **"Developer Command Prompt for VS 2022"**（或您安装的版本）
3. 在开发者命令提示符中运行：

```bash
cd C:\tgkz2026
pip install TgCrypto
```

**注意：** 必须在开发者命令提示符中运行，不能在普通 PowerShell 中运行。

---

## 🎯 验证安装成功

安装完成后，运行：

```powershell
python -c "import TgCrypto; print('✅ 安装成功！版本:', TgCrypto.__version__)"
```

如果显示版本号（如 `1.2.5`），说明安装成功。

---

## 💡 如果还是不行

如果以上方法都不行，可以**直接跳过 TgCrypto**：

- ✅ 应用仍然可以正常工作
- ⚠️ 只是性能会慢一些（加密操作速度）
- ✅ 不影响功能

**操作：** 什么都不用做，直接使用应用即可。应用会显示警告，但可以忽略。

---

## 📞 需要帮助？

如果遇到问题，请告诉我：
1. Visual Studio Installer 中显示什么？
2. 是否成功添加了 "使用 C++ 的桌面开发" 工作负载？
3. 重启后 `where cl` 命令的输出是什么？

我会继续协助您！

