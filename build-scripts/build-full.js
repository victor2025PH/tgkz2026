/**
 * TG-Matrix 完整打包腳本
 * 
 * 步驟：
 * 1. 編譯 Python 後端為 exe
 * 2. 構建 Angular 前端
 * 3. 打包 Electron 安裝程序
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const BACKEND_EXE_DIR = path.join(PROJECT_ROOT, 'backend-exe');

// 顏色輸出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(msg, type = 'info') {
    const prefix = {
        info: `${colors.cyan}[INFO]${colors.reset}`,
        success: `${colors.green}[SUCCESS]${colors.reset}`,
        warn: `${colors.yellow}[WARN]${colors.reset}`,
        error: `${colors.red}[ERROR]${colors.reset}`
    };
    console.log(`${prefix[type] || prefix.info} ${msg}`);
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        log(`執行: ${command} ${args.join(' ')}`);
        
        const proc = spawn(command, args, {
            cwd: options.cwd || PROJECT_ROOT,
            stdio: 'inherit',
            shell: true,
            ...options
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`命令失敗，退出碼: ${code}`));
            }
        });
        
        proc.on('error', (err) => {
            reject(err);
        });
    });
}

async function step1_buildPythonBackend() {
    console.log('\n' + '='.repeat(60));
    log('📦 步驟 1/3: 編譯 Python 後端為 exe', 'info');
    console.log('='.repeat(60) + '\n');
    
    const buildScript = path.join(__dirname, 'build-backend-exe.py');
    
    if (!fs.existsSync(buildScript)) {
        throw new Error(`找不到編譯腳本: ${buildScript}`);
    }
    
    await runCommand('python', [buildScript]);
    
    // 驗證 exe 是否生成
    const exePath = path.join(BACKEND_EXE_DIR, 'tg-matrix-backend.exe');
    if (!fs.existsSync(exePath)) {
        throw new Error(`編譯失敗: 未找到 ${exePath}`);
    }
    
    const stats = fs.statSync(exePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    log(`✓ 後端 exe 已生成: ${sizeMB} MB`, 'success');
}

async function step2_buildFrontend() {
    console.log('\n' + '='.repeat(60));
    log('🎨 步驟 2/3: 構建 Angular 前端', 'info');
    console.log('='.repeat(60) + '\n');
    
    await runCommand('npm', ['run', 'build:prod']);
    
    // 驗證構建結果
    const distPath = path.join(PROJECT_ROOT, 'dist', 'index.html');
    if (!fs.existsSync(distPath)) {
        throw new Error(`構建失敗: 未找到 ${distPath}`);
    }
    
    log('✓ 前端構建完成', 'success');
}

async function step3_packageElectron() {
    console.log('\n' + '='.repeat(60));
    log('📦 步驟 3/3: 打包 Electron 安裝程序', 'info');
    console.log('='.repeat(60) + '\n');
    
    // 清理舊的 release
    const releaseDir = path.join(PROJECT_ROOT, 'release');
    if (fs.existsSync(releaseDir)) {
        fs.rmSync(releaseDir, { recursive: true, force: true });
        log('已清理舊的 release 目錄');
    }
    
    await runCommand('npx', ['electron-builder', '--config', 'electron-builder.yml', '--win']);
    
    // 查找生成的安裝程序
    const files = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe') && f.includes('Setup'));
    if (files.length === 0) {
        throw new Error('打包失敗: 未找到安裝程序');
    }
    
    const installerPath = path.join(releaseDir, files[0]);
    const stats = fs.statSync(installerPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    
    log(`✓ 安裝程序已生成: ${files[0]} (${sizeMB} MB)`, 'success');
    
    return installerPath;
}

async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       TG-AI智控王 完整打包（含 Python exe）                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    const startTime = Date.now();
    
    try {
        // 步驟 1: 編譯 Python
        await step1_buildPythonBackend();
        
        // 步驟 2: 構建前端
        await step2_buildFrontend();
        
        // 步驟 3: 打包 Electron
        const installerPath = await step3_packageElectron();
        
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ 打包完成！                           ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n');
        log(`總耗時: ${elapsed} 分鐘`, 'success');
        log(`安裝程序: ${installerPath}`, 'success');
        console.log('\n');
        log('此安裝程序無需安裝 Python 即可運行！', 'info');
        console.log('\n');
        
    } catch (error) {
        console.log('\n');
        log(`打包失敗: ${error.message}`, 'error');
        console.log('\n');
        process.exit(1);
    }
}

main();
