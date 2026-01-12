/**
 * Electron Security Module
 * Electron 主進程安全加固
 */

const { app, BrowserWindow, dialog } = require('electron');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

class ElectronSecurity {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isProduction = !process.argv.includes('--dev') && app.isPackaged;
    this.integrityChecked = false;
  }

  /**
   * 初始化所有安全措施
   */
  initialize() {
    if (this.isProduction) {
      this.disableDevTools();
      this.preventNavigation();
      this.setupCSP();
      this.checkIntegrity();
      this.setupAntiDebug();
    }
    
    this.setupSecureIPC();
    console.log('[Security] Initialized in', this.isProduction ? 'production' : 'development', 'mode');
  }

  /**
   * 禁用開發者工具
   */
  disableDevTools() {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('devtools-opened', () => {
      console.log('[Security] DevTools opened - closing');
      this.mainWindow.webContents.closeDevTools();
    });

    // 攔截快捷鍵
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      // F12
      if (input.key === 'F12') {
        event.preventDefault();
      }
      // Ctrl+Shift+I
      if (input.control && input.shift && input.key === 'I') {
        event.preventDefault();
      }
      // Ctrl+Shift+J
      if (input.control && input.shift && input.key === 'J') {
        event.preventDefault();
      }
    });
  }

  /**
   * 防止導航到外部頁面
   */
  preventNavigation() {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      const appUrl = this.mainWindow.webContents.getURL();
      if (!url.startsWith(appUrl.split('#')[0])) {
        console.log('[Security] Blocked navigation to:', url);
        event.preventDefault();
      }
    });

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      console.log('[Security] Blocked new window:', url);
      return { action: 'deny' };
    });
  }

  /**
   * 設置內容安全策略
   */
  setupCSP() {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self' https: wss:",
            "font-src 'self' data:"
          ].join('; ')
        }
      });
    });
  }

  /**
   * 文件完整性檢查
   */
  checkIntegrity() {
    const checksumFile = path.join(app.getAppPath(), 'checksums.json');
    
    if (!fs.existsSync(checksumFile)) {
      console.log('[Security] No checksum file found - skipping integrity check');
      return true;
    }

    try {
      const checksums = JSON.parse(fs.readFileSync(checksumFile, 'utf8'));
      
      for (const [file, expectedHash] of Object.entries(checksums)) {
        const filePath = path.join(app.getAppPath(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(content).digest('hex');
          
          if (actualHash !== expectedHash) {
            console.error('[Security] Integrity check failed for:', file);
            this.handleIntegrityFailure();
            return false;
          }
        }
      }
      
      console.log('[Security] Integrity check passed');
      this.integrityChecked = true;
      return true;
    } catch (e) {
      console.error('[Security] Integrity check error:', e);
      return false;
    }
  }

  /**
   * 處理完整性檢查失敗
   */
  handleIntegrityFailure() {
    dialog.showErrorBox(
      '安全警告',
      '應用程序文件已被修改，可能存在安全風險。請重新下載安裝。'
    );
    app.quit();
  }

  /**
   * 反調試措施
   */
  setupAntiDebug() {
    // 檢測調試器
    const checkDebugger = () => {
      const start = Date.now();
      // 故意觸發斷點檢測
      (function() {}).constructor('debugger')();
      const duration = Date.now() - start;
      
      if (duration > 100) {
        console.log('[Security] Debugger detected');
        // 可以選擇退出或禁用某些功能
      }
    };

    // 每 10 秒檢查一次
    setInterval(checkDebugger, 10000);

    // 檢測進程調試器
    if (process.platform === 'win32') {
      const isDebugged = require('child_process')
        .execSync('tasklist /FI "IMAGENAME eq devenv.exe" /NH')
        .toString()
        .includes('devenv.exe');
      
      if (isDebugged) {
        console.log('[Security] Visual Studio debugger detected');
      }
    }
  }

  /**
   * 設置安全的 IPC 通信
   */
  setupSecureIPC() {
    const { ipcMain } = require('electron');

    // 驗證 IPC 請求
    ipcMain.on('secure-request', (event, data) => {
      if (!this.validateRequest(data)) {
        console.log('[Security] Invalid IPC request blocked');
        event.returnValue = { error: 'Invalid request' };
        return;
      }
      
      // 處理有效請求
      event.returnValue = { success: true };
    });
  }

  /**
   * 驗證請求
   */
  validateRequest(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 檢查時間戳
    if (data.timestamp) {
      const now = Date.now();
      if (Math.abs(now - data.timestamp) > 5 * 60 * 1000) {
        return false; // 請求過期
      }
    }

    // 檢查簽名
    if (data.signature) {
      const expectedSig = this.generateSignature(data.payload, data.timestamp);
      if (expectedSig !== data.signature) {
        return false;
      }
    }

    return true;
  }

  /**
   * 生成簽名
   */
  generateSignature(payload, timestamp) {
    const secret = 'TG-Matrix-IPC-Secret-2026';
    const data = JSON.stringify(payload) + timestamp;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * 生成機器 ID
   */
  static getMachineId() {
    const components = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || 'unknown',
      os.totalmem()
    ];

    const fingerprint = components.join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
  }

  /**
   * 加密數據
   */
  static encrypt(data, key = 'TG-Matrix-Default-Key') {
    const algorithm = 'aes-256-cbc';
    const keyHash = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密數據
   */
  static decrypt(encryptedData, key = 'TG-Matrix-Default-Key') {
    const algorithm = 'aes-256-cbc';
    const keyHash = crypto.createHash('sha256').update(key).digest();
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

/**
 * 生成文件校驗和
 */
function generateChecksums(directory, files) {
  const checksums = {};
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      checksums[file] = crypto.createHash('sha256').update(content).digest('hex');
    }
  }
  
  return checksums;
}

module.exports = { ElectronSecurity, generateChecksums };
