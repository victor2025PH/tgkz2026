
const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const AutoAiSetup = require('./auto-ai-setup');

// 在应用启动前设置语言环境为中文
// 必须在 app.on('ready') 之前调用
app.commandLine.appendSwitch('lang', 'zh-CN');

// 🔧 P0: 註冊自定義協議以支持 ES 模塊加載
// 必須在 app.ready 之前調用
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'app', 
    privileges: { 
      secure: true, 
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: true
    } 
  }
]);

// 修復截屏時畫面消失的問題
// 禁用 GPU 合成器，使用軟體渲染來確保截屏工具可以正常捕獲畫面
app.commandLine.appendSwitch('disable-gpu-compositing');
// 啟用離屏渲染以提高兼容性
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');

// ========== 🔧 Phase 3 優化：內存優化設置 ==========
// 檢查是否啟用輕量模式
// 🔧 打包後默認啟用輕量模式以節省用戶電腦內存
const isPackagedApp = !process.defaultApp && !process.argv.some(arg => arg.includes('node_modules'));
const LIGHTWEIGHT_MODE = process.env.TG_LIGHTWEIGHT_MODE === 'true' || 
                         process.argv.includes('--lightweight') ||
                         isPackagedApp;  // 打包後默認啟用

if (LIGHTWEIGHT_MODE) {
  console.log('[Electron] ⚡ 輕量模式已啟用 - 減少內存佔用');
  // 設置環境變量，讓 Python 後端也知道
  process.env.TG_LIGHTWEIGHT_MODE = 'true';
  process.env.TG_DISABLE_NEURAL_EMBEDDING = 'true';
}

