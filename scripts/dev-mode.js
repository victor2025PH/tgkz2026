/**
 * 開發模式：使用 Angular 開發服務器，支持熱重載
 * 這樣修改代碼後會自動刷新，無需手動重新構建
 * 
 * 🔧 Phase 3 優化：支持輕量模式
 * 使用 --lightweight 參數啟動可大幅減少內存佔用
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 🔧 檢測輕量模式
const isLightweightMode = process.argv.includes('--lightweight') || process.env.TG_LIGHTWEIGHT_MODE === 'true';

if (isLightweightMode) {
    console.log('⚡ 輕量模式啟動中...');
    console.log('📊 內存優化設置:');
    console.log('   - 神經網絡嵌入: 禁用 (節省 ~200MB)');
    console.log('   - 模塊延遲加載: 啟用 (節省 ~100MB)');
    console.log('   - 緩存限制: 已啟用\n');
    
    // 設置環境變量
    process.env.TG_LIGHTWEIGHT_MODE = 'true';
    process.env.TG_DISABLE_NEURAL_EMBEDDING = 'true';
    process.env.TG_MAX_CACHE_ENTRIES = '200';
} else {
    console.log('🚀 啟動開發模式...');
}
console.log('📝 提示：修改代碼後會自動刷新，無需重新構建\n');

// 檢查是否安裝了 concurrently 和 wait-on
function checkDependencies() {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    const hasConcurrently = fs.existsSync(path.join(nodeModulesPath, 'concurrently'));
    const hasWaitOn = fs.existsSync(path.join(nodeModulesPath, 'wait-on'));
    return { hasConcurrently, hasWaitOn };
}

const { hasConcurrently, hasWaitOn } = checkDependencies();

if (!hasConcurrently || !hasWaitOn) {
    console.log('⚠️  檢測到缺少依賴，正在安裝 concurrently 和 wait-on...\n');
    const install = spawn('npm', ['install', '--save-dev', 'concurrently', 'wait-on'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        shell: true
    });
    
    install.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ 依賴安裝完成，正在啟動開發模式...\n');
            setTimeout(() => startDevMode(), 1000); // 等待一下確保模塊已加載
        } else {
            console.error('\n❌ 依賴安裝失敗，請手動運行：');
            console.error('   npm install --save-dev concurrently wait-on');
            process.exit(1);
        }
    });
} else {
    startDevMode();
}

function startDevMode() {
    const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 
        process.platform === 'win32' ? 'electron.cmd' : 'electron');
    
    console.log('📦 啟動 Angular 開發服務器 (端口 4200)...');
    console.log('⚡ 啟動 Electron (將連接到開發服務器)...\n');
    console.log('💡 提示：');
    console.log('   - 修改代碼後會自動刷新');
    console.log('   - 按 Ctrl+C 停止開發模式\n');
    
    try {
        // 使用 concurrently 同時運行兩個命令
        const concurrently = require('concurrently');
        
        // 🔧 構建 Electron 啟動命令
        const electronArgs = ['--dev'];
        if (isLightweightMode) {
            electronArgs.push('--lightweight');
        }
        const electronCmd = `wait-on http://localhost:4200 && ${electronPath} . ${electronArgs.join(' ')}`;
        
        concurrently([
            {
                command: 'ng serve --port 4200',
                name: 'angular',
                prefixColor: 'cyan'
            },
            {
                command: electronCmd,
                name: 'electron',
                prefixColor: 'green',
                // 🔧 傳遞環境變量
                env: isLightweightMode ? {
                    ...process.env,
                    TG_LIGHTWEIGHT_MODE: 'true',
                    TG_DISABLE_NEURAL_EMBEDDING: 'true',
                    TG_MAX_CACHE_ENTRIES: '200'
                } : process.env
            }
        ], {
            killOthers: ['failure', 'success'],
            restartTries: 0
        });
    } catch (error) {
        console.error('❌ 啟動失敗:', error.message);
        console.error('請確保已安裝依賴: npm install --save-dev concurrently wait-on');
        process.exit(1);
    }
}
