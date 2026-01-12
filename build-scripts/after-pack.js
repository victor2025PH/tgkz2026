/**
 * electron-builder after-pack 鉤子
 * 在打包完成後執行的腳本
 */

const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
    console.log('📦 After Pack: 執行打包後處理...');
    
    const appDir = context.appOutDir;
    const resourcesDir = path.join(appDir, 'resources');
    
    // 創建空的數據目錄結構
    const dataDirs = [
        'data',
        'data/sessions',
        'data/backups',
        'data/logs'
    ];
    
    for (const dir of dataDirs) {
        const dirPath = path.join(resourcesDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`  ✓ 創建目錄: ${dir}`);
        }
    }
    
    // 創建 .gitkeep 文件
    const gitkeepPath = path.join(resourcesDir, 'data', '.gitkeep');
    fs.writeFileSync(gitkeepPath, '');
    
    // 刪除不需要的文件
    const filesToRemove = [
        'data/.gitkeep'  // 實際上我們要保留這個
    ];
    
    // 清理 Python 緩存文件
    const backendDir = path.join(resourcesDir, 'backend');
    if (fs.existsSync(backendDir)) {
        cleanPythonCache(backendDir);
    }
    
    console.log('✅ After Pack: 處理完成');
};

function cleanPythonCache(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            if (item === '__pycache__' || item === '.pytest_cache') {
                fs.rmSync(itemPath, { recursive: true, force: true });
                console.log(`  ✓ 刪除緩存: ${item}`);
            } else {
                cleanPythonCache(itemPath);
            }
        } else if (item.endsWith('.pyc') || item.endsWith('.pyo')) {
            fs.unlinkSync(itemPath);
        }
    }
}
