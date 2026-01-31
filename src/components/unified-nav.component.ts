/**
 * 統一導航組件
 * Unified Navigation Component
 * 
 * 提供:
 * - 模塊切換
 * - 視圖導航
 * - 麵包屑
 * - 快速搜索
 */

import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  UnifiedNavService, 
  NAV_MODULES, 
  NavModule, 
  NavItem,
  ViewId,
  ModuleId 
} from './unified-nav.service';

@Component({
  selector: 'app-unified-nav',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="unified-nav">
      <!-- 頂部模塊切換器 -->
      <div class="module-switcher flex items-center gap-1 p-2 bg-slate-900/50 border-b border-slate-700/50">
        @for (module of visibleModules(); track module.id) {
          <button 
            (click)="selectModule(module.id)"
            [class.active]="navService.currentModule().id === module.id"
            class="module-btn px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                   hover:bg-slate-700/50 flex items-center gap-1.5"
            [class.bg-gradient-to-r]="navService.currentModule().id === module.id"
            [class.text-white]="navService.currentModule().id === module.id"
            [class.text-slate-400]="navService.currentModule().id !== module.id"
            [ngClass]="navService.currentModule().id === module.id ? module.color : ''"
            [title]="module.description">
            <span>{{ module.icon }}</span>
            <span class="hidden sm:inline">{{ module.label }}</span>
          </button>
        }
        
        <!-- 搜索按鈕 -->
        <button 
          (click)="toggleSearch()"
          class="ml-auto px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all">
          🔍
        </button>
      </div>
      
      <!-- 搜索面板 -->
      @if (showSearch()) {
        <div class="search-panel p-3 bg-slate-800/80 border-b border-slate-700/50">
          <div class="relative">
            <input 
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="搜索功能..."
              class="w-full pl-9 pr-4 py-2 bg-slate-700/50 rounded-lg text-sm text-white 
                     placeholder-slate-400 border border-slate-600 focus:border-cyan-500 
                     focus:outline-none transition-colors">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          
          @if (searchResults().length > 0) {
            <div class="mt-2 space-y-1">
              @for (item of searchResults(); track item.id) {
                <button 
                  (click)="navigateAndCloseSearch(item.id)"
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                         hover:bg-slate-700/50 transition-colors">
                  <span>{{ item.icon }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm text-white">{{ item.label }}</div>
                    @if (item.description) {
                      <div class="text-xs text-slate-400 truncate">{{ item.description }}</div>
                    }
                  </div>
                  @if (item.shortcut) {
                    <kbd class="px-1.5 py-0.5 text-xs bg-slate-600 rounded">{{ item.shortcut }}</kbd>
                  }
                </button>
              }
            </div>
          }
        </div>
      }
      
      <!-- 麵包屑導航 -->
      <div class="breadcrumbs flex items-center gap-1 px-4 py-2 text-xs text-slate-400 
                  border-b border-slate-700/30 bg-slate-800/30">
        @for (crumb of navService.breadcrumbs(); track $index; let last = $last) {
          @if (!last) {
            <button 
              (click)="crumb.view && navigateTo(crumb.view)"
              class="flex items-center gap-1 hover:text-cyan-400 transition-colors"
              [class.cursor-pointer]="crumb.view">
              <span>{{ crumb.icon }}</span>
              <span>{{ crumb.label }}</span>
            </button>
            <span class="text-slate-600">/</span>
          } @else {
            <span class="flex items-center gap-1 text-white">
              <span>{{ crumb.icon }}</span>
              <span>{{ crumb.label }}</span>
            </span>
          }
        }
        
        <!-- 返回按鈕 -->
        <button 
          (click)="goBack()"
          class="ml-auto text-slate-400 hover:text-white transition-colors"
          title="返回上一頁 (Backspace)">
          ← 返回
        </button>
      </div>
      
      <!-- 子視圖標籤 -->
      @if (currentModuleViews().length > 1) {
        <div class="sub-nav flex items-center gap-1 px-4 py-2 bg-slate-800/20 overflow-x-auto">
          @for (view of currentModuleViews(); track view.id) {
            <button 
              (click)="navigateTo(view.id)"
              [class.active]="navService.currentView() === view.id"
              class="sub-nav-btn px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all
                     hover:bg-slate-700/50 flex items-center gap-1.5"
              [class.bg-cyan-500/20]="navService.currentView() === view.id"
              [class.text-cyan-400]="navService.currentView() === view.id"
              [class.border-cyan-500/50]="navService.currentView() === view.id"
              [class.text-slate-400]="navService.currentView() !== view.id"
              [class.border-transparent]="navService.currentView() !== view.id"
              [class.border]="true">
              <span>{{ view.icon }}</span>
              <span>{{ view.label }}</span>
              @if (view.badge && view.badge > 0) {
                <span class="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                  {{ view.badge > 99 ? '99+' : view.badge }}
                </span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .unified-nav {
      background: linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8));
      backdrop-filter: blur(12px);
    }
    
    .module-btn.active {
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
    }
    
    .sub-nav::-webkit-scrollbar {
      height: 4px;
    }
    
    .sub-nav::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .sub-nav::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 2px;
    }
    
    .sub-nav::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.5);
    }
  `]
})
export class UnifiedNavComponent {
  navService = inject(UnifiedNavService);
  
  // 輸出事件
  viewChange = output<ViewId>();
  
  // 狀態
  showSearch = signal(false);
  searchQuery = '';
  searchResults = signal<NavItem[]>([]);
  
  // 計算屬性
  visibleModules = computed(() => NAV_MODULES.filter(m => m.id !== 'system'));
  
  currentModuleViews = computed(() => {
    const module = this.navService.currentModule();
    return module.views.filter(v => !v.hidden);
  });
  
  /**
   * 選擇模塊
   */
  selectModule(moduleId: ModuleId): void {
    this.navService.navigateToModule(moduleId);
    this.emitChange();
  }
  
  /**
   * 導航到視圖
   */
  navigateTo(viewId: ViewId): void {
    this.navService.navigateTo(viewId);
    this.emitChange();
  }
  
  /**
   * 返回
   */
  goBack(): void {
    if (this.navService.goBack()) {
      this.emitChange();
    }
  }
  
  /**
   * 切換搜索
   */
  toggleSearch(): void {
    this.showSearch.update(v => !v);
    if (!this.showSearch()) {
      this.searchQuery = '';
      this.searchResults.set([]);
    }
  }
  
  /**
   * 搜索
   */
  onSearch(): void {
    const results = this.navService.searchViews(this.searchQuery);
    this.searchResults.set(results);
  }
  
  /**
   * 導航並關閉搜索
   */
  navigateAndCloseSearch(viewId: ViewId): void {
    this.navigateTo(viewId);
    this.showSearch.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);
  }
  
  private emitChange(): void {
    this.viewChange.emit(this.navService.currentView());
  }
}


/**
 * 側邊欄導航組件
 * 垂直佈局的完整導航
 */
@Component({
  selector: 'app-unified-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sidebar h-full flex flex-col bg-slate-900/95 border-r border-slate-700/50">
      <!-- Logo -->
      <div class="p-4 border-b border-slate-700/50">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 
                      flex items-center justify-center text-white font-bold">
            TG
          </div>
          <div>
            <div class="text-sm font-bold text-white">TG-AI 智控王</div>
            <div class="text-[10px] text-slate-400">Marketing Automation</div>
          </div>
        </div>
      </div>
      
      <!-- 模塊列表 -->
      <div class="flex-1 overflow-y-auto py-2">
        @for (module of modules; track module.id) {
          <div class="px-2 mb-2">
            <!-- 模塊標題 -->
            <button 
              (click)="toggleModule(module.id)"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                     hover:bg-slate-800"
              [class.bg-slate-800]="isModuleExpanded(module.id)">
              <span class="text-lg">{{ module.icon }}</span>
              <span class="flex-1 text-left text-sm font-medium"
                    [class.text-white]="isModuleActive(module.id)"
                    [class.text-slate-400]="!isModuleActive(module.id)">
                {{ module.label }}
              </span>
              <span class="text-slate-500 text-xs transition-transform"
                    [class.rotate-90]="isModuleExpanded(module.id)">
                ▶
              </span>
            </button>
            
            <!-- 子視圖 -->
            @if (isModuleExpanded(module.id)) {
              <div class="mt-1 ml-4 pl-3 border-l border-slate-700/50 space-y-0.5">
                @for (view of getVisibleViews(module); track view.id) {
                  <button 
                    (click)="navigateTo(view.id)"
                    class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
                           transition-all hover:bg-slate-800"
                    [class.bg-cyan-500/10]="navService.currentView() === view.id"
                    [class.text-cyan-400]="navService.currentView() === view.id"
                    [class.text-slate-400]="navService.currentView() !== view.id">
                    <span>{{ view.icon }}</span>
                    <span class="flex-1 text-left">{{ view.label }}</span>
                    @if (view.badge && view.badge > 0) {
                      <span class="px-1 py-0.5 text-[10px] bg-red-500 text-white rounded-full min-w-[16px] text-center">
                        {{ view.badge > 99 ? '99+' : view.badge }}
                      </span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
      
      <!-- 底部 -->
      <div class="p-3 border-t border-slate-700/50">
        <button 
          (click)="navigateTo('settings')"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400
                 hover:text-white hover:bg-slate-800 transition-all">
          <span>⚙️</span>
          <span>設置</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 220px;
      min-width: 220px;
    }
    
    .sidebar::-webkit-scrollbar {
      width: 4px;
    }
    
    .sidebar::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .sidebar::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 2px;
    }
  `]
})
export class UnifiedSidebarComponent {
  navService = inject(UnifiedNavService);
  
  modules = NAV_MODULES;
  
  // 輸出事件
  viewChange = output<ViewId>();
  
  // 展開的模塊
  private expandedModules = signal<Set<ModuleId>>(new Set(['accounts', 'automation']));
  
  toggleModule(moduleId: ModuleId): void {
    this.expandedModules.update(set => {
      const newSet = new Set(set);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  }
  
  isModuleExpanded(moduleId: ModuleId): boolean {
    return this.expandedModules().has(moduleId);
  }
  
  isModuleActive(moduleId: ModuleId): boolean {
    return this.navService.currentModule().id === moduleId;
  }
  
  getVisibleViews(module: NavModule): NavItem[] {
    return module.views.filter(v => !v.hidden);
  }
  
  navigateTo(viewId: ViewId): void {
    this.navService.navigateTo(viewId);
    this.viewChange.emit(viewId);
    
    // 自動展開對應模塊
    const module = this.navService.getViewModule(viewId);
    if (module) {
      this.expandedModules.update(set => {
        const newSet = new Set(set);
        newSet.add(module.id);
        return newSet;
      });
    }
  }
}
