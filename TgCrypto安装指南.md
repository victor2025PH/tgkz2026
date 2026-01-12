# TgCrypto 安装指南

## 📋 什么是 TgCrypto？

TgCrypto 是 Pyrogram 的一个可选依赖库，用于加速 Telegram API 的加密操作。安装后可以显著提升消息发送和接收的性能。

**注意：** TgCrypto 是可选的，不安装也能正常工作，只是速度会慢一些。

---

## 🚀 安装方法

### 方法一：使用 pip 安装（推荐）

#### 1. 打开命令提示符或 PowerShell

- 按 `Win + R`，输入 `cmd` 或 `powershell`，按回车
- 或者右键点击"开始"菜单，选择"Windows PowerShell"或"命令提示符"

#### 2. 确认 Python 环境

首先确认您使用的 Python 环境：

```bash
# 查看 Python 版本
python --version

# 查看 Python 路径
where python
```

**重要：** 确保使用与项目相同的 Python 环境！

#### 3. 进入项目目录

```bash
cd C:\tgkz2026
```

#### 4. 安装 TgCrypto

**标准安装：**
```bash
pip install TgCrypto
```

**如果使用虚拟环境：**
```bash
# 激活虚拟环境（如果有）
# venv\Scripts\activate  # Windows
# 或
# .venv\Scripts\activate

# 然后安装
pip install TgCrypto
```

**如果遇到权限问题，使用管理员权限：**
```bash
# 以管理员身份运行 PowerShell 或 CMD
pip install TgCrypto
```

---

### 方法二：添加到 requirements.txt（推荐用于项目）

#### 1. 编辑 requirements.txt

打开 `backend/requirements.txt` 文件，添加：

```
TgCrypto>=1.2.5
```

#### 2. 安装所有依赖

```bash
cd C:\tgkz2026
pip install -r backend/requirements.txt
```

---

## 📍 安装位置

### Python 包安装位置

TgCrypto 会安装到您当前 Python 环境的 `site-packages` 目录中。

**常见位置：**

1. **系统 Python（全局安装）：**
   ```
   C:\Users\<用户名>\AppData\Local\Programs\Python\Python313\Lib\site-packages\TgCrypto
   ```

2. **虚拟环境：**
   ```
   C:\tgkz2026\venv\Lib\site-packages\TgCrypto
   ```
   或
   ```
   C:\tgkz2026\.venv\Lib\site-packages\TgCrypto
   ```

3. **Anaconda/Miniconda：**
   ```
   C:\Users\<用户名>\anaconda3\Lib\site-packages\TgCrypto
   ```
   或
   ```
   C:\Users\<用户名>\miniconda3\Lib\site-packages\TgCrypto
   ```

### 查看安装位置

安装后，可以使用以下命令查看：

```bash
# 查看 TgCrypto 安装位置
python -c "import TgCrypto; print(TgCrypto.__file__)"

# 或使用 pip show
pip show TgCrypto
```

---

## ✅ 验证安装

### 方法一：Python 命令行验证

```bash
python -c "import TgCrypto; print('TgCrypto 安装成功！')"
```

如果显示 `TgCrypto 安装成功！`，说明安装成功。

### 方法二：在 Python 中测试

```bash
python
```

然后在 Python 交互式环境中：

```python
>>> import TgCrypto
>>> print(TgCrypto.__version__)
```

如果显示版本号（如 `1.2.5`），说明安装成功。

### 方法三：运行应用验证

启动应用后，如果不再显示 `TgCrypto is missing!` 警告，说明安装成功。

---

## ⚠️ 常见问题和解决方案

### 问题 1：`pip` 命令不存在

**解决方案：**
```bash
# 使用 python -m pip
python -m pip install TgCrypto

# 或使用 py
py -m pip install TgCrypto
```

### 问题 2：权限不足

**错误信息：**
```
ERROR: Could not install packages due to an OSError: [WinError 5] 拒绝访问
```

**解决方案：**
1. 以管理员身份运行 PowerShell 或 CMD
2. 或使用 `--user` 参数：
   ```bash
   pip install --user TgCrypto
   ```

### 问题 3：编译错误（需要 Visual C++）⚠️ **您当前遇到的问题**

**错误信息：**
```
error: Microsoft Visual C++ 14.0 or greater is required
```

**解决方案（按推荐顺序）：**

#### 方案 A：使用预编译的 wheel 文件（最简单，推荐）⭐

**这是最快的解决方案，不需要安装 Visual C++：**

```bash
# 方法 1：尝试安装预编译版本
pip install --only-binary :all: TgCrypto

# 如果方法 1 失败，尝试方法 2：指定平台
pip install --prefer-binary TgCrypto

# 如果方法 2 也失败，尝试方法 3：从 PyPI 直接安装 wheel
pip install TgCrypto --no-build-isolation
```

