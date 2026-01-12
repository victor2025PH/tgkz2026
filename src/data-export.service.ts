/**
 * Data Export/Import Service
 * Provides enhanced data export and import functionality
 */
import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  filename?: string;
  includeTimestamp?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DataExportService {
  private toastService = inject(ToastService);
  
  /**
   * Export data to JSON file
   */
  exportToJson(data: any, filename: string = 'export'): void {
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadFile(jsonString, `${filename}.json`, 'application/json');
  }
  
  /**
   * Export data to CSV file
   */
  exportToCsv(data: any[], filename: string = 'export', headers?: string[]): void {
    if (!data || data.length === 0) {
      this.toastService.warning('沒有數據可導出');
      return;
    }
    
    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Build CSV content
    const csvRows: string[] = [];
    
    // Add header row
    csvRows.push(csvHeaders.map(h => this.escapeCsvValue(h)).join(','));
    
    // Add data rows
    for (const item of data) {
      const row = csvHeaders.map(header => {
        const value = item[header];
        return this.escapeCsvValue(this.formatCsvValue(value));
      });
      csvRows.push(row.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    // Add BOM for Excel compatibility with Chinese characters
    const bom = '\uFEFF';
    this.downloadFile(bom + csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
  }
  
  /**
   * Export accounts data
   */
  exportAccounts(accounts: any[]): void {
    const exportData = accounts.map(acc => ({
      phone: acc.phone,
      status: acc.status,
      role: acc.role,
      group: acc.group || '',
      dailySendLimit: acc.dailySendLimit || 50,
      healthScore: acc.healthScore || 100,
      lastActivity: acc.lastActivity || '',
      tags: (acc.tags || []).join(';'),
      notes: acc.notes || ''
    }));
    
    this.exportToCsv(exportData, `tg-matrix-accounts-${this.getTimestamp()}`);
    this.toastService.success(`已導出 ${accounts.length} 個賬戶`);
  }
  
  /**
   * Export leads/contacts data
   */
  exportLeads(leads: any[]): void {
    const exportData = leads.map(lead => ({
      username: lead.username || '',
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      phone: lead.phone || '',
      source: lead.source || '',
      sourceGroup: lead.sourceGroup || '',
      funnelStage: lead.funnelStage || '',
      score: lead.score || 0,
      tags: (lead.tags || []).join(';'),
      firstContact: lead.firstContact || '',
      lastContact: lead.lastContact || '',
      messageCount: lead.messageCount || 0,
      notes: lead.notes || ''
    }));
    
    this.exportToCsv(exportData, `tg-matrix-leads-${this.getTimestamp()}`);
    this.toastService.success(`已導出 ${leads.length} 個潛在客戶`);
  }
  
  /**
   * Export keyword sets
   */
  exportKeywordSets(keywordSets: any[]): void {
    const exportData: any[] = [];
    
    for (const set of keywordSets) {
      for (const keyword of (set.keywords || [])) {
        exportData.push({
          setName: set.name,
          keyword: keyword.keyword,
          isRegex: keyword.isRegex ? 'Yes' : 'No',
          priority: keyword.priority || 0
        });
      }
    }
    
    if (exportData.length === 0) {
      // Export empty sets
      for (const set of keywordSets) {
        exportData.push({
          setName: set.name,
          keyword: '',
          isRegex: 'No',
          priority: 0
        });
      }
    }
    
    this.exportToCsv(exportData, `tg-matrix-keywords-${this.getTimestamp()}`);
    this.toastService.success(`已導出 ${keywordSets.length} 個關鍵詞集`);
  }
  
  /**
   * Export monitored groups
   */
  exportGroups(groups: any[]): void {
    const exportData = groups.map(group => ({
      name: group.name || '',
      url: group.url || '',
      type: group.type || '',
      memberCount: group.memberCount || 0,
      keywordSetName: group.keywordSetName || '',
      isActive: group.isActive ? 'Yes' : 'No',
      joinedAt: group.joinedAt || '',
      lastActivity: group.lastActivity || ''
    }));
    
    this.exportToCsv(exportData, `tg-matrix-groups-${this.getTimestamp()}`);
    this.toastService.success(`已導出 ${groups.length} 個群組`);
  }
  
  /**
   * Export templates
   */
  exportTemplates(templates: any[]): void {
    const exportData = templates.map(tpl => ({
      name: tpl.name,
      prompt: tpl.prompt?.replace(/\n/g, '\\n') || '',
      category: tpl.category || 'general',
      isActive: tpl.isActive ? 'Yes' : 'No'
    }));
    
    this.exportToCsv(exportData, `tg-matrix-templates-${this.getTimestamp()}`);
    this.toastService.success(`已導出 ${templates.length} 個模板`);
  }
  
  /**
   * Export campaigns
   */
  exportCampaigns(campaigns: any[]): void {
    const exportData = campaigns.map(c => ({
      name: c.name,
      status: c.status,
      templateName: c.templateName || '',
      keywordSetName: c.keywordSetName || '',
      minDelay: c.actionMinDelaySeconds || 30,
      maxDelay: c.actionMaxDelaySeconds || 120,
      createdAt: c.createdAt || ''
    }));
    
    this.exportToCsv(exportData, `tg-matrix-campaigns-${this.getTimestamp()}`);
    this.toastService.success(`已導出 ${campaigns.length} 個活動`);
  }
  
  /**
   * Export all data as a backup
   */
  exportFullBackup(data: {
    accounts?: any[];
    leads?: any[];
    keywordSets?: any[];
    groups?: any[];
    templates?: any[];
    campaigns?: any[];
    settings?: any;
  }): void {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      data: data
    };
    
    this.exportToJson(backup, `tg-matrix-backup-${this.getTimestamp()}`);
    this.toastService.success('完整備份已導出');
  }
  
  /**
   * Import data from JSON file
   */
  async importFromJson(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error('無法解析 JSON 文件'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('無法讀取文件'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }
  
  /**
   * Import data from CSV file
   */
  async importFromCsv(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV 文件格式不正確（需要標題行和數據行）'));
            return;
          }
          
          const headers = this.parseCsvLine(lines[0]);
          const data: any[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            if (values.length === headers.length) {
              const row: any = {};
              for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j];
              }
              data.push(row);
            }
          }
          
          resolve(data);
        } catch (error) {
          reject(new Error('無法解析 CSV 文件'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('無法讀取文件'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }
  
  /**
   * Parse a CSV line handling quoted values
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  /**
   * Download file helper
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * Escape CSV value
   */
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // If value contains comma, newline, or quote, wrap in quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
  
  /**
   * Format value for CSV
   */
  private formatCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (Array.isArray(value)) {
        return value.join(';');
      }
      return JSON.stringify(value);
    }
    
    return String(value);
  }
  
  /**
   * Get timestamp string for filenames
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }
}