// 減少 V8 堆內存限制（默認較高）
// 開發模式下限制為 512MB，生產模式為 1GB
const maxOldSpaceSize = LIGHTWEIGHT_MODE ? 256 : (app.isPackaged ? 1024 : 512);
app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${maxOldSpaceSize}`);

// 禁用不必要的 GPU 功能以節省內存
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');

// 減少渲染進程內存
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// 限制緩存大小
app.commandLine.appendSwitch('disk-cache-size', LIGHTWEIGHT_MODE ? '52428800' : '104857600'); // 50MB or 100MB

// 禁用不必要的功能
if (LIGHTWEIGHT_MODE) {
  app.commandLine.appendSwitch('disable-extensions');
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('disable-translate');
}

let mainWindow;
let pythonProcess = null;
let autoAiSetup = null;  // AI 自動設置模塊

// --- Message Acknowledgment Manager ---

class RequestManager {
    constructor() {
        this.pendingRequests = new Map(); // request_id -> RequestInfo
        this.timeoutInterval = null;
        this.defaultTimeout = 30000; // 30 seconds
        this.maxRetries = 3;
        this.startTimeoutChecker();
    }

    startTimeoutChecker() {
        // Check for timeout requests every second
        this.timeoutInterval = setInterval(() => {
            this.checkTimeouts();
        }, 1000);
    }

    stopTimeoutChecker() {
        if (this.timeoutInterval) {
            clearInterval(this.timeoutInterval);
            this.timeoutInterval = null;
        }
    }

    generateRequestId() {
        return uuidv4();
    }

    registerRequest(command, payload, timeout = null) {
        const requestId = this.generateRequestId();
        
        // Commands that should NOT be retried to avoid duplicate operations
        // All mutation commands (add, remove, save, toggle, create, delete) should NOT retry
        const noRetryCommands = [
            // Account operations
            'add-account', 'login-account', 'delete-account', 'update-account',
            // Keyword operations
            'add-keyword-set', 'remove-keyword-set', 'add-keyword', 'remove-keyword',
            // Template operations
            'add-template', 'remove-template', 'update-template',
            // Campaign operations
            'add-campaign', 'remove-campaign', 'toggle-campaign-status', 'create-campaign',
            // Group operations
            'add-group', 'remove-group', 'join-group',
            // Settings operations
            'save-settings', 'save-auto-reply-message',
            // Message operations
            'send-message', 'send-greeting', 'add-to-queue'
        ];
        // Commands that need longer timeout
        const longTimeoutCommands = [
            'add-account', 'login-account', 'import-accounts', 'import-sessions', 
            'get-initial-state', 'get-chat-history-full', 'get-chat-list', 
            'generate-ai-response', 'analyze-conversation', 'get-rag-context',
            'test-ai-model'  // 🔧 AI 測試需要較長超時（網絡延遲）
        ];
        // Commands that should only retry once (low priority)
        const lowRetryCommands = [
            'get-queue-status', 'get-performance-metrics', 'get-performance-summary',
            'test-ai-model', 'save-ai-model', 'get-ai-models'  // 🔧 AI 命令減少重試
        ];
        
        let effectiveTimeout = timeout || this.defaultTimeout;
        let effectiveMaxRetries = this.maxRetries;
        
        // Disable retries for sensitive commands
        if (noRetryCommands.includes(command)) {
            effectiveMaxRetries = 0;  // No retries for account operations
            console.log(`[RequestManager] Disabled retries for command: ${command}`);
        }
        
        // Reduce retries for low priority commands
        if (lowRetryCommands.includes(command)) {
            effectiveMaxRetries = 1;  // Only 1 retry for status checks
        }
        
        // Use longer timeout for long-running commands
        if (longTimeoutCommands.includes(command)) {
            effectiveTimeout = 120000;  // 2 minutes for login/initial operations
            console.log(`[RequestManager] Using extended timeout (120s) for command: ${command}`);
        }
        
        const requestInfo = {
            requestId,
            command,
            payload,
            timestamp: Date.now(),
            timeout: effectiveTimeout,
            retryCount: 0,
            maxRetries: effectiveMaxRetries
        };
        this.pendingRequests.set(requestId, requestInfo);
        console.log(`[RequestManager] Registered request: ${requestId} for command: ${command}`);
        return requestId;
    }

    handleAcknowledgment(requestId, status) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            console.warn(`[RequestManager] Received ack for unknown request: ${requestId}`);
            return;
        }
        console.log(`[RequestManager] Received ack for request: ${requestId}, status: ${status}`);
        
        // Remove from pending - backend has acknowledged, no need to retry
        // This prevents duplicate operations from retry logic
        this.pendingRequests.delete(requestId);
        console.log(`[RequestManager] Request ${requestId} completed after ack (no retry needed)`);
    }

    handleCompletion(requestId, status, error = null) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            console.warn(`[RequestManager] Received completion for unknown request: ${requestId}`);
            return;
        }
        console.log(`[RequestManager] Request completed: ${requestId}, status: ${status}`);
        this.pendingRequests.delete(requestId);
        
        // Optionally notify frontend about completion
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('command-complete', {
                requestId,
                command: request.command,
                status,
                error
            });
        }
    }

    checkTimeouts() {
        const now = Date.now();
        const timedOutRequests = [];

        for (const [requestId, request] of this.pendingRequests.entries()) {
            const elapsed = now - request.timestamp;
            if (elapsed > request.timeout) {
                timedOutRequests.push({ requestId, request });
            }
        }

        for (const { requestId, request } of timedOutRequests) {
            if (request.retryCount < request.maxRetries) {
                // Retry the request
                request.retryCount++;
                request.timestamp = Date.now();
                console.log(`[RequestManager] Retrying request: ${requestId} (attempt ${request.retryCount}/${request.maxRetries})`);
                this.retryRequest(request);
            } else {
                // Max retries reached, remove request
                console.error(`[RequestManager] Request timeout after ${request.maxRetries} retries: ${requestId}`);
                this.pendingRequests.delete(requestId);
                
                // Notify frontend about timeout
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('command-complete', {
                        requestId,
                        command: request.command,
                        status: 'timeout',
                        error: `Request timeout after ${request.maxRetries} retries`
                    });
                }
            }
        }
    }

    retryRequest(request) {
        // Resend the command to Python
        if (!pythonProcess || pythonProcess.killed) {
            console.error('[RequestManager] Cannot retry: Python process not running');
            // Remove request from pending if process is dead
            this.pendingRequests.delete(request.requestId);
            return;
        }

        // Check if stdin is writable
        if (!pythonProcess.stdin || pythonProcess.stdin.destroyed || pythonProcess.stdin.writableEnded) {
            console.error('[RequestManager] Cannot retry: Python stdin is not writable');
            // Remove request from pending if stdin is closed
            this.pendingRequests.delete(request.requestId);
            return;
        }

        const message = JSON.stringify({
            command: request.command,
            payload: request.payload,
            request_id: request.requestId
        }) + '\n';

        console.log(`[RequestManager] Retrying command: ${request.command} (request_id: ${request.requestId})`);
        try {
            const result = pythonProcess.stdin.write(message, (error) => {
                if (error) {
                    console.error('[RequestManager] Error retrying command:', error);
                    // Remove request if write failed
                    this.pendingRequests.delete(request.requestId);
                }
            });
            
            // Check if write was successful (returns false if buffer is full)
            if (result === false) {
                console.warn('[RequestManager] Write buffer full, command may not be sent');
            }
        } catch (error) {
            console.error('[RequestManager] Exception while retrying command:', error);
            // Remove request if exception occurred
            this.pendingRequests.delete(request.requestId);
        }
    }

    clearAll() {
        this.pendingRequests.clear();
    }
}

// Global request manager instance
const requestManager = new RequestManager();

// 🆕 P0: 啟動畫面窗口
let splashWindow = null;

// 🆕 P0: 日誌文件路徑
let logFilePath = null;

// 🆕 P0: 後端準備狀態
let backendReadyForUI = false;

// 🔧 後端崩潰自動重啟的計數與上限（就緒成功後歸零）
let backendRestartCount = 0;
const MAX_BACKEND_RESTARTS = 5;

// 🆕 P0: 寫入日誌文件
function writeLog(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logLine.trim());
  
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, logLine);
    } catch (e) {
      // 忽略日誌寫入錯誤
    }
  }
}

// 🆕 P0: 初始化日誌文件
function initLogFile() {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const today = new Date().toISOString().split('T')[0];
    logFilePath = path.join(logDir, `app-${today}.log`);
    writeLog('========== 應用啟動 ==========');
    writeLog(`App version: ${app.getVersion()}`);
    writeLog(`Electron: ${process.versions.electron}`);
    writeLog(`Chrome: ${process.versions.chrome}`);
    writeLog(`Node: ${process.versions.node}`);
    writeLog(`Platform: ${process.platform} ${process.arch}`);
    writeLog(`App path: ${app.getAppPath()}`);
    writeLog(`User data: ${app.getPath('userData')}`);
    writeLog(`Is packaged: ${app.isPackaged}`);
    if (process.resourcesPath) {
      writeLog(`Resources path: ${process.resourcesPath}`);
    }
  } catch (e) {
    console.error('Failed to init log file:', e);
  }
}

// 🆕 P0: 創建啟動畫面
function createSplashWindow() {
  writeLog('Creating splash window...');
  
  // 🔧 P0: 使用 app.getAppPath() 替代 __dirname
  const appPath = app.isPackaged ? path.dirname(app.getAppPath()) : __dirname;
  const splashPath = app.isPackaged 
    ? path.join(app.getAppPath(), 'splash.html')
    : path.join(__dirname, 'splash.html');
  
  writeLog(`Splash path: ${splashPath}`);
  writeLog(`Splash exists: ${fs.existsSync(splashPath)}`);
  
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: false,
    backgroundColor: '#0f172a',
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  if (fs.existsSync(splashPath)) {
    splashWindow.loadFile(splashPath);
  } else {
    // 回退：顯示簡單的加載頁面
    splashWindow.loadURL(`data:text/html,
      <html>
        <body style="background:#0f172a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
          <div style="text-align:center">
            <h1>🤖 TG-AI智控王</h1>
            <p>正在啟動...</p>
          </div>
        </body>
      </html>
    `);
  }
  
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    writeLog('Splash window shown');
  });
  
  return splashWindow;
}

// 🆕 P0: 更新啟動畫面狀態
function updateSplashStatus(message, progress = null, error = null) {
  writeLog(`Splash status: ${message}${error ? ' ERROR: ' + error : ''}`);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-status', { message, progress, error });
  }
}

function createWindow() {
  // 设置应用语言环境为中文
  app.commandLine.appendSwitch('lang', 'zh-CN');
  
  writeLog('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    // 設置背景顏色，避免截屏時畫面消失
    backgroundColor: '#0f172a',
    // 確保窗口不透明
    transparent: false,
    show: false,  // 🆕 P0: 初始隱藏，等加載完成後顯示
    webPreferences: {
      nodeIntegration: true, // Allows renderer to use Node.js APIs like 'require'
      contextIsolation: false, // Required for nodeIntegration to work
      preload: path.join(__dirname, 'preload.js'), // We will create this in a future step for better security
      // 🔧 P0: 禁用 webSecurity 以允許 ES 模塊在 file:// 協議下加載
      webSecurity: false,
      // 禁用 WebGL 硬體加速以提高截屏兼容性
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Accelerated2dCanvas',
      // ========== 🔧 Phase 3 優化：內存優化設置 ==========
      // 啟用背景節流以減少不活躍標籤頁的資源使用
      backgroundThrottling: true,
      // 禁用拼寫檢查以節省內存
      spellcheck: false,
      // 限制 Canvas 內存使用
      enableWebSQL: false,
      // 輕量模式下的額外優化
      ...(LIGHTWEIGHT_MODE && {
        // 禁用硬件加速
        offscreen: false,
      })
    },
    title: 'TG-Matrix',
    // In a real build, you'd create an icon file.
    // icon: path.join(__dirname, 'assets/icon.png') 
  });
  
  // 🔧 Phase 3 優化：定期清理渲染進程緩存
  if (LIGHTWEIGHT_MODE) {
    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.session.clearCache().catch(() => {});
      }
    }, 5 * 60 * 1000); // 每 5 分鐘清理一次
  }
  
  // 🆕 P0: 主窗口加載完成後，等待後端準備好再顯示
  mainWindow.once('ready-to-show', () => {
    writeLog('Main window ready to show, waiting for backend...');
    
    // 檢查後端是否已準備好
    const checkAndShow = () => {
      if (backendReadyForUI) {
        writeLog('Backend ready, showing main window');
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
        mainWindow.show();
        writeLog('Main window shown');
      } else {
        // 每 500ms 檢查一次
        setTimeout(checkAndShow, 500);
      }
    };
    
    // 設置最大等待時間 60 秒
    const maxWaitTimeout = setTimeout(() => {
      writeLog('Max wait time reached (60s), showing main window anyway', 'WARN');
      if (!mainWindow.isVisible()) {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
        mainWindow.show();
      }
    }, 60000);
    
    // 開始檢查
    checkAndShow();
    
    // 當窗口顯示後清除超時
    mainWindow.once('show', () => {
      clearTimeout(maxWaitTimeout);
    });
  });

  // Load the Angular app
  // Check if running in dev mode (--dev flag)
  const isDevMode = process.argv.includes('--dev');
  
  if (isDevMode) {
    // 開發模式：清除緩存並連接到 Angular 開發服務器
    console.log('[Electron] 🚀 開發模式：連接到 http://localhost:4200');
    
    // 清除緩存以確保加載最新代碼
    mainWindow.webContents.session.clearCache().then(() => {
      console.log('[Electron] ✅ 緩存已清除');
    }).catch(err => {
      console.log('[Electron] 清除緩存時出錯:', err);
    });
    
    mainWindow.loadURL('http://localhost:4200');
    
    // 監聽開發服務器是否就緒
    let retryCount = 0;
    const maxRetries = 30;
    const checkDevServer = setInterval(() => {
      const http = require('http');
      const req = http.get('http://localhost:4200', (res) => {
        clearInterval(checkDevServer);
        console.log('[Electron] ✅ 開發服務器已就緒');
      });
      
      req.on('error', () => {
        retryCount++;
        if (retryCount >= maxRetries) {
          clearInterval(checkDevServer);
          console.error('[Electron] ❌ 無法連接到開發服務器');
          console.error('[Electron] 請確保 Angular 開發服務器正在運行 (npm run dev)');
        }
      });
    }, 1000);
  } else {
    // 生產模式：使用構建後的文件
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log('[Electron] 📦 加載構建文件: dist/index.html');
      writeLog('[Electron] Loading via app:// protocol');
      // 🔧 P0: 使用 app:// 協議加載，以支持 ES 模塊
      mainWindow.loadURL('app://./index.html');
    } else {
      // Build files should have been created by check-build.js
      // If we reach here, something went wrong
      console.error('[Electron] ❌ Build files not found!');
      console.error('[Electron] Expected file:', indexPath);
      console.error('[Electron] Please run: npm run build');
      console.error('[Electron] Or use: npm run start:build');
      console.error('[Electron] Or use dev mode: npm run start:dev');
      
      // Show error dialog
      const { dialog } = require('electron');
      dialog.showErrorBox(
        '构建文件未找到',
        'Angular 应用未构建。\n\n请运行以下命令之一：\n\n' +
        '  npm run build\n' +
        '  或\n' +
        '  npm run start:build\n' +
        '  或使用開發模式\n' +
        '  npm run start:dev\n\n' +
        '然后重新启动应用。'
      );
      
      // Try to load anyway (might work if dev server is running)
      console.warn('[Electron] Attempting to connect to dev server at http://localhost:4200');
      mainWindow.loadURL('http://localhost:4200');
    }
  }

  // 確保開發模式下打開 DevTools，並監聽錯誤
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] 頁面載入失敗:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (level === 3) { // ERROR level
      console.error('[Renderer]', message);
    }
  });

  // Open the DevTools for debugging during development
  // 🔧 臨時：打包模式也打開開發者工具以便調試
  if (!app.isPackaged || process.env.DEBUG_MODE) {
    mainWindow.webContents.openDevTools();
  }
  
  // 🔧 P0: 監聽渲染進程的控制台輸出
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    writeLog(`[Renderer Console] ${message}`);
  });
  
  // 🔧 P0: 監聯頁面加載完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    writeLog('[Electron] Page did-finish-load');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    writeLog(`[Electron] Page did-fail-load: ${errorCode} - ${errorDescription} - ${validatedURL}`);
  });
  
  // Start the Python backend
  startPythonBackend();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 在应用启动前设置语言环境
app.on('ready', async () => {
  // 🆕 P0: 初始化日誌
  initLogFile();
  writeLog('App ready event fired');
  
  // 🔧 P0: 註冊 app:// 協議處理程序
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = url.pathname;
    
    // 處理 URL：移除開頭的 ./ 或 /
    if (filePath.startsWith('./')) {
      filePath = filePath.substring(2);
    } else if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // 如果是根路徑，默認為 index.html
    if (!filePath || filePath === '') {
      filePath = 'index.html';
    }
    
    // 構建完整路徑
    const distPath = path.join(__dirname, 'dist');
    const fullPath = path.join(distPath, filePath);
    
    writeLog(`[Protocol] Handling app://${filePath} -> ${fullPath}`);
    
    try {
      // 讀取文件內容
      const data = fs.readFileSync(fullPath);
      
      // 確定 MIME 類型
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      
      writeLog(`[Protocol] Serving ${filePath} as ${mimeType} (${data.length} bytes)`);
      
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      writeLog(`[Protocol] Error reading ${fullPath}: ${err.message}`);
      return new Response('Not Found', { status: 404 });
    }
  });
  writeLog('[Protocol] app:// protocol registered');
  
  // 🆕 P0: 先顯示啟動畫面
  createSplashWindow();
  updateSplashStatus('正在初始化...', 10);
  
  // 设置系统语言环境为中文（如果系统支持）
  if (process.platform === 'win32') {
    // Windows: 设置环境变量
    process.env.LANG = 'zh_CN.UTF-8';
    process.env.LC_ALL = 'zh_CN.UTF-8';
  } else if (process.platform === 'darwin') {
    // macOS: 设置环境变量
    process.env.LANG = 'zh_CN.UTF-8';
    process.env.LC_ALL = 'zh_CN.UTF-8';
  } else {
    // Linux: 设置环境变量
    process.env.LANG = 'zh_CN.UTF-8';
    process.env.LC_ALL = 'zh_CN.UTF-8';
  }
  
  updateSplashStatus('正在載入配置...', 20);
  
  // 註冊本地文件協議，用於安全載入頭像等本地資源
  protocol.registerFileProtocol('local-file', (request, callback) => {
    let filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    
    // 🔧 Windows 路徑修復：移除開頭的斜線
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // 標準化路徑
    const normalizedPath = path.normalize(filePath);
    const dataDir = path.normalize(path.join(__dirname, 'backend', 'data'));
    
    // 🔧 安全檢查：允許載入 backend/data 目錄下的文件
    // 使用 toLowerCase() 確保 Windows 下路徑比較不區分大小寫
    const isAllowed = process.platform === 'win32'
      ? normalizedPath.toLowerCase().startsWith(dataDir.toLowerCase())
      : normalizedPath.startsWith(dataDir);
    
    if (isAllowed) {
      // 檢查文件是否存在
      const fs = require('fs');
      if (fs.existsSync(normalizedPath)) {
        callback({ path: normalizedPath });
      } else {
        console.warn('[Protocol] File not found:', normalizedPath);
        callback({ error: -6 }); // NET::ERR_FILE_NOT_FOUND
      }
    } else {
      console.error('[Protocol] Blocked access to:', normalizedPath);
      console.error('[Protocol] Expected prefix:', dataDir);
      callback({ error: -6 }); // NET::ERR_FILE_NOT_FOUND
    }
  });
  
  updateSplashStatus('正在初始化 AI 模塊...', 40);
  
  // 初始化 AI 自動設置模塊
  autoAiSetup = new AutoAiSetup();
  try {
    const userDataPath = app.getPath('userData');
    const aiStatus = await autoAiSetup.initialize(userDataPath);
    writeLog('AI auto setup completed: ' + JSON.stringify(aiStatus));
  } catch (error) {
    writeLog('AI auto setup failed: ' + error.message, 'ERROR');
  }
  
  updateSplashStatus('正在啟動後端服務...', 60);
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Flag to prevent auto-restart during shutdown
let isShuttingDown = false;

