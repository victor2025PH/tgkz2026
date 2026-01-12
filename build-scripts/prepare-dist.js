/**
 * 打包前準備腳本
 * 確保所有必要的文件和目錄都存在
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

console.log('📦 準備打包環境...');

// 1. 確保 build-resources 目錄存在
const buildResourcesDir = path.join(PROJECT_ROOT, 'build-resources');
if (!fs.existsSync(buildResourcesDir)) {
    fs.mkdirSync(buildResourcesDir, { recursive: true });
    console.log('  ✓ 創建 build-resources 目錄');
}

// 2. 創建佔位圖標（如果不存在）
const iconPath = path.join(buildResourcesDir, 'icon.ico');
if (!fs.existsSync(iconPath)) {
    console.log('  ⚠️ 未找到圖標文件，請添加 build-resources/icon.ico');
    // 創建一個說明文件
    fs.writeFileSync(
        path.join(buildResourcesDir, 'README.md'),
        `# Build Resources

請在此目錄放置以下文件：

- \`icon.ico\` - Windows 圖標 (256x256)
- \`icon.icns\` - macOS 圖標
- \`icons/\` - Linux 圖標目錄 (包含多種尺寸的 PNG)

## 圖標生成工具

可以使用以下工具生成圖標：
- https://icoconvert.com/
- https://cloudconvert.com/

## 推薦尺寸

- 16x16
- 32x32
- 48x48
- 64x64
- 128x128
- 256x256
- 512x512
`,
        'utf8'
    );
}

// 3. 確保 default-config 目錄存在並有默認配置
const defaultConfigDir = path.join(PROJECT_ROOT, 'default-config');
if (!fs.existsSync(defaultConfigDir)) {
    fs.mkdirSync(defaultConfigDir, { recursive: true });
    console.log('  ✓ 創建 default-config 目錄');
}

// 4. 檢查 AI 配置
const aiConfigPath = path.join(defaultConfigDir, 'ai-config.json');
if (!fs.existsSync(aiConfigPath)) {
    console.log('  ⚠️ 未找到 AI 配置文件');
}

// 5. 檢查系統設置
const settingsPath = path.join(defaultConfigDir, 'settings.json');
if (!fs.existsSync(settingsPath)) {
    console.log('  ⚠️ 未找到系統設置文件');
}

// 6. 創建 LICENSE.txt（如果不存在）
const licensePath = path.join(PROJECT_ROOT, 'LICENSE.txt');
if (!fs.existsSync(licensePath)) {
    fs.writeFileSync(
        licensePath,
        `TG-Matrix License Agreement

Copyright © 2026 TG-Matrix. All Rights Reserved.

This software is provided "as is" without warranty of any kind, express or implied.

By using this software, you agree to:
1. Use it only for legal purposes
2. Comply with Telegram's Terms of Service
3. Respect local laws and regulations

For commercial licensing, contact: license@tg-matrix.com
`,
        'utf8'
    );
    console.log('  ✓ 創建 LICENSE.txt');
}

// 7. 創建 NSIS 安裝腳本
const nsisPath = path.join(buildResourcesDir, 'installer.nsh');
if (!fs.existsSync(nsisPath)) {
    fs.writeFileSync(
        nsisPath,
        `; TG-Matrix NSIS 自定義安裝腳本

!macro customHeader
  ; 自定義標頭
!macroend

!macro preInit
  ; 安裝前初始化
!macroend

!macro customInit
  ; 自定義初始化
!macroend

!macro customInstall
  ; 創建數據目錄
  CreateDirectory "$INSTDIR\\data"
  CreateDirectory "$INSTDIR\\data\\sessions"
  CreateDirectory "$INSTDIR\\data\\backups"
  CreateDirectory "$INSTDIR\\data\\logs"
  
  ; 寫入版本信息
  FileOpen $0 "$INSTDIR\\version.txt" w
  FileWrite $0 "TG-Matrix v\${VERSION}$\\r$\\n"
  FileWrite $0 "Installed: $\\r$\\n"
  FileClose $0
!macroend

!macro customUnInstall
  ; 卸載時詢問是否刪除數據
  MessageBox MB_YESNO "是否刪除用戶數據？" IDNO skip_data
    RMDir /r "$INSTDIR\\data"
  skip_data:
!macroend
`,
        'utf8'
    );
    console.log('  ✓ 創建 installer.nsh');
}

console.log('✅ 打包環境準備完成!');
console.log('');
console.log('下一步：');
console.log('  npm run dist:win    - 打包 Windows 版本');
console.log('  npm run dist:mac    - 打包 macOS 版本');
console.log('  npm run dist:linux  - 打包 Linux 版本');
