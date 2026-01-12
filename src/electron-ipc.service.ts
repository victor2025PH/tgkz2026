import { Injectable, NgZone } from '@angular/core';

// Define a minimal interface for the Electron IpcRenderer to satisfy TypeScript.
// In a real Electron app, more specific types might be available.
interface IpcRenderer {
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  removeAllListeners: (channel: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ElectronIpcService {
  private ipcRenderer?: IpcRenderer;

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
    this.ipcRenderer.send(channel, ...args);
  }

  /**
   * Listens for messages from the Electron main process on a specified channel.
   * Runs the listener inside Angular's zone to ensure change detection is triggered.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   */
  on(channel: string, listener: (...args: any[]) => void): void {
    if (!this.ipcRenderer) {
      return;
    }
    // Wrap the listener in NgZone.run to ensure that Angular's change detection
    // runs in response to events from the Electron main process.
    this.ipcRenderer.on(channel, (event, ...args) => {
      this.ngZone.run(() => {
        listener(...args);
      });
    });
  }
  
  /**
   * Listens for a single message from the Electron main process on a specified channel.
   * Uses a flag to ensure the listener only fires once.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   */
  once(channel: string, listener: (...args: any[]) => void): void {
    if (!this.ipcRenderer) {
      // In browser mode, simulate timeout
      return;
    }
    let fired = false;
    this.ipcRenderer.on(channel, (event, ...args) => {
      if (fired) return;
      fired = true;
      this.ngZone.run(() => {
        listener(...args);
      });
    });
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
   * Removes all listeners from a specified channel to prevent memory leaks.
   * @param channel The channel to clean up listeners for.
   */
  cleanup(channel: string): void {
    if (!this.ipcRenderer) {
      return;
    }
    this.ipcRenderer.removeAllListeners(channel);
  }
}