app.on('before-quit', async (event) => {
    if (isShuttingDown) return;
    
    // Prevent immediate quit to allow graceful shutdown
    if (pythonProcess && !pythonProcess.killed) {
        event.preventDefault();
        isShuttingDown = true;
        
        console.log('[App] Initiating graceful shutdown...');
        
        // Send graceful shutdown command to Python
        try {
            const shutdownMessage = JSON.stringify({
                command: 'graceful-shutdown',
                payload: {},
                request_id: 'shutdown-' + Date.now()
            }) + '\n';
            
            if (pythonProcess.stdin && !pythonProcess.stdin.destroyed) {
                pythonProcess.stdin.write(shutdownMessage);
                console.log('[App] Sent graceful-shutdown command to Python');
            }
        } catch (e) {
            console.error('[App] Error sending shutdown command:', e);
        }
        
        // Wait for Python to finish gracefully (max 5 seconds)
        const shutdownTimeout = setTimeout(() => {
            console.log('[App] Graceful shutdown timeout, forcing kill...');
            forceKillPythonProcess();
            app.quit();
        }, 5000);
        
        // Listen for Python process exit
        if (pythonProcess) {
            pythonProcess.once('exit', () => {
                clearTimeout(shutdownTimeout);
                console.log('[App] Python process exited gracefully');
                pythonProcess = null;
                app.quit();
            });
        }
    }
});

function forceKillPythonProcess() {
    if (pythonProcess) {
        console.log('[App] Force killing Python process...');
        try {
            // On Windows, use taskkill for more reliable termination
            if (process.platform === 'win32') {
                const { execSync } = require('child_process');
                try {
                    execSync(`taskkill /pid ${pythonProcess.pid} /T /F`, { stdio: 'ignore' });
                } catch (e) {
                    // Process might already be dead
                    pythonProcess.kill('SIGKILL');
                }
            } else {
                pythonProcess.kill('SIGKILL');
            }
        } catch (e) {
            console.error('[App] Error killing Python process:', e);
        }
        pythonProcess = null;
    }
}

app.on('quit', () => {
    // Terminate the python process when the app quits (fallback)
    forceKillPythonProcess();
    // Stop request manager timeout checker
    requestManager.stopTimeoutChecker();
});

// --- Python Backend Management ---

function findPythonExecutable() {
    // 🔧 修復：一律優先解析「絕對路徑」的真實 python.exe（不再僅限打包模式）。
    // 原因：裸字串 'python' 交給 PATH 解析時，可能命中 Windows Store 的
    // AppExecutionAlias shim（WindowsApps\python.exe）——shim 會另起真正的
    // python 進程，導致進程樹斷裂（kill 殺不到）且 stdin 管道句柄傳遞不可靠
    // （實測出現 "ValueError: I/O operation on closed file"）。
    const possiblePaths = [];
    
    if (process.platform === 'win32') {
        // Windows: Check common Python installation paths
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const localAppData = process.env['LOCALAPPDATA'] || path.join(process.env['USERPROFILE'] || '', 'AppData', 'Local');
        
        possiblePaths.push(
            path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
            path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
            path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
            path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
            path.join(programFiles, 'Python313', 'python.exe'),
            path.join(programFiles, 'Python312', 'python.exe'),
            path.join(programFiles, 'Python311', 'python.exe'),
            path.join(programFiles, 'Python310', 'python.exe')
        );
    } else {
        // Linux/macOS: Check common paths
        possiblePaths.push(
            '/usr/bin/python3',
            '/usr/local/bin/python3',
            '/opt/homebrew/bin/python3',
            path.join(process.env['HOME'] || '', '.local', 'bin', 'python3')
        );
    }
    
    for (const pythonPath of possiblePaths) {
        try {
            if (fs.existsSync(pythonPath)) {
                require('child_process').execSync(`"${pythonPath}" --version`, { stdio: 'ignore' });
                return pythonPath;
            }
        } catch (e) {
            // Continue to next path
        }
    }
    
    // Fallback: PATH 裡的 python（僅當找不到任何絕對路徑安裝時）
    return process.platform === 'win32' ? 'python' : 'python3';
}

