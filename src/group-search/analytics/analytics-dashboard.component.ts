/**
 * TG-AI智控王 數據分析儀表板
 * Analytics Dashboard Component v1.0
 */
import { Component, inject, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupScorer, GroupScore } from './group-scorer';
import { MemberAnalyzer, GroupMemberStats, MemberSegment } from './member-analyzer';
import { RecommendationEngine, Recommendation } from './recommendation-engine';
import { GroupBasicInfo, GroupDetailInfo, MemberBasicInfo, FavoriteGroup, SearchHistory } from '../search.types';

type DashboardTab = 'overview' | 'groups' | 'members' | 'recommendations';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <!-- 頂部標題 -->
      <div class="px-6 py-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📊</span>
            <h2 class="text-xl font-bold">數據分析中心</h2>
            <span class="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">AI</span>
          </div>
          
          <!-- Tab 切換 -->
          <div class="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            @for (tab of tabs; track tab.id) {
              <button (click)="currentTab.set(tab.id)"
                      [class]="currentTab() === tab.id 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400' 
                        : 'text-slate-400 hover:text-white'"
                      class="px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                <span>{{ tab.icon }}</span>
                <span>{{ tab.name }}</span>
              </button>
            }
          </div>
        </div>
      </div>
      
      <!-- 內容區 -->
      <div class="flex-1 overflow-auto p-6">
        <!-- 概覽 Tab -->
        @if (currentTab() === 'overview') {
          <div class="grid grid-cols-4 gap-4 mb-6">
            <!-- 統計卡片 -->
            <div class="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-5 border border-cyan-500/20">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-slate-400">已收藏群組</p>
                  <p class="text-3xl font-bold text-cyan-400 mt-1">{{ favorites.length }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl">⭐</div>
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-5 border border-purple-500/20">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-slate-400">已提取成員</p>
                  <p class="text-3xl font-bold text-purple-400 mt-1">{{ members.length }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">👥</div>
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-5 border border-green-500/20">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-slate-400">高價值成員</p>
                  <p class="text-3xl font-bold text-green-400 mt-1">{{ highValueCount() }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">💎</div>
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-2xl p-5 border border-orange-500/20">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-slate-400">推薦群組</p>
                  <p class="text-3xl font-bold text-orange-400 mt-1">{{ recommendations().length }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl">🎯</div>
              </div>
            </div>
          </div>
          
          <!-- 圖表區域 -->
          <div class="grid grid-cols-2 gap-6 mb-6">
            <!-- 群組評分分布 -->
            <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <span>📈</span> 群組評分分布
              </h3>
              <div class="space-y-3">
                @for (grade of gradeDistribution(); track grade.grade) {
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                         [style.background-color]="grade.color + '30'"
                         [style.color]="grade.color">
                      {{ grade.grade }}
                    </div>
                    <div class="flex-1">
                      <div class="h-6 bg-slate-700/50 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500"
                             [style.width.%]="grade.percentage"
                             [style.background-color]="grade.color"></div>
                      </div>
                    </div>
                    <div class="w-16 text-right text-sm">
                      <span class="font-medium">{{ grade.count }}</span>
                      <span class="text-slate-500"> ({{ grade.percentage.toFixed(0) }}%)</span>
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- 成員質量分布 -->
            <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <span>👥</span> 成員質量分布
              </h3>
              @if (memberStats()) {
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center p-4 bg-green-500/10 rounded-xl">
                    <p class="text-2xl font-bold text-green-400">{{ memberStats()!.valueDistribution.high }}</p>
                    <p class="text-sm text-slate-400 mt-1">高價值</p>
                  </div>
                  <div class="text-center p-4 bg-blue-500/10 rounded-xl">
                    <p class="text-2xl font-bold text-blue-400">{{ memberStats()!.valueDistribution.medium }}</p>
                    <p class="text-sm text-slate-400 mt-1">中等</p>
                  </div>
                  <div class="text-center p-4 bg-slate-500/10 rounded-xl">
                    <p class="text-2xl font-bold text-slate-400">{{ memberStats()!.valueDistribution.low }}</p>
                    <p class="text-sm text-slate-400 mt-1">低價值</p>
                  </div>
                </div>
                
                <!-- 關鍵指標 -->
                <div class="mt-4 grid grid-cols-2 gap-3">
                  <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span class="text-sm text-slate-400">Premium 比例</span>
                    <span class="font-medium text-yellow-400">{{ (memberStats()!.premiumRate * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span class="text-sm text-slate-400">機器人比例</span>
                    <span class="font-medium" [class]="memberStats()!.botRate > 0.1 ? 'text-red-400' : 'text-green-400'">
                      {{ (memberStats()!.botRate * 100).toFixed(1) }}%
                    </span>
                  </div>
                </div>
              } @else {
                <div class="text-center py-10 text-slate-500">
                  <p>暫無成員數據</p>
                  <p class="text-sm mt-1">提取群組成員後可查看分析</p>
                </div>
              }
            </div>
          </div>
          
          <!-- 成員細分 -->
          @if (memberStats()?.segments?.length) {
            <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 class="font-semibold mb-4 flex items-center gap-2">
                <span>🎯</span> 成員細分群體
              </h3>
              <div class="grid grid-cols-4 gap-4">
                @for (segment of memberStats()!.segments.slice(0, 4); track segment.id) {
                  <div class="p-4 rounded-xl border transition-all cursor-pointer hover:scale-105"
                       [style.border-color]="segment.color + '50'"
                       [style.background]="segment.color + '10'">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">{{ segment.name.split(' ')[0] }}</span>
                      <span class="font-medium">{{ segment.name.split(' ').slice(1).join(' ') }}</span>
                    </div>
                    <div class="flex items-end justify-between">
                      <div>
                        <p class="text-2xl font-bold" [style.color]="segment.color">{{ segment.count }}</p>
                        <p class="text-xs text-slate-500">{{ segment.percentage.toFixed(1) }}%</p>
                      </div>
                      <div class="text-xs text-slate-400 max-w-[100px] truncate">
                        {{ segment.description }}
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
        
        <!-- 群組分析 Tab -->
        @if (currentTab() === 'groups') {
          <div class="space-y-4">
            @for (fav of favorites; track fav.id) {
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                @if (groupScores().get(fav.group.id); as score) {
                  <div class="flex items-center gap-4">
                    <!-- 評分 -->
                    <div class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                         [style.background-color]="scorer.getGradeColor(score.grade) + '20'"
                         [style.color]="scorer.getGradeColor(score.grade)">
                      {{ score.grade }}
                    </div>
                    
                    <!-- 群組信息 -->
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h4 class="font-semibold">{{ fav.group.title }}</h4>
                        @for (tag of score.tags.slice(0, 3); track tag.id) {
                          <span class="px-2 py-0.5 text-xs rounded-full"
                                [style.background-color]="tag.color + '20'"
                                [style.color]="tag.color">
                            {{ tag.icon }} {{ tag.name }}
                          </span>
                        }
                      </div>
                      <p class="text-sm text-slate-400 mt-1">
                        {{ fav.group.username ? '@' + fav.group.username : '' }} · 
                        {{ formatNumber(fav.group.membersCount) }} 成員
                      </p>
                    </div>
                    
                    <!-- 得分詳情 -->
                    <div class="grid grid-cols-5 gap-2 text-center">
                      <div class="px-2">
                        <p class="text-xs text-slate-500">規模</p>
                        <p class="font-medium">{{ score.dimensions.scale.score }}</p>
                      </div>
                      <div class="px-2">
                        <p class="text-xs text-slate-500">活躍</p>
                        <p class="font-medium">{{ score.dimensions.activity.score }}</p>
                      </div>
                      <div class="px-2">
                        <p class="text-xs text-slate-500">質量</p>
                        <p class="font-medium">{{ score.dimensions.quality.score }}</p>
                      </div>
                      <div class="px-2">
                        <p class="text-xs text-slate-500">互動</p>
                        <p class="font-medium">{{ score.dimensions.engagement.score }}</p>
                      </div>
                      <div class="px-2">
                        <p class="text-xs text-slate-500">安全</p>
                        <p class="font-medium" [class]="score.dimensions.safety.score < 60 ? 'text-red-400' : ''">
                          {{ score.dimensions.safety.score }}
                        </p>
                      </div>
                    </div>
                    
                    <!-- 總分 -->
                    <div class="text-center px-4">
                      <p class="text-3xl font-bold" [style.color]="scorer.getGradeColor(score.grade)">
                        {{ score.total }}
                      </p>
                      <p class="text-xs text-slate-500">總分</p>
                    </div>
                  </div>
                  
                  <!-- 亮點和警告 -->
                  @if (score.highlights.length || score.warnings.length) {
                    <div class="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                      @for (highlight of score.highlights; track highlight) {
                        <span class="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded">
                          {{ highlight }}
                        </span>
                      }
                      @for (warning of score.warnings; track warning) {
                        <span class="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded">
                          {{ warning }}
                        </span>
                      }
                    </div>
                  }
                }
              </div>
            }
            
            @if (favorites.length === 0) {
              <div class="text-center py-20 text-slate-500">
                <div class="text-4xl mb-4">⭐</div>
                <p>暫無收藏群組</p>
                <p class="text-sm mt-1">收藏群組後可查看詳細分析</p>
              </div>
            }
          </div>
        }
        
        <!-- 推薦 Tab -->
        @if (currentTab() === 'recommendations') {
          <div class="space-y-4">
            <!-- 熱門趨勢 -->
            @if (recommendationEngine.trendingGroups().length > 0) {
              <div class="mb-6">
                <h3 class="font-semibold mb-4 flex items-center gap-2">
                  <span>🔥</span> 熱門趨勢
                </h3>
                <div class="grid grid-cols-5 gap-3">
                  @for (trending of recommendationEngine.trendingGroups().slice(0, 5); track trending.group.id) {
                    <div class="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20 cursor-pointer hover:scale-105 transition-all">
                      <p class="font-medium truncate">{{ trending.group.title }}</p>
                      <p class="text-xs text-slate-400 mt-1">{{ formatNumber(trending.group.membersCount) }} 成員</p>
                      <div class="flex items-center justify-between mt-2">
                        <span class="text-orange-400 text-sm font-medium">
                          +{{ trending.growth.toFixed(1) }}%
                        </span>
                        <span class="text-xs text-slate-500">週增長</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
            
            <!-- 推薦列表 -->
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <span>🎯</span> 為您推薦
            </h3>
            @for (rec of recommendations(); track rec.group.id) {
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/30 transition-all cursor-pointer">
                <div class="flex items-center gap-4">
                  <!-- 推薦分數 -->
                  <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xl font-bold">
                    {{ Math.round(rec.score * 100) }}
                  </div>
                  
                  <!-- 群組信息 -->
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <h4 class="font-semibold">{{ rec.group.title }}</h4>
                      <span class="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300">
                        {{ getSourceLabel(rec.source) }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-400 mt-1">{{ rec.reason }}</p>
                    <div class="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>👥 {{ formatNumber(rec.group.membersCount) }}</span>
                      @if (rec.tags?.length) {
                        @for (tag of rec.tags; track tag) {
                          <span>{{ tag }}</span>
                        }
                      }
                    </div>
                  </div>
                  
                  <!-- 置信度 -->
                  <div class="text-center">
                    <div class="w-12 h-12 rounded-full border-2 border-cyan-500/50 flex items-center justify-center">
                      <span class="text-sm font-medium">{{ Math.round(rec.confidence * 100) }}%</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">置信度</p>
                  </div>
                </div>
              </div>
            }
            
            @if (recommendations().length === 0) {
              <div class="text-center py-20 text-slate-500">
                <div class="text-4xl mb-4">🎯</div>
                <p>暫無推薦</p>
                <p class="text-sm mt-1">收藏更多群組以獲得個性化推薦</p>
              </div>
            }
          </div>
        }
        
        <!-- 成員 Tab -->
        @if (currentTab() === 'members') {
          @if (memberStats()) {
            <div class="space-y-6">
              <!-- 狀態分布 -->
              <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 class="font-semibold mb-4">📊 在線狀態分布</h3>
                <div class="flex items-end gap-2 h-40">
                  @for (status of statusChartData(); track status.status) {
                    <div class="flex-1 flex flex-col items-center">
                      <div class="w-full rounded-t-lg transition-all duration-500"
                           [style.height.%]="status.percentage"
                           [style.background-color]="status.color">
                      </div>
                      <p class="text-xs mt-2">{{ status.icon }}</p>
                      <p class="text-xs text-slate-500">{{ status.count }}</p>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 細分群體詳情 -->
              <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 class="font-semibold mb-4">🎯 細分群體詳情</h3>
                <div class="space-y-3">
                  @for (segment of memberStats()!.segments; track segment.id) {
                    <div class="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                           [style.background-color]="segment.color + '20'">
                        {{ segment.name.split(' ')[0] }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between">
                          <span class="font-medium">{{ segment.name.split(' ').slice(1).join(' ') }}</span>
                          <span class="text-sm">{{ segment.count }} 人</span>
                        </div>
                        <div class="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                               [style.width.%]="segment.percentage"
                               [style.background-color]="segment.color">
                          </div>
                        </div>
                      </div>
                      <span class="text-sm text-slate-400">{{ segment.percentage.toFixed(1) }}%</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="text-center py-20 text-slate-500">
              <div class="text-4xl mb-4">👥</div>
              <p>暫無成員數據</p>
              <p class="text-sm mt-1">提取群組成員後可查看分析</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit {
  @Input() favorites: FavoriteGroup[] = [];
  @Input() members: MemberBasicInfo[] = [];
  @Input() searchHistory: SearchHistory[] = [];
  @Input() candidateGroups: GroupBasicInfo[] = [];
  
  scorer = inject(GroupScorer);
  analyzer = inject(MemberAnalyzer);
  recommendationEngine = inject(RecommendationEngine);
  
  // Tab 配置
  tabs = [
    { id: 'overview' as DashboardTab, name: '概覽', icon: '📊' },
    { id: 'groups' as DashboardTab, name: '群組分析', icon: '🏠' },
    { id: 'recommendations' as DashboardTab, name: '智能推薦', icon: '🎯' },
    { id: 'members' as DashboardTab, name: '成員分析', icon: '👥' }
  ];
  
  currentTab = signal<DashboardTab>('overview');
  
  // 群組評分
  groupScores = signal<Map<string, GroupScore>>(new Map());
  
  // 成員統計
  memberStats = signal<GroupMemberStats | null>(null);
  
  // 推薦
  recommendations = signal<Recommendation[]>([]);
  
  // 高價值成員數
  highValueCount = computed(() => {
    const stats = this.memberStats();
    return stats?.valueDistribution.high || 0;
  });
  
  // 評分分布
  gradeDistribution = computed(() => {
    const scores = this.groupScores();
    const grades: Record<GroupScore['grade'], { count: number; color: string }> = {
      'S': { count: 0, color: '#FFD700' },
      'A': { count: 0, color: '#22C55E' },
      'B': { count: 0, color: '#3B82F6' },
      'C': { count: 0, color: '#F59E0B' },
      'D': { count: 0, color: '#EF4444' },
      'F': { count: 0, color: '#6B7280' }
    };
    
    for (const score of scores.values()) {
      grades[score.grade].count++;
    }
    
    const total = scores.size || 1;
    return Object.entries(grades).map(([grade, data]) => ({
      grade,
      count: data.count,
      color: data.color,
      percentage: (data.count / total) * 100
    }));
  });
  
  // 狀態圖表數據
  statusChartData = computed(() => {
    const stats = this.memberStats();
    if (!stats) return [];
    
    const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
      online: { icon: '🟢', color: '#22C55E', label: '在線' },
      recently: { icon: '🟡', color: '#F59E0B', label: '最近' },
      lastWeek: { icon: '🟠', color: '#F97316', label: '上週' },
      lastMonth: { icon: '🔴', color: '#EF4444', label: '上月' },
      longAgo: { icon: '⚫', color: '#6B7280', label: '很久' },
      unknown: { icon: '⚪', color: '#9CA3AF', label: '未知' }
    };
    
    const total = stats.total || 1;
    return Object.entries(stats.statusDistribution).map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100,
      ...statusConfig[status]
    }));
  });
  
  ngOnInit(): void {
    this.analyzeData();
  }
  
  private analyzeData(): void {
    // 分析群組
    if (this.favorites.length > 0) {
      const scores = this.scorer.scoreGroups(this.favorites.map(f => f.group));
      this.groupScores.set(scores);
    }
    
    // 分析成員
    if (this.members.length > 0) {
      const stats = this.analyzer.analyzeGroupMembers(this.members);
      this.memberStats.set(stats);
    }
    
    // 生成推薦
    if (this.candidateGroups.length > 0) {
      this.recommendationEngine.generateRecommendations(
        this.favorites,
        this.searchHistory,
        this.candidateGroups
      ).then(recs => {
        this.recommendations.set(recs);
      });
    }
  }
  
  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      similar: '相似推薦',
      trending: '熱門趨勢',
      category: '同類推薦',
      personalized: '個性化',
      discovery: '發現'
    };
    return labels[source] || source;
  }
  
  formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }
}
