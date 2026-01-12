/**
 * Check if Angular build files exist, if not, build them
 * Also checks if source files are newer than build files (auto-rebuild)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
const srcDir = path.join(__dirname, '..', 'src');

// 獲取目錄中最新文件的修改時間
function getLatestFileTime(dir, extensions = ['.ts', '.html', '.css', '.json']) {
    let latestTime = 0;
    
    function scanDir(currentDir) {
        if (!fs.existsSync(currentDir)) return;
        
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 跳過 node_modules 和 dist 目錄
                if (item !== 'node_modules' && item !== 'dist') {
                    scanDir(fullPath);
                }
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (extensions.includes(ext) || extensions.length === 0) {
                    const mtime = stat.mtime.getTime();
                    if (mtime > latestTime) {
                        latestTime = mtime;
                    }
                }
            }
        }
    }
    
    scanDir(dir);
    return latestTime;
}

// 獲取構建文件的修改時間
function getBuildTime() {
    if (!fs.existsSync(indexPath)) {
        return 0;
    }
    return fs.statSync(indexPath).mtime.getTime();
}

console.log('🔍 检查构建文件...');

const buildTime = getBuildTime();
const sourceTime = getLatestFileTime(srcDir);

if (!fs.existsSync(indexPath)) {
    console.log('❌ 构建文件不存在，正在构建 Angular 应用...');
    console.log('⏳ 这可能需要几分钟时间，请稍候...\n');
    
    try {
        execSync('npm run build', { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        console.log('\n✅ 构建完成！\n');
    } catch (error) {
        console.error('\n❌ 构建失败！');
        console.error('请手动运行: npm run build');
        process.exit(1);
    }
} else if (sourceTime > buildTime) {
    console.log('⚠️  检测到源文件已更新，正在重新构建...');
    console.log(`   源文件最新修改: ${new Date(sourceTime).toLocaleString()}`);
    console.log(`   构建文件时间: ${new Date(buildTime).toLocaleString()}`);
    console.log('⏳ 这可能需要几分钟时间，请稍候...\n');
    
    try {
        execSync('npm run build', { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        console.log('\n✅ 重新构建完成！\n');
    } catch (error) {
        console.error('\n❌ 构建失败！');
        console.error('请手动运行: npm run build');
        process.exit(1);
    }
} else {
    console.log('✅ 构建文件已存在且是最新的\n');
}