function startPythonBackend() {
    // 🔧 單實例守護：已有存活後端時不得重複 spawn。
    // 實測曾出現雙後端同時運行：互搶 SQLite、stdin 管道混亂、殭屍進程。
    if (pythonProcess && !pythonProcess.killed) {
        writeLog('startPythonBackend skipped: backend already running (PID: ' + pythonProcess.pid + ')', 'WARN');
        return;
    }
    writeLog('========== Starting Python Backend ==========');
    updateSplashStatus('正在啟動後端服務...', 70);
    
    // 開發模式下優先使用 Python 腳本，生產環境優先使用編譯好的 exe
    const isPackaged = app.isPackaged;
    
    // 🔧 P0: 使用 app.getAppPath() 獲取正確的應用路徑
    const appPath = app.getAppPath();
    const resourcesPath = process.resourcesPath || path.dirname(appPath);
    
    // 🔧 修復：打包後優先使用 resourcesPath 中的 exe
    const backendExeResources = path.join(resourcesPath, 'backend-exe', 'tg-matrix-backend.exe');
    const backendExe = path.join(appPath, 'backend-exe', 'tg-matrix-backend.exe');
    const pythonScript = path.join(appPath, 'backend', 'main.py');
    
    let useExe = false;
    let backendPath = '';
    let backendArgs = [];
    let workingDir = appPath;
    
    // 🆕 P0: 詳細日誌
    writeLog('App isPackaged: ' + isPackaged);
    writeLog('appPath: ' + appPath);
    writeLog('resourcesPath: ' + resourcesPath);
    writeLog('Checking backendExeResources: ' + backendExeResources);
    writeLog('backendExeResources exists: ' + fs.existsSync(backendExeResources));
    writeLog('Checking backendExe: ' + backendExe);
    writeLog('backendExe exists: ' + fs.existsSync(backendExe));
    writeLog('Checking pythonScript: ' + pythonScript);
    writeLog('pythonScript exists: ' + fs.existsSync(pythonScript));
    
    if (!isPackaged && fs.existsSync(pythonScript)) {
        // 開發模式：使用 Python 腳本
        const pythonExecutable = findPythonExecutable();
        backendPath = pythonExecutable;
        backendArgs = [pythonScript];
        workingDir = path.join(appPath, 'backend');
        writeLog('DEV MODE: Using Python script');
        writeLog('Python executable: ' + pythonExecutable);
    } else if (isPackaged && fs.existsSync(backendExeResources)) {
        // 🔧 生產環境：優先使用 resources 中的 exe
        useExe = true;
        backendPath = backendExeResources;
        workingDir = path.dirname(backendExeResources);
        writeLog('PROD MODE: Using exe from resources');
    } else if (fs.existsSync(backendExe)) {
        // 回退：使用本地 exe（開發時測試用）
        useExe = true;
        backendPath = backendExe;
        workingDir = path.join(appPath, 'backend-exe');
        writeLog('Using local backend exe');
    } else if (fs.existsSync(pythonScript)) {
        // 回退：使用 Python 腳本
        const pythonExecutable = findPythonExecutable();
        backendPath = pythonExecutable;
        backendArgs = [pythonScript];
        workingDir = path.join(appPath, 'backend');
        writeLog('Fallback: Using Python script');
        writeLog('Python executable: ' + pythonExecutable);
    } else {
        const errorMsg = `找不到後端程序！\n\n檢查的路徑:\n- ${backendExeResources}\n- ${backendExe}\n- ${pythonScript}`;
        writeLog('ERROR: Backend not found!', 'ERROR');
        writeLog('Checked paths: ' + backendExeResources + ', ' + backendExe + ', ' + pythonScript, 'ERROR');
        
        // 🆕 P0: 更新啟動畫面顯示錯誤
        updateSplashStatus(null, null, '找不到後端程序，請重新安裝');
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox('後端錯誤', errorMsg);
            mainWindow.webContents.send('backend-status', {
                running: false,
                error: '找不到後端程序',
                suggestion: '請重新安裝程序'
            });
        }
        return;
    }
    
    writeLog('Backend path: ' + backendPath);
    writeLog('Backend args: ' + JSON.stringify(backendArgs));
    writeLog('Working dir: ' + workingDir);
    
    writeLog('Starting backend process...');
    updateSplashStatus('正在啟動後端服務...', 75);
    
    // 確保 sessions 和 data 目錄存在
    const sessionsDir = path.join(workingDir, 'sessions');
    const dataDir = path.join(workingDir, 'data');
    try {
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
            writeLog('Created sessions dir: ' + sessionsDir);
        }
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            writeLog('Created data dir: ' + dataDir);
        }
    } catch (dirError) {
        writeLog('Failed to create directories: ' + dirError.message, 'ERROR');
    }
    
    // 🆕 設置用戶數據目錄（用於持久化存儲）
    const userDataPath = app.getPath('userData');
    const persistentDataDir = path.join(userDataPath, 'backend-data');
    const persistentSessionsDir = path.join(userDataPath, 'sessions');
    
    // 確保持久化目錄存在
    try {
        if (!fs.existsSync(persistentDataDir)) {
            fs.mkdirSync(persistentDataDir, { recursive: true });
            writeLog('Created persistent data dir: ' + persistentDataDir);
        }
        if (!fs.existsSync(persistentSessionsDir)) {
            fs.mkdirSync(persistentSessionsDir, { recursive: true });
            writeLog('Created persistent sessions dir: ' + persistentSessionsDir);
        }
    } catch (e) {
        writeLog('Failed to create persistent dirs: ' + e.message, 'ERROR');
    }
    
    // 🆕 判斷是否為開發模式
    const isDevelopment = !isPackaged;
    
    try {
        pythonProcess = spawn(backendPath, backendArgs, {
            cwd: workingDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            // 🔧 修復：一律不經 shell。舊代碼開發模式 shell:true 讓 Node 追蹤的是
            // cmd.exe 包裝進程而非 python 本體：cmd 一退出就誤觸發 on('exit') 重啟，
            // 真正的 python 淪為殭屍（taskkill 樹殺也打不到），stdin 句柄經多層
            // 轉發後不可靠。findPythonExecutable() 已回傳絕對路徑，無需 shell 解析。
            shell: false,
            windowsHide: true,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8',  // 🔧 修復 Windows GBK 編碼問題
                // 🆕 傳遞開發模式標識（開發模式使用本地數據目錄）
                TG_DEV_MODE: isDevelopment ? 'true' : 'false',
                IS_PACKAGED: isPackaged ? 'true' : 'false',
                // 🆕 傳遞用戶數據路徑給 Python 後端（僅生產模式使用）
                TG_USER_DATA_PATH: userDataPath,
                TG_DATA_DIR: persistentDataDir,
                TG_SESSIONS_DIR: persistentSessionsDir,
                // 🔧 Phase 3: 內存優化環境變量
                TG_LIGHTWEIGHT_MODE: LIGHTWEIGHT_MODE ? 'true' : 'false',
                TG_DISABLE_NEURAL_EMBEDDING: LIGHTWEIGHT_MODE ? 'true' : 'false'
            }
        });
        
        writeLog('Backend env TG_DEV_MODE: ' + (isDevelopment ? 'true' : 'false'));
        writeLog('Backend env IS_PACKAGED: ' + (isPackaged ? 'true' : 'false'));
        writeLog('Backend env TG_USER_DATA_PATH: ' + userDataPath);
        if (isDevelopment) {
            writeLog('🔧 開發模式：後端將使用本地 backend/data/ 目錄');
        } else {
            writeLog('📦 生產模式：後端將使用 AppData 目錄: ' + persistentDataDir);
        }
        
        writeLog('Backend process spawned, PID: ' + (pythonProcess.pid || 'unknown'));
        updateSplashStatus('後端服務已啟動...', 85);
    } catch (spawnError) {
        writeLog('Failed to spawn backend: ' + spawnError.message, 'ERROR');
        updateSplashStatus(null, null, '無法啟動後端服務: ' + spawnError.message);
        return;
    }
    
    // 🆕 P0: 監聽進程錯誤
    pythonProcess.on('error', (err) => {
        writeLog('Backend process error: ' + err.message, 'ERROR');
        updateSplashStatus(null, null, '後端啟動失敗: ' + err.message);
    });
    
    // Buffer for incomplete lines (handles JSON split across multiple data events)
    let stdoutBuffer = '';
    
    // 🆕 P1: 後端健康檢查
    let backendReady = false;
    const healthCheckTimeout = setTimeout(() => {
        if (!backendReadyForUI && pythonProcess && !pythonProcess.killed) {
            writeLog('Backend health check: no full init in 60s', 'WARN');
            // 如果已經有響應但還沒完全初始化，繼續等待
            if (backendReady) {
                updateSplashStatus('後端服務初始化中，請稍候...', 90);
            } else {
                updateSplashStatus(null, null, '後端服務無響應，請檢查安裝');
            }
        }
    }, 60000);
    
    // Handle stdout (events from Python)
    pythonProcess.stdout.on('data', (data) => {
        const rawData = data.toString();
        // Append new data to buffer
        stdoutBuffer += rawData;
        
        // 🆕 P1: 標記後端已響應（收到任何輸出即表示後端已啟動）
        if (!backendReady) {
            backendReady = true;
            writeLog('Backend health check: first stdout data received');
            writeLog('First data preview: ' + rawData.substring(0, 100));
        }
        
        // 🆕 P1: 當收到初始化完成的標誌時，才標記為 UI 可用
        // 🔧 修復：舊條件含 rawData.includes('"event"')——後端第一條輸出
        // {"event":"backend-starting"}（初始化「開始」信號）就會誤判為就緒，
        // 比真實就緒早數十秒。現只認顯式 backend-ready 事件與完成文案。
        if (!backendReadyForUI && (rawData.includes('"backend-ready"') || rawData.includes('後端初始化完成') || rawData.includes('Initialization complete'))) {
            backendReadyForUI = true;
            backendRestartCount = 0;  // 成功就緒後重置重啟計數
            clearTimeout(healthCheckTimeout);
            writeLog('Backend fully initialized, ready for UI');
            updateSplashStatus('後端服務已就緒，正在載入界面...', 95);
            
            // 通知前端後端已就緒
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('backend-status', {
                    running: true,
                    error: null
                });
            }
        }
        
        // Process complete lines
        const lines = stdoutBuffer.split('\n');
        
        // Keep the last incomplete line in buffer (or empty if ends with newline)
        stdoutBuffer = lines.pop() || '';
        
        lines.filter(line => line.trim()).forEach(line => {
            try {
                // 🆕 跳過非 JSON 格式的行（如錯誤訊息）
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith('{')) {
                    // 非 JSON 行，可能是錯誤或日誌，靜默忽略
                    if (trimmedLine.includes('Error') || trimmedLine.includes('error')) {
                        console.warn('[Backend] Non-JSON error output:', trimmedLine.substring(0, 100));
                    }
                    return;
                }
                
                const event = JSON.parse(line);
                console.log('[Backend] Event:', event.event);
                
                // Handle acknowledgment events
                if (event.event === 'command-ack') {
                    const { request_id, status } = event.payload;
                    requestManager.handleAcknowledgment(request_id, status);
                    // Don't forward ack events to frontend (internal only)
                    return;
                }
                
                if (event.event === 'command-complete') {
                    const { request_id, status, error } = event.payload;
                    requestManager.handleCompletion(request_id, status, error);
                    // Don't forward completion events to frontend (already handled)
                    return;
                }
                
                // 🆕 檢查是否有 invoke 模式的回調等待此事件
                if (global.pendingRagCallbacks && global.pendingRagCallbacks[event.event]) {
                    console.log(`[Backend] ★ RAG invoke callback found for: ${event.event}`);
                    global.pendingRagCallbacks[event.event](event.payload);
                    // 不要 return，仍然轉發到前端（前端可能也在監聽）
                }
                
                // Forward other events to frontend
                if (mainWindow && !mainWindow.isDestroyed()) {
                    // Special logging for initial-state and accounts-updated
                    if (event.event === 'initial-state') {
                        console.log('[Backend] ★★★ Forwarding initial-state to frontend ★★★');
                        console.log('[Backend] initial-state accounts count:', event.payload?.accounts?.length || 0);
                    }
                    if (event.event === 'accounts-updated') {
                        console.log('[Backend] ★★★ Forwarding accounts-updated to frontend ★★★');
                        console.log('[Backend] accounts-updated count:', Array.isArray(event.payload) ? event.payload.length : 'not array');
                    }
                    // Debug logging for trigger-rule events
                    if (event.event === 'save-trigger-rule-result' || event.event === 'trigger-rules-result') {
                        console.log(`[Backend] ★★★ Forwarding ${event.event} to frontend ★★★`);
                        console.log(`[Backend] ${event.event} payload:`, JSON.stringify(event.payload).substring(0, 200));
                    }
                    mainWindow.webContents.send(event.event, event.payload);
                }
            } catch (e) {
                console.error('[Backend] Failed to parse event:', line, e);
            }
        });
    });
    
    // Handle stderr (Python uses stderr for all logging)
    pythonProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (!message) return;
        
        // 🆕 P0: 記錄到日誌文件
        writeLog('[stderr] ' + message.substring(0, 200));
        
        // 🆕 P1: 如果後端還沒有通過 stdout 響應，stderr 也算響應
        if (!backendReady) {
            backendReady = true;
            writeLog('Backend responded via stderr');
        }
        
        // 區分真正的錯誤和普通日誌
        // 只有包含 "Error"、"Exception"、"Traceback" 等關鍵字才標記為錯誤
        const isError = /\b(Error|Exception|Traceback|CRITICAL|FATAL|failed|Failed)\b/i.test(message);
        
        if (isError) {
            console.error('[electron]', message);
            // 更新啟動畫面顯示錯誤
            if (!backendReadyForUI) {
                updateSplashStatus('後端啟動中...', 80);
            }
        } else {
            console.log('[electron]', message);
        }
    });
    
    // Handle process exit
    pythonProcess.on('exit', (code, signal) => {
        writeLog(`Backend process exited with code ${code}, signal ${signal}`);
        pythonProcess = null;
        const wasReady = backendReadyForUI;
        backendReadyForUI = false;  // 🔧 進程已死，就緒狀態同步復位（舊代碼遺漏，導致重啟後判斷失真）
        
        // 🆕 P0: 如果後端還沒準備好就退出了，顯示錯誤
        if (!wasReady) {
            const errorMsg = `後端進程異常退出 (code: ${code})`;
            writeLog(errorMsg, 'ERROR');
            updateSplashStatus(null, null, errorMsg + '，請查看日誌');
        }
        
        // 通知前端後端已離線
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('backend-status', {
                running: false,
                error: code === 0 ? null : `後端進程退出 (code: ${code})`
            });
        }
        
        // Restart if not intentionally closed and not shutting down
        // 🔧 加重啟上限：崩潰循環時最多重試 MAX_BACKEND_RESTARTS 次，避免無限重生
        if (!isShuttingDown && code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
            if (backendRestartCount >= MAX_BACKEND_RESTARTS) {
                writeLog(`Backend restart limit reached (${MAX_BACKEND_RESTARTS}), giving up`, 'ERROR');
                mainWindow.webContents.send('backend-status', {
                    running: false,
                    error: '後端連續崩潰，已停止自動重啟',
                    suggestion: '請查看日誌後手動重啟應用'
                });
                return;
            }
            backendRestartCount++;
            writeLog(`Restarting Python backend in 2 seconds... (attempt ${backendRestartCount}/${MAX_BACKEND_RESTARTS})`);
            setTimeout(() => startPythonBackend(), 2000);
        }
    });
    
    pythonProcess.on('error', (error) => {
        console.error('[Backend] Failed to start Python backend:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('log-entry', {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                message: `Failed to start Python backend: ${error.message}`,
                type: 'error'
            });
            
            // 發送後端狀態事件
            mainWindow.webContents.send('backend-status', {
                running: false,
                error: error.message,
                suggestion: 'Please ensure Python 3.9+ is installed and added to PATH'
            });
            
            // 顯示錯誤對話框
            dialog.showErrorBox(
                'Python 後端啟動失敗',
                `無法啟動 Python 後端服務。\n\n` +
                `錯誤: ${error.message}\n\n` +
                `請確保：\n` +
                `1. 已安裝 Python 3.9 或更高版本\n` +
                `2. Python 已添加到系統 PATH\n` +
                `3. 已安裝所需依賴 (pip install -r requirements.txt)\n\n` +
                `安裝 Python: https://www.python.org/downloads/`
            );
        }
    });
}

