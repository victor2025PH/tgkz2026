/**
 * 實時統計面板組件
 * Realtime Stats Panel Component
 * 
 * 功能:
 * 1. 今日關鍵指標
 * 2. 趨勢對比 (較昨日)
 * 3. 動態更新動畫
 */

import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RealtimeStats {
  matchesToday: number;
  matchesYesterday: number;
  leadsToday: number;
  leadsYesterday: number;
  repliestoday: number;
  repliesYesterday: number;
  conversionsToday: number;
  conversionsYesterday: number;
}

@Component({
  selector: 'app-realtime-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="realtime-stats bg-gradient-to-r from-slate-800/60 to-slate-800/40 rounded-xl border border-slate-700/50 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-slate-400 flex items-center gap-2">
          <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          今日數據
        </h3>
        <span class="text-xs text-slate-500">{{ currentTime() }}</span>
      </div>
      
      <div class="grid grid-cols-4 gap-3">
        <!-- 匹配次數 -->
        <div class="stat-card p-3 bg-slate-700/30 rounded-lg text-center group hover:bg-slate-700/50 transition-colors">
          <div class="text-2xl font-bold text-cyan-400 group-hover:scale-110 transition-transform">
            {{ stats().matchesToday }}
          </div>
          <div class="text-xs text-slate-400 mt-1">匹配次數</div>
          <div class="flex items-center justify-center gap-1 mt-1.5">
            @if (matchesTrend() > 0) {
              <span class="text-xs text-emerald-400">↑ {{ matchesTrend() }}%</span>
            } @else if (matchesTrend() < 0) {
              <span class="text-xs text-red-400">↓ {{ -matchesTrend() }}%</span>
            } @else {
              <span class="text-xs text-slate-500">—</span>
            }
          </div>
        </div>
        
        <!-- 新 Lead -->
        <div class="stat-card p-3 bg-slate-700/30 rounded-lg text-center group hover:bg-slate-700/50 transition-colors">
          <div class="text-2xl font-bold text-purple-400 group-hover:scale-110 transition-transform">
            {{ stats().leadsToday }}
          </div>
          <div class="text-xs text-slate-400 mt-1">新 Lead</div>
          <div class="flex items-center justify-center gap-1 mt-1.5">
            @if (leadsTrend() > 0) {
              <span class="text-xs text-emerald-400">↑ {{ leadsTrend() }}%</span>
            } @else if (leadsTrend() < 0) {
              <span class="text-xs text-red-400">↓ {{ -leadsTrend() }}%</span>
            } @else {
              <span class="text-xs text-slate-500">—</span>
            }
          </div>
        </div>
        
        <!-- 回覆數 -->
        <div class="stat-card p-3 bg-slate-700/30 rounded-lg text-center group hover:bg-slate-700/50 transition-colors">
          <div class="text-2xl font-bold text-amber-400 group-hover:scale-110 transition-transform">
            {{ stats().repliestoday }}
          </div>
          <div class="text-xs text-slate-400 mt-1">回覆數</div>
          <div class="flex items-center justify-center gap-1 mt-1.5">
            <span class="text-xs text-slate-500">{{ replyRate() }}% 回覆率</span>
          </div>
        </div>
        
        <!-- 轉化數 -->
        <div class="stat-card p-3 bg-slate-700/30 rounded-lg text-center group hover:bg-slate-700/50 transition-colors">
          <div class="text-2xl font-bold text-emerald-400 group-hover:scale-110 transition-transform">
            {{ stats().conversionsToday }}
          </div>
          <div class="text-xs text-slate-400 mt-1">轉化數</div>
          <div class="flex items-center justify-center gap-1 mt-1.5">
            <span class="text-xs text-slate-500">{{ conversionRate() }}% 轉化率</span>
          </div>
        </div>
      </div>
      
      <!-- 趨勢指示 -->
      @if (overallTrend() !== 0) {
        <div class="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-center gap-2 text-sm">
          @if (overallTrend() > 0) {
            <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
              📈 較昨日 +{{ overallTrend() }}%
            </span>
          } @else {
            <span class="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
              📉 較昨日 {{ overallTrend() }}%
            </span>
          }
        </div>
      }
    </div>
  `
})
export class RealtimeStatsComponent {
  stats = input<RealtimeStats>({
    matchesToday: 0,
    matchesYesterday: 0,
    leadsToday: 0,
    leadsYesterday: 0,
    repliestoday: 0,
    repliesYesterday: 0,
    conversionsToday: 0,
    conversionsYesterday: 0
  });
  
  currentTime = computed(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  
  matchesTrend = computed(() => {
    const s = this.stats();
    if (s.matchesYesterday === 0) return 0;
    return Math.round(((s.matchesToday - s.matchesYesterday) / s.matchesYesterday) * 100);
  });
  
  leadsTrend = computed(() => {
    const s = this.stats();
    if (s.leadsYesterday === 0) return 0;
    return Math.round(((s.leadsToday - s.leadsYesterday) / s.leadsYesterday) * 100);
  });
  
  replyRate = computed(() => {
    const s = this.stats();
    if (s.leadsToday === 0) return 0;
    return Math.round((s.repliestoday / s.leadsToday) * 100);
  });
  
  conversionRate = computed(() => {
    const s = this.stats();
    if (s.leadsToday === 0) return 0;
    return Math.round((s.conversionsToday / s.leadsToday) * 100);
  });
  
  overallTrend = computed(() => {
    return Math.round((this.matchesTrend() + this.leadsTrend()) / 2);
  });
}
