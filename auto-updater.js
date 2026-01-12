/**
 * Auto Updater Module for Electron
 * Handles automatic application updates using electron-updater
 * 
 * Note: electron-updater needs to be installed: npm install electron-updater
 */

const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');

class AutoUpdaterModule {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.autoUpdater = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    
    // Only initialize if electron-updater is available
    this.initialize();
  }
  
  /**
   * Initialize the auto updater
   */
  initialize() {
    try {
      // Try to load electron-updater
      const { autoUpdater } = require('electron-updater');
      this.autoUpdater = autoUpdater;
      
      // Configure auto updater
      this.autoUpdater.autoDownload = false; // Don't auto-download, let user choose
      this.autoUpdater.autoInstallOnAppQuit = true;
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Set up IPC handlers
      this.setupIpcHandlers();
      
      console.log('[AutoUpdater] Initialized successfully');
      
      // Check for updates on startup (after a delay)
      setTimeout(() => {
        this.checkForUpdates();
      }, 10000); // 10 seconds after startup
      
    } catch (e) {
      console.log('[AutoUpdater] electron-updater not available:', e.message);
      console.log('[AutoUpdater] Auto-update feature disabled');
      
      // Set up IPC handlers that return "not available"
      this.setupFallbackIpcHandlers();
    }
  }
  
  /**
   * Set up auto updater event handlers
   */
  setupEventHandlers() {
    if (!this.autoUpdater) return;
    
    this.autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      this.sendToRenderer('checking-for-update', {});
    });
    
    this.autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.updateAvailable = true;
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    });
    
    this.autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] No update available. Current version:', info.version);
      this.sendToRenderer('update-not-available', {
        version: info.version
      });
    });
    
    this.autoUpdater.on('download-progress', (progress) => {
      console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(2)}%`);
      this.sendToRenderer('download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      });
    });
    
    this.autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.updateDownloaded = true;
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    });
    
    this.autoUpdater.on('error', (error) => {
      console.error('[AutoUpdater] Error:', error.message);
      this.sendToRenderer('error', {
        message: error.message
      });
    });
  }
  
  /**
   * Set up IPC handlers for renderer process
   */
  setupIpcHandlers() {
    // Check for updates
    ipcMain.handle('check-for-updates', async () => {
      return await this.checkForUpdates();
    });
    
    // Download update
    ipcMain.handle('download-update', async () => {
      return await this.downloadUpdate();
    });
    
    // Install update (quit and install)
    ipcMain.handle('install-update', async () => {
      return await this.installUpdate();
    });
    
    // Get app version
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });
    
    // Get update status
    ipcMain.handle('get-update-status', () => {
      return {
        available: this.updateAvailable,
        downloaded: this.updateDownloaded
      };
    });
  }
  
  /**
   * Set up fallback IPC handlers when auto-updater is not available
   */
  setupFallbackIpcHandlers() {
    ipcMain.handle('check-for-updates', async () => {
      return { available: false, message: '自動更新功能未啟用' };
    });
    
    ipcMain.handle('download-update', async () => {
      return { success: false, message: '自動更新功能未啟用' };
    });
    
    ipcMain.handle('install-update', async () => {
      return { success: false, message: '自動更新功能未啟用' };
    });
    
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });
    
    ipcMain.handle('get-update-status', () => {
      return { available: false, downloaded: false };
    });
  }
  
  /**
   * Check for updates
   */
  async checkForUpdates() {
    if (!this.autoUpdater) {
      return { available: false, message: '自動更新功能未啟用' };
    }
    
    try {
      const result = await this.autoUpdater.checkForUpdates();
      return {
        available: result && result.updateInfo,
        version: result?.updateInfo?.version
      };
    } catch (e) {
      console.error('[AutoUpdater] Check failed:', e.message);
      return { available: false, error: e.message };
    }
  }
  
  /**
   * Download available update
   */
  async downloadUpdate() {
    if (!this.autoUpdater || !this.updateAvailable) {
      return { success: false, message: '沒有可用的更新' };
    }
    
    try {
      await this.autoUpdater.downloadUpdate();
      return { success: true };
    } catch (e) {
      console.error('[AutoUpdater] Download failed:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Install downloaded update and restart
   */
  async installUpdate() {
    if (!this.autoUpdater || !this.updateDownloaded) {
      return { success: false, message: '沒有已下載的更新' };
    }
    
    try {
      this.autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (e) {
      console.error('[AutoUpdater] Install failed:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Send message to renderer process
   */
  sendToRenderer(event, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', event, data);
    }
  }
  
  /**
   * Update the main window reference
   */
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }
}

module.exports = AutoUpdaterModule;