// 檢查 Python 環境
function checkPythonEnvironment() {
    return new Promise((resolve) => {
        const pythonExecutable = findPythonExecutable();
        const testProcess = spawn(pythonExecutable, ['--version'], { shell: true });
        
        let output = '';
        testProcess.stdout.on('data', (data) => { output += data.toString(); });
        testProcess.stderr.on('data', (data) => { output += data.toString(); });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                console.log('[Backend] Python found:', output.trim());
                resolve({ success: true, version: output.trim() });
            } else {
                console.error('[Backend] Python not found or not accessible');
                resolve({ success: false, error: 'Python not found' });
            }
        });
        
        testProcess.on('error', (error) => {
            console.error('[Backend] Python check failed:', error);
            resolve({ success: false, error: error.message });
        });
    });
}

function sendToPython(command, payload = {}, requestId = null) {
    if (!pythonProcess || pythonProcess.killed) {
        console.error('[Backend] Python process not running');
        return null;
    }
    
    // Check if stdin is writable
    if (!pythonProcess.stdin || pythonProcess.stdin.destroyed || pythonProcess.stdin.writableEnded) {
        console.error('[Backend] Python stdin is not writable');
        return null;
    }
    
    // Generate request ID if not provided (for acknowledgment tracking)
    if (!requestId) {
        requestId = requestManager.registerRequest(command, payload);
    }
    
    const message = JSON.stringify({
        command: command,
        payload: payload,
        request_id: requestId
    }) + '\n';
    
    console.log('[Backend] Sending command:', command, 'request_id:', requestId);
    try {
        // 🆕 明確使用 UTF-8 編碼發送（解決中文關鍵詞亂碼問題）
        const result = pythonProcess.stdin.write(message, 'utf8', (error) => {
            if (error) {
                console.error('[Backend] Error sending command:', error);
                // Remove request from pending if send failed
                requestManager.pendingRequests.delete(requestId);
            }
        });
        
        // Check if write was successful (returns false if buffer is full)
        if (result === false) {
            console.warn('[Backend] Write buffer full, command may not be sent');
        }
    } catch (error) {
        console.error('[Backend] Exception while sending command:', error);
        // Remove request if exception occurred
        requestManager.pendingRequests.delete(requestId);
        return null;
    }
    
    return requestId;
}


// --- IPC Listeners: The Bridge between Frontend and Backend ---
// These listeners receive commands from the Angular app via ElectronIpcService

ipcMain.on('get-initial-state', (event) => {
  console.log('[IPC] Received: get-initial-state');
  sendToPython('get-initial-state');
});

