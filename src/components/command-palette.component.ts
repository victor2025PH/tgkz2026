/**
 * 命令面板組件 (全局搜索)
 * Command Palette Component (Global Search)
 * 
 * 快捷鍵：Cmd/Ctrl + K
 * 功能：
 * 1. 搜索頁面和功能
 * 2. 快速導航
 * 3. 執行常用操作
 * 4. 搜索聯繫人
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, HostListener, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 命令項類型
export type CommandType = 'page' | 'action' | 'contact' | 'recent' | 'help';

// 命令項
export interface CommandItem {
  id: string;
  type: CommandType;
  icon: string;
  title: string;
  subtitle?: string;
  keywords: string[];      // 搜索關鍵詞
  shortcut?: string;       // 快捷鍵
  action: () => void;      // 執行動作
}

// 命令分組
export interface CommandGroup {
  title: string;
  items: CommandItem[];
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="command-palette-overlay fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
           (click)="close()"
           [class.animate-fade-in]="animateIn()">
        
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- 命令面板 -->
        <div class="command-palette relative w-full max-w-2xl mx-4 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
             [class.animate-slide-down]="animateIn()"
             (click)="$event.stopPropagation()">
          
          <!-- 搜索輸入 -->
          <div class="flex items-center gap-3 p-4 border-b border-slate-700/50">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              #searchInput
              type="text"
              [(ngModel)]="query"
              (ngModelChange)="onQueryChange($event)"
              (keydown)="onKeyDown($event)"
              placeholder="搜索頁面、功能、聯繫人..."
              class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
              autofocus
            />
            <kbd class="px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded border border-slate-700">ESC</kbd>
          </div>
          
          <!-- 搜索結果 -->
          <div class="max-h-[60vh] overflow-y-auto">
            @if (filteredGroups().length === 0) {
              <div class="p-8 text-center">
                <div class="text-4xl mb-3">🔍</div>
                <p class="text-slate-400">未找到匹配的結果</p>
                <p class="text-sm text-slate-500 mt-1">嘗試其他關鍵詞</p>
              </div>
            } @else {
              @for (group of filteredGroups(); track group.title) {
                <div class="py-2">
                  <!-- 分組標題 -->
                  <div class="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {{ group.title }}
                  </div>
                  
                  <!-- 命令列表 -->
                  @for (item of group.items; track item.id; let i = $index) {
                    <div
                      (click)="executeCommand(item)"
                      (mouseenter)="selectedIndex.set(getGlobalIndex(group, i))"
                      class="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors"
                      [class.bg-cyan-500/20]="isSelected(group, i)"
                      [class.hover:bg-slate-800]="!isSelected(group, i)">
                      
                      <!-- 圖標 -->
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                           [class.bg-cyan-500/20]="isSelected(group, i)"
                           [class.bg-slate-800]="!isSelected(group, i)">
                        {{ item.icon }}
                      </div>
                      
                      <!-- 內容 -->
                      <div class="flex-1 min-w-0">
                        <div class="text-white font-medium truncate">{{ item.title }}</div>
                        @if (item.subtitle) {
                          <div class="text-sm text-slate-400 truncate">{{ item.subtitle }}</div>
                        }
                      </div>
                      
                      <!-- 類型標籤 -->
                      <span class="px-2 py-0.5 text-xs rounded-full"
                            [class.bg-blue-500/20]="item.type === 'page'"
                            [class.text-blue-400]="item.type === 'page'"
                            [class.bg-green-500/20]="item.type === 'action'"
                            [class.text-green-400]="item.type === 'action'"
                            [class.bg-purple-500/20]="item.type === 'contact'"
                            [class.text-purple-400]="item.type === 'contact'"
                            [class.bg-amber-500/20]="item.type === 'recent'"
                            [class.text-amber-400]="item.type === 'recent'">
                        {{ getTypeLabel(item.type) }}
                      </span>
                      
                      <!-- 快捷鍵 -->
                      @if (item.shortcut) {
                        <kbd class="px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded border border-slate-700">
                          {{ item.shortcut }}
                        </kbd>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
          
          <!-- 底部提示 -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd>
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↓</kbd>
                導航
              </span>
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
                選擇
              </span>
              <span class="flex items-center gap-1">
                <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">ESC</kbd>
                關閉
              </span>
            </div>
            <span>TG-Matrix 命令面板</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: fade-in 0.15s ease-out;
    }
    
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .animate-slide-down {
      animation: slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes slide-down {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    /* 自定義滾動條 */
    .command-palette ::-webkit-scrollbar {
      width: 6px;
    }
    
    .command-palette ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .command-palette ::-webkit-scrollbar-thumb {
      background: rgb(71, 85, 105);
      border-radius: 3px;
    }
    
    .command-palette ::-webkit-scrollbar-thumb:hover {
      background: rgb(100, 116, 139);
    }
  `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  // 輸出事件
  navigate = output<string>();
  
  // 狀態
  isOpen = signal(false);
  animateIn = signal(true);
  query = '';
  selectedIndex = signal(0);
  
  // 最近訪問
  private recentPages = signal<string[]>([]);
  
  // 所有命令
  private commands = signal<CommandItem[]>([]);
  
  // 過濾後的分組
  filteredGroups = computed((): CommandGroup[] => {
    const q = this.query.toLowerCase().trim();
    const commands = this.commands();
    
    if (!q) {
      // 無搜索時顯示最近和推薦
      return this.getDefaultGroups(commands);
    }
    
    // 搜索匹配
    const matched = commands.filter(cmd => 
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle?.toLowerCase().includes(q) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(q))
    );
    
    // 按類型分組
    return this.groupByType(matched);
  });
  
  ngOnInit() {
    this.initCommands();
    this.loadRecentPages();
  }
  
  ngOnDestroy() {
    // 清理
  }
  
  /**
   * 初始化命令列表
   */
  private initCommands() {
    const commands: CommandItem[] = [
      // 頁面導航
      { id: 'nav-dashboard', type: 'page', icon: '📊', title: '儀表板', subtitle: '查看系統概覽', keywords: ['dashboard', '首頁', '概覽'], action: () => this.navigateTo('dashboard') },
      { id: 'nav-accounts', type: 'page', icon: '👤', title: '帳號管理', subtitle: '管理 Telegram 帳號', keywords: ['accounts', '帳戶', '登錄'], action: () => this.navigateTo('accounts') },
      { id: 'nav-resource', type: 'page', icon: '📇', title: '資源中心', subtitle: '管理聯繫人和群組', keywords: ['resource', '聯繫人', '群組', 'contacts'], action: () => this.navigateTo('resource-center') },
      { id: 'nav-ai-assistant', type: 'page', icon: '🎯', title: '策略規劃', subtitle: 'AI 營銷助手', keywords: ['ai', '營銷', '策略', 'marketing'], action: () => this.navigateTo('ai-assistant') },
      { id: 'nav-ai-team', type: 'page', icon: '🤖', title: '自動執行', subtitle: 'AI 團隊銷售', keywords: ['ai', '團隊', '自動', 'team'], action: () => this.navigateTo('ai-team') },
      { id: 'nav-analytics', type: 'page', icon: '📈', title: '數據洞察', subtitle: '智能分析報告', keywords: ['analytics', '分析', '報告', '統計'], action: () => this.navigateTo('analytics') },
      { id: 'nav-automation', type: 'page', icon: '⚡', title: '自動化中心', subtitle: '監控和自動回覆', keywords: ['automation', '自動化', '監控'], action: () => this.navigateTo('automation') },
      { id: 'nav-leads', type: 'page', icon: '🎯', title: '潛在客戶', subtitle: '客戶管理', keywords: ['leads', '客戶', 'crm'], action: () => this.navigateTo('leads') },
      { id: 'nav-settings', type: 'page', icon: '⚙️', title: '系統設置', subtitle: '配置系統選項', keywords: ['settings', '設置', '配置'], action: () => this.navigateTo('settings') },
      
      // 快速操作
      { id: 'action-add-account', type: 'action', icon: '➕', title: '添加帳號', subtitle: '添加新的 Telegram 帳號', keywords: ['add', 'account', '新增'], shortcut: '⌘N', action: () => this.navigateTo('add-account') },
      { id: 'action-send-message', type: 'action', icon: '✉️', title: '發送消息', subtitle: '向聯繫人發送消息', keywords: ['send', 'message', '發送'], action: () => this.emitAction('send-message') },
      { id: 'action-extract', type: 'action', icon: '📥', title: '提取成員', subtitle: '從群組提取成員', keywords: ['extract', 'member', '提取'], action: () => this.emitAction('extract-members') },
      { id: 'action-search-group', type: 'action', icon: '🔍', title: '搜索群組', subtitle: '搜索 Telegram 群組', keywords: ['search', 'group', '搜索'], action: () => this.emitAction('search-groups') },
      { id: 'action-start-monitor', type: 'action', icon: '📡', title: '啟動監控', subtitle: '開始監控群組消息', keywords: ['monitor', 'start', '監控'], action: () => this.emitAction('start-monitor') },
      { id: 'action-refresh', type: 'action', icon: '🔄', title: '刷新數據', subtitle: '重新加載數據', keywords: ['refresh', 'reload', '刷新'], shortcut: '⌘R', action: () => this.emitAction('refresh') },
      
      // 幫助
      { id: 'help-docs', type: 'help', icon: '📖', title: '幫助文檔', subtitle: '查看使用指南', keywords: ['help', 'docs', '幫助', '文檔'], action: () => this.emitAction('open-docs') },
      { id: 'help-shortcuts', type: 'help', icon: '⌨️', title: '快捷鍵', subtitle: '查看所有快捷鍵', keywords: ['shortcuts', 'keyboard', '快捷鍵'], action: () => this.emitAction('show-shortcuts') },
      { id: 'help-feedback', type: 'help', icon: '💬', title: '意見反饋', subtitle: '提交問題或建議', keywords: ['feedback', '反饋', '建議'], action: () => this.emitAction('open-feedback') },
    ];
    
    this.commands.set(commands);
  }
  
  /**
   * 獲取默認分組
   */
  private getDefaultGroups(commands: CommandItem[]): CommandGroup[] {
    const recent = this.recentPages();
    const groups: CommandGroup[] = [];
    
    // 最近訪問
    if (recent.length > 0) {
      const recentItems = commands
        .filter(cmd => recent.includes(cmd.id))
        .sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
        .slice(0, 5)
        .map(cmd => ({ ...cmd, type: 'recent' as CommandType }));
      
      if (recentItems.length > 0) {
        groups.push({ title: '最近訪問', items: recentItems });
      }
    }
    
    // 推薦頁面
    const recommended = commands
      .filter(cmd => cmd.type === 'page')
      .slice(0, 6);
    groups.push({ title: '頁面', items: recommended });
    
    // 快速操作
    const actions = commands
      .filter(cmd => cmd.type === 'action')
      .slice(0, 4);
    groups.push({ title: '快速操作', items: actions });
    
    return groups;
  }
  
  /**
   * 按類型分組
   */
  private groupByType(items: CommandItem[]): CommandGroup[] {
    const groups: CommandGroup[] = [];
    
    const pages = items.filter(i => i.type === 'page');
    const actions = items.filter(i => i.type === 'action');
    const contacts = items.filter(i => i.type === 'contact');
    const help = items.filter(i => i.type === 'help');
    
    if (pages.length > 0) groups.push({ title: '頁面', items: pages });
    if (actions.length > 0) groups.push({ title: '操作', items: actions });
    if (contacts.length > 0) groups.push({ title: '聯繫人', items: contacts });
    if (help.length > 0) groups.push({ title: '幫助', items: help });
    
    return groups;
  }
  
  /**
   * 監聽全局鍵盤事件
   */
  @HostListener('document:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent) {
    // Cmd/Ctrl + K 打開命令面板
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggle();
    }
    
    // Escape 關閉
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
  
  /**
   * 輸入框鍵盤事件
   */
  onKeyDown(event: KeyboardEvent) {
    const groups = this.filteredGroups();
    const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => (i + 1) % totalItems);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => (i - 1 + totalItems) % totalItems);
        break;
        
      case 'Enter':
        event.preventDefault();
        const item = this.getSelectedItem();
        if (item) {
          this.executeCommand(item);
        }
        break;
    }
  }
  
  /**
   * 搜索變更
   */
  onQueryChange(value: string) {
    this.selectedIndex.set(0);
  }
  
  /**
   * 獲取選中的項目
   */
  private getSelectedItem(): CommandItem | null {
    const groups = this.filteredGroups();
    let currentIndex = 0;
    
    for (const group of groups) {
      for (const item of group.items) {
        if (currentIndex === this.selectedIndex()) {
          return item;
        }
        currentIndex++;
      }
    }
    
    return null;
  }
  
  /**
   * 獲取全局索引
   */
  getGlobalIndex(group: CommandGroup, itemIndex: number): number {
    const groups = this.filteredGroups();
    let globalIndex = 0;
    
    for (const g of groups) {
      if (g === group) {
        return globalIndex + itemIndex;
      }
      globalIndex += g.items.length;
    }
    
    return 0;
  }
  
  /**
   * 判斷是否選中
   */
  isSelected(group: CommandGroup, itemIndex: number): boolean {
    return this.getGlobalIndex(group, itemIndex) === this.selectedIndex();
  }
  
  /**
   * 獲取類型標籤
   */
  getTypeLabel(type: CommandType): string {
    const labels: Record<CommandType, string> = {
      page: '頁面',
      action: '操作',
      contact: '聯繫人',
      recent: '最近',
      help: '幫助'
    };
    return labels[type];
  }
  
  /**
   * 打開/關閉
   */
  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * 打開
   */
  open() {
    this.query = '';
    this.selectedIndex.set(0);
    this.animateIn.set(true);
    this.isOpen.set(true);
  }
  
  /**
   * 關閉
   */
  close() {
    this.animateIn.set(false);
    setTimeout(() => {
      this.isOpen.set(false);
    }, 150);
  }
  
  /**
   * 執行命令
   */
  executeCommand(item: CommandItem) {
    // 記錄最近訪問
    if (item.type === 'page') {
      this.addToRecent(item.id);
    }
    
    // 執行動作
    item.action();
    
    // 關閉面板
    this.close();
  }
  
  /**
   * 導航到頁面
   */
  private navigateTo(view: string) {
    this.navigate.emit(view);
  }
  
  /**
   * 發出動作事件
   */
  private emitAction(action: string) {
    this.navigate.emit(`action:${action}`);
  }
  
  /**
   * 添加到最近訪問
   */
  private addToRecent(id: string) {
    this.recentPages.update(recent => {
      const filtered = recent.filter(r => r !== id);
      return [id, ...filtered].slice(0, 10);
    });
    this.saveRecentPages();
  }
  
  /**
   * 載入最近訪問
   */
  private loadRecentPages() {
    try {
      const stored = localStorage.getItem('tg-matrix-recent-pages');
      if (stored) {
        this.recentPages.set(JSON.parse(stored));
      }
    } catch {}
  }
  
  /**
   * 保存最近訪問
   */
  private saveRecentPages() {
    try {
      localStorage.setItem('tg-matrix-recent-pages', JSON.stringify(this.recentPages()));
    } catch {}
  }
  
  /**
   * 添加自定義命令
   */
  addCommand(command: CommandItem) {
    this.commands.update(commands => [...commands, command]);
  }
  
  /**
   * 添加聯繫人命令
   */
  addContactCommands(contacts: { id: string; name: string; username?: string }[]) {
    const contactCommands: CommandItem[] = contacts.map(c => ({
      id: `contact-${c.id}`,
      type: 'contact',
      icon: '👤',
      title: c.name,
      subtitle: c.username ? `@${c.username}` : undefined,
      keywords: [c.name, c.username || ''].filter(Boolean),
      action: () => this.navigate.emit(`contact:${c.id}`)
    }));
    
    this.commands.update(commands => [
      ...commands.filter(c => c.type !== 'contact'),
      ...contactCommands
    ]);
  }
}
