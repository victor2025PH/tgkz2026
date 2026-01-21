
const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const AutoAiSetup = require('./auto-ai-setup');

// 在应用启动前设置语言环境为中文
// 必须在 app.on('ready') 之前调用
app.commandLine.appendSwitch('lang', 'zh-CN');

// 修復截屏時畫面消失的問題
// 禁用 GPU 合成器，使用軟體渲染來確保截屏工具可以正常捕獲畫面
app.commandLine.appendSwitch('disable-gpu-compositing');
// 啟用離屏渲染以提高兼容性
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');

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
        const longTimeoutCommands = ['add-account', 'login-account', 'import-accounts', 'import-sessions', 'get-initial-state', 'get-chat-history-full', 'get-chat-list', 'generate-ai-response', 'analyze-conversation', 'get-rag-context'];
        // Commands that should only retry once (low priority)
        const lowRetryCommands = ['get-queue-status', 'get-performance-metrics', 'get-performance-summary'];
        
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

function createWindow() {
  // 设置应用语言环境为中文
  app.commandLine.appendSwitch('lang', 'zh-CN');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    // 設置背景顏色，避免截屏時畫面消失
    backgroundColor: '#0f172a',
    // 確保窗口不透明
    transparent: false,
    webPreferences: {
      nodeIntegration: true, // Allows renderer to use Node.js APIs like 'require'
      contextIsolation: false, // Required for nodeIntegration to work
      preload: path.join(__dirname, 'preload.js'), // We will create this in a future step for better security
      // 禁用 WebGL 硬體加速以提高截屏兼容性
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Accelerated2dCanvas'
    },
    title: 'TG-Matrix',
    // In a real build, you'd create an icon file.
    // icon: path.join(__dirname, 'assets/icon.png') 
  });

  // Load the Angular app
  // Check if running in dev mode (--dev flag)
  const isDevMode = process.argv.includes('--dev');
  
  if (isDevMode) {
    // 開發模式：連接到 Angular 開發服務器
    console.log('[Electron] 🚀 開發模式：連接到 http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    
    // 監聽開發服務器是否就緒
    let retryCount = 0;
    const maxRetries = 30;
    const checkDevServer = setInterval(() => {
      const http = require('http');
      const req = http.get('http://localhost:3000', (res) => {
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
      mainWindow.loadFile(indexPath);
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
      console.warn('[Electron] Attempting to connect to dev server at http://localhost:3000');
      mainWindow.loadURL('http://localhost:3000');
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
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  // Start the Python backend
  startPythonBackend();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 在应用启动前设置语言环境
app.on('ready', async () => {
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
  
  // 註冊本地文件協議，用於安全載入頭像等本地資源
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    // 安全檢查：只允許載入 backend/data 目錄下的文件
    const normalizedPath = path.normalize(filePath);
    const dataDir = path.join(__dirname, 'backend', 'data');
    if (normalizedPath.startsWith(dataDir)) {
      callback({ path: normalizedPath });
    } else {
      console.error('[Protocol] Blocked access to:', normalizedPath);
      callback({ error: -6 }); // NET::ERR_FILE_NOT_FOUND
    }
  });
  
  // 初始化 AI 自動設置模塊
  autoAiSetup = new AutoAiSetup();
  try {
    const userDataPath = app.getPath('userData');
    const aiStatus = await autoAiSetup.initialize(userDataPath);
    console.log('[Electron] AI 自動設置完成:', aiStatus);
  } catch (error) {
    console.error('[Electron] AI 自動設置失敗:', error);
  }
  
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
    // In packaged app, try to find Python in common locations
    if (app.isPackaged) {
        const possiblePaths = [];
        
        if (process.platform === 'win32') {
            // Windows: Check common Python installation paths
            const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
            const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
            const localAppData = process.env['LOCALAPPDATA'] || path.join(process.env['USERPROFILE'] || '', 'AppData', 'Local');
            
            possiblePaths.push(
                path.join(programFiles, 'Python313', 'python.exe'),
                path.join(programFiles, 'Python312', 'python.exe'),
                path.join(programFiles, 'Python311', 'python.exe'),
                path.join(programFiles, 'Python310', 'python.exe'),
                path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
                path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
                path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
                path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe')
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
        
        // Try to find Python in PATH first
        const pythonInPath = process.platform === 'win32' ? 'python' : 'python3';
        
        // Check if Python is in PATH
        try {
            require('child_process').execSync(`${pythonInPath} --version`, { stdio: 'ignore' });
            return pythonInPath;
        } catch (e) {
            // Python not in PATH, try possible paths
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
        }
    }
    
    // Fallback to default
    return process.platform === 'win32' ? 'python' : 'python3';
}

function startPythonBackend() {
    // 開發模式下優先使用 Python 腳本，生產環境優先使用編譯好的 exe
    const backendExe = path.join(__dirname, 'backend-exe', 'tg-matrix-backend.exe');
    const backendExeResources = path.join(process.resourcesPath || __dirname, 'backend-exe', 'tg-matrix-backend.exe');
    const pythonScript = path.join(__dirname, 'backend', 'main.py');
    
    let useExe = false;
    let backendPath = '';
    let backendArgs = [];
    let workingDir = __dirname;
    
    // 開發模式：優先使用 Python 腳本（方便調試和修改代碼）
    const isDevelopment = !app.isPackaged;
    
    if (isDevelopment && fs.existsSync(pythonScript)) {
        // 開發模式：使用 Python 腳本
        const pythonExecutable = findPythonExecutable();
        backendPath = pythonExecutable;
        backendArgs = [pythonScript];
        workingDir = path.join(__dirname, 'backend');
        console.log('[Backend] 🔧 開發模式：使用 Python 腳本後端');
        console.log('[Backend] Python executable:', pythonExecutable);
    } else if (fs.existsSync(backendExe)) {
        // 生產環境：使用本地 exe
        useExe = true;
        backendPath = backendExe;
        workingDir = path.join(__dirname, 'backend-exe');
        console.log('[Backend] 使用編譯好的 exe 後端');
    } else if (fs.existsSync(backendExeResources)) {
        // 生產環境：使用 resources 中的 exe
        useExe = true;
        backendPath = backendExeResources;
        workingDir = path.dirname(backendExeResources);
        console.log('[Backend] 使用 resources 中的 exe 後端');
    } else if (fs.existsSync(pythonScript)) {
        // 回退：使用 Python 腳本
        const pythonExecutable = findPythonExecutable();
        backendPath = pythonExecutable;
        backendArgs = [pythonScript];
        workingDir = path.join(__dirname, 'backend');
        console.log('[Backend] 使用 Python 腳本後端');
        console.log('[Backend] Python executable:', pythonExecutable);
    } else {
        const errorMsg = `找不到後端程序！\n\n檢查的路徑:\n- ${backendExe}\n- ${pythonScript}`;
        console.error(`[Backend] ${errorMsg}`);
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
    
    console.log('[Backend] Starting backend...');
    console.log('[Backend] Path:', backendPath);
    console.log('[Backend] Args:', backendArgs);
    console.log('[Backend] Working Dir:', workingDir);
    
    // 確保 sessions 和 data 目錄存在
    const sessionsDir = path.join(workingDir, 'sessions');
    const dataDir = path.join(workingDir, 'data');
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    pythonProcess = spawn(backendPath, backendArgs, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: !useExe,  // exe 不需要 shell
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    });
    
    // Buffer for incomplete lines (handles JSON split across multiple data events)
    let stdoutBuffer = '';
    
    // Handle stdout (events from Python)
    pythonProcess.stdout.on('data', (data) => {
        // Append new data to buffer
        stdoutBuffer += data.toString();
        
        // Process complete lines
        const lines = stdoutBuffer.split('\n');
        
        // Keep the last incomplete line in buffer (or empty if ends with newline)
        stdoutBuffer = lines.pop() || '';
        
        lines.filter(line => line.trim()).forEach(line => {
            try {
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
    
    // Handle stderr (errors from Python)
    pythonProcess.stderr.on('data', (data) => {
        console.error('[Backend] Error:', data.toString());
    });
    
    // Handle process exit
    pythonProcess.on('exit', (code) => {
        console.log(`[Backend] Python process exited with code ${code}`);
        pythonProcess = null;
        
        // Restart if not intentionally closed and not shutting down
        if (!isShuttingDown && code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
            console.log('[Backend] Restarting Python backend...');
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
        const result = pythonProcess.stdin.write(message, (error) => {
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
    // Group Message Commands
    'send-group-message', 'schedule-message',
    // Resource Commands
    'clear-all-resources', 'verify-resource-type',
    // TData Import Commands
    'scan-tdata', 'import-tdata-account', 'import-tdata-batch', 'get-default-tdata-path',
    // Orphan Session Recovery Commands
    'scan-orphan-sessions', 'recover-orphan-sessions',
    // Lead Management Commands
    'delete-lead', 'batch-delete-leads', 'get-detailed-funnel-stats',
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
    'create-group'
];

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


// This will be used in the next step to create a dummy preload file
// to avoid an error on startup.
const preloadContent = `
// This file is intentionally left blank for now.
// In a production app, it would be used to securely expose
// specific 'ipcRenderer' functions to the frontend,
// rather than enabling full nodeIntegration.
`;
fs.writeFileSync(path.join(__dirname, 'preload.js'), preloadContent);
