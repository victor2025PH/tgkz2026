/**
 * Safe Windows packaging script that handles permission issues
 * This script clears cache and provides instructions for admin rights
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 TG-Matrix Windows 安全打包脚本\n');

// Check if running on Windows
if (os.platform() !== 'win32') {
    console.error('❌ 此脚本仅适用于 Windows 系统');
    process.exit(1);
}

// Check for admin rights
const isAdmin = () => {
    try {
        execSync('net session', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
};

if (!isAdmin()) {
    console.log('⚠️  检测到未以管理员身份运行\n');
    console.log('📋 解决方案：');
    console.log('   1. 右键点击 PowerShell');
    console.log('   2. 选择"以管理员身份运行"');
    console.log('   3. 导航到项目目录：cd C:\\tgkz2026');
    console.log('   4. 运行：node scripts/package-win-safe.js\n');
    console.log('或者使用以下方法：\n');
    console.log('方法 2: 启用开发者模式（推荐）');
    console.log('   1. 打开"设置" (Win + I)');
    console.log('   2. 进入"更新和安全" → "开发者选项"');
    console.log('   3. 启用"开发人员模式"');
    console.log('   4. 重启计算机后重新运行打包命令\n');
    process.exit(1);
}

console.log('✅ 已检测到管理员权限\n');

// Step 1: Clear Electron Builder cache
console.log('🧹 步骤 1: 清除 Electron Builder 缓存...');
const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache');
if (fs.existsSync(cacheDir)) {
    try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log('✅ 缓存已清除\n');
    } catch (error) {
        console.warn('⚠️  清除缓存时出错（可能正在使用）:', error.message);
        console.log('   可以手动删除:', cacheDir, '\n');
    }
} else {
    console.log('ℹ️  缓存目录不存在，跳过\n');
}

// Step 2: Check and create icon placeholder if needed
console.log('🎨 步骤 2: 检查图标文件...');
const buildDir = path.join(__dirname, '..', 'build');
const iconFile = path.join(buildDir, 'icon.ico');

if (!fs.existsSync(iconFile)) {
    console.log('⚠️  图标文件不存在，将使用默认图标');
    console.log('   提示：可以添加自定义图标到 build/icon.ico\n');
    
    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
} else {
    console.log('✅ 图标文件已找到\n');
}

// Step 3: Build Angular
console.log('📦 步骤 3: 构建 Angular 应用...');
try {
    execSync('npm run build:prod', { stdio: 'inherit' });
    console.log('✅ Angular 构建完成\n');
} catch (error) {
    console.error('❌ Angular 构建失败');
    process.exit(1);
}

// Step 4: Package with Electron Builder
console.log('📦 步骤 4: 使用 Electron Builder 打包...');
console.log('   使用环境变量跳过 winCodeSign...\n');

// Set environment variable to skip problematic tools
process.env.SKIP_NOTARIZATION = 'true';
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

try {
    execSync('electron-builder --win', {
        stdio: 'inherit',
        env: {
            ...process.env,
            SKIP_NOTARIZATION: 'true',
            CSC_IDENTITY_AUTO_DISCOVERY: 'false'
        }
    });
    console.log('\n✅ 打包完成！');
    console.log('📁 输出目录: release/');
} catch (error) {
    console.error('\n❌ 打包失败');
    console.log('\n💡 如果仍然遇到符号链接错误，请尝试：');
    console.log('   1. 启用 Windows 开发者模式（设置 → 更新和安全 → 开发者选项）');
    console.log('   2. 重启计算机');
    console.log('   3. 重新运行此脚本');
    process.exit(1);
}

