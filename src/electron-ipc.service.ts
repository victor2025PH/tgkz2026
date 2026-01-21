import { Injectable, NgZone, OnDestroy } from '@angular/core';

// Define a minimal interface for the Electron IpcRenderer to satisfy TypeScript.
interface IpcRenderer {
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  removeAllListeners: (channel: string) => void;
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
}

// 監聽器信息
interface ListenerInfo {
  channel: string;
  originalListener: (...args: any[]) => void;
  wrappedListener: (event: any, ...args: any[]) => void;
}

// 取消訂閱函數類型
export type Unsubscribe = () => void;

@Injectable({
  providedIn: 'root'
})
export class ElectronIpcService implements OnDestroy {
  private ipcRenderer?: IpcRenderer;
  
  // 追蹤所有監聽器
  private listeners: ListenerInfo[] = [];
  
  // 頻道到監聽器的映射
  private channelListeners = new Map<string, ListenerInfo[]>();

  constructor(private ngZone: NgZone) {
    // Check if the app is running in Electron by looking for the 'require' function.
    if ((window as any).require) {
      try {
        const electron = (window as any).require('electron');
        if (electron && electron.ipcRenderer) {
          this.ipcRenderer = electron.ipcRenderer;
          console.log('Electron IPC renderer successfully loaded.');
        } else {
           console.warn('Electron IPC renderer not found, running in browser mode.');
        }
      } catch (e) {
        console.error('Could not load Electron IPC renderer:', e);
      }
    } else {
      console.warn('Electron IPC not available, running in browser mode.');
    }
  }
  
  ngOnDestroy(): void {
    // 清理所有監聽器
    this.cleanupAll();
  }

  /**
   * Sends a message to the Electron main process over a specified channel.
   * @param channel The channel to send the message on.
   * @param args The data to send.
   */
  send(channel: string, ...args: any[]): void {
    if (!this.ipcRenderer) {
      console.log(`[Browser Mode] IPC Send to '${channel}':`, ...args);
      return;
    }
    console.log(`[IPC Service] → Sending '${channel}':`, args);
    this.ipcRenderer.send(channel, ...args);
  }

  /**
   * Listens for messages from the Electron main process on a specified channel.
   * Returns an unsubscribe function to remove the listener.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   * @returns Unsubscribe function
   */
  on(channel: string, listener: (...args: any[]) => void): Unsubscribe {
    if (!this.ipcRenderer) {
      // 瀏覽器模式返回空的取消訂閱函數
      return () => {};
    }
    
    // 包裝監聽器以在 Angular Zone 中運行
    const wrappedListener = (event: any, ...args: any[]) => {
      this.ngZone.run(() => {
        listener(...args);
      });
    };
    
    // 記錄監聽器信息
    const listenerInfo: ListenerInfo = {
      channel,
      originalListener: listener,
      wrappedListener
    };
    
    this.listeners.push(listenerInfo);
    
    // 更新頻道映射
    const channelList = this.channelListeners.get(channel) || [];
    channelList.push(listenerInfo);
    this.channelListeners.set(channel, channelList);
    
    // 添加監聽器
    this.ipcRenderer.on(channel, wrappedListener);
    
    // 返回取消訂閱函數
    return () => {
      this.removeListener(channel, listener);
    };
  }
  
  /**
   * Listens for a single message from the Electron main process on a specified channel.
   * Automatically removes the listener after first invocation.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   * @returns Unsubscribe function
   */
  once(channel: string, listener: (...args: any[]) => void): Unsubscribe {
    if (!this.ipcRenderer) {
      return () => {};
    }
    
    let fired = false;
    
    const wrappedListener = (event: any, ...args: any[]) => {
      if (fired) return;
      fired = true;
      
      // 自動移除監聽器
      this.removeListenerByWrapped(channel, wrappedListener);
      
      this.ngZone.run(() => {
        listener(...args);
      });
    };
    
    // 記錄監聽器信息
    const listenerInfo: ListenerInfo = {
      channel,
      originalListener: listener,
      wrappedListener
    };
    
    this.listeners.push(listenerInfo);
    
    const channelList = this.channelListeners.get(channel) || [];
    channelList.push(listenerInfo);
    this.channelListeners.set(channel, channelList);
    
    this.ipcRenderer.on(channel, wrappedListener);
    
    return () => {
      if (!fired) {
        this.removeListenerByWrapped(channel, wrappedListener);
      }
    };
  }

