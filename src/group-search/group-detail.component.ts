/**
 * TG-AI智控王 群組詳情組件
 * Group Detail Component v2.0 — Phase2: 狀態感知按鈕
 */
import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupSearchService } from './search.service';
import { MembershipService } from '../membership.service';
import { ToastService } from '../toast.service';
import { GroupBasicInfo, GroupDetailInfo, GroupStats } from './search.types';

/** 群組在系統中的狀態 */
export type GroupResourceStatus = 'discovered' | 'pending' | 'joined' | 'monitoring' | 'paused' | 'failed' | 'unknown';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <!-- 頂部導航 -->
      <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-700/50">
        <button (click)="back.emit()"
                class="p-2 rounded-lg hover:bg-slate-800 transition-colors">
          ← 返回
        </button>
        <h3 class="text-lg font-semibold">群組詳情</h3>
        
        <!-- 狀態標記 -->
        @if (resourceStatus !== 'unknown') {
          <span class="ml-auto px-3 py-1 rounded-full text-xs font-medium"
                [class]="statusStyle">
            {{ statusLabel }}
          </span>
        }
      </div>
      
      <!-- 內容區 -->
      <div class="flex-1 overflow-auto p-6">
        @if (isLoading()) {
          <div class="flex items-center justify-center py-20">
            <div class="text-2xl animate-spin">⏳</div>
          </div>
        } @else if (detail()) {
          <div class="max-w-4xl mx-auto space-y-6">
            <!-- 群組頭部 -->
            <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div class="flex items-start gap-6">
                <!-- 頭像 -->
                <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl flex-shrink-0">
                  @if (detail()?.photo?.bigUrl) {
                    <img [src]="detail()!.photo!.bigUrl" class="w-full h-full rounded-2xl object-cover">
                  } @else {
                    {{ detail()!.title[0] }}
                  }
                </div>
                
                <!-- 基本信息 -->
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <h2 class="text-2xl font-bold">{{ detail()!.title }}</h2>
                    @if (detail()!.type === 'channel') {
                      <span class="px-2 py-1 text-sm rounded bg-purple-500/20 text-purple-400">頻道</span>
                    } @else {
                      <span class="px-2 py-1 text-sm rounded bg-cyan-500/20 text-cyan-400">群組</span>
                    }
                  </div>
                  
                  @if (detail()!.username) {
                    <a [href]="'https://t.me/' + detail()!.username" target="_blank"
                       class="text-cyan-400 hover:underline mt-1 inline-block">
                      {{ '@' + detail()!.username }}
                    </a>
                  }
                  
                  @if (detail()!.description) {
                    <p class="text-slate-400 mt-3 leading-relaxed">{{ detail()!.description }}</p>
                  }
                  
                  <!-- 標籤 -->
                  @if (detail()!.tags?.length) {
                    <div class="flex flex-wrap gap-2 mt-4">
                      @for (tag of detail()!.tags; track tag) {
                        <span class="px-2 py-1 text-sm rounded-full bg-slate-700 text-slate-300">
                          #{{ tag }}
                        </span>
                      }
                    </div>
                  }
                </div>
                
                <!-- 操作按鈕 — 根據狀態智能顯示 -->
                <div class="flex flex-col gap-2">
                  @if (isMonitoring) {
                    <!-- 監控中：顯示狀態 + 提取 -->
                    <span class="px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg text-sm text-center font-medium">
                      📡 監控中
                    </span>
                    <span class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm text-center">
                      ✅ 已加入
                    </span>
                  } @else if (isJoined) {
                    <!-- 已加入未監控：提供監控選項 -->
                    <span class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm text-center">
                      ✅ 已加入
                    </span>
                    <button (click)="joinAndMonitor.emit()"
                            class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-2 text-white text-sm">
                      📡 加入監控
                    </button>
                  } @else {
                    <!-- 未加入：完整操作 -->
                    <button (click)="joinGroup()"
                            class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors flex items-center gap-2 text-sm">
                      ➕ 加入群組
                    </button>
                    <button (click)="joinAndMonitor.emit()"
                            class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-2 text-white text-sm">
                      📡 加入並監控
                    </button>
                  }
                  <button (click)="toggleFavorite()"
                          class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                          [class]="isFavorite() ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 hover:bg-slate-600'">
                    {{ isFavorite() ? '⭐ 已收藏' : '☆ 收藏' }}
                  </button>
                  <button (click)="copyLink()"
                          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2 text-sm">
                    📋 複製鏈接
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 數據統計 -->
            <div class="grid grid-cols-4 gap-4">
              <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 text-center">
                <p class="text-3xl font-bold text-cyan-400">{{ formatNumber(detail()!.stats.membersCount) }}</p>
                <p class="text-sm text-slate-400 mt-1">總成員</p>
              </div>
              <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 text-center">
                <p class="text-3xl font-bold text-green-400">{{ formatNumber(detail()!.stats.onlineCount || 0) }}</p>
                <p class="text-sm text-slate-400 mt-1">在線人數</p>
              </div>
              <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 text-center">
                <p class="text-3xl font-bold text-purple-400">{{ formatNumber(detail()!.stats.dailyMessages || 0) }}</p>
                <p class="text-sm text-slate-400 mt-1">日消息數</p>
              </div>
              <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 text-center">
                <p class="text-3xl font-bold"
                   [class]="(detail()!.stats.weeklyGrowth || 0) >= 0 ? 'text-green-400' : 'text-red-400'">
                  {{ (detail()!.stats.weeklyGrowth || 0) >= 0 ? '+' : '' }}{{ detail()!.stats.weeklyGrowth || 0 }}%
                </p>
                <p class="text-sm text-slate-400 mt-1">週增長</p>
              </div>
            </div>
            
            <!-- 活躍度指標 -->
            <div class="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h4 class="font-semibold mb-4">📊 活躍度分析</h4>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-slate-400">活躍率</span>
                    <span>{{ detail()!.stats.activeRate || 0 }}%</span>
                  </div>
                  <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                         [style.width.%]="detail()!.stats.activeRate || 0"></div>
                  </div>
                </div>
                
                @if (detail()!.stats.lastActivity) {
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-400">最後活動</span>
                    <span>{{ formatTime(detail()!.stats.lastActivity!) }}</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- 成員提取按鈕 — 根據狀態顯示 -->
            <div class="rounded-xl p-6 border"
                 [class]="canExtractNow ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30' : 'bg-slate-800/50 border-slate-700/50'">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-semibold text-lg">👥 提取群組成員</h4>
                  <p class="text-sm text-slate-400 mt-1">
                    @if (!isJoined && !isMonitoring) {
                      需要先加入群組才能提取成員
                    } @else if (!canExtract()) {
                      需要升級會員才能使用此功能
                    } @else {
                      提取成員的頭像、暱稱、用戶名、ID 等公開信息
                    }
                  </p>
                </div>
                <button (click)="handleExtractClick()"
                        [disabled]="!canExtractNow"
                        class="px-6 py-3 rounded-xl font-medium transition-all"
                        [class]="canExtractNow ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'">
                  @if (!isJoined && !isMonitoring) {
                    🔒 需先加入
                  } @else if (!canExtract()) {
                    🔒 需要升級
                  } @else {
                    📥 提取成員
                  }
                </button>
              </div>
              
              @if (!canExtract() && (isJoined || isMonitoring)) {
                <p class="mt-3 text-sm text-orange-400">
                  {{ membershipService.levelIcon() }} {{ membershipService.levelName() }} 無法使用成員提取功能，需要升級到 🥈 白銀精英 或以上
                </p>
              }
              @if (!isJoined && !isMonitoring) {
                <p class="mt-3 text-sm text-slate-500">
                  💡 提示：請先點擊上方「加入群組」按鈕，加入後即可提取成員
                </p>
              }
            </div>
            
            <!-- 相關群組 -->
            @if (detail()!.relatedGroups?.length) {
              <div class="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h4 class="font-semibold mb-4">🔗 相關群組</h4>
                <div class="grid grid-cols-2 gap-3">
                  @for (related of detail()!.relatedGroups; track related.id) {
                    <div class="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-slate-700 transition-colors">
                      <div class="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                        {{ related.title[0] }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium truncate">{{ related.title }}</p>
                        <p class="text-xs text-slate-400">{{ formatNumber(related.membersCount) }} 成員</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="text-4xl mb-4">❌</div>
            <p class="text-slate-400">無法載入群組詳情</p>
          </div>
        }
      </div>
    </div>
  `
})
export class GroupDetailComponent implements OnInit {
  @Input({ required: true }) group!: GroupBasicInfo;
  @Input() resourceStatus: GroupResourceStatus = 'unknown';
  @Output() back = new EventEmitter<void>();
  @Output() extractMembers = new EventEmitter<void>();
  @Output() joinAndMonitor = new EventEmitter<void>();
  
  private searchService = inject(GroupSearchService);
  membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  
  detail = signal<GroupDetailInfo | null>(null);
  isLoading = signal(true);
  
  /** 是否已加入（包含 monitoring） */
  get isJoined(): boolean {
    return this.resourceStatus === 'joined' || this.resourceStatus === 'monitoring' || this.resourceStatus === 'paused';
  }
  
  /** 是否正在監控 */
  get isMonitoring(): boolean {
    return this.resourceStatus === 'monitoring';
  }
  
  /** 是否可以立即提取 */
  get canExtractNow(): boolean {
    return this.isJoined && this.canExtract();
  }
  
  /** 狀態標籤文字 */
  get statusLabel(): string {
    switch (this.resourceStatus) {
      case 'monitoring': return '📡 監控中';
      case 'joined': return '✅ 已加入';
      case 'paused': return '⏸ 已暫停';
      case 'discovered': return '🔍 已發現';
      case 'pending': return '⏳ 待處理';
      case 'failed': return '❌ 失敗';
      default: return '';
    }
  }
  
  /** 狀態標籤樣式 */
  get statusStyle(): string {
    switch (this.resourceStatus) {
      case 'monitoring': return 'bg-emerald-500/20 text-emerald-400';
      case 'joined': return 'bg-green-500/20 text-green-400';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400';
      case 'discovered': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-700 text-slate-400';
    }
  }
  
  ngOnInit(): void {
    this.loadDetail();
  }
  
  private async loadDetail(): Promise<void> {
    this.isLoading.set(true);
    
    const result = await this.searchService.getGroupDetail(this.group.id);
    
    if (result) {
      this.detail.set(result);
    } else {
      this.detail.set({
        ...this.group,
        stats: {
          membersCount: this.group.membersCount,
          onlineCount: 0,
          dailyMessages: 0,
          weeklyGrowth: 0,
          activeRate: 0
        },
        tags: [],
        source: 'telegram',
        lastUpdated: new Date()
      });
    }
    
    this.isLoading.set(false);
  }
  
  isFavorite(): boolean {
    return this.searchService.isFavorite(this.group.id);
  }
  
  toggleFavorite(): void {
    if (this.isFavorite()) {
      this.searchService.removeFromFavorites(this.group.id);
    } else {
      this.searchService.addToFavorites(this.group);
    }
  }
  
  joinGroup(): void {
    this.searchService.joinGroup(this.group);
  }
  
  /** 提取按鈕點擊處理 — 帶前置引導 */
  handleExtractClick(): void {
    if (!this.isJoined) {
      this.toastService.warning('📥 需要先加入群組才能提取成員。請點擊「加入群組」按鈕。');
      return;
    }
    if (!this.canExtract()) {
      this.toastService.warning('🔒 需要升級會員才能使用提取功能');
      return;
    }
    this.extractMembers.emit();
  }
  
  copyLink(): void {
    const link = this.group.username 
      ? `https://t.me/${this.group.username}`
      : this.group.inviteLink || '';
    
    if (link) {
      navigator.clipboard.writeText(link);
      this.toastService.success('鏈接已複製');
    } else {
      this.toastService.warning('無可用鏈接');
    }
  }
  
  canExtract(): boolean {
    const level = this.membershipService.level();
    return level !== 'bronze';
  }
  
  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分鐘前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小時前';
    
    return new Date(date).toLocaleDateString();
  }
}
