/**
 * 協作監控儀表板組件
 * Collaboration Dashboard Component
 * 
 * 實時監控多角色協作狀態和統計
 */

import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiRoleService } from '../multi-role.service';
import { AutoGroupService } from '../auto-group.service';
import { CollaborationExecutorService } from '../collaboration-executor.service';
import { CollaborationGroup } from '../multi-role.models';

interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalConversions: number;
  conversionRate: number;
  totalMessagesSent: number;
  avgMessagesPerGroup: number;
  todayGroups: number;
  todayConversions: number;
}

@Component({
  selector: 'app-collaboration-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="collaboration-dashboard p-6 bg-slate-900 min-h-full">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span class="text-2xl">📊</span>
            協作監控中心
          </h2>
          <p class="text-slate-400 mt-1">實時監控多角色協作狀態</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2">
            <svg class="w-4 h-4" [class.animate-spin]="isRefreshing()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            刷新
          </button>
          
          <div class="text-sm text-slate-500">
            最後更新: {{ lastUpdate() | date:'HH:mm:ss' }}
          </div>
        </div>
      </div>
      
      <!-- 頂部統計卡片 -->
      <div class="grid grid-cols-5 gap-4 mb-8">
        <!-- 總群組數 -->
        <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
          <div class="text-4xl font-bold text-purple-400">{{ stats().totalGroups }}</div>
          <div class="text-sm text-slate-400 mt-1">總群組數</div>
          <div class="text-xs text-purple-400/70 mt-2">
            今日 +{{ stats().todayGroups }}
          </div>
        </div>
        
        <!-- 活躍協作 -->
        <div class="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/30">
          <div class="flex items-center gap-2">
            <div class="text-4xl font-bold text-emerald-400">{{ stats().activeGroups }}</div>
            @if (stats().activeGroups > 0) {
              <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            }
          </div>
          <div class="text-sm text-slate-400 mt-1">活躍協作</div>
          <div class="text-xs text-emerald-400/70 mt-2">
            運行中
          </div>
        </div>
        
        <!-- 已完成 -->
        <div class="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/30">
          <div class="text-4xl font-bold text-cyan-400">{{ stats().completedGroups }}</div>
          <div class="text-sm text-slate-400 mt-1">已完成</div>
          <div class="text-xs text-cyan-400/70 mt-2">
            歷史累計
          </div>
        </div>
        
        <!-- 成功轉化 -->
        <div class="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-500/30">
          <div class="text-4xl font-bold text-amber-400">{{ stats().totalConversions }}</div>
          <div class="text-sm text-slate-400 mt-1">成功轉化</div>
          <div class="text-xs text-amber-400/70 mt-2">
            今日 +{{ stats().todayConversions }}
          </div>
        </div>
        
        <!-- 轉化率 -->
        <div class="bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl p-4 border border-pink-500/30">
          <div class="text-4xl font-bold text-pink-400">{{ stats().conversionRate | number:'1.1-1' }}%</div>
          <div class="text-sm text-slate-400 mt-1">轉化率</div>
          <div class="h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                 [style.width.%]="stats().conversionRate">
            </div>
          </div>
        </div>
      </div>
      
      <!-- 圖表區域 -->
      <div class="grid grid-cols-3 gap-6 mb-8">
        <!-- 趨勢圖 -->
        <div class="col-span-2 bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">協作趨勢</h3>
            <div class="flex gap-2">
              <button (click)="chartPeriod.set('week')"
                      class="px-3 py-1 text-sm rounded-lg"
                      [class.bg-purple-500]="chartPeriod() === 'week'"
                      [class.text-white]="chartPeriod() === 'week'"
                      [class.bg-slate-700]="chartPeriod() !== 'week'"
                      [class.text-slate-400]="chartPeriod() !== 'week'">
                7天
              </button>
              <button (click)="chartPeriod.set('month')"
                      class="px-3 py-1 text-sm rounded-lg"
                      [class.bg-purple-500]="chartPeriod() === 'month'"
                      [class.text-white]="chartPeriod() === 'month'"
                      [class.bg-slate-700]="chartPeriod() !== 'month'"
                      [class.text-slate-400]="chartPeriod() !== 'month'">
                30天
              </button>
            </div>
          </div>
          
          <!-- 簡化圖表展示 -->
          <div class="h-48 flex items-end gap-2">
            @for (day of chartData(); track day.date; let i = $index) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full bg-slate-700 rounded-t relative flex flex-col justify-end"
                     [style.height.px]="Math.max(day.groups * 10, 4)"
                     [class.bg-gradient-to-t]="true"
                     [class.from-purple-600]="true"
                     [class.to-purple-400]="true">
                  <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-400">
                    {{ day.groups }}
                  </div>
                </div>
                <div class="text-xs text-slate-500">{{ day.label }}</div>
              </div>
            }
          </div>
          
          <div class="flex justify-center gap-6 mt-4 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded bg-purple-500"></div>
              <span class="text-slate-400">新建群組</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded bg-emerald-500"></div>
              <span class="text-slate-400">成功轉化</span>
            </div>
          </div>
        </div>
        
        <!-- 角色效果 -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 class="text-lg font-semibold text-white mb-4">角色效果排名</h3>
          
          <div class="space-y-3">
            @for (role of topRoles(); track role.id; let i = $index) {
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                     [class.bg-amber-500]="i === 0"
                     [class.text-amber-900]="i === 0"
                     [class.bg-slate-600]="i === 1"
                     [class.text-white]="i === 1"
                     [class.bg-amber-700]="i === 2"
                     [class.text-amber-200]="i === 2"
                     [class.bg-slate-700]="i > 2"
                     [class.text-slate-400]="i > 2">
                  {{ i + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-white truncate">{{ role.name }}</div>
                  <div class="text-xs text-slate-500">{{ role.usageCount }} 次使用</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-emerald-400">{{ role.successRate }}%</div>
                  <div class="text-xs text-slate-500">成功率</div>
                </div>
              </div>
            }
            
            @if (topRoles().length === 0) {
              <div class="text-center py-8 text-slate-500">暫無數據</div>
            }
          </div>
        </div>
      </div>
      
      <!-- 活躍群組列表 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div class="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">活躍協作群組</h3>
          <span class="text-sm text-slate-400">共 {{ activeGroups().length }} 個</span>
        </div>
        
        <div class="divide-y divide-slate-700/50">
          @for (group of activeGroups(); track group.id) {
            <div class="p-4 hover:bg-slate-700/30 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <!-- 狀態指示燈 -->
                  <div class="w-10 h-10 rounded-full flex items-center justify-center"
                       [class.bg-emerald-500/20]="group.status === 'running'"
                       [class.bg-amber-500/20]="group.status === 'paused'"
                       [class.bg-cyan-500/20]="group.status === 'inviting'">
                    <span class="w-3 h-3 rounded-full"
                          [class.bg-emerald-500]="group.status === 'running'"
                          [class.animate-pulse]="group.status === 'running'"
                          [class.bg-amber-500]="group.status === 'paused'"
                          [class.bg-cyan-500]="group.status === 'inviting'">
                    </span>
                  </div>
                  
                  <div>
                    <div class="font-medium text-white">{{ group.groupTitle }}</div>
                    <div class="text-sm text-slate-400">
                      客戶: {{ group.targetCustomer.firstName || group.targetCustomer.username || group.targetCustomer.id }}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-6">
                  <!-- 消息統計 -->
                  <div class="text-center">
                    <div class="text-lg font-bold text-purple-400">{{ group.messagesSent }}</div>
                    <div class="text-xs text-slate-500">已發送</div>
                  </div>
                  
                  <div class="text-center">
                    <div class="text-lg font-bold text-cyan-400">{{ group.customerMessages }}</div>
                    <div class="text-xs text-slate-500">客戶回覆</div>
                  </div>
                  
                  <!-- 狀態標籤 -->
                  <div class="px-3 py-1 rounded-full text-xs font-medium"
                       [class.bg-emerald-500/20]="group.status === 'running'"
                       [class.text-emerald-400]="group.status === 'running'"
                       [class.bg-amber-500/20]="group.status === 'paused'"
                       [class.text-amber-400]="group.status === 'paused'"
                       [class.bg-cyan-500/20]="group.status === 'inviting'"
                       [class.text-cyan-400]="group.status === 'inviting'">
                    {{ getStatusLabel(group.status) }}
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex gap-2">
                    @if (group.status === 'running') {
                      <button (click)="pauseGroup(group)"
                              class="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </button>
                    }
                    @if (group.status === 'paused') {
                      <button (click)="resumeGroup(group)"
                              class="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        </svg>
                      </button>
                    }
                    <button (click)="viewGroupDetails(group)"
                            class="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
          
          @if (activeGroups().length === 0) {
            <div class="p-8 text-center text-slate-500">
              <div class="text-4xl mb-2">🎭</div>
              <div>暫無活躍的協作群組</div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CollaborationDashboardComponent implements OnInit, OnDestroy {
  private multiRoleService = inject(MultiRoleService);
  private autoGroupService = inject(AutoGroupService);
  private executorService = inject(CollaborationExecutorService);
  
  // 狀態
  isRefreshing = signal(false);
  lastUpdate = signal(new Date());
  chartPeriod = signal<'week' | 'month'>('week');
  
  // 統計數據
  stats = signal<DashboardStats>({
    totalGroups: 0,
    activeGroups: 0,
    completedGroups: 0,
    totalConversions: 0,
    conversionRate: 0,
    totalMessagesSent: 0,
    avgMessagesPerGroup: 0,
    todayGroups: 0,
    todayConversions: 0
  });
  
  // 圖表數據
  chartData = signal<{ date: string; label: string; groups: number; conversions: number }[]>([]);
  
  // 角色排名
  topRoles = computed(() => {
    const roles = this.multiRoleService.roles();
    return roles
      .map(r => ({
        ...r,
        successRate: r.usageCount && r.usageCount > 0 
          ? Math.round((r.successCount || 0) / r.usageCount * 100) 
          : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
  });
  
  // 活躍群組
  activeGroups = computed(() => {
    return this.autoGroupService.groups().filter(
      g => ['creating', 'inviting', 'running', 'paused'].includes(g.status)
    );
  });
  
  // 刷新間隔
  private refreshInterval: any = null;
  
  // Math 引用
  Math = Math;
  
  ngOnInit() {
    this.refreshData();
    
    // 每30秒自動刷新
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 30000);
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  async refreshData() {
    this.isRefreshing.set(true);
    
    try {
      // 獲取統計數據
      const groupStats = this.autoGroupService.statistics();
      
      this.stats.set({
        totalGroups: groupStats.totalGroups,
        activeGroups: groupStats.activeGroups,
        completedGroups: groupStats.totalGroups - groupStats.activeGroups - groupStats.pendingRequests,
        totalConversions: groupStats.successfulConversions,
        conversionRate: groupStats.totalGroups > 0 
          ? (groupStats.successfulConversions / groupStats.totalGroups * 100) 
          : 0,
        totalMessagesSent: this.executorService.statistics().totalExecutions,
        avgMessagesPerGroup: groupStats.totalGroups > 0 
          ? this.executorService.statistics().totalExecutions / groupStats.totalGroups 
          : 0,
        todayGroups: 0, // TODO: 從後端獲取
        todayConversions: 0 // TODO: 從後端獲取
      });
      
      // 生成圖表數據
      this.generateChartData();
      
      this.lastUpdate.set(new Date());
    } catch (e) {
      console.error('Failed to refresh dashboard data:', e);
    } finally {
      this.isRefreshing.set(false);
    }
  }
  
  private generateChartData() {
    const days = this.chartPeriod() === 'week' ? 7 : 30;
    const data: { date: string; label: string; groups: number; conversions: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        label: i === 0 ? '今天' : (days === 7 ? 
          ['日', '一', '二', '三', '四', '五', '六'][date.getDay()] : 
          `${date.getMonth() + 1}/${date.getDate()}`),
        groups: Math.floor(Math.random() * 10), // TODO: 從後端獲取真實數據
        conversions: Math.floor(Math.random() * 5)
      });
    }
    
    this.chartData.set(data);
  }
  
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'creating': '創建中',
      'inviting': '邀請中',
      'running': '進行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  pauseGroup(group: CollaborationGroup) {
    this.autoGroupService.pauseGroup(group.id);
    this.executorService.pauseExecution(group.id);
  }
  
  resumeGroup(group: CollaborationGroup) {
    this.autoGroupService.resumeGroup(group.id);
    this.executorService.resumeExecution(group.id);
  }
  
  viewGroupDetails(group: CollaborationGroup) {
    // TODO: 打開群組詳情對話框
    console.log('View group details:', group);
  }
}
