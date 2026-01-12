/**
 * Complete packaging script for TG-Matrix
 * This script handles the entire packaging process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting TG-Matrix packaging process...\n');

// Step 1: Build Angular application
console.log('📦 Step 1: Building Angular application...');
try {
    execSync('npm run build:prod', { stdio: 'inherit' });
    console.log('✅ Angular build completed\n');
} catch (error) {
    console.error('❌ Angular build failed:', error.message);
    process.exit(1);
}

// Step 2: Check if icons exist
console.log('🎨 Step 2: Checking icon files...');
const buildDir = path.join(__dirname, '..', 'build');
const iconFiles = {
    win: path.join(buildDir, 'icon.ico'),
    mac: path.join(buildDir, 'icon.icns'),
    linux: path.join(buildDir, 'icon.png')
};

if (!fs.existsSync(iconFiles.win)) {
    console.warn('⚠️  Warning: Windows icon (icon.ico) not found. Using default icon.');
}
if (!fs.existsSync(iconFiles.mac)) {
    console.warn('⚠️  Warning: macOS icon (icon.icns) not found. Using default icon.');
}
if (!fs.existsSync(iconFiles.linux)) {
    console.warn('⚠️  Warning: Linux icon (icon.png) not found. Using default icon.');
}
console.log('✅ Icon check completed\n');

// Step 3: Optional - Build Python backend (if PyInstaller is available)
console.log('🐍 Step 3: Checking Python backend packaging...');
try {
    execSync('pip show pyinstaller', { stdio: 'ignore' });
    console.log('PyInstaller found. Building Python backend...');
    try {
        execSync('node scripts/build-backend.js', { stdio: 'inherit' });
        console.log('✅ Python backend built successfully\n');
    } catch (error) {
        console.warn('⚠️  Python backend build failed. Continuing with source files...\n');
    }
} catch (error) {
    console.log('ℹ️  PyInstaller not found. Using Python source files (requires Python installation).\n');
}

// Step 4: Package with Electron Builder
console.log('📦 Step 4: Packaging with Electron Builder...');
const platform = process.argv[2] || 'auto';

// Detect current platform if 'auto' or 'all' is specified
const currentPlatform = process.platform;
let targetPlatform = platform;

if (platform === 'auto' || platform === 'all') {
    if (currentPlatform === 'win32') {
        targetPlatform = 'win';
        console.log('ℹ️  Detected Windows platform. Building Windows package only.');
        console.log('ℹ️  Note: macOS and Linux packages can only be built on their respective platforms.\n');
    } else if (currentPlatform === 'darwin') {
        targetPlatform = 'mac';
        console.log('ℹ️  Detected macOS platform. Building macOS package only.\n');
    } else if (currentPlatform === 'linux') {
        targetPlatform = 'linux';
        console.log('ℹ️  Detected Linux platform. Building Linux package only.\n');
    } else {
        console.warn('⚠️  Unknown platform. Defaulting to Windows.');
        targetPlatform = 'win';
    }
}

let command = 'npm run package';
if (targetPlatform === 'win') {
    command = 'npm run package:win';
} else if (targetPlatform === 'mac') {
    command = 'npm run package:mac';
} else if (targetPlatform === 'linux') {
    command = 'npm run package:linux';
} else if (platform === 'all' && currentPlatform === 'win32') {
    // On Windows, only build Windows package
    console.log('⚠️  Cannot build macOS/Linux packages on Windows. Building Windows package only.');
    command = 'npm run package:win';
}

try {
    execSync(command, { stdio: 'inherit' });
    console.log('\n✅ Packaging completed successfully!');
    console.log('📁 Output directory: release/');
} catch (error) {
    console.error('\n❌ Packaging failed:', error.message);
    process.exit(1);
}

// Step 5: Create installation instructions
console.log('\n📝 Step 5: Creating installation instructions...');
const installInstructions = `
# TG-Matrix 安装说明

## 系统要求

- Windows 10/11 或更高版本
- Python 3.8 或更高版本（如果使用源代码版本）
- 至少 500MB 可用磁盘空间

## 安装步骤

### 方法 1：使用安装程序（推荐）

1. 运行 \`TG-Matrix-${require('../package.json').version}-Setup.exe\`
2. 按照安装向导完成安装
3. 安装程序会自动检查 Python 是否已安装
4. 如果未安装 Python，请访问 https://www.python.org/downloads/ 下载安装

### 方法 2：便携版

1. 解压 \`TG-Matrix-${require('../package.json').version}-win.zip\` 到任意目录
2. 运行 \`TG-Matrix.exe\`
3. 确保已安装 Python 3.8+

## 首次运行

1. 启动应用后，系统会自动启动 Python 后端
2. 如果提示 Python 未找到，请：
   - 安装 Python 3.8 或更高版本
   - 确保 Python 已添加到系统 PATH
   - 重启应用

## 数据目录

应用数据存储在以下位置：
- 数据库：\`%APPDATA%\\TG-Matrix\\backend\\data\\tgmatrix.db\`
- 会话文件：\`%APPDATA%\\TG-Matrix\\backend\\sessions\\\`
- 日志文件：\`%APPDATA%\\TG-Matrix\\backend\\logs\\\`

## 卸载

1. 通过"控制面板" → "程序和功能"卸载
2. 或运行安装目录中的 \`Uninstall.exe\`

## 技术支持

如遇问题，请查看：
- 用户手册：用户手册.md
- 部署指南：部署指南.md
`;

fs.writeFileSync(
    path.join(__dirname, '..', 'release', '安装说明.txt'),
    installInstructions,
    'utf8'
);

console.log('✅ Installation instructions created\n');
console.log('🎉 All done! Check the release/ directory for packaged files.');