  /**
   * Invokes a method on the Electron main process and returns a promise.
   * @param channel The channel to invoke on.
   * @param args The data to send.
   */
  invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.ipcRenderer) {
      console.log(`[Browser Mode] IPC Invoke to '${channel}':`, ...args);
      return Promise.resolve(null);
    }
    return this.ipcRenderer.invoke(channel, ...args);
  }
  
  /**
   * 移除特定監聽器
   */
  removeListener(channel: string, listener: (...args: any[]) => void): void {
    if (!this.ipcRenderer) return;
    
    const channelList = this.channelListeners.get(channel);
    if (!channelList) return;
    
    const index = channelList.findIndex(info => info.originalListener === listener);
    if (index !== -1) {
      const info = channelList[index];
      this.ipcRenderer.removeListener(channel, info.wrappedListener);
      channelList.splice(index, 1);
      
      // 從全局列表移除
      const globalIndex = this.listeners.findIndex(l => l === info);
      if (globalIndex !== -1) {
        this.listeners.splice(globalIndex, 1);
      }
    }
  }
  
  /**
   * 通過包裝後的監聽器移除
   */
  private removeListenerByWrapped(channel: string, wrappedListener: (event: any, ...args: any[]) => void): void {
    if (!this.ipcRenderer) return;
    
    this.ipcRenderer.removeListener(channel, wrappedListener);
    
    const channelList = this.channelListeners.get(channel);
    if (channelList) {
      const index = channelList.findIndex(info => info.wrappedListener === wrappedListener);
      if (index !== -1) {
        const info = channelList[index];
        channelList.splice(index, 1);
        
        const globalIndex = this.listeners.findIndex(l => l === info);
        if (globalIndex !== -1) {
          this.listeners.splice(globalIndex, 1);
        }
      }
    }
  }

  /**
   * Removes all listeners from a specified channel to prevent memory leaks.
   * @param channel The channel to clean up listeners for.
   */
  cleanup(channel: string): void {
    if (!this.ipcRenderer) return;
    
    this.ipcRenderer.removeAllListeners(channel);
    
    // 清理追蹤列表
    const channelList = this.channelListeners.get(channel);
    if (channelList) {
      channelList.forEach(info => {
        const index = this.listeners.findIndex(l => l === info);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      });
      this.channelListeners.delete(channel);
    }
  }
  
  /**
   * 清理所有監聽器
   */
  cleanupAll(): void {
    if (!this.ipcRenderer) return;
    
    // 移除所有追蹤的監聯器
    const channels = new Set(this.listeners.map(l => l.channel));
    channels.forEach(channel => {
      this.ipcRenderer!.removeAllListeners(channel);
    });
    
    this.listeners = [];
    this.channelListeners.clear();
    
    console.log('[IPC] All listeners cleaned up');
  }

  /**
   * Alias for cleanup - removes all listeners from a channel.
   * @param channel The channel to clean up listeners for.
   * @param _listener Ignored - provided for API compatibility
   */
  off(channel: string, _listener?: (...args: any[]) => void): void {
    this.cleanup(channel);
  }
  
  /**
   * 獲取當前監聽器數量（用於調試）
   */
  getListenerCount(channel?: string): number {
    if (channel) {
      return this.channelListeners.get(channel)?.length || 0;
    }
    return this.listeners.length;
  }
  
  /**
   * 獲取所有活躍的頻道
   */
  getActiveChannels(): string[] {
    return Array.from(this.channelListeners.keys());
  }

  /**
   * 選擇文件附件（使用原生文件對話框）
   * 返回文件路徑而非 base64，支持大文件上傳
   * @param type 'image' 或 'file'
   * @param multiple 是否允許多選
   */
  async selectFileForAttachment(type: 'image' | 'file', multiple: boolean = false): Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: 'image' | 'file';
    files?: Array<{
      filePath: string;
      fileName: string;
      fileSize: number;
      fileType: 'image' | 'file';
    }>;
  }> {
    if (!this.ipcRenderer) {
      console.warn('[Browser Mode] selectFileForAttachment not available');
      return { success: false, canceled: true };
    }
    return this.invoke('select-file-for-attachment', { type, multiple });
  }
}