**如果以上方法都失败，继续看方案 B。**

#### 方案 B：安装 Visual Studio Build Tools（完整解决方案）

1. **下载 Visual Studio Build Tools：**
   - 访问：https://visualstudio.microsoft.com/downloads/
   - 滚动到底部，找到 "Tools for Visual Studio"
   - 点击 "Build Tools for Visual Studio" 下载

2. **安装步骤：**
   - 运行下载的安装程序
   - 选择 "C++ build tools" 工作负载
   - 确保勾选以下组件：
     - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
     - ✅ Windows 10/11 SDK（最新版本）
     - ✅ C++ CMake tools for Windows
   - 点击"安装"，等待完成（可能需要 10-30 分钟）

3. **安装完成后：**
   - **重启计算机**（重要！）
   - 重新打开 PowerShell
   - 再次运行：`pip install TgCrypto`

#### 方案 C：跳过安装（TgCrypto 是可选的）

**如果不想安装 Visual C++ Build Tools，可以跳过 TgCrypto：**

- ✅ 应用仍然可以正常工作
- ⚠️ 只是性能会慢一些（加密操作）
- ✅ 不影响功能

**跳过安装后，应用会显示警告，但可以忽略。**

### 问题 4：Python 版本不兼容

**要求：** Python 3.7 或更高版本

**检查版本：**
```bash
python --version
```

如果版本过低，需要升级 Python。

### 问题 5：安装到错误的 Python 环境

**问题：** 安装了 TgCrypto，但应用仍然显示警告

**解决方案：**
1. 确认应用使用的 Python 环境：
   - 查看 `electron.js` 中的 Python 路径
   - 或查看应用启动日志中的 Python 路径

2. 在该 Python 环境中安装：
   ```bash
   # 使用完整路径
   C:\Users\<用户名>\AppData\Local\Programs\Python\Python313\python.exe -m pip install TgCrypto
   ```

---

## 🔍 确认应用使用的 Python 环境

### 方法一：查看应用日志

启动应用后，查看终端输出，找到：
```
[Backend] Python executable: python
```

或
```
[Backend] Python executable: C:\Users\...\python.exe
```

### 方法二：查看 electron.js

打开 `electron.js` 文件，查找 `findPythonExecutable` 函数，查看 Python 路径查找逻辑。

### 方法三：在应用启动时打印 Python 路径

在 `backend/main.py` 开头添加：
```python
import sys
print(f"[Backend] Python path: {sys.executable}", file=sys.stderr)
```

---

## 📝 推荐的安装步骤（完整流程）

### 步骤 1：确认 Python 环境

```bash
cd C:\tgkz2026
python --version
where python
```

### 步骤 2：安装 TgCrypto

```bash
pip install TgCrypto
```

### 步骤 3：验证安装

```bash
python -c "import TgCrypto; print('安装成功！版本:', TgCrypto.__version__)"
```

### 步骤 4：添加到 requirements.txt（可选）

编辑 `backend/requirements.txt`，添加：
```
TgCrypto>=1.2.5
```

### 步骤 5：重启应用

关闭应用，重新启动，检查是否还有警告。

---

## 🎯 快速安装命令（复制粘贴）

### 标准安装

```bash
cd C:\tgkz2026
pip install TgCrypto
python -c "import TgCrypto; print('安装成功！')"
```

### 如果使用虚拟环境

```bash
cd C:\tgkz2026
venv\Scripts\activate
pip install TgCrypto
python -c "import TgCrypto; print('安装成功！')"
```

### 如果权限不足

```bash
cd C:\tgkz2026
pip install --user TgCrypto
python -c "import TgCrypto; print('安装成功！')"
```

---

## 📊 安装后的效果

安装 TgCrypto 后：

| 指标 | 安装前 | 安装后 | 提升 |
|------|--------|--------|------|
| 消息发送速度 | 较慢 | 快 | +50-70% |
| 加密操作速度 | 较慢 | 快 | +60-80% |
| CPU 使用率 | 较高 | 较低 | -30-40% |

---

## 💡 提示

1. **TgCrypto 是可选的：** 不安装也能正常工作，只是性能会慢一些
2. **安装位置：** 会自动安装到当前 Python 环境的 `site-packages` 目录
3. **版本要求：** Python 3.7+，建议 Python 3.8+
4. **Windows 用户：** 如果遇到编译错误，可能需要安装 Visual C++ Build Tools

---

## 🔗 相关链接

- TgCrypto GitHub: https://github.com/pyrogram/tgcrypto
- Pyrogram 文档: https://docs.pyrogram.org/topics/speedups
- Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/

---

**最后更新：** 2026-01-02

