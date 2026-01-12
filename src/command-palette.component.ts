/**
 * Command Palette Component
 * 快捷命令面板組件
 * 
 * 功能：
 * - 快速搜索命令
 * - 鍵盤導航
 * - 最近使用記錄
 * - 模糊搜索
 */
import { 
  Component, 
  inject, 
  signal, 
  computed, 
  OnInit, 
  OnDestroy,
  ElementRef,
  ViewChild,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ============ 類型定義 ============

export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  category: CommandCategory;
  keywords?: string[];
  shortcut?: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
  hidden?: boolean;
}

export type CommandCategory = 
  | 'navigation' 
  | 'action' 
  | 'account' 
  | 'lead' 
  | 'ai' 
  | 'settings' 
  | 'help';

const CATEGORY_INFO: Record<CommandCategory, { label: string; icon: string }> = {
  navigation: { label: '導航', icon: '🧭' },
  action: { label: '操作', icon: '⚡' },
  account: { label: '賬號', icon: '👤' },
  lead: { label: '客戶', icon: '🎯' },
  ai: { label: 'AI', icon: '🤖' },
  settings: { label: '設置', icon: '⚙️' },
  help: { label: '幫助', icon: '❓' }
};

// ============ 組件實現 ============

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if(isOpen()) {
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
           (click)="close()">
      </div>
      
      <!-- 命令面板 -->
      <div class="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[10000]">
        <div class="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          
          <!-- 搜索框 -->
          <div class="relative">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input #searchInput
                   type="text"
                   [(ngModel)]="searchQuery"
                   (input)="onSearch()"
                   (keydown)="onKeyDown($event)"
                   placeholder="輸入命令或搜索..."
                   class="w-full bg-transparent text-white text-lg px-12 py-5 border-b border-slate-700 focus:outline-none placeholder-slate-500">
            <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <kbd class="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded">ESC</kbd>
            </div>
          </div>
          
          <!-- 命令列表 -->
          <div class="max-h-[400px] overflow-y-auto py-2">
            @if(filteredCommands().length === 0) {
              <div class="px-4 py-8 text-center text-slate-400">
                <div class="text-4xl mb-2">🔍</div>
                <p>找不到匹配的命令</p>
              </div>
            } @else {
              @for(group of groupedCommands(); track group.category) {
                <div class="mb-2">
                  <div class="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                    {{ getCategoryInfo(group.category).icon }} {{ getCategoryInfo(group.category).label }}
                  </div>
                  @for(command of group.commands; track command.id; let i = $index) {
                    <button (click)="executeCommand(command)"
                            (mouseenter)="selectedIndex.set(getGlobalIndex(group.category, i))"
                            [class.bg-cyan-500/20]="isSelected(group.category, i)"
                            [disabled]="command.disabled"
                            class="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-left disabled:opacity-50">
                      <span class="text-2xl">{{ command.icon || '📌' }}</span>
                      <div class="flex-1 min-w-0">
                        <div class="text-white font-medium truncate">{{ command.title }}</div>
                        @if(command.description) {
                          <div class="text-sm text-slate-400 truncate">{{ command.description }}</div>
                        }
                      </div>
                      @if(command.shortcut) {
                        <kbd class="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded font-mono">
                          {{ command.shortcut }}
                        </kbd>
                      }
                    </button>
                  }
                </div>
              }
            }
          </div>
          
          <!-- 底部提示 -->
          <div class="px-4 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd>
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↓</kbd>
                導航
              </span>
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd>
                執行
              </span>
            </div>
            <span>{{ filteredCommands().length }} 個命令</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    kbd {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @Output() commandExecuted = new EventEmitter<Command>();
  
  // 狀態
  isOpen = signal(false);
  searchQuery = '';
  selectedIndex = signal(0);
  
  // 命令列表
  private _commands = signal<Command[]>([]);
  commands = this._commands.asReadonly();
  
  // 最近使用
  private _recentCommands = signal<string[]>([]);
  
  // 計算屬性
  filteredCommands = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    let commands = this._commands().filter(c => !c.hidden);
    
    if (!query) {
      // 顯示最近使用 + 所有命令
      const recent = this._recentCommands();
      const recentCmds = commands.filter(c => recent.includes(c.id));
      const otherCmds = commands.filter(c => !recent.includes(c.id));
      return [...recentCmds, ...otherCmds];
    }
    
    // 模糊搜索
    return commands.filter(c => {
      const titleMatch = c.title.toLowerCase().includes(query);
      const descMatch = c.description?.toLowerCase().includes(query);
      const keywordMatch = c.keywords?.some(k => k.toLowerCase().includes(query));
      const categoryMatch = CATEGORY_INFO[c.category].label.toLowerCase().includes(query);
      
      return titleMatch || descMatch || keywordMatch || categoryMatch;
    }).sort((a, b) => {
      // 優先顯示標題匹配的
      const aTitle = a.title.toLowerCase().indexOf(query);
      const bTitle = b.title.toLowerCase().indexOf(query);
      if (aTitle !== -1 && bTitle === -1) return -1;
      if (aTitle === -1 && bTitle !== -1) return 1;
      return 0;
    });
  });
  
  groupedCommands = computed(() => {
    const commands = this.filteredCommands();
    const groups: { category: CommandCategory; commands: Command[] }[] = [];
    
    const categoryOrder: CommandCategory[] = ['navigation', 'action', 'account', 'lead', 'ai', 'settings', 'help'];
    
    for (const category of categoryOrder) {
      const categoryCommands = commands.filter(c => c.category === category);
      if (categoryCommands.length > 0) {
        groups.push({ category, commands: categoryCommands });
      }
    }
    
    return groups;
  });
  
  private keydownListener!: (e: KeyboardEvent) => void;
  
  ngOnInit(): void {
    this.loadRecentCommands();
    this.setupGlobalShortcut();
  }
  
  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
  }
  
  /**
   * 設置全局快捷鍵
   */
  private setupGlobalShortcut(): void {
    this.keydownListener = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 打開命令面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this.keydownListener);
  }
  
  /**
   * 打開/關閉
   */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open(): void {
    this.isOpen.set(true);
    this.searchQuery = '';
    this.selectedIndex.set(0);
    
    // 聚焦搜索框
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 50);
  }
  
  close(): void {
    this.isOpen.set(false);
    this.searchQuery = '';
  }
  
  /**
   * 註冊命令
   */
  registerCommand(command: Command): void {
    this._commands.update(commands => {
      const existing = commands.findIndex(c => c.id === command.id);
      if (existing >= 0) {
        commands[existing] = command;
        return [...commands];
      }
      return [...commands, command];
    });
  }
  
  /**
   * 批量註冊命令
   */
  registerCommands(commands: Command[]): void {
    commands.forEach(c => this.registerCommand(c));
  }
  
  /**
   * 移除命令
   */
  unregisterCommand(commandId: string): void {
    this._commands.update(commands => commands.filter(c => c.id !== commandId));
  }
  
  /**
   * 搜索處理
   */
  onSearch(): void {
    this.selectedIndex.set(0);
  }
  
  /**
   * 鍵盤導航
   */
  onKeyDown(event: KeyboardEvent): void {
    const commands = this.filteredCommands();
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => Math.min(i + 1, commands.length - 1));
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => Math.max(i - 1, 0));
        break;
        
      case 'Enter':
        event.preventDefault();
        const command = commands[this.selectedIndex()];
        if (command && !command.disabled) {
          this.executeCommand(command);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }
  
  /**
   * 執行命令
   */
  async executeCommand(command: Command): Promise<void> {
    if (command.disabled) return;
    
    // 記錄到最近使用
    this._recentCommands.update(recent => {
      const filtered = recent.filter(id => id !== command.id);
      return [command.id, ...filtered].slice(0, 10);
    });
    this.saveRecentCommands();
    
    // 關閉面板
    this.close();
    
    // 執行命令
    try {
      await command.action();
      this.commandExecuted.emit(command);
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }
  
  /**
   * 獲取分類信息
   */
  getCategoryInfo(category: CommandCategory) {
    return CATEGORY_INFO[category];
  }
  
  /**
   * 檢查是否選中
   */
  isSelected(category: CommandCategory, index: number): boolean {
    return this.getGlobalIndex(category, index) === this.selectedIndex();
  }
  
  /**
   * 獲取全局索引
   */
  getGlobalIndex(category: CommandCategory, localIndex: number): number {
    const groups = this.groupedCommands();
    let globalIndex = 0;
    
    for (const group of groups) {
      if (group.category === category) {
        return globalIndex + localIndex;
      }
      globalIndex += group.commands.length;
    }
    
    return globalIndex + localIndex;
  }
  
  // ============ 持久化 ============
  
  private loadRecentCommands(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-recent-commands');
      if (stored) {
        this._recentCommands.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent commands:', e);
    }
  }
  
  private saveRecentCommands(): void {
    try {
      localStorage.setItem('tg-matrix-recent-commands', JSON.stringify(this._recentCommands()));
    } catch (e) {
      console.error('Failed to save recent commands:', e);
    }
  }
}

