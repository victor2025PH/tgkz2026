/**
 * TG-AI智控王 完整打包腳本
 * Full Packaging Script
 * 
 * 功能:
 * 1. 清理舊的構建文件
 * 2. 下載 VC++ 運行時
 * 3. 編譯 Python 後端
 * 4. 編譯前端
 * 5. 清理敏感文件
 * 6. 生成安裝程序
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BUILD_RESOURCES = path.join(ROOT_DIR, 'build-resources');
const BACKEND_EXE_DIR = path.join(ROOT_DIR, 'backend-exe');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');

// 顏色輸出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, total, msg) {
    log(`\n[${ step }/${ total }] ${msg}`, 'cyan');
    log('='.repeat(60), 'cyan');
}

function logSuccess(msg) {
    log(`[OK] ${msg}`, 'green');
}

function logError(msg) {
    log(`[ERROR] ${msg}`, 'red');
}

function logWarning(msg) {
    log(`[WARN] ${msg}`, 'yellow');
}

function execCommand(cmd, options = {}) {
    try {
        execSync(cmd, { 
            stdio: 'inherit', 
            cwd: ROOT_DIR,
            shell: true,
            ...options 
        });
        return true;
    } catch (e) {
        return false;
    }
}

// ============ 步驟函數 ============

function step1_clean() {
    logStep(1, 7, '清理舊的構建文件');
    
    const dirsToClean = [
        path.join(ROOT_DIR, 'dist'),
        path.join(ROOT_DIR, 'build-python'),
        path.join(ROOT_DIR, 'dist-backend'),
        RELEASE_DIR,
    ];
    
    for (const dir of dirsToClean) {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            logSuccess(`Deleted: ${path.relative(ROOT_DIR, dir)}`);
        }
    }
    
    // 清理 backend-exe 中的舊文件，但保留目錄結構
    const backendExeFiles = ['tg-matrix-backend.exe'];
    for (const file of backendExeFiles) {
        const filePath = path.join(BACKEND_EXE_DIR, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logSuccess(`Deleted: backend-exe/${file}`);
        }
    }
    
    logSuccess('清理完成');
    return true;
}

function step2_downloadVCRedist() {
    logStep(2, 7, '檢查/下載 VC++ 運行時');
    
    const vcRedistPath = path.join(BUILD_RESOURCES, 'vc_redist.x64.exe');
    
    if (fs.existsSync(vcRedistPath)) {
        const stats = fs.statSync(vcRedistPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
        logSuccess(`VC++ 運行時已存在 (${sizeMB} MB)`);
        return true;
    }
    
    logWarning('VC++ 運行時不存在，開始下載...');
    
    const downloadScript = path.join(__dirname, 'download-vcredist.js');
    if (!execCommand(`node "${downloadScript}"`)) {
        logError('下載 VC++ 運行時失敗');
        log('請手動下載: https://aka.ms/vs/17/release/vc_redist.x64.exe');
        log(`保存到: ${vcRedistPath}`);
        return false;
    }
    
    return true;
}

function step3_buildBackend() {
    logStep(3, 7, '編譯 Python 後端');
    
    const backendExe = path.join(BACKEND_EXE_DIR, 'tg-matrix-backend.exe');
    
    // 檢查 Python 是否可用
    try {
        execSync('python --version', { stdio: 'pipe' });
    } catch {
        logError('Python 未安裝或不在 PATH 中');
        return false;
    }
    
    // 運行後端編譯腳本
    const buildScript = path.join(__dirname, 'build-backend-exe.py');
    if (!execCommand(`python "${buildScript}"`)) {
        logError('後端編譯失敗');
        return false;
    }
    
    // 驗證輸出
    if (!fs.existsSync(backendExe)) {
        logError(`後端 exe 未生成: ${backendExe}`);
        return false;
    }
    
    const stats = fs.statSync(backendExe);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    logSuccess(`後端編譯完成 (${sizeMB} MB)`);
    
    return true;
}

function step4_buildFrontend() {
    logStep(4, 7, '編譯前端');
    
    // 編譯 Angular
    if (!execCommand('npm run build:prod')) {
        logError('前端編譯失敗');
        return false;
    }
    
    // 驗證輸出 - 支持多種 Angular 輸出格式
    const possiblePaths = [
        path.join(ROOT_DIR, 'dist'),  // Angular 17+ 新格式
        path.join(ROOT_DIR, 'dist', 'tg-ai-smartking', 'browser'),  // 舊格式
        path.join(ROOT_DIR, 'dist', 'tg-ai-smartking'),  // 另一種格式
    ];
    
    let distDir = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
            distDir = p;
            break;
        }
    }
    
    if (!distDir) {
        logError('前端輸出目錄不存在或不完整');
        return false;
    }
    
    logSuccess(`前端編譯完成: ${path.relative(ROOT_DIR, distDir)}`);
    return true;
}

function step5_cleanSensitiveFiles() {
    logStep(5, 7, '清理敏感文件（僅打包輸出目錄）');
    
    // 🔧 修復：只清理打包輸出目錄，不清理源代碼目錄
    // 這樣可以保護開發環境中的數據不被意外刪除
    
    const SAFE_DIRS_TO_CLEAN = [
        // 只清理這些打包輸出目錄中的敏感文件
        path.join(ROOT_DIR, 'dist'),
        path.join(ROOT_DIR, 'release'),
        path.join(ROOT_DIR, 'dist-backend'),
        path.join(ROOT_DIR, 'build-python'),
    ];
    
    // 🚫 絕對不能清理的目錄（源代碼和開發數據）
    const PROTECTED_DIRS = [
        path.join(ROOT_DIR, 'backend', 'data'),
        path.join(ROOT_DIR, 'backend', 'sessions'),
        path.join(ROOT_DIR, 'backend-exe', 'data'),
        path.join(ROOT_DIR, 'backend-exe', 'sessions'),
    ];
    
    logWarning('⚠️  保護模式：不會刪除源代碼目錄中的數據');
    log(`   受保護的目錄:`);
    for (const dir of PROTECTED_DIRS) {
        log(`   - ${path.relative(ROOT_DIR, dir)}`);
    }
    
    let cleanedCount = 0;
    
    // 使用簡單的文件系統遍歷
    function cleanDirectory(dir, pattern, isDir = false) {
        if (!fs.existsSync(dir)) return 0;
        
        // 🔧 檢查是否是受保護的目錄
        for (const protectedDir of PROTECTED_DIRS) {
            if (dir.startsWith(protectedDir) || protectedDir.startsWith(dir)) {
                return 0; // 跳過受保護的目錄
            }
        }
        
        let count = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            // 跳過 node_modules
            if (entry.name === 'node_modules') continue;
            
            // 🔧 跳過受保護的目錄
            let isProtected = false;
            for (const protectedDir of PROTECTED_DIRS) {
                if (fullPath.startsWith(protectedDir) || protectedDir.startsWith(fullPath)) {
                    isProtected = true;
                    break;
                }
            }
            if (isProtected) continue;
            
            if (entry.isDirectory()) {
                if (pattern.includes(entry.name) && isDir) {
                    try {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                        count++;
                    } catch {}
                } else {
                    count += cleanDirectory(fullPath, pattern, isDir);
                }
            } else if (entry.isFile()) {
                if (matchPattern(entry.name, pattern)) {
                    try {
                        fs.unlinkSync(fullPath);
                        count++;
                    } catch {}
                }
            }
        }
        
        return count;
    }
    
    function matchPattern(filename, pattern) {
        // 簡單的通配符匹配
        const regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${regex}$`, 'i').test(filename);
    }
    
    // 🔧 只清理打包輸出目錄中的敏感文件
    const cleanPatterns = [
        { pattern: '*.session', isDir: false },
        { pattern: '*.session-journal', isDir: false },
        { pattern: '*.db', isDir: false },
        { pattern: '*.log', isDir: false },
        { pattern: 'chroma_db', isDir: true },
        { pattern: 'chroma_rag_db', isDir: true },
    ];
    
    for (const safeDir of SAFE_DIRS_TO_CLEAN) {
        if (!fs.existsSync(safeDir)) continue;
        for (const { pattern, isDir } of cleanPatterns) {
            cleanedCount += cleanDirectory(safeDir, pattern, isDir);
        }
    }
    
    // 清理根目錄的 .env 文件（這些不應該被打包）
    const envFiles = ['.env', '.env.local', '.env.production'];
    for (const envFile of envFiles) {
        const envPath = path.join(ROOT_DIR, envFile);
        if (fs.existsSync(envPath)) {
            // 🔧 只是警告，不刪除
            logWarning(`   發現 ${envFile}，請確保不會被打包進安裝程序`);
        }
    }
    
    // 清理 .env 文件
    const envFiles = ['.env', '.env.local', '.env.production'];
    for (const envFile of envFiles) {
        const envPath = path.join(ROOT_DIR, envFile);
        if (fs.existsSync(envPath)) {
            fs.unlinkSync(envPath);
            cleanedCount++;
        }
    }
    
    logSuccess(`清理了 ${cleanedCount} 個敏感文件/目錄`);
    return true;
}

function step6_createDirectories() {
    logStep(6, 7, '創建必要的目錄結構');
    
    const dirsToCreate = [
        path.join(BACKEND_EXE_DIR, 'sessions'),
        path.join(BACKEND_EXE_DIR, 'data'),
        path.join(ROOT_DIR, 'default-config'),
    ];
    
    for (const dir of dirsToCreate) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logSuccess(`Created: ${path.relative(ROOT_DIR, dir)}`);
        }
    }
    
    // 創建 .gitkeep 文件
    const gitkeepDirs = [
        path.join(BACKEND_EXE_DIR, 'sessions'),
        path.join(BACKEND_EXE_DIR, 'data'),
    ];
    
    for (const dir of gitkeepDirs) {
        const gitkeep = path.join(dir, '.gitkeep');
        if (!fs.existsSync(gitkeep)) {
            fs.writeFileSync(gitkeep, '');
        }
    }
    
    logSuccess('目錄結構創建完成');
    return true;
}

function step7_buildInstaller() {
    logStep(7, 7, '生成安裝程序');
    
    // 確保 release 目錄存在
    if (!fs.existsSync(RELEASE_DIR)) {
        fs.mkdirSync(RELEASE_DIR, { recursive: true });
    }
    
    // 運行 electron-builder
    if (!execCommand('npx electron-builder --config electron-builder.yml --win')) {
        logError('安裝程序生成失敗');
        return false;
    }
    
    // 查找生成的安裝程序
    const installers = fs.readdirSync(RELEASE_DIR)
        .filter(f => f.endsWith('.exe') && f.includes('Setup'));
    
    if (installers.length === 0) {
        logError('未找到生成的安裝程序');
        return false;
    }
    
    for (const installer of installers) {
        const installerPath = path.join(RELEASE_DIR, installer);
        const stats = fs.statSync(installerPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
        logSuccess(`生成: ${installer} (${sizeMB} MB)`);
    }
    
    return true;
}

// ============ 主程序 ============

async function main() {
    console.log();
    log('='.repeat(60), 'bright');
    log('  TG-AI智控王 v2.1.0 完整打包腳本', 'bright');
    log('  Full Packaging Script', 'bright');
    log('='.repeat(60), 'bright');
    
    const startTime = Date.now();
    
    // 讀取版本號
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    log(`\n[INFO] 版本: ${packageJson.version}`, 'yellow');
    log(`[INFO] 產品: ${packageJson.build?.productName || packageJson.name}`, 'yellow');
    
    // 執行步驟
    const steps = [
        { fn: step1_clean, name: '清理' },
        { fn: step2_downloadVCRedist, name: 'VC++ 運行時' },
        { fn: step3_buildBackend, name: '後端編譯' },
        { fn: step4_buildFrontend, name: '前端編譯' },
        { fn: step5_cleanSensitiveFiles, name: '敏感文件清理' },
        { fn: step6_createDirectories, name: '目錄結構' },
        { fn: step7_buildInstaller, name: '安裝程序生成' },
    ];
    
    let failedStep = null;
    
    for (const step of steps) {
        try {
            const success = step.fn();
            if (!success) {
                failedStep = step.name;
                break;
            }
        } catch (e) {
            logError(`步驟 "${step.name}" 發生錯誤: ${e.message}`);
            failedStep = step.name;
            break;
        }
    }
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log();
    log('='.repeat(60), 'bright');
    
    if (failedStep) {
        logError(`打包失敗！失敗步驟: ${failedStep}`);
        log('='.repeat(60), 'bright');
        process.exit(1);
    }
    
    log('  ✅ 打包成功！', 'green');
    log(`  ⏱️  耗時: ${duration} 分鐘`, 'yellow');
    log('='.repeat(60), 'bright');
    
    // 列出生成的文件
    console.log();
    log('[OUTPUT] 生成的文件:', 'cyan');
    
    if (fs.existsSync(RELEASE_DIR)) {
        const files = fs.readdirSync(RELEASE_DIR);
        for (const file of files) {
            if (file.endsWith('.exe') || file.endsWith('.yml') || file.endsWith('.blockmap')) {
                const filePath = path.join(RELEASE_DIR, file);
                const stats = fs.statSync(filePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
                log(`  📦 ${file} (${sizeMB} MB)`, 'green');
            }
        }
    }
    
    console.log();
    log('[NEXT] 下一步:', 'yellow');
    log('  1. 在乾淨的 Windows 系統上安裝測試', 'reset');
    log('  2. 確認所有功能正常運行', 'reset');
    log('  3. 分發安裝程序', 'reset');
    console.log();
}

main().catch(e => {
    logError(`打包腳本錯誤: ${e.message}`);
    process.exit(1);
});
