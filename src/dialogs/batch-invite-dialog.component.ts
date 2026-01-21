/**
 * 批量拉群對話框組件
 * Batch Invite to Group Dialog Component
 * 
 * 優化功能：
 * - 支持選擇現有群組
 * - 支持創建新群組（手動/AI 生成群名）
 * - 支持拉群後發送歡迎消息
 */

import { Component, signal, input, output, inject, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

export interface BatchInviteTarget {
  telegramId: string;
  username?: string;
  firstName?: string;
  displayName?: string;
}

export interface GroupOption {
  id: string;
  name: string;
  url: string;
  memberCount: number;
  isAdmin: boolean;
  type: 'group' | 'supergroup' | 'channel';
}

export interface ChatTemplate {
  id: number;
  name: string;
  content: string;
  category: string;
  isEnabled: boolean;
}

export type GroupSource = 'existing' | 'create';
export type GroupType = 'group' | 'supergroup';
export type WelcomeMessageSource = 'none' | 'template' | 'ai';

// 帳號接口（用於傳入）
export interface AccountInfo {
  id: number;
  phone: string;
  firstName?: string;
  status: string;
  role?: string;
}

@Component({
  selector: 'app-batch-invite-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
           (click)="onBackdropClick($event)">
        <div class="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col">
          
          <!-- 頭部 -->
          <div class="p-5 border-b border-slate-700/50 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xl">
                  👥
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">批量拉入群組</h2>
                  <p class="text-sm text-slate-400">將 {{ targets().length }} 個用戶拉入群組</p>
                </div>
              </div>
              <button (click)="close()" class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 內容 - 增加底部 padding 防止被底部按鈕擋住 -->
          <div class="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
            
            <!-- 群組來源選擇 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                🎯 群組來源
              </label>
              <div class="flex gap-2">
                <button 
                  (click)="setGroupSource('existing')"
                  class="flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                  [class.border-emerald-500]="groupSource() === 'existing'"
                  [class.bg-emerald-500/20]="groupSource() === 'existing'"
                  [class.text-emerald-400]="groupSource() === 'existing'"
                  [class.border-slate-600]="groupSource() !== 'existing'"
                  [class.bg-slate-800/50]="groupSource() !== 'existing'"
                  [class.text-slate-400]="groupSource() !== 'existing'">
                  🏠 現有群組
                </button>
                <button 
                  (click)="setGroupSource('create')"
                  class="flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                  [class.border-cyan-500]="groupSource() === 'create'"
                  [class.bg-cyan-500/20]="groupSource() === 'create'"
                  [class.text-cyan-400]="groupSource() === 'create'"
                  [class.border-slate-600]="groupSource() !== 'create'"
                  [class.bg-slate-800/50]="groupSource() !== 'create'"
                  [class.text-slate-400]="groupSource() !== 'create'">
                  ➕ 創建新群
                </button>
              </div>
            </div>
            
            <!-- 選擇現有群組 -->
            @if (groupSource() === 'existing') {
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  選擇目標群組
                </label>
                
                @if (isLoadingGroups()) {
                  <div class="flex items-center justify-center py-8">
                    <svg class="animate-spin h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="ml-2 text-slate-400">載入群組列表...</span>
                  </div>
                } @else if (availableGroups().length === 0) {
                  <div class="text-center py-8 text-slate-400">
                    <p class="text-lg mb-2">😅 沒有可用的群組</p>
                    <p class="text-sm">請確保帳號已加入群組並且擁有邀請權限</p>
                  </div>
                } @else {
                  <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                    @for (group of availableGroups(); track group.id) {
                      <button 
                        (click)="selectGroup(group)"
                        class="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                        [class.border-emerald-500]="selectedGroup()?.id === group.id"
                        [class.bg-emerald-500/10]="selectedGroup()?.id === group.id"
                        [class.border-slate-600]="selectedGroup()?.id !== group.id"
                        [class.bg-slate-800/50]="selectedGroup()?.id !== group.id"
                        [class.hover:border-slate-500]="selectedGroup()?.id !== group.id">
                        
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-lg"
                             [class.from-blue-500]="group.type === 'group'"
                             [class.to-cyan-500]="group.type === 'group'"
                             [class.from-purple-500]="group.type === 'supergroup'"
                             [class.to-pink-500]="group.type === 'supergroup'"
                             [class.from-amber-500]="group.type === 'channel'"
                             [class.to-orange-500]="group.type === 'channel'">
                          {{ group.type === 'channel' ? '📢' : '👥' }}
                        </div>
                        
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-white truncate">{{ group.name }}</span>
                            @if (group.isAdmin) {
                              <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">管理員</span>
                            } @else {
                              <span class="px-1.5 py-0.5 bg-slate-600 text-slate-400 text-xs rounded">成員</span>
                            }
                          </div>
                          <div class="text-xs text-slate-400 flex items-center gap-2">
                            <span>👤 {{ group.memberCount | number }} 成員</span>
                            <span>•</span>
                            <span class="truncate">{{ group.url }}</span>
                          </div>
                        </div>
                        
                        @if (selectedGroup()?.id === group.id) {
                          <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            }
            
            <!-- 創建新群組 -->
            @if (groupSource() === 'create') {
              <div class="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30 space-y-4">
                <label class="block text-sm font-medium text-cyan-300">📝 新群組信息</label>
                
                <!-- 群名生成方式 -->
                <div>
                  <span class="text-xs text-slate-400 mb-2 block">群名生成：</span>
                  <div class="flex gap-2">
                    <button 
                      (click)="groupNameMode.set('manual')"
                      class="flex-1 py-2 rounded-lg text-sm transition-all"
                      [class.bg-cyan-500]="groupNameMode() === 'manual'"
                      [class.text-white]="groupNameMode() === 'manual'"
                      [class.bg-slate-700]="groupNameMode() !== 'manual'"
                      [class.text-slate-400]="groupNameMode() !== 'manual'">
                      ✏️ 手動輸入
                    </button>
                    <button 
                      (click)="groupNameMode.set('ai')"
                      class="flex-1 py-2 rounded-lg text-sm transition-all"
                      [class.bg-purple-500]="groupNameMode() === 'ai'"
                      [class.text-white]="groupNameMode() === 'ai'"
                      [class.bg-slate-700]="groupNameMode() !== 'ai'"
                      [class.text-slate-400]="groupNameMode() !== 'ai'">
                      🤖 AI 生成
                    </button>
                  </div>
                </div>
                
                <!-- 手動輸入群名 -->
                @if (groupNameMode() === 'manual') {
                  <div>
                    <span class="text-xs text-slate-400 mb-2 block">群組名稱：</span>
                    <input 
                      type="text"
                      [(ngModel)]="newGroupName"
                      placeholder="輸入群組名稱..."
                      maxlength="128"
                      class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500">
                    <span class="text-xs text-slate-500 mt-1 block">{{ newGroupName.length }}/128</span>
                  </div>
                }
                
                <!-- AI 生成群名 -->
                @if (groupNameMode() === 'ai') {
                  <div class="space-y-3">
                    <div>
                      <span class="text-xs text-slate-400 mb-2 block">主題/關鍵詞：</span>
                      <input 
                        type="text"
                        [(ngModel)]="aiGroupKeywords"
                        placeholder="例如：幣圈、交流、VIP..."
                        class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500">
                    </div>
                    
                    <div>
                      <span class="text-xs text-slate-400 mb-2 block">風格：</span>
                      <div class="flex flex-wrap gap-2">
                        @for (style of groupNameStyles; track style.key) {
                          <button 
                            (click)="selectedGroupNameStyle.set(style.key)"
                            class="px-3 py-1 text-xs rounded-lg transition-all"
                            [class.bg-purple-500]="selectedGroupNameStyle() === style.key"
                            [class.text-white]="selectedGroupNameStyle() === style.key"
                            [class.bg-slate-700]="selectedGroupNameStyle() !== style.key"
                            [class.text-slate-400]="selectedGroupNameStyle() !== style.key">
                            {{ style.label }}
                          </button>
                        }
                      </div>
                    </div>
                    
                    <button 
                      (click)="generateGroupNames()"
                      [disabled]="isGeneratingNames() || !aiGroupKeywords.trim()"
                      class="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      @if (isGeneratingNames()) {
                        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        生成中...
                      } @else {
                        ✨ 生成群名
                      }
                    </button>
                    
                    <!-- AI 生成結果 -->
                    @if (generatedGroupNames().length > 0) {
                      <div class="space-y-2">
                        <span class="text-xs text-slate-400">選擇一個：</span>
                        @for (name of generatedGroupNames(); track $index) {
                          <button 
                            (click)="selectGeneratedName(name)"
                            class="w-full p-2 rounded-lg border transition-all text-left text-sm"
                            [class.border-purple-500]="newGroupName === name"
                            [class.bg-purple-500/10]="newGroupName === name"
                            [class.border-slate-600]="newGroupName !== name"
                            [class.bg-slate-800/50]="newGroupName !== name">
                            {{ name }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
                
                <!-- 群組類型 -->
                <div>
                  <span class="text-xs text-slate-400 mb-2 block">群組類型：</span>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="groupType" value="group" [(ngModel)]="newGroupType" 
                             class="w-4 h-4 text-cyan-500 border-slate-600 focus:ring-cyan-500">
                      <span class="text-sm text-slate-300">普通群組 (最多 200 人)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="groupType" value="supergroup" [(ngModel)]="newGroupType"
                             class="w-4 h-4 text-cyan-500 border-slate-600 focus:ring-cyan-500">
                      <span class="text-sm text-slate-300">超級群組 (最多 20 萬人)</span>
                    </label>
                  </div>
                </div>
                
                <!-- 群組描述 -->
                <div>
                  <span class="text-xs text-slate-400 mb-2 block">群組描述（可選）：</span>
                  <textarea 
                    [(ngModel)]="newGroupDescription"
                    rows="2"
                    placeholder="簡短介紹群組目的..."
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-cyan-500 text-sm">
                  </textarea>
                </div>
              </div>
            }
            
            <!-- 拉群設置 -->
            <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <label class="block text-sm font-medium text-slate-300 mb-3">
                ⚙️ 拉群設置
              </label>
              
              <div class="space-y-4">
                <!-- 每批次人數 -->
                <div class="flex items-center gap-3">
                  <span class="text-sm text-slate-400 w-24">每批次人數：</span>
                  <input 
                    type="number" 
                    [(ngModel)]="batchSize"
                    min="1" max="50"
                    class="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-emerald-500">
                  <span class="text-sm text-slate-400">人</span>
                </div>
                
                <!-- 間隔時間 -->
                <div class="flex items-center gap-3">
                  <span class="text-sm text-slate-400 w-24">批次間隔：</span>
                  <input 
                    type="number" 
                    [(ngModel)]="minInterval"
                    min="30" max="300"
                    class="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-emerald-500">
                  <span class="text-slate-400">-</span>
                  <input 
                    type="number" 
                    [(ngModel)]="maxInterval"
                    min="30" max="600"
                    class="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-emerald-500">
                  <span class="text-sm text-slate-400">秒</span>
                </div>
              </div>
            </div>
            
            <!-- 歡迎消息設置 -->
            <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <label class="block text-sm font-medium text-slate-300 mb-3">
                💬 歡迎消息
              </label>
              
              <!-- 歡迎消息來源 -->
              <div class="flex gap-2 mb-3">
                <button 
                  (click)="welcomeMessageSource.set('none')"
                  class="flex-1 py-2 rounded-lg text-sm transition-all"
                  [class.bg-slate-600]="welcomeMessageSource() === 'none'"
                  [class.text-white]="welcomeMessageSource() === 'none'"
                  [class.bg-slate-700]="welcomeMessageSource() !== 'none'"
                  [class.text-slate-400]="welcomeMessageSource() !== 'none'">
                  ❌ 不發送
                </button>
                <button 
                  (click)="welcomeMessageSource.set('template')"
                  class="flex-1 py-2 rounded-lg text-sm transition-all"
                  [class.bg-blue-500]="welcomeMessageSource() === 'template'"
                  [class.text-white]="welcomeMessageSource() === 'template'"
                  [class.bg-slate-700]="welcomeMessageSource() !== 'template'"
                  [class.text-slate-400]="welcomeMessageSource() !== 'template'">
                  📄 選模板
                </button>
                <button 
                  (click)="welcomeMessageSource.set('ai')"
                  class="flex-1 py-2 rounded-lg text-sm transition-all"
                  [class.bg-purple-500]="welcomeMessageSource() === 'ai'"
                  [class.text-white]="welcomeMessageSource() === 'ai'"
                  [class.bg-slate-700]="welcomeMessageSource() !== 'ai'"
                  [class.text-slate-400]="welcomeMessageSource() !== 'ai'">
                  🤖 AI 生成
                </button>
              </div>
              
              <!-- 模板選擇 -->
              @if (welcomeMessageSource() === 'template') {
                <div class="space-y-2">
                  @if (isLoadingTemplates()) {
                    <div class="flex items-center justify-center py-4">
                      <svg class="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <span class="ml-2 text-slate-400 text-sm">載入模板...</span>
                    </div>
                  } @else if (welcomeTemplates().length === 0) {
                    <p class="text-sm text-slate-500 text-center py-4">沒有可用的模板</p>
                  } @else {
                    <div class="max-h-32 overflow-y-auto space-y-2">
                      @for (template of welcomeTemplates(); track template.id) {
                        <button 
                          (click)="selectWelcomeTemplate(template)"
                          class="w-full p-2 rounded-lg border transition-all text-left text-sm"
                          [class.border-blue-500]="selectedWelcomeTemplate()?.id === template.id"
                          [class.bg-blue-500/10]="selectedWelcomeTemplate()?.id === template.id"
                          [class.border-slate-600]="selectedWelcomeTemplate()?.id !== template.id"
                          [class.bg-slate-800/50]="selectedWelcomeTemplate()?.id !== template.id">
                          <span class="font-medium text-white">{{ template.name }}</span>
                          <p class="text-xs text-slate-400 truncate mt-1">{{ template.content }}</p>
                        </button>
                      }
                    </div>
                  }
                </div>
              }
              
              <!-- AI 生成歡迎消息 -->
              @if (welcomeMessageSource() === 'ai') {
                <div class="space-y-3">
                  <input 
                    type="text"
                    [(ngModel)]="aiWelcomeTopic"
                    placeholder="歡迎消息主題，例如：歡迎加入、社群介紹..."
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-purple-500">
                  
                  <button 
                    (click)="generateWelcomeMessage()"
                    [disabled]="isGeneratingWelcome() || !aiWelcomeTopic.trim()"
                    class="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    @if (isGeneratingWelcome()) {
                      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      生成中...
                    } @else {
                      ✨ 生成歡迎消息
                    }
                  </button>
                  
                  @if (generatedWelcomeMessage()) {
                    <div class="p-3 bg-slate-800/50 rounded-lg border border-purple-500/30">
                      <p class="text-sm text-white">{{ generatedWelcomeMessage() }}</p>
                    </div>
                  }
                </div>
              }
              
              <!-- 自定義歡迎消息編輯 -->
              @if (welcomeMessageSource() !== 'none') {
                <div class="mt-3">
                  <span class="text-xs text-slate-400 mb-2 block">消息內容：</span>
                  <textarea 
                    [(ngModel)]="welcomeMessageContent"
                    rows="2"
                    placeholder="輸入歡迎消息內容..."
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-emerald-500 text-sm">
                  </textarea>
                </div>
              }
            </div>
            
            <!-- 權限檢查結果 -->
            @if (selectedGroup()) {
              <div class="p-4 rounded-xl"
                   [class.bg-emerald-500/10]="permissionCheck().canInvite > 0"
                   [class.border]="true"
                   [class.border-emerald-500/30]="permissionCheck().canInvite > 0"
                   [class.bg-amber-500/10]="permissionCheck().canInvite === 0"
                   [class.border-amber-500/30]="permissionCheck().canInvite === 0">
                <h4 class="text-sm font-medium text-slate-300 mb-2">📊 權限檢查結果</h4>
                <div class="flex items-center gap-6 text-sm">
                  <span class="text-emerald-400">✅ 可拉入: {{ permissionCheck().canInvite }} 人</span>
                  @if (permissionCheck().alreadyInGroup > 0) {
                    <span class="text-amber-400">⚠️ 已在群內: {{ permissionCheck().alreadyInGroup }} 人</span>
                  }
                  @if (permissionCheck().privacyRestricted > 0) {
                    <span class="text-red-400">❌ 隱私限制: {{ permissionCheck().privacyRestricted }} 人</span>
                  }
                </div>
              </div>
            }
            
            <!-- 目標用戶預覽 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                👥 目標用戶（{{ targets().length }} 人）
              </label>
              <div class="max-h-32 overflow-y-auto p-3 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <div class="flex flex-wrap gap-2">
                  @for (target of targets().slice(0, 20); track target.telegramId) {
                    <span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                      {{ target.displayName || target.firstName || target.username || target.telegramId }}
                    </span>
                  }
                  @if (targets().length > 20) {
                    <span class="px-2 py-1 text-slate-400 text-xs">
                      +{{ targets().length - 20 }} 更多...
                    </span>
                  }
                </div>
              </div>
            </div>
            
          </div>
          
          <!-- 進度顯示 -->
          @if (isInviting()) {
            <div class="p-4 bg-slate-800/50 border-t border-slate-700/50">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-white">拉群進度</span>
                <span class="text-sm text-slate-400">{{ invitedCount() }} / {{ targets().length }}</span>
              </div>
              <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                  [style.width.%]="progressPercent()">
                </div>
              </div>
              <div class="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <span>✅ 成功: {{ successCount() }}</span>
                <span>⚠️ 跳過: {{ skippedCount() }}</span>
                <span>❌ 失敗: {{ failedCount() }}</span>
                <span>⏳ 預計剩餘: {{ estimatedRemaining() }}</span>
              </div>
            </div>
          }
          
          <!-- 帳號狀態提示 -->
          @if (onlineAccountsCount() === 0) {
            <div class="px-5 py-3 bg-red-500/10 border-t border-red-500/30">
              <div class="flex items-center gap-2 text-sm text-red-400">
                <span>⚠️</span>
                <span>沒有可用的在線帳號，請先登入帳號後再進行拉群操作</span>
              </div>
            </div>
          } @else {
            <!-- 帳號狀態 -->
            <div class="px-5 py-2 bg-slate-800/30 border-t border-slate-700/50">
              <div class="flex items-center gap-2 text-xs text-slate-400">
                <span>🔗</span>
                <span>可用帳號: {{ onlineAccountsCount() }} 個在線</span>
                <span class="text-slate-500">|</span>
                <span>將使用: {{ preferredAccount()?.firstName || preferredAccount()?.phone || '自動選擇' }}</span>
              </div>
            </div>
          }
          
          <!-- 操作摘要 -->
          @if (canInvite()) {
            <div class="px-5 py-3 bg-slate-800/50 border-t border-slate-700/50">
              <div class="flex items-center gap-2 text-sm text-slate-400">
                <span>📋</span>
                <span>
                  @if (groupSource() === 'create') {
                    創建群組「{{ newGroupName }}」→ 拉入 {{ targets().length }} 人
                    @if (welcomeMessageSource() !== 'none') {
                      → 發送歡迎消息
                    }
                  } @else {
                    拉入群組「{{ selectedGroup()?.name }}」→ {{ targets().length }} 人
                    @if (welcomeMessageSource() !== 'none') {
                      → 發送歡迎消息
                    }
                  }
                </span>
              </div>
            </div>
          }
          
          <!-- 底部按鈕 - 固定在底部，確保始終可見 -->
          <div class="sticky bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-slate-900 flex gap-3 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
            <button 
              (click)="close()"
              [disabled]="isInviting() || isCreatingGroup()"
              class="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50">
              {{ (isInviting() || isCreatingGroup()) ? '⏳ 進行中' : '取消' }}
            </button>
            <button 
              (click)="startInviting()"
              [disabled]="!canInvite() || isInviting() || isCreatingGroup()"
              class="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-500/20">
              @if (isCreatingGroup()) {
                <span class="animate-spin">⏳</span> 創建群組中...
              } @else if (isInviting()) {
                <span class="animate-spin">⏳</span> 拉群中...
              } @else if (groupSource() === 'create') {
                🚀 創建並拉人 ({{ targets().length }} 人)
              } @else {
                👥 開始拉群 ({{ targets().length }} 人)
              }
            </button>
          </div>
          
        </div>
      </div>
    }
  `
})
export class BatchInviteDialogComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 輸入
  isOpen = input<boolean>(false);
  targets = input<BatchInviteTarget[]>([]);
  accounts = input<AccountInfo[]>([]); // 從父組件傳入帳號數據
  
  // 輸出
  closeDialog = output<void>();
  inviteComplete = output<{ success: number; failed: number; skipped: number }>();
  
  // 群組來源
  groupSource = signal<GroupSource>('existing');
  
  // 現有群組列表
  availableGroups = signal<GroupOption[]>([]);
  isLoadingGroups = signal(false);
  selectedGroup = signal<GroupOption | null>(null);
  
  // 創建新群組相關
  groupNameMode = signal<'manual' | 'ai'>('manual');
  newGroupName = '';
  newGroupType: GroupType = 'supergroup';
  newGroupDescription = '';
  aiGroupKeywords = '';
  selectedGroupNameStyle = signal<string>('professional');
  isGeneratingNames = signal(false);
  generatedGroupNames = signal<string[]>([]);
  
  groupNameStyles = [
    { key: 'professional', label: '專業正式' },
    { key: 'lively', label: '活潑有趣' },
    { key: 'mysterious', label: '神秘高端' },
    { key: 'simple', label: '簡約明了' },
  ];
  
  // 歡迎消息相關
  welcomeMessageSource = signal<WelcomeMessageSource>('none');
  welcomeTemplates = signal<ChatTemplate[]>([]);
  isLoadingTemplates = signal(false);
  selectedWelcomeTemplate = signal<ChatTemplate | null>(null);
  welcomeMessageContent = '';
  aiWelcomeTopic = '';
  isGeneratingWelcome = signal(false);
  generatedWelcomeMessage = signal<string>('');
  
  // 拉群設置
  batchSize = 10;
  minInterval = 60;
  maxInterval = 120;
  
  // 進度狀態
  isInviting = signal(false);
  invitedCount = signal(0);
  successCount = signal(0);
  failedCount = signal(0);
  skippedCount = signal(0);
  
  // 創建群組狀態
  isCreatingGroup = signal(false);
  createdGroupId = signal<string | null>(null);
  
  // 監聯器清理
  private listeners: (() => void)[] = [];
  
  // 計算屬性
  progressPercent = computed(() => {
    const total = this.targets().length;
    return total > 0 ? (this.invitedCount() / total) * 100 : 0;
  });
  
  estimatedRemaining = computed(() => {
    const remaining = this.targets().length - this.invitedCount();
    const avgInterval = (this.minInterval + this.maxInterval) / 2;
    const batches = Math.ceil(remaining / this.batchSize);
    const seconds = batches * avgInterval;
    if (seconds < 60) return `${Math.round(seconds)} 秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} 分鐘`;
    return `${Math.round(seconds / 3600)} 小時`;
  });
  
  permissionCheck = computed(() => {
    // 模擬權限檢查（實際應從後端獲取）
    const total = this.targets().length;
    return {
      canInvite: Math.floor(total * 0.8),
      alreadyInGroup: Math.floor(total * 0.1),
      privacyRestricted: Math.floor(total * 0.1)
    };
  });
  
  // 在線帳號數量
  onlineAccountsCount = computed(() => {
    return this.accounts().filter(a => a.status === 'Online').length;
  });
  
  // 優先使用的帳號（用於創建群組）
  preferredAccount = computed(() => {
    const online = this.accounts().filter(a => a.status === 'Online');
    // 優先選擇 Sender 角色的帳號（如果沒有就用任意在線帳號）
    const sender = online.find(a => a.role === 'Sender');
    return sender || online[0] || null;
  });
  
  ngOnInit() {
    this.setupIpcListeners();
    this.loadAvailableGroups();
    this.loadWelcomeTemplates();
  }
  
  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }
  
  private setupIpcListeners() {
    const cleanup1 = this.ipc.on('batch-invite:progress', (data: any) => {
      this.invitedCount.set(data.invited);
      this.successCount.set(data.success);
      this.failedCount.set(data.failed);
      this.skippedCount.set(data.skipped);
    });
    this.listeners.push(cleanup1);
    
    const cleanup2 = this.ipc.on('batch-invite:complete', (data: any) => {
      this.isInviting.set(false);
      this.isCreatingGroup.set(false);
      this.inviteComplete.emit({ 
        success: data.success, 
        failed: data.failed, 
        skipped: data.skipped 
      });
      this.toast.success(`批量拉群完成：成功 ${data.success}，跳過 ${data.skipped}，失敗 ${data.failed}`);
    });
    this.listeners.push(cleanup2);
    
    const cleanup3 = this.ipc.on('get-admin-groups-result', (data: any) => {
      this.isLoadingGroups.set(false);
      if (data.groups) {
        this.availableGroups.set(data.groups);
      }
    });
    this.listeners.push(cleanup3);
    
    // 聊天模板
    const cleanup4 = this.ipc.on('get-chat-templates-result', (data: any) => {
      this.isLoadingTemplates.set(false);
      if (data.templates) {
        this.welcomeTemplates.set(data.templates.filter((t: ChatTemplate) => t.isEnabled));
      }
    });
    this.listeners.push(cleanup4);
    
    // AI 生成群名結果
    const cleanup5 = this.ipc.on('ai-generate-group-names-result', (data: any) => {
      this.isGeneratingNames.set(false);
      if (data.success && data.names) {
        this.generatedGroupNames.set(data.names);
        this.toast.success('群名生成成功！');
      } else {
        this.toast.error(data.error || 'AI 生成失敗');
      }
    });
    this.listeners.push(cleanup5);
    
    // AI 生成歡迎消息結果
    const cleanup6 = this.ipc.on('ai-generate-welcome-result', (data: any) => {
      this.isGeneratingWelcome.set(false);
      if (data.success && data.message) {
        this.generatedWelcomeMessage.set(data.message);
        this.welcomeMessageContent = data.message;
        this.toast.success('歡迎消息生成成功！');
      } else {
        this.toast.error(data.error || 'AI 生成失敗');
      }
    });
    this.listeners.push(cleanup6);
    
    // 創建群組結果
    const cleanup7 = this.ipc.on('create-group-result', (data: any) => {
      console.log('[BatchInvite] 收到創建群組結果:', data);
      
      // 清除超時計時器
      if (this.createGroupTimeout) {
        clearTimeout(this.createGroupTimeout);
        this.createGroupTimeout = null;
      }
      
      this.isCreatingGroup.set(false);
      if (data.success && data.groupId) {
        this.createdGroupId.set(data.groupId);
        this.toast.success(`群組「${this.newGroupName}」創建成功！`);
        // 自動開始拉群
        this.startInvitingToGroup(data.groupId, data.groupUrl || '');
      } else {
        // 顯示詳細錯誤信息
        const errorMsg = data.error || '創建群組失敗';
        if (errorMsg.includes('FLOOD')) {
          this.toast.error('請求過於頻繁，請稍後再試');
        } else if (errorMsg.includes('not connected') || errorMsg.includes('Offline')) {
          this.toast.error('帳號未連接，請先登入帳號');
        } else if (errorMsg.includes('PEER_FLOOD')) {
          this.toast.error('帳號被限制，請更換帳號或稍後再試');
        } else {
          this.toast.error(errorMsg);
        }
      }
    });
    this.listeners.push(cleanup7);
  }
  
  // 設置群組來源
  setGroupSource(source: GroupSource) {
    this.groupSource.set(source);
    if (source === 'existing') {
      this.loadAvailableGroups();
    }
  }
  
  loadAvailableGroups() {
    this.isLoadingGroups.set(true);
    this.ipc.send('get-admin-groups', {});
  }
  
  loadWelcomeTemplates() {
    this.isLoadingTemplates.set(true);
    this.ipc.send('get-chat-templates', {});
  }
  
  selectGroup(group: GroupOption) {
    this.selectedGroup.set(group);
  }
  
  // 選擇生成的群名
  selectGeneratedName(name: string) {
    this.newGroupName = name;
  }
  
  // 生成群名
  generateGroupNames() {
    if (!this.aiGroupKeywords.trim()) {
      this.toast.warning('請輸入主題關鍵詞');
      return;
    }
    
    this.isGeneratingNames.set(true);
    this.generatedGroupNames.set([]);
    
    this.ipc.send('ai-generate-group-names', {
      keywords: this.aiGroupKeywords,
      style: this.selectedGroupNameStyle(),
      count: 5
    });
  }
  
  // 選擇歡迎模板
  selectWelcomeTemplate(template: ChatTemplate) {
    this.selectedWelcomeTemplate.set(template);
    this.welcomeMessageContent = template.content;
  }
  
  // 生成歡迎消息
  generateWelcomeMessage() {
    if (!this.aiWelcomeTopic.trim()) {
      this.toast.warning('請輸入消息主題');
      return;
    }
    
    this.isGeneratingWelcome.set(true);
    this.generatedWelcomeMessage.set('');
    
    this.ipc.send('ai-generate-welcome', {
      topic: this.aiWelcomeTopic,
      groupName: this.newGroupName || this.selectedGroup()?.name || ''
    });
  }
  
  canInvite(): boolean {
    if (this.groupSource() === 'existing') {
      return this.selectedGroup() !== null && this.targets().length > 0;
    } else {
      return this.newGroupName.trim().length > 0 && this.targets().length > 0;
    }
  }
  
  startInviting() {
    if (!this.canInvite()) return;
    
    if (this.groupSource() === 'create') {
      // 先創建群組，再拉人
      this.createGroupAndInvite();
    } else {
      // 直接拉入現有群組
      this.startInvitingToGroup(this.selectedGroup()!.id, this.selectedGroup()!.url);
    }
  }
  
  // 創建群組超時計時器
  private createGroupTimeout: any = null;
  
  // 創建群組然後拉人
  async createGroupAndInvite() {
    // 先檢查是否有在線帳號
    const onlineAccounts = await this.checkOnlineAccounts();
    if (onlineAccounts.length === 0) {
      this.toast.error('沒有可用的在線帳號，請先登入帳號');
      return;
    }
    
    this.isCreatingGroup.set(true);
    
    // 設置 30 秒超時
    if (this.createGroupTimeout) {
      clearTimeout(this.createGroupTimeout);
    }
    this.createGroupTimeout = setTimeout(() => {
      if (this.isCreatingGroup()) {
        this.isCreatingGroup.set(false);
        this.toast.error('創建群組超時，請檢查網絡連接或帳號狀態');
      }
    }, 30000);
    
    console.log('[BatchInvite] 開始創建群組:', {
      name: this.newGroupName,
      type: this.newGroupType,
      account: onlineAccounts[0]?.phone
    });
    
    this.ipc.send('create-group', {
      name: this.newGroupName,
      description: this.newGroupDescription,
      type: this.newGroupType,
      accountPhone: onlineAccounts[0]?.phone // 指定使用哪個帳號創建
    });
    
    this.toast.info(`正在使用帳號 ${onlineAccounts[0]?.firstName || onlineAccounts[0]?.phone} 創建群組...`);
  }
  
  // 檢查在線帳號 - 使用從父組件傳入的帳號數據
  async checkOnlineAccounts(): Promise<AccountInfo[]> {
    const allAccounts = this.accounts();
    const onlineAccounts = allAccounts.filter(a => a.status === 'Online');
    
    console.log('[BatchInvite] 檢查帳號: 總數', allAccounts.length, ', 在線', onlineAccounts.length);
    
    if (onlineAccounts.length === 0) {
      this.toast.warning('沒有可用的在線帳號，請先登入帳號');
    }
    
    return onlineAccounts;
  }
  
  // 開始拉人到群組
  startInvitingToGroup(groupId: string, groupUrl: string) {
    this.isInviting.set(true);
    this.invitedCount.set(0);
    this.successCount.set(0);
    this.failedCount.set(0);
    this.skippedCount.set(0);
    
    // 發送到後端
    this.ipc.send('batch-invite:start', {
      groupId: groupId,
      groupUrl: groupUrl,
      targets: this.targets().map(t => ({
        telegramId: t.telegramId,
        username: t.username,
        firstName: t.firstName,
        displayName: t.displayName
      })),
      config: {
        batchSize: this.batchSize,
        minInterval: this.minInterval,
        maxInterval: this.maxInterval,
        sendWelcomeMessage: this.welcomeMessageSource() !== 'none',
        welcomeMessage: this.welcomeMessageContent
      }
    });
    
    this.toast.info('開始批量拉群...');
  }
  
  close() {
    if (this.isInviting()) {
      // 確認是否要中斷
      if (!confirm('拉群正在進行中，確定要取消嗎？')) {
        return;
      }
      this.ipc.send('batch-invite:cancel', {});
    }
    this.closeDialog.emit();
  }
  
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.isInviting()) {
      this.close();
    }
  }
}
