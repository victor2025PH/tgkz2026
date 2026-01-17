/**
 * TG-AI智控王 圖標生成腳本
 * 將 SVG 轉換為 Windows ICO 格式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const SVG_PATH = path.join(PROJECT_ROOT, 'build-resources', 'icon.svg');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
const BUILD_RESOURCES_DIR = path.join(PROJECT_ROOT, 'build-resources');

// 確保目錄存在
if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

console.log('🎨 TG-AI智控王 圖標生成工具\n');

// 檢查 SVG 文件
if (!fs.existsSync(SVG_PATH)) {
    console.log('❌ 找不到 SVG 文件:', SVG_PATH);
    process.exit(1);
}

console.log('✓ 找到 SVG 源文件:', SVG_PATH);

// 方法 1: 使用 sharp (如果已安裝)
async function generateWithSharp() {
    try {
        const sharp = require('sharp');
        const pngToIco = require('png-to-ico');
        
        console.log('📦 使用 sharp + png-to-ico 生成圖標...\n');
        
        // 生成多種尺寸的 PNG
        const sizes = [16, 32, 48, 64, 128, 256];
        const pngBuffers = [];
        
        for (const size of sizes) {
            console.log(`  生成 ${size}x${size} PNG...`);
            const buffer = await sharp(SVG_PATH)
                .resize(size, size)
                .png()
                .toBuffer();
            pngBuffers.push(buffer);
        }
        
        // 生成 256x256 PNG 作為基礎
        const png256 = await sharp(SVG_PATH)
            .resize(256, 256)
            .png()
            .toBuffer();
        
        // 轉換為 ICO
        console.log('  轉換為 ICO...');
        const icoBuffer = await pngToIco(png256);
        
        const icoPath = path.join(BUILD_DIR, 'icon.ico');
        const icoPath2 = path.join(BUILD_RESOURCES_DIR, 'icon.ico');
        
        fs.writeFileSync(icoPath, icoBuffer);
        fs.writeFileSync(icoPath2, icoBuffer);
        
        console.log(`\n✅ ICO 圖標已生成:`);
        console.log(`   ${icoPath}`);
        console.log(`   ${icoPath2}`);
        
        return true;
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            return false;
        }
        throw e;
    }
}

// 方法 2: 使用 Jimp (純 JS，無需編譯)
async function generateWithJimp() {
    try {
        const Jimp = require('jimp');
        
        console.log('📦 使用 Jimp 生成圖標...\n');
        console.log('⚠️ Jimp 不支持 SVG，需要使用其他方法');
        
        return false;
    } catch (e) {
        return false;
    }
}

// 方法 3: 創建一個簡易的 PNG 圖標 (純 JavaScript)
function createSimplePngIcon() {
    console.log('📦 創建簡易 PNG 圖標...\n');
    
    // 創建一個提示文件
    const readmePath = path.join(BUILD_DIR, 'ICON_README.md');
    const content = `# 圖標文件說明

## 自動生成圖標

由於缺少必要的圖像處理庫，請手動生成圖標：

### 方法 1：在線轉換
1. 打開 SVG 文件: ${SVG_PATH}
2. 訪問 https://convertio.co/svg-ico/
3. 上傳 SVG 文件
4. 下載 ICO 文件
5. 將 ICO 文件複製到:
   - ${path.join(BUILD_DIR, 'icon.ico')}
   - ${path.join(BUILD_RESOURCES_DIR, 'icon.ico')}

### 方法 2：安裝依賴後重新運行
\`\`\`bash
npm install sharp png-to-ico
node scripts/generate-icon.js
\`\`\`

### 方法 3：使用 ImageMagick
\`\`\`bash
# 安裝 ImageMagick
# Windows: https://imagemagick.org/script/download.php

# 轉換命令
magick convert ${SVG_PATH} -resize 256x256 ${path.join(BUILD_DIR, 'icon.ico')}
\`\`\`
`;
    
    fs.writeFileSync(readmePath, content);
    console.log('📝 已創建說明文件:', readmePath);
    
    return false;
}

// 方法 4: 嘗試使用系統 ImageMagick
function tryImageMagick() {
    console.log('📦 嘗試使用 ImageMagick...\n');
    
    try {
        // 檢查 magick 命令
        execSync('magick --version', { stdio: 'pipe' });
        console.log('✓ 找到 ImageMagick');
        
        const icoPath = path.join(BUILD_DIR, 'icon.ico');
        const icoPath2 = path.join(BUILD_RESOURCES_DIR, 'icon.ico');
        
        // 使用 ImageMagick 轉換
        console.log('  轉換 SVG 到 ICO...');
        execSync(`magick convert "${SVG_PATH}" -resize 256x256 "${icoPath}"`, { stdio: 'inherit' });
        
        // 複製到 build-resources
        fs.copyFileSync(icoPath, icoPath2);
        
        console.log(`\n✅ ICO 圖標已生成:`);
        console.log(`   ${icoPath}`);
        console.log(`   ${icoPath2}`);
        
        return true;
    } catch (e) {
        console.log('⚠️ ImageMagick 未安裝或不可用');
        return false;
    }
}

// 主函數
async function main() {
    let success = false;
    
    // 嘗試不同的方法
    success = await generateWithSharp();
    
    if (!success) {
        success = tryImageMagick();
    }
    
    if (!success) {
        createSimplePngIcon();
        
        console.log('\n' + '='.repeat(60));
        console.log('⚠️ 無法自動生成圖標文件');
        console.log('');
        console.log('請選擇以下方法之一：');
        console.log('');
        console.log('1. 安裝圖像處理庫：');
        console.log('   npm install sharp png-to-ico');
        console.log('   node scripts/generate-icon.js');
        console.log('');
        console.log('2. 安裝 ImageMagick：');
        console.log('   下載: https://imagemagick.org/script/download.php');
        console.log('   重新運行此腳本');
        console.log('');
        console.log('3. 在線轉換：');
        console.log('   https://convertio.co/svg-ico/');
        console.log('   上傳 build-resources/icon.svg');
        console.log('   下載並放到 build/icon.ico');
        console.log('='.repeat(60));
    }
}

main().catch(console.error);