// Generic handler for most commands that just pass through to Python
const passThroughChannels = [
    'add-account', 'login-account', 'check-account-status',
    'start-monitoring', 'stop-monitoring', 'clear-logs',
    'bulk-assign-role', 'bulk-assign-group', 'bulk-delete-accounts',
    'update-account-data', 'add-keyword-set', 'add-keyword', 'remove-keyword',
    'add-group', 'join-group', `remove-keyword-set`, `remove-group`, `remove-campaign`, `remove-template`, `remove-account`,
    'add-template', 'toggle-template-status', 'add-campaign', 'toggle-campaign-status',
    'send-message', 'update-lead-status', 'add-to-dnc',
    'save-settings', 'get-settings',
    'get-queue-status', 'clear-queue',
    'pause-queue', 'resume-queue',
    'delete-queue-message', 'update-queue-message-priority', 'get-queue-messages',
    'get-logs', 'export-logs',
    'get-performance-summary', 'get-performance-metrics',
    // AI Auto Chat Commands
    'generate-ai-response', 'get-ai-chat-settings', 'update-ai-chat-settings',
    'get-chat-history', 'get-user-context', 'add-ai-memory', 'get-ai-memories',
    'analyze-conversation',
    // Voice Clone Commands
    'upload-voice-sample', 'delete-voice-sample', 'preview-voice-sample',
    'generate-cloned-voice', 'list-voice-samples',
    // Local AI/TTS/STT Test Commands
    'test-local-ai', 'test-tts-service', 'test-stt-service',
    // Knowledge Base Commands
    'init-knowledge-base', 'get-knowledge-stats', 'add-document', 'get-documents',
    'delete-document', 'add-media', 'get-media', 'delete-media',
    'search-knowledge', 'add-qa-pair', 'get-qa-pairs', 'import-qa', 'get-rag-context',
    // User Management Commands
    'get-users-with-profiles', 'get-funnel-stats', 'bulk-update-user-tags',
    'bulk-update-user-stage', 'update-user-profile',
    // One-Click Control Commands
    'one-click-start', 'one-click-stop', 'get-system-status',
    // Knowledge Learning Commands
    'learn-from-history', 'get-knowledge-stats',
    // Resource Discovery Commands
    'init-resource-discovery', 'search-resources', 'get-resources', 'get-resource-stats',
    'add-resource-manually', 'delete-resource', 'add-to-join-queue', 'process-join-queue',
    'batch-join-resources', 'get-discovery-keywords', 'add-discovery-keyword', 'get-discovery-logs',
    // 🔧 P0: 添加群組搜索命令
    'search-groups', 'get-group-members', 'get-monitored-groups',
    // Jiso Search Commands
    'search-jiso', 'check-jiso-availability',
    // Search Channel Management Commands
    'get-search-channels', 'add-search-channel', 'update-search-channel', 'delete-search-channel', 'test-search-channel',
    // Discussion Watcher Commands
    'init-discussion-watcher', 'discover-discussion', 'discover-discussions-from-resources',
    'get-discussion-groups', 'update-discussion-monitoring', 'get-discussion-messages',
    'get-discussion-stats',
    // Batch Operations Commands
    'get-batch-tasks', 'create-batch-task', 'start-batch-task', 'stop-batch-task', 'delete-batch-task',
    'get-batch-history', 'get-batch-stats', 'batch-send-messages', 'batch-manage-accounts',
    // Batch Send/Invite Commands
    'batch-send:start', 'batch-send:cancel', 'batch-invite:start', 'batch-invite:cancel', 'get-admin-groups',
    // Ad Manager Commands
    'get-ad-templates', 'add-ad-template', 'update-ad-template', 'delete-ad-template',
    'get-ad-schedules', 'add-ad-schedule', 'update-ad-schedule', 'delete-ad-schedule',
    'start-ad-schedule', 'stop-ad-schedule', 'get-ad-history', 'get-ad-stats',
    // User Tracker Commands
    'get-tracked-users', 'add-tracked-user', 'update-tracked-user', 'delete-tracked-user',
    'get-user-interactions', 'get-user-analytics', 'get-funnel-analysis',
    // RAG Commands
    'get-rag-stats', 'search-rag', 'trigger-rag-learning', 'add-rag-knowledge',
    'rag-feedback', 'reindex-conversations', 'cleanup-rag-knowledge',
    // Campaign Orchestrator Commands
    'get-campaigns-full', 'create-campaign', 'update-campaign', 'delete-campaign-full',
    'start-campaign', 'stop-campaign', 'get-campaign-stats', 'get-campaign-history',
    // Multi Channel Stats Commands
    'get-unified-stats', 'get-module-stats', 'get-trend-data',
    // Multi Role Manager Commands
    'get-all-roles', 'assign-role', 'update-role', 'delete-role', 'get-role-stats',
    // Script Engine Commands
    'get-scripts', 'create-script', 'update-script', 'delete-script',
    'get-script-stats', 'execute-script',
    // Trigger Rules Commands
    'get-trigger-rules', 'get-trigger-rule', 'save-trigger-rule', 'delete-trigger-rule', 'toggle-trigger-rule',
    // Collected Users Commands (廣告識別)
    'get-collected-users', 'get-collected-users-stats', 'mark-user-as-ad', 'blacklist-user',
    'get-user-message-samples', 'recalculate-user-risk',
    // Collaboration Coordinator Commands
    'get-collab-groups', 'create-collab-group', 'update-collab-group',
    'delete-collab-group', 'start-collab-session', 'stop-collab-session', 'get-collab-stats',
    // Resource Discovery Extended Commands
    'join-and-monitor-resource', 'join-and-monitor-with-account', 'batch-join-and-monitor', 'analyze-group-link',
    'batch-analyze-links', 'get-analysis-history',
    // Ollama / Local AI Commands
    'get-ollama-models', 'test-ollama-connection', 'ollama-generate',
    // AI Model Management Commands
    'save-ai-model', 'get-ai-models', 'update-ai-model', 'delete-ai-model', 'test-ai-model', 'set-default-ai-model',
    'save-model-usage', 'get-model-usage',
    'save-conversation-strategy', 'get-conversation-strategy',
    // QR Login Commands (Phase 1)
    'qr-login-create', 'qr-login-status', 'qr-login-refresh', 'qr-login-submit-2fa', 'qr-login-cancel',
    // IP Binding Commands (Phase 2)
    'ip-bind', 'ip-unbind', 'ip-get-binding', 'ip-get-all-bindings', 'ip-get-statistics', 'ip-verify-binding',
    // Credential Scraper Commands (Phase 2)
    'credential-start-scrape', 'credential-submit-code', 'credential-get-status', 'credential-get-all', 'credential-cancel-scrape',
    // API Credential Pool Commands
    'get-api-credentials', 'add-api-credential', 'remove-api-credential', 'toggle-api-credential',
    'bulk-import-api-credentials', 'get-api-recommendation',
    // Platform API Pool Commands
    'get-platform-api-usage', 'allocate-platform-api', 'release-platform-api',
    // Account Edit & Proxy Commands
    'update-account', 'test-proxy', 'sync-account-info', 'batch-update-accounts', 'logout-account',
    // Tags & Groups
    'save-tags', 'save-groups', 'get-tags', 'get-groups',
    // AI Personas
    'save-personas', 'get-personas',
    // Member Extraction Commands
    'extract-members', 'get-extracted-members', 'get-member-stats', 'get-online-members', 'update-member',
    // 🆕 Group Collected Stats
    'get-group-collected-stats',
    // Group Message Commands
    'send-group-message', 'schedule-message',
    // Resource Commands
    'clear-all-resources', 'verify-resource-type',
    // TData Import Commands
    'scan-tdata', 'import-tdata-account', 'import-tdata-batch', 'get-default-tdata-path',
    // Orphan Session Recovery Commands
    'scan-orphan-sessions', 'recover-orphan-sessions',
    // Lead Management Commands
    'delete-lead', 'batch-delete-leads', 'get-detailed-funnel-stats', 'get-leads-paginated',
    // Batch Operations
    'batch-update-leads', 'batch-tag-leads', 'batch-export-leads',
    'undo-batch-operation', 'get-batch-operation-history', 'get-all-tags',
    // Lead to Group Integration
    'invite-lead-to-collab-group', 'create-collab-group-for-lead',
    // Chat Template Commands
    'get-chat-templates', 'save-chat-template', 'delete-chat-template',
    // Keyword Set Commands (新增)
    'save-keyword-set', 'delete-keyword-set', 'bind-keyword-set', 'unbind-keyword-set', 'get-keyword-sets',
    // AI Message Generation Commands (批量發送/拉群優化)
    'ai-generate-message', 'ai-generate-group-names', 'ai-generate-welcome',
    // Group Creation Commands
    'create-group',
    // Unified Contacts Commands (資源中心)
    'unified-contacts:sync', 'unified-contacts:get', 'unified-contacts:stats',
    'unified-contacts:update', 'unified-contacts:add-tags', 'unified-contacts:update-status',
    'unified-contacts:delete', 'unified-contacts:import-members',
    // 🆕 Knowledge Base Management Commands (知識庫管理)
    'add-knowledge-base', 'add-knowledge-item', 'get-knowledge-items', 'update-knowledge-item', 'delete-knowledge-item',
    // 🆕 AI 智能生成知識庫
    'ai-generate-knowledge',
    // 🆕 行業模板和聊天學習
    'apply-industry-template', 'learn-from-chat-history',
    // 🧠 RAG 知識大腦 2.0
    'rag-initialize', 'rag-search', 'rag-get-stats', 'rag-add-knowledge',
    'rag-record-feedback', 'rag-get-recent', 'rag-cleanup', 'rag-merge-similar',
    'rag-build-from-conversation', 'rag-import-url', 'rag-import-document',
    // 🆕 知識管理（完整 CRUD）
    'rag-get-all-knowledge', 'rag-update-knowledge', 'rag-delete-knowledge', 'rag-delete-knowledge-batch',
    // 🆕 知識缺口和健康度
    'rag-get-gaps', 'rag-resolve-gap', 'rag-ignore-gap', 'rag-suggest-gap-answer',
    'rag-get-health-report', 'rag-start-guided-build', 'rag-cleanup-duplicate-gaps',
    // 🆕 AI 自主模式命令
    'set-autonomous-mode', 'get-customer-state', 'get-smart-system-stats',
    // 🆕 Phase1-3: 智能系統擴展命令
    'get-user-memories', 'get-user-tags', 'add-user-tag', 'remove-user-tag', 'get-users-by-tag',
    'get-customer-profile', 'get-emotion-trend', 'get-workflow-rules',
    'get-followup-tasks', 'get-learning-stats', 'get-knowledge-gaps',
    'schedule-followup', 'trigger-workflow',
    // 🆕 P1-1: 統一營銷任務命令
    'get-marketing-tasks', 'create-marketing-task', 'update-marketing-task', 'delete-marketing-task',
    'start-marketing-task', 'pause-marketing-task', 'resume-marketing-task', 'complete-marketing-task',
    'add-marketing-task-targets', 'get-marketing-task-targets', 'update-marketing-task-target',
    'assign-marketing-task-role', 'auto-assign-marketing-task-roles', 'get-marketing-task-stats',
    'set-ai-hosting', 'save-marketing-settings', 'navigate-to',
    // 🔧 P0 修復: 添加 AI 文本生成命令
    'ai:generate-text',
    // 🔧 P0 修復: 添加多角色 AI 團隊執行命令
    'ai-team:start-execution', 'ai-team:send-private-message', 'ai-team:send-manual-message',
    'ai-team:send-scriptless-message', 'ai-team:generate-scriptless-message',
    'ai-team:add-targets', 'ai-team:adjust-strategy', 'ai-team:request-suggestion',
    'ai-team:user-completed', 'ai-team:queue-completed', 'ai-team:next-user',
    'ai-team:conversion-signal',
    // 🔧 群聊協作: 群組管理命令
    'group:create', 'group:invite-user', 'group:add-member', 'group:send-message',
    'group:get-info', 'group:leave', 'group:monitor-messages',
    // 🆕 P0: 操作記錄命令
    'record-action',
    // 🆕 Phase3: 全鏈路自動化工作流命令
    'multi-role:ai-plan', 'multi-role:start-private-collaboration',
    'multi-role:auto-create-group', 'multi-role:start-group-collaboration',
    'ai:analyze-interest', 'workflow:save-config', 'workflow:get-executions'
];

