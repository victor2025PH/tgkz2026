/**
 * TG-AI智控王 數據導出服務
 * Data Exporter v1.0
 * 
 * 功能：
 * - 導出為 Excel/CSV/JSON/TXT
 * - 自定義導出字段
 * - 批量導出
 * - 導出歷史管理
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  MemberBasicInfo, 
  GroupBasicInfo,
  ExportConfig, 
  ExportFormat, 
  ExportResult 
} from '../search.types';

// 導出字段配置
const EXPORT_FIELDS: Record<keyof MemberBasicInfo, { label: string; getter: (m: MemberBasicInfo) => string }> = {
  id: { label: 'ID', getter: m => m.id },
  firstName: { label: '名字', getter: m => m.firstName || '' },
  lastName: { label: '姓氏', getter: m => m.lastName || '' },
  username: { label: '用戶名', getter: m => m.username ? `@${m.username}` : '' },
  phone: { label: '電話', getter: m => m.phone || '' },
  status: { label: '在線狀態', getter: m => formatStatus(m.status) },
  role: { label: '角色', getter: m => formatRole(m.role) },
  isBot: { label: '是否機器人', getter: m => m.isBot ? '是' : '否' },
  isPremium: { label: 'Premium', getter: m => m.isPremium ? '是' : '否' },
  isVerified: { label: '已認證', getter: m => m.isVerified ? '是' : '否' },
  isScam: { label: '詐騙標記', getter: m => m.isScam ? '是' : '否' },
  isFake: { label: '假冒標記', getter: m => m.isFake ? '是' : '否' },
  bio: { label: '簡介', getter: m => m.bio || '' },
  joinedDate: { label: '加入時間', getter: m => m.joinedDate ? m.joinedDate.toLocaleDateString() : '' },
  photo: { label: '頭像', getter: m => m.photo?.smallUrl || '' },
  accessHash: { label: '訪問哈希', getter: m => m.accessHash || '' }
};

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    online: '在線',
    recently: '最近在線',
    lastWeek: '上週在線',
    lastMonth: '上月在線',
    longAgo: '很久未上線',
    unknown: '未知'
  };
  return map[status] || status;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    creator: '創建者',
    admin: '管理員',
    member: '成員',
    restricted: '受限',
    banned: '已封禁'
  };
  return map[role] || role;
}

// 導出歷史記錄
interface ExportHistoryItem {
  id: string;
  filename: string;
  format: ExportFormat;
  recordCount: number;
  fileSize: number;
  exportedAt: Date;
  groupTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataExporter {
  // 導出歷史
  private _exportHistory = signal<ExportHistoryItem[]>([]);
  exportHistory = computed(() => this._exportHistory());
  
  // 可用字段
  availableFields = Object.entries(EXPORT_FIELDS).map(([key, value]) => ({
    key: key as keyof MemberBasicInfo,
    label: value.label
  }));
  
  // 默認導出字段
  defaultFields: (keyof MemberBasicInfo)[] = [
    'id', 'username', 'firstName', 'lastName', 'phone', 'status', 'isBot', 'isPremium'
  ];
  
  constructor() {
    this.loadHistory();
  }
  
  // ============ 導出方法 ============
  
  /**
   * 導出成員數據
   */
  async exportMembers(
    members: MemberBasicInfo[],
    config: ExportConfig,
    groupInfo?: GroupBasicInfo
  ): Promise<ExportResult> {
    if (members.length === 0) {
      return { success: false, recordCount: 0, error: '沒有數據可導出' };
    }
    
    try {
      let content: string;
      let mimeType: string;
      let extension: string;
      
      switch (config.format) {
        case 'excel':
          content = this.toExcel(members, config);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;
        case 'csv':
          content = this.toCSV(members, config);
          mimeType = 'text/csv;charset=utf-8';
          extension = 'csv';
          break;
        case 'json':
          content = this.toJSON(members, config);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'txt':
          content = this.toTXT(members, config);
          mimeType = 'text/plain;charset=utf-8';
          extension = 'txt';
          break;
        default:
          return { success: false, recordCount: 0, error: '不支持的格式' };
      }
      
      // 生成文件名
      const filename = config.filename || this.generateFilename(groupInfo?.title, extension);
      
      // 下載文件
      if (config.format === 'excel') {
        // Excel 需要特殊處理（使用 Blob）
        await this.downloadExcel(members, config, filename);
      } else {
        this.downloadFile(content, filename, mimeType);
      }
      
      // 記錄歷史
      const historyItem: ExportHistoryItem = {
        id: `export_${Date.now()}`,
        filename,
        format: config.format,
        recordCount: members.length,
        fileSize: new Blob([content]).size,
        exportedAt: new Date(),
        groupTitle: groupInfo?.title
      };
      this.addToHistory(historyItem);
      
      return {
        success: true,
        filePath: filename,
        recordCount: members.length
      };
    } catch (error: any) {
      console.error('[Exporter] Export error:', error);
      return { success: false, recordCount: 0, error: error.message };
    }
  }
  
  /**
   * 快速導出 Excel
   */
  async quickExportExcel(
    members: MemberBasicInfo[],
    groupInfo?: GroupBasicInfo
  ): Promise<ExportResult> {
    return this.exportMembers(members, {
      format: 'excel',
      fields: this.defaultFields,
      includeHeaders: true
    }, groupInfo);
  }
  
  /**
   * 快速導出 CSV
   */
  async quickExportCSV(
    members: MemberBasicInfo[],
    groupInfo?: GroupBasicInfo
  ): Promise<ExportResult> {
    return this.exportMembers(members, {
      format: 'csv',
      fields: this.defaultFields,
      includeHeaders: true
    }, groupInfo);
  }
  
  // ============ 格式轉換 ============
  
  private toCSV(members: MemberBasicInfo[], config: ExportConfig): string {
    const lines: string[] = [];
    
    // 表頭
    if (config.includeHeaders) {
      const headers = config.fields.map(field => EXPORT_FIELDS[field]?.label || field);
      lines.push(headers.join(','));
    }
    
    // 數據行
    for (const member of members) {
      const values = config.fields.map(field => {
        const fieldConfig = EXPORT_FIELDS[field];
        const value = fieldConfig ? fieldConfig.getter(member) : String((member as any)[field] || '');
        // CSV 轉義
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      lines.push(values.join(','));
    }
    
    // 添加 BOM 以支持中文
    return '\ufeff' + lines.join('\n');
  }
  
  private toJSON(members: MemberBasicInfo[], config: ExportConfig): string {
    const data = members.map(member => {
      const obj: Record<string, any> = {};
      for (const field of config.fields) {
        const fieldConfig = EXPORT_FIELDS[field];
        obj[field] = fieldConfig ? fieldConfig.getter(member) : (member as any)[field];
      }
      return obj;
    });
    
    return JSON.stringify(data, null, 2);
  }
  
  private toTXT(members: MemberBasicInfo[], config: ExportConfig): string {
    const lines: string[] = [];
    
    // 表頭分隔線
    const headers = config.includeHeaders 
      ? config.fields.map(field => EXPORT_FIELDS[field]?.label || field)
      : [];
    
    if (config.includeHeaders) {
      lines.push(headers.join('\t'));
      lines.push('='.repeat(80));
    }
    
    // 數據行
    for (const member of members) {
      const values = config.fields.map(field => {
        const fieldConfig = EXPORT_FIELDS[field];
        return fieldConfig ? fieldConfig.getter(member) : String((member as any)[field] || '');
      });
      lines.push(values.join('\t'));
    }
    
    return lines.join('\n');
  }
  
  private toExcel(members: MemberBasicInfo[], config: ExportConfig): string {
    // 簡化版：生成 CSV 格式，由專門的方法處理 Excel
    return this.toCSV(members, config);
  }
  
  // ============ 下載 ============
  
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
  
  private async downloadExcel(
    members: MemberBasicInfo[],
    config: ExportConfig,
    filename: string
  ): Promise<void> {
    // 嘗試使用 xlsx 庫（如果可用）
    // 如果沒有 xlsx 庫，降級為 CSV
    try {
      if ((window as any).XLSX) {
        const XLSX = (window as any).XLSX;
        
        // 準備數據
        const headers = config.fields.map(field => EXPORT_FIELDS[field]?.label || field);
        const data = [
          config.includeHeaders ? headers : null,
          ...members.map(member => 
            config.fields.map(field => {
              const fieldConfig = EXPORT_FIELDS[field];
              return fieldConfig ? fieldConfig.getter(member) : (member as any)[field];
            })
          )
        ].filter(Boolean);
        
        // 創建工作簿
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '成員列表');
        
        // 下載
        XLSX.writeFile(wb, filename);
      } else {
        // 降級為 CSV
        console.warn('[Exporter] XLSX library not found, falling back to CSV');
        const csvContent = this.toCSV(members, config);
        this.downloadFile(csvContent, filename.replace('.xlsx', '.csv'), 'text/csv;charset=utf-8');
      }
    } catch (error) {
      console.error('[Exporter] Excel export error:', error);
      // 降級為 CSV
      const csvContent = this.toCSV(members, config);
      this.downloadFile(csvContent, filename.replace('.xlsx', '.csv'), 'text/csv;charset=utf-8');
    }
  }
  
  // ============ 文件名生成 ============
  
  private generateFilename(groupTitle?: string, extension: string = 'csv'): string {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const groupPart = groupTitle 
      ? `_${groupTitle.replace(/[^\w\u4e00-\u9fff]/g, '_').substring(0, 20)}`
      : '';
    
    return `TG_Members${groupPart}_${date}_${time}.${extension}`;
  }
  
  // ============ 歷史管理 ============
  
  private addToHistory(item: ExportHistoryItem): void {
    this._exportHistory.update(history => {
      const newHistory = [item, ...history].slice(0, 100);
      this.saveHistory(newHistory);
      return newHistory;
    });
  }
  
  clearHistory(): void {
    this._exportHistory.set([]);
    localStorage.removeItem('tgai-export-history');
  }
  
  private saveHistory(history: ExportHistoryItem[]): void {
    try {
      localStorage.setItem('tgai-export-history', JSON.stringify(history));
    } catch (e) {}
  }
  
  private loadHistory(): void {
    try {
      const data = localStorage.getItem('tgai-export-history');
      if (data) {
        const history = JSON.parse(data);
        this._exportHistory.set(history.map((h: any) => ({
          ...h,
          exportedAt: new Date(h.exportedAt)
        })));
      }
    } catch (e) {}
  }
  
  // ============ 統計 ============
  
  getExportStats(): {
    totalExports: number;
    totalRecords: number;
    byFormat: Record<ExportFormat, number>;
  } {
    const history = this._exportHistory();
    const byFormat: Record<ExportFormat, number> = {
      excel: 0,
      csv: 0,
      json: 0,
      txt: 0
    };
    
    let totalRecords = 0;
    
    for (const item of history) {
      totalRecords += item.recordCount;
      byFormat[item.format]++;
    }
    
    return {
      totalExports: history.length,
      totalRecords,
      byFormat
    };
  }
}
