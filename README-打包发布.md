# TG-Matrix 打包发布指南

## 📦 快速打包

### 一键打包（所有平台）

```bash
npm run package:all
```

### 单独打包

**Windows:**
```bash
npm run package:win
```

**macOS:**
```bash
npm run package:mac
```

**Linux:**
```bash
npm run package:linux
```

### 使用打包脚本（推荐）

```bash
node scripts/package.js [platform]
```

支持的平台参数：
- `win` - 仅打包 Windows 版本
- `mac` - 仅打包 macOS 版本
- `linux` - 仅打包 Linux 版本
- `all` 或不指定 - 打包所有平台

## 📋 打包前准备

### 1. 安装依赖

确保所有依赖已安装：

```bash
npm install
pip install -r backend/requirements.txt
```

### 2. 准备图标文件

在 `build/` 目录放置图标文件：

- **Windows**: `build/icon.ico` (256x256 或更大)
- **macOS**: `build/icon.icns` (512x512 或更大)
- **Linux**: `build/icon.png` (512x512 或更大)

如果没有图标文件，打包时会使用默认图标。

### 3. 构建 Angular 应用

打包脚本会自动构建，也可以手动构建：

```bash
npm run build:prod
```

## 🔧 打包配置

打包配置在 `package.json` 的 `build` 字段中：

```json
{
  "build": {
    "appId": "com.tgmatrix.app",
    "productName": "TG-Matrix",
    "directories": {
      "output": "release"
    },
    ...
  }
}
```

### 自定义配置

可以修改以下配置：

- **输出目录**: 修改 `directories.output`
- **应用 ID**: 修改 `appId`
- **产品名称**: 修改 `productName`
- **安装程序选项**: 修改 `nsis` 配置

## 📁 打包输出

打包完成后，文件会输出到 `release/` 目录：

### Windows
- `TG-Matrix-1.0.0-Setup.exe` - NSIS 安装程序
- `TG-Matrix-1.0.0-win.zip` - 便携版（可选）

### macOS
- `TG-Matrix-1.0.0.dmg` - DMG 安装包
- `TG-Matrix-1.0.0-mac.zip` - 便携版（可选）

### Linux
- `TG-Matrix-1.0.0.AppImage` - AppImage 格式
- `TG-Matrix_1.0.0_amd64.deb` - Debian 包

## 🐍 Python 后端打包（可选）

### 方法 1：使用源代码（推荐）

默认情况下，打包会包含 Python 源代码，用户需要安装 Python。

**优点：**
- 打包体积小
- 更新 Python 依赖方便
- 调试容易

**缺点：**
- 用户需要安装 Python

### 方法 2：使用 PyInstaller（高级）

将 Python 后端打包为可执行文件：

```bash
# 安装 PyInstaller
pip install pyinstaller

# 构建后端
node scripts/build-backend.js
```

**优点：**
- 用户不需要安装 Python
- 完全独立的应用

**缺点：**
- 打包体积大（~100MB+）
- 更新依赖需要重新打包

## 📦 安装程序特性

### Windows (NSIS)

- ✅ 自定义安装目录
- ✅ 创建桌面快捷方式
- ✅ 创建开始菜单快捷方式
- ✅ Python 检测提示
- ✅ 自动卸载程序

### macOS (DMG)

- ✅ 拖拽安装
- ✅ 应用程序签名（需要开发者证书）
- ✅ 自动更新支持（需要配置）

### Linux (AppImage/Deb)

- ✅ 无需安装即可运行（AppImage）
- ✅ 系统集成（Deb）
- ✅ 自动更新支持

## 🚀 发布流程

### 1. 版本号更新

更新 `package.json` 中的版本号：

```json
{
  "version": "1.0.0"
}
```

### 2. 构建和打包

```bash
node scripts/package.js all
```

### 3. 测试打包文件

在干净的系统中测试安装程序：

1. 在虚拟机或新系统中测试
2. 验证所有功能正常
3. 检查 Python 检测是否工作
4. 测试卸载功能

### 4. 创建发布说明

创建 `CHANGELOG.md` 或发布说明，包含：
- 新功能
- 修复的问题
- 已知问题
- 系统要求

### 5. 分发

将 `release/` 目录中的文件上传到：
- GitHub Releases
- 公司内部服务器
- 云存储服务

## 🔍 故障排除

### 问题：打包失败，提示找不到文件

**解决：**
1. 确保已运行 `npm run build:prod`
2. 检查 `dist/` 目录是否存在
3. 检查 `package.json` 中的 `files` 配置

### 问题：安装程序无法启动 Python 后端

**解决：**
1. 检查 Python 是否已安装
2. 检查 Python 是否在 PATH 中
3. 查看应用日志：`%APPDATA%\TG-Matrix\backend\logs\`

### 问题：打包体积过大

**解决：**
1. 使用 `asar` 压缩（Electron Builder 默认启用）
2. 排除不必要的文件（在 `files` 配置中使用 `!`）
3. 使用 Python 源代码而不是 PyInstaller

### 问题：macOS 打包需要签名

**解决：**
1. 获取 Apple Developer 证书
2. 在 `package.json` 中配置签名：
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name"
   }
   ```

## 📝 检查清单

打包前检查：

- [ ] 版本号已更新
- [ ] 所有依赖已安装
- [ ] Angular 应用已构建
- [ ] 图标文件已准备
- [ ] 测试应用功能正常
- [ ] 更新了用户手册和部署指南
- [ ] 创建了发布说明

打包后检查：

- [ ] 安装程序可以正常安装
- [ ] 应用可以正常启动
- [ ] Python 后端可以正常启动
- [ ] 所有功能正常工作
- [ ] 卸载程序可以正常卸载
- [ ] 在不同系统上测试（如可能）

## 🎯 最佳实践

1. **版本管理**：使用语义化版本号（SemVer）
2. **测试**：在多个系统上测试打包文件
3. **文档**：保持用户手册和部署指南更新
4. **签名**：为 macOS 和 Windows 应用签名（可选但推荐）
5. **更新机制**：考虑实现自动更新功能

## 📚 相关文档

- [用户手册](用户手册.md)
- [部署指南](部署指南.md)
- [Electron Builder 文档](https://www.electron.build/)

---

**最后更新：** 2026-01-02

