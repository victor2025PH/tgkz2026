import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 成員數據接口
export interface ExtractedMember {
  id: number;
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  bio: string;
  language_code: string;
  
  // 狀態標記
  is_bot: boolean;
  is_premium: boolean;
  is_verified: boolean;
  is_scam: boolean;
  is_fake: boolean;
  is_deleted: boolean;
  has_photo: boolean;
  
  // 在線狀態
  online_status: 'online' | 'recently' | 'last_week' | 'last_month' | 'long_ago' | 'unknown';
  last_online: string | null;
  activity_score: number;
  
  // 來源信息
  source_chat_id: string;
  source_chat_title: string;
  groups: string; // JSON array of group IDs
  extracted_at: string;
  extracted_by_phone: string;
  
  // 營銷狀態
  value_level: 'S' | 'A' | 'B' | 'C' | 'D';
  tags: string; // JSON array of tags
  notes: string;
  contacted: boolean;
  contacted_at: string | null;
  response_status: string;
  converted: boolean;
  
  created_at: string;
  updated_at: string;
}

// 統計數據接口
export interface MemberStats {
  total: number;
  online: number;
  recently: number;
  premium: number;
  chinese: number;
  contacted: number;
  converted: number;
  todayNew: number;
  byValueLevel: { [key: string]: number };
  bySource: { group: string; count: number }[];
}

