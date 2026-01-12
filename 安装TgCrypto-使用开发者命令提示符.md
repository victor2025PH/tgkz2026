# 使用开发者命令提示符安装 TgCrypto

## 🎯 为什么需要开发者命令提示符？

即使您已经安装了 C++ 工具，普通 PowerShell 可能还没有加载编译器的环境变量。开发者命令提示符会自动设置所有必要的环境变量。

---

## ✅ 安装步骤

### 方法 1：使用开发者命令提示符（推荐）

1. **打开开发者命令提示符：**
   - 按 `Win + S`
   - 输入 **"Developer Command Prompt"**
   - 选择 **"Developer Command Prompt for VS 2022"**（或您安装的版本）

2. **在开发者命令提示符中运行：**
   ```bash
   cd C:\tgkz2026
   pip install TgCrypto
   ```

3. **验证安装：**
   ```bash
   python -c "import TgCrypto; print('✅ 安装成功！版本:', TgCrypto.__version__)"
   ```

---

### 方法 2：重启计算机后使用普通 PowerShell

如果您已经安装了 C++ 工具，但还没有重启：

1. **重启计算机**（必须！）

2. **重启后，打开 PowerShell：**
   ```powershell
   cd C:\tgkz2026
   pip install TgCrypto
   ```

---

### 方法 3：在 PowerShell 中手动加载环境

如果不想重启，可以在 PowerShell 中手动加载 Visual Studio 环境：

```powershell
# 查找开发者命令脚本
$vsPath = Get-ChildItem "C:\Program Files*\Microsoft Visual Studio\*\*\Common7\Tools\VsDevCmd.bat" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($vsPath) {
    # 加载环境变量
    cmd /c "`"$($vsPath.FullName)`" && set" | ForEach-Object {
        if ($_ -match "^(.+?)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    
    # 验证
    where cl
    
    # 安装 TgCrypto
    cd C:\tgkz2026
    pip install TgCrypto
} else {
    Write-Host "未找到 Visual Studio 开发者命令脚本"
}
```

---

## 🔍 验证安装成功

安装完成后，运行：

```bash
python -c "import TgCrypto; print('✅ 安装成功！版本:', TgCrypto.__version__)"
```

如果显示版本号（如 `1.2.5`），说明安装成功。

---

## 💡 推荐操作

**最简单的方法：**
1. 打开 "Developer Command Prompt for VS 2022"
2. 运行 `cd C:\tgkz2026 && pip install TgCrypto`
3. 完成！

**如果开发者命令提示符不可用：**
1. 重启计算机
2. 在普通 PowerShell 中运行 `pip install TgCrypto`