// 🔧 P0: 將 passThroughChannels 導出為 Set 便於檢查
const passThroughChannelsSet = new Set(passThroughChannels);

passThroughChannels.forEach(channel => {
    ipcMain.on(channel, (event, data) => {
        // 🆕 優化日誌格式：只在有數據時顯示數據摘要
        if (data !== undefined && data !== null) {
            const dataPreview = typeof data === 'object' 
                ? JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : '')
                : data;
            console.log(`[IPC] → ${channel}:`, dataPreview);
        } else {
            console.log(`[IPC] → ${channel}`);
        }
        sendToPython(channel, data);
    });
});

// 🔧 P0: 添加未註冊命令的 fallback 警告處理器
// 當收到未註冊的命令時，記錄警告日誌
ipcMain.on('unhandled-command', (event, data) => {
    const command = data?.command || 'unknown';
    console.warn(`[IPC] ⚠️ Unhandled command received: ${command}`);
    console.warn(`[IPC] ⚠️ Consider adding '${command}' to passThroughChannels if it should be forwarded to backend`);
});


// ==================== AI Auto Setup IPC ====================

// 獲取 AI 設置狀態
ipcMain.on('get-ai-setup-status', async (event) => {
    console.log('[IPC] Received: get-ai-setup-status');
    if (autoAiSetup) {
        const status = autoAiSetup.getStatus();
        event.sender.send('ai-setup-status', { success: true, ...status });
    } else {
        event.sender.send('ai-setup-status', { success: false, error: 'AI setup not initialized' });
    }
});

// 重新檢測 Ollama
ipcMain.on('detect-ollama', async (event) => {
    console.log('[IPC] Received: detect-ollama');
    if (autoAiSetup) {
        const ollamaAvailable = await autoAiSetup.checkOllama();
        let models = [];
        if (ollamaAvailable) {
            models = await autoAiSetup.getOllamaModels();
        }
        event.sender.send('ollama-detected', { 
            success: true, 
            available: ollamaAvailable, 
            models: models 
        });
    } else {
        event.sender.send('ollama-detected', { success: false, error: 'AI setup not initialized' });
    }
});

// 測試 AI 連接
ipcMain.on('test-ai-connection-quick', async (event, data) => {
    console.log('[IPC] Received: test-ai-connection-quick');
    if (autoAiSetup) {
        const result = await autoAiSetup.testConnection(data.endpoint, data.model);
        event.sender.send('ai-connection-result', result);
    } else {
        event.sender.send('ai-connection-result', { success: false, error: 'AI setup not initialized' });
    }
});

// 獲取首次運行狀態
ipcMain.on('check-first-run', (event) => {
    console.log('[IPC] Received: check-first-run');
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'ai-config.json');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    const isFirstRun = !fs.existsSync(configPath) || !fs.existsSync(settingsPath);
    event.sender.send('first-run-status', { 
        isFirstRun: isFirstRun,
        userDataPath: userDataPath
    });
});

// 保存首次設置
ipcMain.on('save-first-run-settings', (event, data) => {
    console.log('[IPC] Received: save-first-run-settings');
    try {
        const userDataPath = app.getPath('userData');
        
        // 保存 AI 配置
        if (data.aiConfig) {
            const aiConfigPath = path.join(userDataPath, 'ai-config.json');
            fs.writeFileSync(aiConfigPath, JSON.stringify(data.aiConfig, null, 2), 'utf8');
        }
        
        // 保存系統設置
        if (data.settings) {
            const settingsPath = path.join(userDataPath, 'settings.json');
            fs.writeFileSync(settingsPath, JSON.stringify(data.settings, null, 2), 'utf8');
        }
        
        event.sender.send('first-run-settings-saved', { success: true });
    } catch (error) {
        event.sender.send('first-run-settings-saved', { success: false, error: error.message });
    }
});

// File Operations

ipcMain.on('download-excel-template', async (event) => {
    console.log('[IPC] Received: download-excel-template');
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Account Template',
        defaultPath: 'tg-matrix-accounts-template.xlsx',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (filePath) {
        // Create Excel template file using Python script
        const path = require('path');
        const templateScript = path.join(__dirname, 'backend', 'create_template.py');
        const { exec } = require('child_process');
        exec(`python "${templateScript}" "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error creating template: ${error}`);
                console.error(`stderr: ${stderr}`);
            } else {
                console.log(`Template created: ${stdout}`);
                shell.openPath(filePath);
            }
        });
    }
});

ipcMain.on('load-accounts-from-excel', async (event) => {
    console.log('[IPC] Received: load-accounts-from-excel');
    const { filePaths } = await dialog.showOpenDialog({
        title: 'Open Accounts Excel File',
        properties: ['openFile'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    });

    if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        console.log(`[IPC] File selected for upload: ${filePath}`);
        sendToPython('load-accounts-from-excel', { filePath });
    }
});

ipcMain.on('reload-sessions-and-accounts', (event) => {
    console.log('[IPC] Received: reload-sessions-and-accounts');
    sendToPython('reload-sessions-and-accounts');
});

// ==================== RAG 知識管理 invoke 支持 ====================
// 這些命令需要返回 Promise 結果，所以使用 ipcMain.handle

// 輔助函數：等待後端響應事件
function waitForBackendEvent(eventName, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.removeListener(eventName, handler);
            }
            reject(new Error(`Timeout waiting for ${eventName}`));
        }, timeout);
        
        const handler = (event, payload) => {
            clearTimeout(timer);
            resolve(payload);
        };
        
        // 使用 webContents.once 來監聽一次性事件
        if (mainWindow && !mainWindow.isDestroyed()) {
            // 通過 IPC 從主進程監聽後端響應
            const ipcHandler = (payload) => {
                clearTimeout(timer);
                mainWindow.webContents.removeAllListeners(`rag-event-${eventName}`);
                resolve(payload);
            };
            
            // 設置一個臨時的監聽器來接收後端響應
            const originalSend = mainWindow.webContents.send.bind(mainWindow.webContents);
            const tempListener = function(channel, data) {
                if (channel === eventName) {
                    clearTimeout(timer);
                    // 恢復原始 send
                    resolve(data);
                }
            };
            
            // 監聯後端事件（通過在 stdout 處理中攔截）
            global.pendingRagCallbacks = global.pendingRagCallbacks || {};
            global.pendingRagCallbacks[eventName] = (data) => {
                clearTimeout(timer);
                delete global.pendingRagCallbacks[eventName];
                resolve(data);
            };
        } else {
            clearTimeout(timer);
            reject(new Error('Main window not available'));
        }
    });
}

// 攔截後端事件用於 invoke 模式
function interceptBackendEvent(eventName, callback) {
    global.pendingRagCallbacks = global.pendingRagCallbacks || {};
    global.pendingRagCallbacks[eventName] = callback;
}

ipcMain.handle('rag-get-all-knowledge', async (event, payload = {}) => {
    console.log('[IPC] Handle: rag-get-all-knowledge');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete global.pendingRagCallbacks['rag-all-knowledge'];
            reject(new Error('Timeout waiting for rag-all-knowledge'));
        }, 30000);
        
        global.pendingRagCallbacks = global.pendingRagCallbacks || {};
        global.pendingRagCallbacks['rag-all-knowledge'] = (data) => {
            clearTimeout(timeout);
            delete global.pendingRagCallbacks['rag-all-knowledge'];
            resolve(data);
        };
        
        sendToPython('rag-get-all-knowledge', payload);
    });
});

ipcMain.handle('rag-update-knowledge', async (event, payload = {}) => {
    console.log('[IPC] Handle: rag-update-knowledge');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete global.pendingRagCallbacks['rag-knowledge-updated'];
            reject(new Error('Timeout waiting for rag-knowledge-updated'));
        }, 30000);
        
        global.pendingRagCallbacks = global.pendingRagCallbacks || {};
        global.pendingRagCallbacks['rag-knowledge-updated'] = (data) => {
            clearTimeout(timeout);
            delete global.pendingRagCallbacks['rag-knowledge-updated'];
            resolve(data);
        };
        
        sendToPython('rag-update-knowledge', payload);
    });
});

ipcMain.handle('rag-delete-knowledge', async (event, payload = {}) => {
    console.log('[IPC] Handle: rag-delete-knowledge');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete global.pendingRagCallbacks['rag-knowledge-deleted'];
            reject(new Error('Timeout waiting for rag-knowledge-deleted'));
        }, 30000);
        
        global.pendingRagCallbacks = global.pendingRagCallbacks || {};
        global.pendingRagCallbacks['rag-knowledge-deleted'] = (data) => {
            clearTimeout(timeout);
            delete global.pendingRagCallbacks['rag-knowledge-deleted'];
            resolve(data);
        };
        
        sendToPython('rag-delete-knowledge', payload);
    });
});