@Component({
  selector: 'app-member-database',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="member-database-container">
      <!-- 頁面標題 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">📁</span>
            成員資料庫
          </h1>
          <p class="page-desc">管理和分析提取的 Telegram 成員數據</p>
        </div>
        <div class="header-actions">
          <!-- P4: 高級工具按鈕組 -->
          <div class="relative inline-block" style="position: relative;">
            <button (click)="showAdvancedMenu.set(!showAdvancedMenu())" class="btn-secondary">
              🛠️ 高級工具 ▾
            </button>
            @if (showAdvancedMenu()) {
              <div class="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-2 z-50" style="position: absolute; right: 0; margin-top: 8px; width: 240px;">
                <button (click)="deduplicateMembers(); showAdvancedMenu.set(false)" class="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2" style="display: flex; align-items: center; padding: 8px 16px;">
                  🔄 智能去重
                  <span class="ml-auto text-xs text-slate-400" style="margin-left: auto; font-size: 11px; color: #94a3b8;">跨群組合併</span>
                </button>
                <button (click)="recalculateScores(); showAdvancedMenu.set(false)" class="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2" style="display: flex; align-items: center; padding: 8px 16px;">
                  📊 重算評分
                  <span class="ml-auto text-xs text-slate-400" style="margin-left: auto; font-size: 11px; color: #94a3b8;">更新價值等級</span>
                </button>
                <div class="border-t border-slate-700 my-1" style="border-top: 1px solid #334155; margin: 4px 0;"></div>
                <button (click)="showGroupProfile(); showAdvancedMenu.set(false)" class="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2" style="display: flex; align-items: center; padding: 8px 16px;">
                  📈 群組畫像
                  <span class="ml-auto text-xs text-slate-400" style="margin-left: auto; font-size: 11px; color: #94a3b8;">質量分析</span>
                </button>
                <button (click)="compareGroups(); showAdvancedMenu.set(false)" class="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2" style="display: flex; align-items: center; padding: 8px 16px;">
                  📊 群組對比
                  <span class="ml-auto text-xs text-slate-400" style="margin-left: auto; font-size: 11px; color: #94a3b8;">多群對比</span>
                </button>
                <div class="border-t border-slate-700 my-1" style="border-top: 1px solid #334155; margin: 4px 0;"></div>
                <button (click)="viewExtractionStats(); showAdvancedMenu.set(false)" class="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2" style="display: flex; align-items: center; padding: 8px 16px;">
                  📉 提取統計
                  <span class="ml-auto text-xs text-slate-400" style="margin-left: auto; font-size: 11px; color: #94a3b8;">成功率/效能</span>
                </button>
              </div>
            }
          </div>
          
          <button (click)="refreshMembers()" [disabled]="isLoading()" class="btn-secondary">
            <span [class.animate-spin]="isLoading()">🔄</span>
            {{ isLoading() ? '載入中...' : '刷新' }}
          </button>
          <button (click)="exportMembers()" [disabled]="filteredMembers().length === 0" class="btn-primary">
            📥 導出 CSV
          </button>
        </div>
      </div>

      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats().total | number }}</div>
            <div class="stat-label">總成員數</div>
          </div>
          @if (stats().todayNew > 0) {
            <div class="stat-badge success">+{{ stats().todayNew }} 今日</div>
          }
        </div>
        
        <div class="stat-card online">
          <div class="stat-icon">🟢</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats().online | number }}</div>
            <div class="stat-label">在線成員</div>
          </div>
          <div class="stat-percent">{{ getOnlinePercent() }}%</div>
        </div>
        
        <div class="stat-card premium">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats().premium | number }}</div>
            <div class="stat-label">Premium 用戶</div>
          </div>
          <div class="stat-percent">{{ getPremiumPercent() }}%</div>
        </div>
        
        <div class="stat-card chinese">
          <div class="stat-icon">🇨🇳</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats().chinese | number }}</div>
            <div class="stat-label">華人成員</div>
          </div>
          <div class="stat-percent">{{ getChinesePercent() }}%</div>
        </div>
        
        <div class="stat-card contacted">
          <div class="stat-icon">💬</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats().contacted | number }}</div>
            <div class="stat-label">已聯繫</div>
          </div>
          <div class="stat-percent">{{ getContactedPercent() }}%</div>
        </div>
        
        <div class="stat-card converted">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats().converted | number }}</div>
            <div class="stat-label">已轉化</div>
          </div>
          <div class="stat-percent">{{ getConvertedPercent() }}%</div>
        </div>
      </div>

      <!-- 篩選器 -->
      <div class="filter-section">
        <div class="filter-row">
          <!-- 搜索框 -->
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange($event)"
              placeholder="搜索姓名、用戶名、ID..."
              class="search-input"
            />
            @if (searchQuery) {
              <button (click)="clearSearch()" class="search-clear">✕</button>
            }
          </div>
          
          <!-- 來源群組篩選 -->
          <select [(ngModel)]="selectedSource" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">所有來源群組</option>
            @for (source of sourceGroups(); track source.group) {
              <option [value]="source.group">{{ source.title }} ({{ source.count }})</option>
            }
          </select>
          
          <!-- 在線狀態篩選 -->
          <select [(ngModel)]="selectedOnlineStatus" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">所有狀態</option>
            <option value="online">🟢 在線</option>
            <option value="recently">🟡 最近上線</option>
            <option value="last_week">🟠 本週上線</option>
            <option value="long_ago">⚪ 長期離線</option>
          </select>
          
          <!-- 價值等級篩選 -->
          <select [(ngModel)]="selectedValueLevel" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">所有等級</option>
            <option value="S">S 級 - 頂級</option>
            <option value="A">A 級 - 優質</option>
            <option value="B">B 級 - 普通</option>
            <option value="C">C 級 - 一般</option>
            <option value="D">D 級 - 低價值</option>
          </select>
        </div>
        
        <div class="filter-row">
          <!-- 快捷篩選 -->
          <label class="filter-checkbox">
            <input type="checkbox" [(ngModel)]="filterPremium" (ngModelChange)="applyFilters()" />
            <span>⭐ Premium</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" [(ngModel)]="filterChinese" (ngModelChange)="applyFilters()" />
            <span>🇨🇳 華人</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" [(ngModel)]="filterHasUsername" (ngModelChange)="applyFilters()" />
            <span>📛 有用戶名</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" [(ngModel)]="filterNotContacted" (ngModelChange)="applyFilters()" />
            <span>📭 未聯繫</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" [(ngModel)]="filterHasPhoto" (ngModelChange)="applyFilters()" />
            <span>📷 有頭像</span>
          </label>
          
          @if (hasActiveFilters()) {
            <button (click)="clearFilters()" class="btn-text">
              🗑️ 清除篩選
            </button>
          }
          
          <div class="filter-result">
            找到 <strong>{{ filteredMembers().length | number }}</strong> 個成員
          </div>
        </div>
      </div>

      <!-- 成員列表 -->
      <div class="member-list-section">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在載入成員數據...</p>
          </div>
        } @else if (filteredMembers().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>暫無成員數據</h3>
            <p>請先從「資源發現」頁面提取群組成員</p>
          </div>
        } @else {
          <!-- 批量操作欄 -->
          @if (selectedMemberIds().length > 0) {
            <div class="batch-action-bar">
              <span class="selected-count">已選擇 {{ selectedMemberIds().length }} 個成員</span>
              <div class="batch-actions">
                <button (click)="batchSendMessage()" class="btn-batch">
                  📨 批量發消息
                </button>
                <button (click)="batchAddTags()" class="btn-batch">
                  🏷️ 批量標籤
                </button>
                <button (click)="batchMarkContacted()" class="btn-batch">
                  ✅ 標記已聯繫
                </button>
                <button (click)="batchExport()" class="btn-batch">
                  📥 導出選中
                </button>
                <button (click)="clearSelection()" class="btn-batch danger">
                  ✕ 取消選擇
                </button>
              </div>
            </div>
          }
          
          <!-- 列表表格 -->
          <div class="member-table-container">
            <table class="member-table">
              <thead>
                <tr>
                  <th class="col-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="isAllSelected()" 
                      [indeterminate]="isPartialSelected()"
                      (change)="toggleSelectAll()"
                    />
                  </th>
                  <th class="col-id" (click)="sortBy('user_id')">
                    ID
                    @if (sortField === 'user_id') {
                      <span>{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </th>
                  <th class="col-user" (click)="sortBy('first_name')">
                    用戶
                    @if (sortField === 'first_name') {
                      <span>{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </th>
                  <th class="col-username">用戶名</th>
                  <th class="col-status" (click)="sortBy('online_status')">
                    狀態
                    @if (sortField === 'online_status') {
                      <span>{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </th>
                  <th class="col-level" (click)="sortBy('value_level')">
                    等級
                    @if (sortField === 'value_level') {
                      <span>{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </th>
                  <th class="col-source">來源群組</th>
                  <th class="col-tags">標籤</th>
                  <th class="col-contacted">聯繫狀態</th>
                  <th class="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                @for (member of paginatedMembers(); track member.user_id) {
                  <tr [class.selected]="isMemberSelected(member.user_id)" (click)="openMemberDetail(member)">
                    <td class="col-checkbox" (click)="$event.stopPropagation()">
                      <input 
                        type="checkbox" 
                        [checked]="isMemberSelected(member.user_id)"
                        (change)="toggleMemberSelection(member.user_id)"
                      />
                    </td>
                    <td class="col-id">
                      <span class="user-id" [title]="member.user_id">{{ member.user_id }}</span>
                    </td>
                    <td class="col-user">
                      <div class="user-info">
                        <div class="user-avatar" [class.has-photo]="member.has_photo">
                          {{ getAvatarLetter(member) }}
                        </div>
                        <div class="user-name-wrapper">
                          <span class="user-name">
                            {{ member.first_name }} {{ member.last_name }}
                            @if (member.is_premium) {
                              <span class="premium-badge" title="Premium">⭐</span>
                            }
                            @if (member.is_verified) {
                              <span class="verified-badge" title="已驗證">✓</span>
                            }
                            @if (isChinese(member)) {
                              <span class="chinese-badge" title="華人">🇨🇳</span>
                            }
                          </span>
                          @if (member.bio) {
                            <span class="user-bio" [title]="member.bio">{{ member.bio }}</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="col-username">
                      @if (member.username) {
                        <a [href]="'https://t.me/' + member.username" target="_blank" class="username-link" (click)="$event.stopPropagation()">
                          @{{ member.username }}
                        </a>
                      } @else {
                        <span class="no-username">-</span>
                      }
                    </td>
                    <td class="col-status">
                      <span class="status-badge" [class]="'status-' + member.online_status">
                        {{ getStatusIcon(member.online_status) }}
                        {{ getStatusText(member.online_status) }}
                      </span>
                    </td>
                    <td class="col-level">
                      <span class="level-badge" [class]="'level-' + member.value_level">
                        {{ member.value_level }}
                      </span>
                    </td>
                    <td class="col-source">
                      <span class="source-name" [title]="member.source_chat_title">
                        {{ member.source_chat_title || '未知' }}
                      </span>
                    </td>
                    <td class="col-tags">
                      @if (getMemberTags(member).length > 0) {
                        <div class="tags-container">
                          @for (tag of getMemberTags(member).slice(0, 2); track tag) {
                            <span class="tag">{{ tag }}</span>
                          }
                          @if (getMemberTags(member).length > 2) {
                            <span class="tag-more">+{{ getMemberTags(member).length - 2 }}</span>
                          }
                        </div>
                      } @else {
                        <span class="no-tags">-</span>
                      }
                    </td>
                    <td class="col-contacted">
                      @if (member.contacted) {
                        <span class="contacted-badge yes">
                          ✅ 已聯繫
                        </span>
                      } @else {
                        <span class="contacted-badge no">
                          📭 未聯繫
                        </span>
                      }
                    </td>
                    <td class="col-actions" (click)="$event.stopPropagation()">
                      <div class="action-buttons">
                        <button (click)="sendMessage(member)" class="action-btn" title="發消息">
                          💬
                        </button>
                        <button (click)="addToFunnel(member)" class="action-btn" title="加入漏斗">
                          📤
                        </button>
                        <button (click)="openMemberDetail(member)" class="action-btn" title="查看詳情">
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- 分頁 -->
          <div class="pagination">
            <div class="page-info">
              顯示 {{ getPageStart() }} - {{ getPageEnd() }} / {{ filteredMembers().length }} 個成員
            </div>
            <div class="page-controls">
              <button (click)="goToPage(1)" [disabled]="currentPage === 1" class="page-btn">
                ⏮️
              </button>
              <button (click)="goToPage(currentPage - 1)" [disabled]="currentPage === 1" class="page-btn">
                ◀️
              </button>
              <span class="page-number">{{ currentPage }} / {{ totalPages() }}</span>
              <button (click)="goToPage(currentPage + 1)" [disabled]="currentPage >= totalPages()" class="page-btn">
                ▶️
              </button>
              <button (click)="goToPage(totalPages())" [disabled]="currentPage >= totalPages()" class="page-btn">
                ⏭️
              </button>
              <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()" class="page-size-select">
                <option [value]="25">25 / 頁</option>
                <option [value]="50">50 / 頁</option>
                <option [value]="100">100 / 頁</option>
                <option [value]="200">200 / 頁</option>
              </select>
            </div>
          </div>
        }
      </div>

      <!-- 成員詳情側邊欄 -->
      @if (selectedMember()) {
        <div class="member-detail-overlay" (click)="closeMemberDetail()"></div>
        <div class="member-detail-drawer">
          <div class="drawer-header">
            <h2>成員詳情</h2>
            <button (click)="closeMemberDetail()" class="close-btn">✕</button>
          </div>
          
          <div class="drawer-content">
            <!-- 基本信息 -->
            <div class="detail-section">
              <div class="member-profile">
                <div class="profile-avatar" [class.has-photo]="selectedMember()!.has_photo">
                  {{ getAvatarLetter(selectedMember()!) }}
                </div>
                <div class="profile-info">
                  <h3 class="profile-name">
                    {{ selectedMember()!.first_name }} {{ selectedMember()!.last_name }}
                    @if (selectedMember()!.is_premium) {
                      <span class="premium-badge">⭐</span>
                    }
                  </h3>
                  @if (selectedMember()!.username) {
                    <a [href]="'https://t.me/' + selectedMember()!.username" target="_blank" class="profile-username">
                      @{{ selectedMember()!.username }}
                    </a>
                  }
                  <span class="status-badge" [class]="'status-' + selectedMember()!.online_status">
                    {{ getStatusIcon(selectedMember()!.online_status) }}
                    {{ getStatusText(selectedMember()!.online_status) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- ID 和電話 -->
            <div class="detail-section">
              <h4 class="section-title">📋 基本信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Telegram ID</span>
                  <span class="detail-value copyable" (click)="copyToClipboard(selectedMember()!.user_id)">
                    {{ selectedMember()!.user_id }}
                    <span class="copy-icon">📋</span>
                  </span>
                </div>
                @if (selectedMember()!.phone) {
                  <div class="detail-item">
                    <span class="detail-label">電話號碼</span>
                    <span class="detail-value">{{ selectedMember()!.phone }}</span>
                  </div>
                }
                @if (selectedMember()!.language_code) {
                  <div class="detail-item">
                    <span class="detail-label">語言</span>
                    <span class="detail-value">{{ selectedMember()!.language_code }}</span>
                  </div>
                }
                <div class="detail-item">
                  <span class="detail-label">價值等級</span>
                  <span class="detail-value">
                    <span class="level-badge" [class]="'level-' + selectedMember()!.value_level">
                      {{ selectedMember()!.value_level }} 級
                    </span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">活躍度評分</span>
                  <span class="detail-value">{{ selectedMember()!.activity_score }}/100</span>
                </div>
              </div>
            </div>
            
            <!-- 帳號狀態 -->
            <div class="detail-section">
              <h4 class="section-title">🔖 帳號狀態</h4>
              <div class="status-tags">
                @if (selectedMember()!.is_premium) {
                  <span class="status-tag premium">⭐ Premium</span>
                }
                @if (selectedMember()!.is_verified) {
                  <span class="status-tag verified">✓ 已驗證</span>
                }
                @if (selectedMember()!.has_photo) {
                  <span class="status-tag photo">📷 有頭像</span>
                }
                @if (isChinese(selectedMember()!)) {
                  <span class="status-tag chinese">🇨🇳 華人</span>
                }
                @if (selectedMember()!.is_scam) {
                  <span class="status-tag danger">⚠️ 詐騙標記</span>
                }
                @if (selectedMember()!.is_deleted) {
                  <span class="status-tag deleted">🗑️ 已刪除</span>
                }
              </div>
            </div>
            
            <!-- 個人簡介 -->
            @if (selectedMember()!.bio) {
              <div class="detail-section">
                <h4 class="section-title">📝 個人簡介</h4>
                <p class="bio-text">{{ selectedMember()!.bio }}</p>
              </div>
            }
            
            <!-- 來源群組 -->
            <div class="detail-section">
              <h4 class="section-title">📍 來源群組</h4>
              <div class="source-list">
                <div class="source-item">
                  <span class="source-name">{{ selectedMember()!.source_chat_title }}</span>
                  <span class="source-date">{{ formatDate(selectedMember()!.extracted_at) }}</span>
                </div>
                @for (groupId of getGroupsList(selectedMember()!); track groupId) {
                  @if (groupId !== selectedMember()!.source_chat_id) {
                    <div class="source-item">
                      <span class="source-name">群組 {{ groupId }}</span>
                    </div>
                  }
                }
              </div>
            </div>
            
            <!-- 標籤 -->
            <div class="detail-section">
              <h4 class="section-title">🏷️ 標籤</h4>
              <div class="tags-edit">
                @for (tag of getMemberTags(selectedMember()!); track tag) {
                  <span class="tag editable">
                    {{ tag }}
                    <button (click)="removeTag(selectedMember()!, tag)" class="tag-remove">✕</button>
                  </span>
                }
                <button (click)="openAddTagDialog()" class="add-tag-btn">+ 添加標籤</button>
              </div>
            </div>
            
            <!-- 備註 -->
            <div class="detail-section">
              <h4 class="section-title">📝 備註</h4>
              <textarea 
                [(ngModel)]="memberNotes"
                (blur)="saveMemberNotes()"
                placeholder="添加跟進備註..."
                class="notes-textarea"
              ></textarea>
            </div>
            
            <!-- 營銷狀態 -->
            <div class="detail-section">
              <h4 class="section-title">📊 營銷狀態</h4>
              <div class="marketing-status">
                <div class="status-item">
                  <span class="status-label">聯繫狀態</span>
                  <span class="status-value" [class.contacted]="selectedMember()!.contacted">
                    {{ selectedMember()!.contacted ? '✅ 已聯繫' : '📭 未聯繫' }}
                  </span>
                </div>
                @if (selectedMember()!.contacted_at) {
                  <div class="status-item">
                    <span class="status-label">聯繫時間</span>
                    <span class="status-value">{{ formatDate(selectedMember()!.contacted_at) }}</span>
                  </div>
                }
                @if (selectedMember()!.response_status) {
                  <div class="status-item">
                    <span class="status-label">回覆狀態</span>
                    <span class="status-value">{{ selectedMember()!.response_status }}</span>
                  </div>
                }
                <div class="status-item">
                  <span class="status-label">轉化狀態</span>
                  <span class="status-value" [class.converted]="selectedMember()!.converted">
                    {{ selectedMember()!.converted ? '✅ 已轉化' : '⏳ 待轉化' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 操作按鈕 -->
          <div class="drawer-footer">
            <button (click)="sendMessage(selectedMember()!)" class="btn-primary">
              💬 發消息
            </button>
            <button (click)="addToFunnel(selectedMember()!)" class="btn-secondary">
              📤 加入漏斗
            </button>
            @if (!selectedMember()!.contacted) {
              <button (click)="markAsContacted(selectedMember()!)" class="btn-secondary">
                ✅ 標記已聯繫
              </button>
            }
          </div>
        </div>
      }

      <!-- 添加標籤對話框 -->
      @if (showAddTagDialog()) {
        <div class="dialog-overlay" (click)="closeAddTagDialog()"></div>
        <div class="dialog">
          <div class="dialog-header">
            <h3>添加標籤</h3>
            <button (click)="closeAddTagDialog()" class="close-btn">✕</button>
          </div>
          <div class="dialog-content">
            <input 
              type="text" 
              [(ngModel)]="newTagName"
              placeholder="輸入標籤名稱..."
              class="tag-input"
              (keyup.enter)="addTag()"
            />
            <div class="suggested-tags">
              <p class="suggested-title">常用標籤：</p>
              <div class="suggested-list">
                @for (tag of suggestedTags; track tag) {
                  <button (click)="addSuggestedTag(tag)" class="suggested-tag">{{ tag }}</button>
                }
              </div>
            </div>
          </div>
          <div class="dialog-footer">
            <button (click)="closeAddTagDialog()" class="btn-secondary">取消</button>
            <button (click)="addTag()" [disabled]="!newTagName" class="btn-primary">添加</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .member-database-container {
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
    }

    /* 頁面標題 */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    .title-icon {
      font-size: 1.75rem;
    }

    .page-desc {
      color: #94a3b8;
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* 按鈕樣式 */
    .btn-primary {
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 0.5rem 1rem;
      background: rgba(71, 85, 105, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(71, 85, 105, 0.7);
      border-color: rgba(148, 163, 184, 0.3);
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-text {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .btn-text:hover {
      color: #f87171;
    }

    /* 統計卡片 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
    }

    .stat-icon {
      font-size: 1.5rem;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .stat-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      font-weight: 600;
    }

    .stat-badge.success {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }

    .stat-percent {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .stat-card.online { border-left: 3px solid #22c55e; }
    .stat-card.premium { border-left: 3px solid #f59e0b; }
    .stat-card.chinese { border-left: 3px solid #ef4444; }
    .stat-card.contacted { border-left: 3px solid #3b82f6; }
    .stat-card.converted { border-left: 3px solid #8b5cf6; }

    /* 篩選器 */
    .filter-section {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .filter-row:last-child {
      margin-bottom: 0;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 200px;
      max-width: 300px;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.875rem;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 2.25rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.5rem;
      color: white;
      font-size: 0.875rem;
    }

    .search-input:focus {
      outline: none;
      border-color: #06b6d4;
    }

    .search-clear {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.75rem;
    }

    .filter-select {
      padding: 0.5rem 0.75rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.5rem;
      color: white;
      font-size: 0.875rem;
      min-width: 140px;
    }

    .filter-select:focus {
      outline: none;
      border-color: #06b6d4;
    }

    .filter-checkbox {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: rgba(15, 23, 42, 0.3);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-checkbox:hover {
      background: rgba(15, 23, 42, 0.5);
      border-color: rgba(148, 163, 184, 0.25);
    }

    .filter-checkbox:has(input:checked) {
      background: rgba(6, 182, 212, 0.15);
      border-color: rgba(6, 182, 212, 0.4);
    }

    .filter-checkbox input {
      margin: 0;
    }

    .filter-result {
      margin-left: auto;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    /* 成員列表區域 */
    .member-list-section {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .loading-state, .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: #94a3b8;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(6, 182, 212, 0.2);
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: white;
      margin: 0 0 0.5rem;
    }

    /* 批量操作欄 */
    .batch-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: rgba(6, 182, 212, 0.1);
      border-bottom: 1px solid rgba(6, 182, 212, 0.2);
    }

    .selected-count {
      color: #22d3ee;
      font-weight: 500;
    }

    .batch-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-batch {
      padding: 0.375rem 0.75rem;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.375rem;
      color: #e2e8f0;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-batch:hover {
      background: rgba(51, 65, 85, 0.8);
    }

    .btn-batch.danger {
      color: #f87171;
    }

    .btn-batch.danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* 表格樣式 */
    .member-table-container {
      overflow-x: auto;
    }

    .member-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .member-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      background: rgba(15, 23, 42, 0.5);
      color: #94a3b8;
      font-weight: 500;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }

    .member-table th:hover {
      background: rgba(15, 23, 42, 0.7);
    }

    .member-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.05);
      color: #e2e8f0;
    }

    .member-table tr {
      cursor: pointer;
      transition: background 0.15s;
    }

    .member-table tbody tr:hover {
      background: rgba(51, 65, 85, 0.3);
    }

    .member-table tbody tr.selected {
      background: rgba(6, 182, 212, 0.1);
    }

    .col-checkbox { width: 40px; }
    .col-id { width: 120px; }
    .col-user { min-width: 180px; }
    .col-username { width: 120px; }
    .col-status { width: 100px; }
    .col-level { width: 60px; }
    .col-source { width: 150px; }
    .col-tags { width: 120px; }
    .col-contacted { width: 100px; }
    .col-actions { width: 100px; }

    .user-id {
      font-family: monospace;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #475569, #334155);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .user-avatar.has-photo {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
    }

    .user-name-wrapper {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .premium-badge, .verified-badge, .chinese-badge {
      font-size: 0.75rem;
    }

    .user-bio {
      font-size: 0.75rem;
      color: #64748b;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .username-link {
      color: #22d3ee;
      text-decoration: none;
    }

    .username-link:hover {
      text-decoration: underline;
    }

    .no-username, .no-tags {
      color: #475569;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .status-badge.status-online { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .status-badge.status-recently { background: rgba(234, 179, 8, 0.2); color: #fde047; }
    .status-badge.status-last_week { background: rgba(249, 115, 22, 0.2); color: #fdba74; }
    .status-badge.status-last_month { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    .status-badge.status-long_ago { background: rgba(71, 85, 105, 0.2); color: #64748b; }
    .status-badge.status-unknown { background: rgba(71, 85, 105, 0.2); color: #64748b; }

    .level-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .level-badge.level-S { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
    .level-badge.level-A { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; }
    .level-badge.level-B { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
    .level-badge.level-C { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
    .level-badge.level-D { background: rgba(71, 85, 105, 0.5); color: #94a3b8; }

    .source-name {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    .tags-container {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .tag {
      padding: 0.125rem 0.375rem;
      background: rgba(59, 130, 246, 0.2);
      border-radius: 0.25rem;
      font-size: 0.7rem;
      color: #93c5fd;
    }

    .tag-more {
      padding: 0.125rem 0.375rem;
      background: rgba(71, 85, 105, 0.3);
      border-radius: 0.25rem;
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .contacted-badge {
      font-size: 0.75rem;
    }

    .contacted-badge.yes { color: #86efac; }
    .contacted-badge.no { color: #94a3b8; }

    .action-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .action-btn {
      padding: 0.25rem 0.5rem;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(71, 85, 105, 0.7);
    }

    /* 分頁 */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: rgba(15, 23, 42, 0.3);
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    .page-info {
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .page-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .page-btn {
      padding: 0.375rem 0.5rem;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-btn:hover:not(:disabled) {
      background: rgba(71, 85, 105, 0.7);
    }

    .page-number {
      color: white;
      font-size: 0.875rem;
      padding: 0 0.5rem;
    }

    .page-size-select {
      padding: 0.375rem 0.5rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.25rem;
      color: white;
      font-size: 0.75rem;
    }

    /* 成員詳情側邊欄 */
    .member-detail-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
    }

    .member-detail-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 90vw;
      height: 100vh;
      background: #1e293b;
      border-left: 1px solid rgba(148, 163, 184, 0.1);
      z-index: 101;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .drawer-header h2 {
      margin: 0;
      font-size: 1.125rem;
      color: white;
    }

    .close-btn {
      padding: 0.375rem;
      background: rgba(71, 85, 105, 0.5);
      border: none;
      border-radius: 0.375rem;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1rem;
    }

    .close-btn:hover {
      background: rgba(71, 85, 105, 0.8);
      color: white;
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0 0 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .member-profile {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .profile-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #475569, #334155);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 1.5rem;
    }

    .profile-avatar.has-photo {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .profile-name {
      margin: 0;
      font-size: 1.125rem;
      color: white;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .profile-username {
      color: #22d3ee;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .profile-username:hover {
      text-decoration: underline;
    }

    .detail-grid {
      display: grid;
      gap: 0.75rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      color: #64748b;
      font-size: 0.875rem;
    }

    .detail-value {
      color: white;
      font-size: 0.875rem;
    }

    .detail-value.copyable {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .detail-value.copyable:hover {
      color: #22d3ee;
    }

    .copy-icon {
      font-size: 0.75rem;
      opacity: 0.5;
    }

    .status-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .status-tag {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .status-tag.premium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .status-tag.verified { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .status-tag.photo { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .status-tag.chinese { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .status-tag.danger { background: rgba(239, 68, 68, 0.3); color: #f87171; }
    .status-tag.deleted { background: rgba(71, 85, 105, 0.3); color: #94a3b8; }

    .bio-text {
      color: #cbd5e1;
      font-size: 0.875rem;
      line-height: 1.5;
      background: rgba(15, 23, 42, 0.5);
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin: 0;
    }

    .source-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .source-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 0.375rem;
    }

    .source-item .source-name {
      color: white;
      font-size: 0.875rem;
    }

    .source-date {
      color: #64748b;
      font-size: 0.75rem;
    }

    .tags-edit {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag.editable {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .tag-remove {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.625rem;
      padding: 0;
    }

    .tag-remove:hover {
      color: #f87171;
    }

    .add-tag-btn {
      padding: 0.25rem 0.5rem;
      background: rgba(51, 65, 85, 0.5);
      border: 1px dashed rgba(148, 163, 184, 0.3);
      border-radius: 0.25rem;
      color: #94a3b8;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .add-tag-btn:hover {
      background: rgba(51, 65, 85, 0.7);
      color: white;
    }

    .notes-textarea {
      width: 100%;
      min-height: 80px;
      padding: 0.75rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.5rem;
      color: white;
      font-size: 0.875rem;
      resize: vertical;
    }

    .notes-textarea:focus {
      outline: none;
      border-color: #06b6d4;
    }

    .marketing-status {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: rgba(15, 23, 42, 0.3);
      border-radius: 0.375rem;
    }

    .status-label {
      color: #64748b;
      font-size: 0.875rem;
    }

    .status-value {
      font-size: 0.875rem;
    }

    .status-value.contacted { color: #86efac; }
    .status-value.converted { color: #c084fc; }

    .drawer-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      display: flex;
      gap: 0.75rem;
    }

    .drawer-footer .btn-primary,
    .drawer-footer .btn-secondary {
      flex: 1;
      justify-content: center;
    }

    /* 對話框 */
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
    }

    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-width: 90vw;
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.75rem;
      z-index: 201;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .dialog-header h3 {
      margin: 0;
      color: white;
    }

    .dialog-content {
      padding: 1.25rem;
    }

    .tag-input {
      width: 100%;
      padding: 0.75rem;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.5rem;
      color: white;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .tag-input:focus {
      outline: none;
      border-color: #06b6d4;
    }

    .suggested-tags {
      margin-top: 1rem;
    }

    .suggested-title {
      color: #94a3b8;
      font-size: 0.75rem;
      margin: 0 0 0.5rem;
    }

    .suggested-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .suggested-tag {
      padding: 0.25rem 0.5rem;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 0.25rem;
      color: #e2e8f0;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .suggested-tag:hover {
      background: rgba(6, 182, 212, 0.2);
      border-color: rgba(6, 182, 212, 0.4);
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }
  `]
})
export class MemberDatabaseComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);

  // 事件輸出 - 與父組件通信
  sendMessageEvent = output<ExtractedMember>();
  addToFunnelEvent = output<ExtractedMember>();
  batchSendMessageEvent = output<ExtractedMember[]>();

  // 數據狀態
  members = signal<ExtractedMember[]>([]);
  filteredMembers = signal<ExtractedMember[]>([]);
  isLoading = signal(false);
  stats = signal<MemberStats>({
    total: 0,
    online: 0,
    recently: 0,
    premium: 0,
    chinese: 0,
    contacted: 0,
    converted: 0,
    todayNew: 0,
    byValueLevel: {},
    bySource: []
  });

  // 來源群組列表
  sourceGroups = signal<{ group: string; title: string; count: number }[]>([]);

  // 篩選條件
  searchQuery = '';
  selectedSource = '';
  selectedOnlineStatus = '';
  selectedValueLevel = '';
  filterPremium = false;
  filterChinese = false;
  filterHasUsername = false;
  filterNotContacted = false;
  filterHasPhoto = false;

  // 排序
  sortField = 'extracted_at';
  sortDirection: 'asc' | 'desc' = 'desc';

  // 分頁
  currentPage = 1;
  pageSize = 50;

  // 選擇
  selectedMemberIds = signal<string[]>([]);

  // 詳情側邊欄
  selectedMember = signal<ExtractedMember | null>(null);
  memberNotes = '';

  // 添加標籤對話框
  showAddTagDialog = signal(false);
  newTagName = '';
  suggestedTags = ['高意向', '幣圈', 'DeFi', 'NFT', '投資', '交易', '量化', '礦工', '開發者', '運營'];

  // P4 高級功能菜單
  showAdvancedMenu = signal(false);

  ngOnInit(): void {
    this.loadMembers();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    // 清理事件監聽
  }

  private setupEventListeners(): void {
    this.ipcService.on('extracted-members-list', (data: any) => {
      console.log('[MemberDatabase] Received extracted-members-list event:', data);
      
      // 清除超時
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }
      
      if (data.success) {
        console.log(`[MemberDatabase] Loaded ${data.members?.length || 0} members`);
        this.members.set(data.members || []);
        this.applyFilters();
        this.calculateStats();
        this.isLoading.set(false);
      } else {
        console.error('[MemberDatabase] Load failed:', data.error);
        this.toastService.error(`載入失敗: ${data.error}`);
        this.isLoading.set(false);
      }
    });

    this.ipcService.on('member-stats', (data: any) => {
      if (data.success) {
        this.stats.update(s => ({ ...s, ...data }));
      }
    });
  }

  private loadTimeout: any = null;
  
  loadMembers(): void {
    console.log('[MemberDatabase] loadMembers called');
    this.isLoading.set(true);
    
    // 清除之前的超時
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    
    // 設置 15 秒超時
    this.loadTimeout = setTimeout(() => {
      if (this.isLoading()) {
        console.warn('[MemberDatabase] Load timeout after 15 seconds');
        this.isLoading.set(false);
        this.toastService.error('載入超時，請重試');
      }
    }, 15000);
    
    // 減少初始載入量以避免超時
    console.log('[MemberDatabase] Sending get-extracted-members request');
    this.ipcService.send('get-extracted-members', {
      limit: 500,
      offset: 0
    });
  }

  refreshMembers(): void {
    this.loadMembers();
    this.toastService.info('正在刷新數據...');
  }

  // 篩選相關
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.members()];

    // 搜索
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m =>
        m.user_id.includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.first_name?.toLowerCase().includes(q) ||
        m.last_name?.toLowerCase().includes(q)
      );
    }

    // 來源群組
    if (this.selectedSource) {
      result = result.filter(m => m.source_chat_id === this.selectedSource);
    }

    // 在線狀態
    if (this.selectedOnlineStatus) {
      result = result.filter(m => m.online_status === this.selectedOnlineStatus);
    }

    // 價值等級
    if (this.selectedValueLevel) {
      result = result.filter(m => m.value_level === this.selectedValueLevel);
    }

    // 快捷篩選
    if (this.filterPremium) {
      result = result.filter(m => m.is_premium);
    }
    if (this.filterChinese) {
      result = result.filter(m => this.isChinese(m));
    }
    if (this.filterHasUsername) {
      result = result.filter(m => m.username);
    }
    if (this.filterNotContacted) {
      result = result.filter(m => !m.contacted);
    }
    if (this.filterHasPhoto) {
      result = result.filter(m => m.has_photo);
    }

    // 排序
    result.sort((a, b) => {
      let aVal = (a as any)[this.sortField];
      let bVal = (b as any)[this.sortField];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredMembers.set(result);
    this.currentPage = 1;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.selectedSource ||
      this.selectedOnlineStatus ||
      this.selectedValueLevel ||
      this.filterPremium ||
      this.filterChinese ||
      this.filterHasUsername ||
      this.filterNotContacted ||
      this.filterHasPhoto
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedSource = '';
    this.selectedOnlineStatus = '';
    this.selectedValueLevel = '';
    this.filterPremium = false;
    this.filterChinese = false;
    this.filterHasUsername = false;
    this.filterNotContacted = false;
    this.filterHasPhoto = false;
    this.applyFilters();
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  // 分頁相關
  paginatedMembers = computed(() => {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredMembers().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredMembers().length / this.pageSize) || 1);

  getPageStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getPageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredMembers().length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // 選擇相關
  isAllSelected(): boolean {
    return this.paginatedMembers().length > 0 &&
      this.paginatedMembers().every(m => this.selectedMemberIds().includes(m.user_id));
  }

  isPartialSelected(): boolean {
    const selected = this.paginatedMembers().filter(m => this.selectedMemberIds().includes(m.user_id));
    return selected.length > 0 && selected.length < this.paginatedMembers().length;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      // 取消選擇當前頁
      const currentIds = this.paginatedMembers().map(m => m.user_id);
      this.selectedMemberIds.update(ids => ids.filter(id => !currentIds.includes(id)));
    } else {
      // 選擇當前頁
      const currentIds = this.paginatedMembers().map(m => m.user_id);
      this.selectedMemberIds.update(ids => [...new Set([...ids, ...currentIds])]);
    }
  }

  isMemberSelected(userId: string): boolean {
    return this.selectedMemberIds().includes(userId);
  }

  toggleMemberSelection(userId: string): void {
    this.selectedMemberIds.update(ids => {
      if (ids.includes(userId)) {
        return ids.filter(id => id !== userId);
      } else {
        return [...ids, userId];
      }
    });
  }

  clearSelection(): void {
    this.selectedMemberIds.set([]);
  }

  // 統計相關
  calculateStats(): void {
    const members = this.members();
    const today = new Date().toDateString();
    
    const stats: MemberStats = {
      total: members.length,
      online: members.filter(m => m.online_status === 'online').length,
      recently: members.filter(m => m.online_status === 'recently').length,
      premium: members.filter(m => m.is_premium).length,
      chinese: members.filter(m => this.isChinese(m)).length,
      contacted: members.filter(m => m.contacted).length,
      converted: members.filter(m => m.converted).length,
      todayNew: members.filter(m => new Date(m.created_at).toDateString() === today).length,
      byValueLevel: {},
      bySource: []
    };

    // 按來源群組統計
    const sourceMap = new Map<string, { title: string; count: number }>();
    members.forEach(m => {
      if (m.source_chat_id) {
        const existing = sourceMap.get(m.source_chat_id);
        if (existing) {
          existing.count++;
        } else {
          sourceMap.set(m.source_chat_id, { title: m.source_chat_title || m.source_chat_id, count: 1 });
        }
      }
    });

    this.sourceGroups.set(
      Array.from(sourceMap.entries()).map(([group, data]) => ({
        group,
        title: data.title,
        count: data.count
      })).sort((a, b) => b.count - a.count)
    );

    this.stats.set(stats);
  }

  getOnlinePercent(): string {
    const total = this.stats().total;
    return total > 0 ? ((this.stats().online / total) * 100).toFixed(1) : '0';
  }

  getPremiumPercent(): string {
    const total = this.stats().total;
    return total > 0 ? ((this.stats().premium / total) * 100).toFixed(1) : '0';
  }

  getChinesePercent(): string {
    const total = this.stats().total;
    return total > 0 ? ((this.stats().chinese / total) * 100).toFixed(1) : '0';
  }

  getContactedPercent(): string {
    const total = this.stats().total;
    return total > 0 ? ((this.stats().contacted / total) * 100).toFixed(1) : '0';
  }

  getConvertedPercent(): string {
    const contacted = this.stats().contacted;
    return contacted > 0 ? ((this.stats().converted / contacted) * 100).toFixed(1) : '0';
  }

  // 工具方法
  getAvatarLetter(member: ExtractedMember): string {
    return (member.first_name || member.username || '?').charAt(0).toUpperCase();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'online': return '🟢';
      case 'recently': return '🟡';
      case 'last_week': return '🟠';
      case 'last_month': return '⚪';
      default: return '⚪';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'online': return '在線';
      case 'recently': return '最近';
      case 'last_week': return '本週';
      case 'last_month': return '本月';
      case 'long_ago': return '離線';
      default: return '未知';
    }
  }

  isChinese(member: ExtractedMember): boolean {
    const name = (member.first_name || '') + (member.last_name || '');
    const bio = member.bio || '';
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(name) || chineseRegex.test(bio);
  }

  getMemberTags(member: ExtractedMember): string[] {
    if (!member.tags) return [];
    try {
      return JSON.parse(member.tags);
    } catch {
      return [];
    }
  }

  getGroupsList(member: ExtractedMember): string[] {
    if (!member.groups) return [];
    try {
      return JSON.parse(member.groups);
    } catch {
      return [];
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
    this.toastService.success('已複製到剪貼板');
  }

  // 詳情側邊欄
  openMemberDetail(member: ExtractedMember): void {
    this.selectedMember.set(member);
    this.memberNotes = member.notes || '';
  }

  closeMemberDetail(): void {
    this.selectedMember.set(null);
    this.memberNotes = '';
  }

  saveMemberNotes(): void {
    const member = this.selectedMember();
    if (!member) return;
    
    this.ipcService.send('update-member', {
      userId: member.user_id,
      updates: { notes: this.memberNotes }
    });
    
    // 更新本地數據
    this.members.update(list => 
      list.map(m => m.user_id === member.user_id ? { ...m, notes: this.memberNotes } : m)
    );
  }

  // 標籤管理
  openAddTagDialog(): void {
    this.showAddTagDialog.set(true);
    this.newTagName = '';
  }

  closeAddTagDialog(): void {
    this.showAddTagDialog.set(false);
    this.newTagName = '';
  }

  addTag(): void {
    if (!this.newTagName.trim()) return;
    
    const member = this.selectedMember();
    if (!member) return;

    const tags = this.getMemberTags(member);
    if (!tags.includes(this.newTagName)) {
      tags.push(this.newTagName);
      
      this.ipcService.send('update-member', {
        userId: member.user_id,
        updates: { tags: JSON.stringify(tags) }
      });
      
      // 更新本地數據
      this.members.update(list =>
        list.map(m => m.user_id === member.user_id ? { ...m, tags: JSON.stringify(tags) } : m)
      );
      
      this.selectedMember.update(m => m ? { ...m, tags: JSON.stringify(tags) } : null);
    }
    
    this.closeAddTagDialog();
  }

  addSuggestedTag(tag: string): void {
    this.newTagName = tag;
    this.addTag();
  }

  removeTag(member: ExtractedMember, tag: string): void {
    const tags = this.getMemberTags(member).filter(t => t !== tag);
    
    this.ipcService.send('update-member', {
      userId: member.user_id,
      updates: { tags: JSON.stringify(tags) }
    });
    
    // 更新本地數據
    this.members.update(list =>
      list.map(m => m.user_id === member.user_id ? { ...m, tags: JSON.stringify(tags) } : m)
    );
    
    this.selectedMember.update(m => m ? { ...m, tags: JSON.stringify(tags) } : null);
  }

  // 操作方法
  sendMessage(member: ExtractedMember): void {
    // 發出事件讓父組件處理，使用統一的發消息對話框
    this.sendMessageEvent.emit(member);
  }

  addToFunnel(member: ExtractedMember): void {
    // 發出事件讓父組件處理，創建 Lead
    this.addToFunnelEvent.emit(member);
  }

  markAsContacted(member: ExtractedMember): void {
    this.ipcService.send('update-member', {
      userId: member.user_id,
      updates: { 
        contacted: true,
        contacted_at: new Date().toISOString()
      }
    });
    
    this.members.update(list =>
      list.map(m => m.user_id === member.user_id 
        ? { ...m, contacted: true, contacted_at: new Date().toISOString() } 
        : m
      )
    );
    
    this.selectedMember.update(m => m 
      ? { ...m, contacted: true, contacted_at: new Date().toISOString() } 
      : null
    );
    
    this.calculateStats();
    this.toastService.success('已標記為已聯繫');
  }

  // 批量操作
  batchSendMessage(): void {
    const selectedMembers = this.members().filter(m => 
      this.selectedMemberIds().includes(m.user_id)
    );
    if (selectedMembers.length > 0) {
      this.batchSendMessageEvent.emit(selectedMembers);
    }
  }

  batchAddTags(): void {
    this.toastService.info('批量添加標籤功能開發中...');
    // TODO: 實現批量標籤
  }

  batchMarkContacted(): void {
    const ids = this.selectedMemberIds();
    const now = new Date().toISOString();
    
    ids.forEach(userId => {
      this.ipcService.send('update-member', {
        userId,
        updates: { contacted: true, contacted_at: now }
      });
    });
    
    this.members.update(list =>
      list.map(m => ids.includes(m.user_id) 
        ? { ...m, contacted: true, contacted_at: now } 
        : m
      )
    );
    
    this.calculateStats();
    this.applyFilters();
    this.clearSelection();
    this.toastService.success(`已將 ${ids.length} 個成員標記為已聯繫`);
  }

  batchExport(): void {
    const ids = this.selectedMemberIds();
    const members = this.members().filter(m => ids.includes(m.user_id));
    this.exportMembersToCSV(members);
  }

  // 導出
  exportMembers(): void {
    this.exportMembersToCSV(this.filteredMembers());
  }

  private exportMembersToCSV(members: ExtractedMember[]): void {
    const headers = [
      'Telegram ID', '用戶名', '姓', '名', '電話', '簡介', '語言',
      'Premium', '已驗證', '有頭像', '在線狀態', '最後在線', '活躍分數',
      '價值等級', '來源群組', '來源群組ID', '提取時間', '標籤', '備註',
      '已聯繫', '聯繫時間', '已轉化'
    ];

    const rows = members.map(m => [
      m.user_id,
      m.username || '',
      m.last_name || '',
      m.first_name || '',
      m.phone || '',
      m.bio || '',
      m.language_code || '',
      m.is_premium ? '是' : '否',
      m.is_verified ? '是' : '否',
      m.has_photo ? '是' : '否',
      this.getStatusText(m.online_status),
      m.last_online || '',
      m.activity_score?.toString() || '',
      m.value_level || '',
      m.source_chat_title || '',
      m.source_chat_id || '',
      m.extracted_at || '',
      this.getMemberTags(m).join('; '),
      m.notes || '',
      m.contacted ? '是' : '否',
      m.contacted_at || '',
      m.converted ? '是' : '否'
    ]);

    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.toastService.success(`✅ 已導出 ${members.length} 個成員`);
  }

  // ==================== P4 高級功能 ====================

  /**
   * 智能去重 - 跨群組合併重複成員
   */
  deduplicateMembers(): void {
    this.toastService.info('🔄 正在執行智能去重...');
    this.ipcService.send('deduplicate-members', {});
    
    // 監聽去重結果
    const cleanup = this.ipcService.on('members-deduplicated', (data: any) => {
      cleanup();
      if (data.success) {
        this.toastService.success(`✅ 去重完成！合併了 ${data.mergedCount || 0} 個重複成員`);
        this.loadMembers(); // 重新載入數據
      } else {
        this.toastService.error(`去重失敗: ${data.error}`);
      }
    });
  }

  /**
   * 重新計算評分 - 更新所有成員的價值等級
   */
  recalculateScores(): void {
    this.toastService.info('📊 正在重新計算評分...');
    this.ipcService.send('recalculate-scores', {});
    
    // 監聯評分結果
    const cleanup = this.ipcService.on('scores-recalculated', (data: any) => {
      cleanup();
      if (data.success) {
        this.toastService.success(`✅ 評分計算完成！更新了 ${data.updatedCount || 0} 個成員`);
        this.loadMembers(); // 重新載入數據
      } else {
        this.toastService.error(`計算失敗: ${data.error}`);
      }
    });
  }

  /**
   * 顯示群組畫像 - 分析當前選中群組的質量
   */
  showGroupProfile(): void {
    if (!this.selectedSource) {
      this.toastService.warning('請先選擇一個來源群組');
      return;
    }
    
    this.toastService.info('📈 正在生成群組畫像...');
    this.ipcService.send('get-group-profile', { chatId: this.selectedSource });
    
    // 監聽畫像結果
    const cleanup = this.ipcService.on('group-profile-result', (data: any) => {
      cleanup();
      if (data.success && data.profile) {
        const p = data.profile;
        // 使用 toast 顯示摘要，未來可改為對話框
        this.toastService.success(`
          📊 群組畫像：
          質量分數: ${p.qualityScore}/100
          總成員: ${p.totalMembers}
          Premium: ${p.premiumRate}%
          活躍率: ${p.activeRate}%
        `.trim());
      } else {
        this.toastService.error(`獲取畫像失敗: ${data.error}`);
      }
    });
  }

  /**
   * 群組對比 - 比較多個群組的成員質量
   */
  compareGroups(): void {
    const sources = this.sourceGroups();
    if (sources.length < 2) {
      this.toastService.warning('需要至少2個群組才能進行對比');
      return;
    }
    
    // 選擇前5個群組進行對比
    const chatIds = sources.slice(0, 5).map(s => s.group);
    
    this.toastService.info('📊 正在對比群組...');
    this.ipcService.send('compare-groups', { chatIds });
    
    // 監聽對比結果
    const cleanup = this.ipcService.on('groups-compared', (data: any) => {
      cleanup();
      if (data.success && data.comparison) {
        const c = data.comparison;
        this.toastService.success(`
          📊 群組對比完成！
          最高質量: ${c.bestGroup?.name || '未知'}
          平均質量: ${c.avgQuality}/100
          對比群組數: ${c.groupCount}
        `.trim());
      } else {
        this.toastService.error(`對比失敗: ${data.error}`);
      }
    });
  }

  /**
   * 查看提取統計 - 顯示提取成功率和效能
   */
  viewExtractionStats(): void {
    this.toastService.info('📉 正在獲取提取統計...');
    this.ipcService.send('get-extraction-stats', {});
    
    // 監聽統計結果
    const cleanup = this.ipcService.on('extraction-stats-result', (data: any) => {
      cleanup();
      if (data.success && data.stats) {
        const s = data.stats;
        this.toastService.success(`
          📉 提取統計：
          成功率: ${s.successRate}%
          總提取: ${s.totalExtractions}
          成功: ${s.successCount}
          失敗: ${s.failedCount}
        `.trim());
      } else {
        this.toastService.error(`獲取統計失敗: ${data.error}`);
      }
    });
  }
}
