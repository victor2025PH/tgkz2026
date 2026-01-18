/**
 * 觸發動作日誌組件
 * 記錄和顯示關鍵詞觸發 → 動作執行的完整流程
 */
import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../../electron-ipc.service';
import { I18nService } from '../../i18n.service';

interface TriggerActionLog {
  id: string;
  timestamp: Date;
  type: 'keyword_match' | 'lead_captured' | 'ai_greeting' | 'campaign_triggered' | 'message_sent' | 'message_failed' | 'error';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: {
    userId?: string;
    username?: string;
    keyword?: string;
    groupName?: string;
    campaignName?: string;
    templateName?: string;
    senderAccount?: string;
    error?: string;
  };
}

@Component({
  selector: 'app-trigger-action-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/50 border border-cyan-500/20 rounded-xl overflow-hidden">
      <!-- 標題欄 -->
      <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-3 border-b border-purple-500/20 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-xl">📋</span>
          <h3 class="font-bold text-white">{{ t('triggerActionLog') }}</h3>
          <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
            {{ logs().length }} 條
          </span>
        </div>
        <div class="flex items-center gap-2">
          <!-- 過濾器 -->
          <select [(ngModel)]="filterType" 
                  (change)="applyFilter()"
                  class="text-xs bg-slate-800/50 border border-slate-600/50 text-slate-300 rounded-lg px-2 py-1">
            <option value="all">全部類型</option>
            <option value="keyword_match">關鍵詞匹配</option>
            <option value="lead_captured">客戶捕獲</option>
            <option value="ai_greeting">AI 問候</option>
            <option value="campaign_triggered">活動觸發</option>
            <option value="message_sent">消息發送</option>
            <option value="error">錯誤</option>
          </select>
          <button (click)="clearLogs()" 
                  class="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors">
            🗑 清空
          </button>
        </div>
      </div>

      <!-- 日誌列表 -->
      <div class="max-h-[400px] overflow-y-auto divide-y divide-slate-700/30">
        @for(log of filteredLogs(); track log.id) {
          <div class="px-4 py-3 hover:bg-slate-800/30 transition-colors">
            <div class="flex items-start gap-3">
              <!-- 類型圖標 -->
              <div class="flex-shrink-0 mt-0.5">
                <span [class]="getTypeIconClass(log.type)">{{ getTypeIcon(log.type) }}</span>
              </div>
              
              <!-- 內容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-mono" [class]="getLevelColor(log.level)">
                    {{ formatTime(log.timestamp) }}
                  </span>
                  <span class="text-xs px-1.5 py-0.5 rounded" [class]="getTypeClass(log.type)">
                    {{ getTypeName(log.type) }}
                  </span>
                </div>
                <p class="text-sm text-white">{{ log.message }}</p>
                
                <!-- 詳情標籤 -->
                @if(log.details) {
                  <div class="flex flex-wrap gap-2 mt-2">
                    @if(log.details.username) {
                      <span class="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                        👤 @{{ log.details.username }}
                      </span>
                    }
                    @if(log.details.keyword) {
                      <span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        🔑 {{ log.details.keyword }}
                      </span>
                    }
                    @if(log.details.groupName) {
                      <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                        📍 {{ log.details.groupName | slice:0:20 }}
                      </span>
                    }
                    @if(log.details.campaignName) {
                      <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        📣 {{ log.details.campaignName }}
                      </span>
                    }
                    @if(log.details.senderAccount) {
                      <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                        📤 {{ log.details.senderAccount }}
                      </span>
                    }
                    @if(log.details.error) {
                      <span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                        ⚠️ {{ log.details.error | slice:0:50 }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="p-8 text-center text-slate-500">
            <div class="text-4xl mb-2">📭</div>
            <p>暫無觸發日誌</p>
            <p class="text-xs mt-1">當關鍵詞被觸發時，日誌將顯示在這裡</p>
          </div>
        }
      </div>

      <!-- 統計摘要 -->
      <div class="bg-slate-800/30 px-4 py-3 border-t border-slate-700/50">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-4">
            <span class="text-slate-400">關鍵詞匹配: <span class="text-cyan-400 font-bold">{{ countByType('keyword_match') }}</span></span>
            <span class="text-slate-400">客戶捕獲: <span class="text-green-400 font-bold">{{ countByType('lead_captured') }}</span></span>
            <span class="text-slate-400">消息發送: <span class="text-blue-400 font-bold">{{ countByType('message_sent') }}</span></span>
            <span class="text-slate-400">錯誤: <span class="text-red-400 font-bold">{{ countByType('error') }}</span></span>
          </div>
          <span class="text-slate-500">最近 {{ logs().length }} 條記錄</span>
        </div>
      </div>
    </div>
  `
})
export class TriggerActionLogComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private i18n = inject(I18nService);
  
  // 狀態
  logs = signal<TriggerActionLog[]>([]);
  filterType = 'all';
  
  // 計算屬性
  filteredLogs = computed(() => {
    const type = this.filterType;
    if (type === 'all') return this.logs();
    return this.logs().filter(log => log.type === type);
  });
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    // 監聽各種觸發事件並記錄日誌
    this.ipcService.on('log', (data: any) => {
      // 解析日誌消息，識別觸發動作相關的日誌
      const message = data.message || data;
      const type = data.type || 'info';
      
      // 識別不同類型的日誌
      const triggerLog = this.parseLogMessage(message, type);
      if (triggerLog) {
        this.addLog(triggerLog);
      }
    });
    
    // 監聽 lead-captured 事件
    this.ipcService.on('lead-captured', (data: any) => {
      this.addLog({
        id: `lead-${Date.now()}`,
        timestamp: new Date(),
        type: 'lead_captured',
        level: 'success',
        message: `捕獲新客戶: @${data.username || data.firstName || data.userId}`,
        details: {
          userId: data.userId,
          username: data.username,
          keyword: data.triggeredKeyword,
          groupName: data.sourceGroup
        }
      });
    });
    
    // 監聯 message-sent 事件
    this.ipcService.on('message-sent', (data: any) => {
      this.addLog({
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        type: 'message_sent',
        level: 'success',
        message: `消息已發送給 @${data.username || data.userId}`,
        details: {
          userId: data.userId,
          username: data.username,
          senderAccount: data.senderPhone
        }
      });
    });
    
    // 監聽 message-failed 事件
    this.ipcService.on('message-failed', (data: any) => {
      this.addLog({
        id: `fail-${Date.now()}`,
        timestamp: new Date(),
        type: 'message_failed',
        level: 'error',
        message: `消息發送失敗: @${data.username || data.userId}`,
        details: {
          userId: data.userId,
          username: data.username,
          error: data.error
        }
      });
    });
  }
  
  ngOnDestroy() {
    // 清理監聽器
  }
  
  parseLogMessage(message: string, type: string): TriggerActionLog | null {
    // 解析特定的日誌消息格式
    if (message.includes('關鍵詞匹配') || message.includes('Keyword matched') || message.includes('🔑')) {
      return {
        id: `kw-${Date.now()}`,
        timestamp: new Date(),
        type: 'keyword_match',
        level: 'info',
        message: message,
        details: this.extractDetails(message)
      };
    }
    
    if (message.includes('AI 問候') || message.includes('自動問候') || message.includes('[AI]')) {
      return {
        id: `ai-${Date.now()}`,
        timestamp: new Date(),
        type: 'ai_greeting',
        level: 'info',
        message: message,
        details: this.extractDetails(message)
      };
    }
    
    if (message.includes('活動匹配') || message.includes('Campaign matched') || message.includes('✓✓✓')) {
      return {
        id: `camp-${Date.now()}`,
        timestamp: new Date(),
        type: 'campaign_triggered',
        level: 'success',
        message: message,
        details: this.extractDetails(message)
      };
    }
    
    if (type === 'error' || message.includes('Error') || message.includes('錯誤')) {
      return {
        id: `err-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        level: 'error',
        message: message,
        details: { error: message }
      };
    }
    
    return null;
  }
  
  extractDetails(message: string): TriggerActionLog['details'] {
    const details: TriggerActionLog['details'] = {};
    
    // 提取 @username
    const usernameMatch = message.match(/@(\w+)/);
    if (usernameMatch) {
      details.username = usernameMatch[1];
    }
    
    // 提取關鍵詞
    const keywordMatch = message.match(/關鍵詞[：:]\s*([^\s,，]+)/);
    if (keywordMatch) {
      details.keyword = keywordMatch[1];
    }
    
    // 提取群組名
    const groupMatch = message.match(/群組[：:]\s*([^\s,，]+)/);
    if (groupMatch) {
      details.groupName = groupMatch[1];
    }
    
    return details;
  }
  
  addLog(log: TriggerActionLog) {
    this.logs.update(logs => [log, ...logs].slice(0, 200)); // 保留最近200條
  }
  
  clearLogs() {
    if (confirm('確定要清空所有觸發日誌嗎？')) {
      this.logs.set([]);
    }
  }
  
  applyFilter() {
    // 過濾器變更時觸發
  }
  
  countByType(type: string): number {
    return this.logs().filter(log => log.type === type).length;
  }
  
  formatTime(date: Date): string {
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  
  getTypeIcon(type: string): string {
    switch (type) {
      case 'keyword_match': return '🔑';
      case 'lead_captured': return '👤';
      case 'ai_greeting': return '🤖';
      case 'campaign_triggered': return '📣';
      case 'message_sent': return '✅';
      case 'message_failed': return '❌';
      case 'error': return '⚠️';
      default: return '📝';
    }
  }
  
  getTypeIconClass(type: string): string {
    switch (type) {
      case 'keyword_match': return 'text-yellow-400';
      case 'lead_captured': return 'text-cyan-400';
      case 'ai_greeting': return 'text-purple-400';
      case 'campaign_triggered': return 'text-green-400';
      case 'message_sent': return 'text-blue-400';
      case 'message_failed': return 'text-red-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  }
  
  getTypeClass(type: string): string {
    switch (type) {
      case 'keyword_match': return 'bg-yellow-500/20 text-yellow-400';
      case 'lead_captured': return 'bg-cyan-500/20 text-cyan-400';
      case 'ai_greeting': return 'bg-purple-500/20 text-purple-400';
      case 'campaign_triggered': return 'bg-green-500/20 text-green-400';
      case 'message_sent': return 'bg-blue-500/20 text-blue-400';
      case 'message_failed': return 'bg-red-500/20 text-red-400';
      case 'error': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  }
  
  getTypeName(type: string): string {
    switch (type) {
      case 'keyword_match': return '關鍵詞匹配';
      case 'lead_captured': return '客戶捕獲';
      case 'ai_greeting': return 'AI 問候';
      case 'campaign_triggered': return '活動觸發';
      case 'message_sent': return '消息發送';
      case 'message_failed': return '發送失敗';
      case 'error': return '錯誤';
      default: return '未知';
    }
  }
  
  getLevelColor(level: string): string {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  }
}