/**
 * 預設命令工廠
 */
export function createDefaultCommands(handlers: {
  navigate: (view: string) => void;
  addAccount: () => void;
  createBackup: () => void;
  openSettings: () => void;
  showHelp: () => void;
  generateAiMessage: () => void;
  exportData: () => void;
}): Command[] {
  return [
    // 導航命令
    {
      id: 'nav-dashboard',
      title: '前往儀表板',
      description: '查看總覽和快捷操作',
      icon: '📊',
      category: 'navigation',
      keywords: ['dashboard', 'home', '首頁'],
      shortcut: 'G D',
      action: () => handlers.navigate('dashboard')
    },
    {
      id: 'nav-accounts',
      title: '前往賬號管理',
      description: '管理 Telegram 賬號',
      icon: '👤',
      category: 'navigation',
      keywords: ['accounts', 'telegram'],
      shortcut: 'G A',
      action: () => handlers.navigate('accounts')
    },
    {
      id: 'nav-leads',
      title: '前往潛在客戶',
      description: '查看和管理客戶列表',
      icon: '🎯',
      category: 'navigation',
      keywords: ['leads', 'customers', '客戶'],
      shortcut: 'G L',
      action: () => handlers.navigate('leads')
    },
    {
      id: 'nav-ai-center',
      title: '前往 AI 中心',
      description: '配置 AI 助手',
      icon: '🤖',
      category: 'navigation',
      keywords: ['ai', 'gemini', 'gpt'],
      shortcut: 'G I',
      action: () => handlers.navigate('ai-center')
    },
    {
      id: 'nav-monitoring',
      title: '前往監控',
      description: '關鍵詞和群組監控',
      icon: '👁️',
      category: 'navigation',
      keywords: ['monitoring', 'keywords'],
      shortcut: 'G M',
      action: () => handlers.navigate('monitoring')
    },
    {
      id: 'nav-analytics',
      title: '前往分析',
      description: '數據分析和報表',
      icon: '📈',
      category: 'navigation',
      keywords: ['analytics', 'reports', '統計'],
      action: () => handlers.navigate('analytics')
    },
    {
      id: 'nav-settings',
      title: '前往設置',
      description: '應用程序設置',
      icon: '⚙️',
      category: 'navigation',
      keywords: ['settings', 'preferences', '設定'],
      shortcut: 'G S',
      action: () => handlers.navigate('settings')
    },
    
    // 操作命令
    {
      id: 'action-add-account',
      title: '新增賬號',
      description: '添加新的 Telegram 賬號',
      icon: '➕',
      category: 'account',
      keywords: ['add', 'new', '添加'],
      shortcut: 'Ctrl+N',
      action: handlers.addAccount
    },
    {
      id: 'action-backup',
      title: '創建備份',
      description: '備份所有數據',
      icon: '💾',
      category: 'action',
      keywords: ['backup', 'save', '保存'],
      action: handlers.createBackup
    },
    {
      id: 'action-export',
      title: '導出數據',
      description: '導出客戶數據為 CSV',
      icon: '📤',
      category: 'action',
      keywords: ['export', 'csv', 'download'],
      action: handlers.exportData
    },
    {
      id: 'action-ai-generate',
      title: 'AI 生成消息',
      description: '使用 AI 生成營銷消息',
      icon: '✨',
      category: 'ai',
      keywords: ['generate', 'ai', 'message'],
      action: handlers.generateAiMessage
    },
    
    // 幫助命令
    {
      id: 'help-shortcuts',
      title: '查看快捷鍵',
      description: '顯示所有鍵盤快捷鍵',
      icon: '⌨️',
      category: 'help',
      keywords: ['shortcuts', 'keyboard', '快捷'],
      shortcut: 'Ctrl+?',
      action: handlers.showHelp
    },
    {
      id: 'help-docs',
      title: '打開文檔',
      description: '查看使用手冊',
      icon: '📖',
      category: 'help',
      keywords: ['docs', 'documentation', 'manual', '說明'],
      action: () => window.open('https://docs.tg-matrix.com', '_blank')
    },
    {
      id: 'help-support',
      title: '聯繫支持',
      description: '獲取技術支持',
      icon: '💬',
      category: 'help',
      keywords: ['support', 'help', 'contact', '客服'],
      action: () => window.open('https://t.me/TGMatrixSupport', '_blank')
    }
  ];
}
