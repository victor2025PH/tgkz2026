import { Injectable, inject } from '@angular/core';
import { TelegramAccount, CapturedLead } from './models';
import { ElectronIpcService } from './electron-ipc.service';

// The XLSX library is no longer needed in the frontend as parsing is now a backend responsibility.
// declare const XLSX: any;

@Injectable()
export class AccountLoaderService {
  private ipcService = inject(ElectronIpcService);

  // All methods now delegate to the backend via IPC.

  /**
   * Asks the main process to trigger a download of the Excel template file.
   */
  downloadExcelTemplate(): void {
    this.ipcService.send('download-excel-template');
  }

  /**
   * Asks the main process to open a file dialog and load accounts from the selected Excel file.
   * The backend will handle file reading and parsing.
   * The frontend will receive an `accounts-updated` event upon completion.
   */
  loadAccountsFromExcel(): void {
    this.ipcService.send('load-accounts-from-excel');
  }
  
  /**
   * Asks the main process to reload accounts by merging data from the database/excel with
   * session files found on the local disk.
   */
  reloadSessionsAndAccounts(): void {
      this.ipcService.send('reload-sessions-and-accounts');
  }

  /**
   * Asks the main process to open a "save" dialog and export the provided leads to an Excel file.
   * @param leads The list of captured leads to export.
   */
  exportLeadsToExcel(leads: CapturedLead[]): void {
    // We send a copy of the data to the main process for export.
    this.ipcService.send('export-leads-to-excel', JSON.parse(JSON.stringify(leads)));
  }
}
