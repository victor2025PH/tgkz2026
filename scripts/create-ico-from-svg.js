/**
 * TG-AI智控王 - 從 SVG 創建 ICO 圖標
 * 使用 svg2img 和 png-to-ico 庫
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const SVG_PATH = path.join(PROJECT_ROOT, 'build-resources', 'icon.svg');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
const BUILD_RESOURCES_DIR = path.join(PROJECT_ROOT, 'build-resources');
const TEMP_PNG_PATH = path.join(BUILD_DIR, 'icon-temp.png');

// 確保目錄存在
[BUILD_DIR, BUILD_RESOURCES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

console.log('🎨 TG-AI智控王 圖標生成工具 v2\n');
console.log('='.repeat(50));

// 安裝必要的依賴
function installDependencies() {
    console.log('\n📦 檢查並安裝圖像處理依賴...');
    
    const deps = ['sharp', 'png-to-ico'];
    let needInstall = [];
    
    for (const dep of deps) {
        try {
            require.resolve(dep);
            console.log(`  ✓ ${dep} 已安裝`);
        } catch (e) {
            console.log(`  ⚠ ${dep} 未安裝`);
            needInstall.push(dep);
        }
    }
    
    if (needInstall.length > 0) {
        console.log(`\n📥 安裝缺失的依賴: ${needInstall.join(', ')}`);
        try {
            execSync(`npm install ${needInstall.join(' ')} --save-dev`, {
                cwd: PROJECT_ROOT,
                stdio: 'inherit'
            });
            console.log('✓ 依賴安裝完成');
            return true;
        } catch (e) {
            console.log('❌ 依賴安裝失敗');
            return false;
        }
    }
    
    return true;
}

// 使用 sharp 生成圖標
async function generateIcon() {
    console.log('\n🔄 開始生成圖標...');
    
    try {
        const sharp = require('sharp');
        const pngToIcoModule = require('png-to-ico');
        const pngToIco = pngToIcoModule.default || pngToIcoModule;
        
        // 讀取 SVG
        console.log('  讀取 SVG 文件...');
        const svgBuffer = fs.readFileSync(SVG_PATH);
        
        // 生成 256x256 PNG
        console.log('  轉換為 256x256 PNG...');
        const png256Buffer = await sharp(svgBuffer)
            .resize(256, 256)
            .png()
            .toBuffer();
        
        // 保存臨時 PNG
        fs.writeFileSync(TEMP_PNG_PATH, png256Buffer);
        console.log(`  ✓ 臨時 PNG 已保存: ${TEMP_PNG_PATH}`);
        
        // 生成 ICO (包含多種尺寸)
        console.log('  生成 ICO 文件...');
        
        // 生成不同尺寸的 PNG 並保存為臨時文件
        const sizes = [16, 32, 48, 64, 128, 256];
        const tempPngPaths = [];
        
        for (const size of sizes) {
            const tempPath = path.join(BUILD_DIR, `icon-${size}.png`);
            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(tempPath);
            tempPngPaths.push(tempPath);
            console.log(`    ✓ 生成 ${size}x${size}`);
        }
        
        // 使用 256x256 PNG 轉換為 ICO
        const icoBuffer = await pngToIco(tempPngPaths);
        
        // 保存 ICO 到兩個位置
        const icoPath1 = path.join(BUILD_DIR, 'icon.ico');
        const icoPath2 = path.join(BUILD_RESOURCES_DIR, 'icon.ico');
        
        fs.writeFileSync(icoPath1, icoBuffer);
        fs.writeFileSync(icoPath2, icoBuffer);
        
        // 清理臨時文件
        if (fs.existsSync(TEMP_PNG_PATH)) {
            fs.unlinkSync(TEMP_PNG_PATH);
        }
        for (const tempPath of tempPngPaths) {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
        
        // 獲取文件大小
        const icoSize = fs.statSync(icoPath1).size;
        const icoSizeKB = (icoSize / 1024).toFixed(1);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ ICO 圖標生成成功!');
        console.log('='.repeat(50));
        console.log(`\n📁 輸出文件:`);
        console.log(`   ${icoPath1}`);
        console.log(`   ${icoPath2}`);
        console.log(`\n📊 文件大小: ${icoSizeKB} KB`);
        console.log(`📐 包含尺寸: ${sizes.join('x, ')}x`);
        
        return true;
        
    } catch (error) {
        console.log('\n❌ 圖標生成失敗:', error.message);
        return false;
    }
}

// 主函數
async function main() {
    // 檢查 SVG 文件
    if (!fs.existsSync(SVG_PATH)) {
        console.log('❌ 找不到 SVG 源文件:', SVG_PATH);
        process.exit(1);
    }
    console.log('✓ SVG 源文件:', SVG_PATH);
    
    // 安裝依賴
    if (!installDependencies()) {
        console.log('\n請手動安裝依賴: npm install sharp png-to-ico --save-dev');
        process.exit(1);
    }
    
    // 生成圖標
    const success = await generateIcon();
    
    if (!success) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('錯誤:', err);
    process.exit(1);
});
