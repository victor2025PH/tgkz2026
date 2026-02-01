/**
 * 下載 Visual C++ 運行時安裝程序
 * Download VC++ Redistributable
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const VCREDIST_URL = 'https://aka.ms/vs/17/release/vc_redist.x64.exe';
const OUTPUT_DIR = path.join(__dirname, '..', 'build-resources');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'vc_redist.x64.exe');

console.log('='.repeat(60));
console.log('[DOWNLOAD] Visual C++ Redistributable');
console.log('='.repeat(60));
console.log();

// 確保目錄存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 檢查是否已存在
if (fs.existsSync(OUTPUT_FILE)) {
    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`[OK] VC++ Redistributable already exists: ${OUTPUT_FILE}`);
    console.log(`[OK] File size: ${sizeMB} MB`);
    console.log();
    console.log('[DONE] No download needed.');
    process.exit(0);
}

console.log(`[INFO] Downloading from: ${VCREDIST_URL}`);
console.log(`[INFO] Saving to: ${OUTPUT_FILE}`);
console.log();

// 跟隨重定向下載
function download(url, dest, callback) {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
        // 處理重定向
        if (response.statusCode === 301 || response.statusCode === 302) {
            console.log(`[INFO] Redirecting to: ${response.headers.location}`);
            file.close();
            fs.unlinkSync(dest);
            download(response.headers.location, dest, callback);
            return;
        }
        
        if (response.statusCode !== 200) {
            callback(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;
        let lastPercent = 0;
        
        console.log(`[INFO] Total size: ${(totalSize / (1024 * 1024)).toFixed(1)} MB`);
        
        response.on('data', (chunk) => {
            downloaded += chunk.length;
            const percent = Math.floor((downloaded / totalSize) * 100);
            
            if (percent >= lastPercent + 10) {
                lastPercent = percent;
                const downloadedMB = (downloaded / (1024 * 1024)).toFixed(1);
                process.stdout.write(`[PROGRESS] ${percent}% (${downloadedMB} MB)\r`);
            }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
            file.close();
            console.log();
            callback(null);
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => {}); // 刪除不完整的文件
        callback(err);
    });
}

download(VCREDIST_URL, OUTPUT_FILE, (err) => {
    if (err) {
        console.error(`[ERROR] Download failed: ${err.message}`);
        console.log();
        console.log('[MANUAL] Please download manually from:');
        console.log('  https://aka.ms/vs/17/release/vc_redist.x64.exe');
        console.log(`  Save to: ${OUTPUT_FILE}`);
        process.exit(1);
    }
    
    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    
    console.log();
    console.log('[SUCCESS] Download completed!');
    console.log(`[OK] File: ${OUTPUT_FILE}`);
    console.log(`[OK] Size: ${sizeMB} MB`);
    console.log();
    console.log('='.repeat(60));
});