ipcMain.handle('rag-delete-knowledge-batch', async (event, payload = {}) => {
    console.log('[IPC] Handle: rag-delete-knowledge-batch');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete global.pendingRagCallbacks['rag-knowledge-batch-deleted'];
            reject(new Error('Timeout waiting for rag-knowledge-batch-deleted'));
        }, 30000);
        
        global.pendingRagCallbacks = global.pendingRagCallbacks || {};
        global.pendingRagCallbacks['rag-knowledge-batch-deleted'] = (data) => {
            clearTimeout(timeout);
            delete global.pendingRagCallbacks['rag-knowledge-batch-deleted'];
            resolve(data);
        };
        
        sendToPython('rag-delete-knowledge-batch', payload);
    });
});

// ==================== AI 執行持久化 API ====================

ipcMain.handle('ai-execution:get-active', async (event, payload = {}) => {
    console.log('[IPC] Handle: ai-execution:get-active');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete global.pendingRagCallbacks['ai-execution:active-list'];
            // 超時時返回空列表而不是錯誤
            resolve({ executions: [] });
        }, 10000);
        
        global.pendingRagCallbacks = global.pendingRagCallbacks || {};
        global.pendingRagCallbacks['ai-execution:active-list'] = (data) => {
            clearTimeout(timeout);
            delete global.pendingRagCallbacks['ai-execution:active-list'];
            resolve(data);
        };
        
        sendToPython('ai-execution:get-active', payload);
    });
});

// ==================== 文件選擇 API ====================
// 用於選擇要發送的附件文件，直接傳遞文件路徑而非 base64

ipcMain.handle('select-file-for-attachment', async (event, options = {}) => {
    console.log('[IPC] Received: select-file-for-attachment');
    const { type = 'file', multiple = false } = options;
    
    let filters;
    if (type === 'image') {
        filters = [
            { name: '圖片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ];
    } else {
        filters = [
            { name: '所有文件', extensions: ['*'] }
        ];
    }
    
    const properties = multiple ? ['openFile', 'multiSelections'] : ['openFile'];
    
    const result = await dialog.showOpenDialog(mainWindow, {
        title: type === 'image' ? '選擇圖片' : '選擇文件',
        properties: properties,
        filters: filters
    });
    
    if (result.canceled || !result.filePaths.length) {
        return { success: false, canceled: true };
    }
    
    // 支持多文件選擇
    const files = result.filePaths.map(filePath => {
        const fileName = path.basename(filePath);
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const ext = path.extname(filePath).toLowerCase();
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const isImage = imageExtensions.includes(ext);
        
        return {
            filePath: filePath,
            fileName: fileName,
            fileSize: fileSize,
            fileType: isImage ? 'image' : 'file'
        };
    });
    
    console.log(`[IPC] Files selected: ${files.length} files`);
    
    // 如果是單文件模式，返回單個對象（向後兼容）
    if (!multiple) {
        const file = files[0];
        return {
            success: true,
            filePath: file.filePath,
            fileName: file.fileName,
            fileSize: file.fileSize,
            fileType: file.fileType
        };
    }
    
    // 多文件模式返回數組
    return {
        success: true,
        files: files
    };
});

ipcMain.on('import-session', async (event, options = {}) => {
    console.log('[IPC] Received: import-session');
    const { filePaths } = await dialog.showOpenDialog({
        title: '導入 Session 文件',
        properties: ['openFile'],
        filters: [
            { name: 'TG-Matrix Session 包 (推薦)', extensions: ['tgpkg'] },
            { name: '批量 Session 包', extensions: ['tgbatch'] },
            { name: 'TData 壓縮包', extensions: ['zip'] },
            { name: '舊版 Session 文件', extensions: ['session'] },
            { name: '所有支持的格式', extensions: ['tgpkg', 'tgbatch', 'session', 'zip'] }
        ]
    });

    if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        console.log(`[IPC] Session file selected: ${filePath}`);
        
        // For legacy .session files, try to extract phone from filename
        let phoneNumber = '';
        if (filePath.endsWith('.session')) {
            const filename = path.basename(filePath, '.session');
            phoneNumber = filename.replace(/[^0-9+]/g, '');
        }
        
        sendToPython('import-session', { 
            filePath: filePath,
            phoneNumber: phoneNumber,
            // Pass any additional options (API credentials for legacy files)
            apiId: options.apiId || '',
            apiHash: options.apiHash || '',
            proxy: options.proxy || ''
        });
    }
});

ipcMain.on('import-session-with-credentials', async (event, payload) => {
    console.log('[IPC] Received: import-session-with-credentials');
    // Import legacy session with user-provided credentials
    sendToPython('import-session', {
        filePath: payload.filePath,
        phoneNumber: payload.phoneNumber,
        apiId: payload.apiId,
        apiHash: payload.apiHash,
        proxy: payload.proxy || ''
    });
});

// TData 文件夾選擇
ipcMain.on('select-tdata-folder', async (event) => {
    console.log('[IPC] Received: select-tdata-folder');
    const { filePaths } = await dialog.showOpenDialog({
        title: '選擇 TData 文件夾',
        properties: ['openDirectory'],
        buttonLabel: '選擇此文件夾'
    });

    if (filePaths && filePaths.length > 0) {
        const folderPath = filePaths[0];
        console.log(`[IPC] TData folder selected: ${folderPath}`);
        mainWindow.webContents.send('tdata-folder-selected', { path: folderPath });
        // 自動觸發掃描
        sendToPython('scan-tdata', { path: folderPath });
    } else {
        mainWindow.webContents.send('tdata-folder-selected', { path: null });
    }
});

// TData ZIP 文件選擇
ipcMain.on('select-tdata-zip', async (event) => {
    console.log('[IPC] Received: select-tdata-zip');
    const { filePaths } = await dialog.showOpenDialog({
        title: '選擇 TData 壓縮包',
        properties: ['openFile'],
        filters: [
            { name: 'ZIP 壓縮包', extensions: ['zip'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        console.log(`[IPC] TData ZIP selected: ${filePath}`);
        mainWindow.webContents.send('tdata-zip-selected', { path: filePath });
        // 自動觸發掃描
        sendToPython('scan-tdata', { path: filePath });
    } else {
        mainWindow.webContents.send('tdata-zip-selected', { path: null });
    }
});

// 打開系統默認 TData 路徑
ipcMain.on('open-default-tdata-folder', async (event) => {
    console.log('[IPC] Received: open-default-tdata-folder');
    const os = require('os');
    const fs = require('fs');
    let tdataPath = '';
    
    if (process.platform === 'win32') {
        tdataPath = path.join(process.env.APPDATA || '', 'Telegram Desktop', 'tdata');
    } else if (process.platform === 'darwin') {
        tdataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Telegram Desktop', 'tdata');
    } else {
        tdataPath = path.join(os.homedir(), '.local', 'share', 'TelegramDesktop', 'tdata');
    }
    
    if (fs.existsSync(tdataPath)) {
        const { shell } = require('electron');
        shell.openPath(path.dirname(tdataPath));
        mainWindow.webContents.send('default-tdata-opened', { path: tdataPath, exists: true });
    } else {
        mainWindow.webContents.send('default-tdata-opened', { path: tdataPath, exists: false });
    }
});

ipcMain.on('export-session', async (event, phoneNumber) => {
    console.log('[IPC] Received: export-session for:', phoneNumber);
    const safePhone = phoneNumber.replace(/[^0-9]/g, '');
    
    const { filePath } = await dialog.showSaveDialog({
        title: '導出 Session 包',
        defaultPath: `${safePhone}.tgpkg`,
        filters: [
            { name: 'TG-Matrix Session 包 (推薦)', extensions: ['tgpkg'] },
            { name: '舊版 Session 文件 (不含憑證)', extensions: ['session'] }
        ]
    });

    if (filePath) {
        const format = filePath.endsWith('.tgpkg') ? 'package' : 'legacy';
        sendToPython('export-session', { 
            phoneNumber: phoneNumber,
            filePath: filePath,
            format: format
        });
    }
});

ipcMain.on('export-sessions-batch', async (event, phoneNumbers) => {
    console.log('[IPC] Received: export-sessions-batch for:', phoneNumbers.length, 'accounts');
    
    const { filePath } = await dialog.showSaveDialog({
        title: '批量導出 Session 包',
        defaultPath: `tg-matrix-sessions-${new Date().toISOString().split('T')[0]}.tgbatch`,
        filters: [
            { name: 'TG-Matrix 批量 Session 包', extensions: ['tgbatch'] }
        ]
    });

    if (filePath) {
        sendToPython('export-sessions-batch', { 
            phoneNumbers: phoneNumbers,
            filePath: filePath
        });
    }
});


ipcMain.on('export-leads-to-excel', async (event, leads) => {
    console.log('[IPC] Received: export-leads-to-excel with', leads.length, 'leads.');
     const { filePath } = await dialog.showSaveDialog({
        title: 'Export Leads',
        defaultPath: `tg-matrix-leads-${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (filePath) {
        // We have the leads data from the frontend.
        // We'll ask the python backend to perform the export.
        sendToPython('export-leads-to-excel', { leads, filePath });
    }
});


// 🔧 排查修復：這裡曾有一段「每次啟動都用空白佔位內容覆寫 preload.js」的
// 遺留腳手架代碼（註釋原文是「這將用於下一步驟建立一個虛設的 preload 檔案」），
// 但「下一步」從未真正發生——preload.js 早已作為真實檔案存在於版本控制中，
// 這段代碼只是每次啟動時把它覆寫回空白內容，是一個潛在地雷：未來一旦有人往
// preload.js 寫入真正的 contextBridge 安全邏輯（webPreferences 註釋裡提到的
// "未來優化方向"），會被這裡靜默清空，且不會有任何錯誤提示。目前
// preload.js 的內容本來就是這段佔位文字，故移除此覆寫不影響現有行為。
