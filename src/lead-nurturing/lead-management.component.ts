/**
 * TG-AI智控王 潛在客戶管理組件
 * Lead Management Component v1.0
 */

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadService } from './lead.service';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
import { NurturingEngineService } from './nurturing-engine.service';
import { NotificationCenterService } from './notification-center.service';
// Phase 2 服務
import { NurturingOrchestratorService } from './nurturing-orchestrator.service';
import { OnlineStatusMonitorService } from './online-status-monitor.service';
import { OptimalTimingService } from './optimal-timing.service';
import { FatigueControllerService } from './fatigue-controller.service';
import { ConversationStrategyService } from './conversation-strategy.service';
// Phase 3 AI 服務
import { AIProviderService } from './ai-provider.service';
import { SentimentAnalyzerService } from './sentiment-analyzer.service';
import { DynamicTopicGeneratorService } from './dynamic-topic-generator.service';
import { AIConversationManagerService } from './ai-conversation-manager.service';
import {
  Lead,
  FunnelStage,
  LeadFilters,
  FollowUp,
  LeadNotification,
  ConversationType
} from './lead.models';

@Component({
  selector: 'app-lead-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lead-management h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold text-white">👥 潛在客戶管理</h1>
          <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
            {{ leadService.leads().length }} 位客戶
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- AI設置按鈕 (Phase 3) -->
          <button (click)="showAISettings.set(!showAISettings())"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm rounded-lg transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
            <span>AI 設置</span>
          </button>
          
          <!-- 協調器狀態 -->
          <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
            <div class="w-2 h-2 rounded-full"
                 [class]="orchestrator.isRunning() ? 'bg-green-500 animate-pulse' : 'bg-slate-500'"></div>
            <span class="text-sm text-slate-400">
              {{ orchestrator.isRunning() ? (orchestrator.mode() === 'auto' ? '全自動' : '半自動') : '已暫停' }}
            </span>
            <button (click)="toggleScheduler()"
                    class="ml-2 px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded">
              {{ orchestrator.isRunning() ? '暫停' : '啟動' }}
            </button>
            <!-- 模式切換 -->
            @if (orchestrator.isRunning()) {
              <button (click)="toggleMode()" 
                      class="px-2 py-0.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded">
                {{ orchestrator.mode() === 'auto' ? '切換半自動' : '切換全自動' }}
              </button>
            }
          </div>
          
          <!-- 通知按鈕 -->
          <button (click)="showNotifications = !showNotifications" 
                  class="relative p-2 text-slate-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            @if (notificationCenter.unreadCount() > 0) {
              <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {{ notificationCenter.unreadCount() > 9 ? '9+' : notificationCenter.unreadCount() }}
              </span>
            }
          </button>
        </div>
      </div>
      
      <!-- 今日概覽 -->
      <div class="grid grid-cols-6 gap-4 p-4 border-b border-slate-700">
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-400 mb-1">待處理任務</div>
          <div class="text-2xl font-bold text-orange-400">{{ orchestrator.status().pendingTaskCount }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-400 mb-1">今日完成</div>
          <div class="text-2xl font-bold text-green-400">{{ orchestrator.status().completedTodayCount }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-400 mb-1">收到回覆</div>
          <div class="text-2xl font-bold text-cyan-400">{{ orchestrator.todayStats().responses }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-400 mb-1">當前在線</div>
          <div class="text-2xl font-bold text-blue-400">{{ onlineMonitor.onlineLeads().length }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-400 mb-1">可聯繫</div>
          <div class="text-2xl font-bold text-emerald-400">{{ fatigueController.getFatigueStats().contactable }}</div>
        </div>
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-400 mb-1">高意向</div>
          <div class="text-2xl font-bold text-purple-400">{{ leadService.qualifiedLeads().length }}</div>
        </div>
      </div>
      
      <!-- 主內容區 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 左側：客戶列表 -->
        <div class="w-96 border-r border-slate-700 flex flex-col">
          <!-- 篩選欄 -->
          <div class="p-3 border-b border-slate-700">
            <div class="flex gap-2 mb-3">
              <input type="text" 
                     [(ngModel)]="searchQuery"
                     placeholder="搜索客戶..." 
                     class="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:border-cyan-500 outline-none">
              <select [(ngModel)]="selectedStage"
                      class="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm">
                <option value="">全部階段</option>
                <option value="stranger">陌生人</option>
                <option value="visitor">訪客</option>
                <option value="lead">潛在客戶</option>
                <option value="qualified">高意向</option>
                <option value="customer">客戶</option>
              </select>
            </div>
            
            <!-- 快速篩選標籤 -->
            <div class="flex flex-wrap gap-2">
              <button (click)="quickFilter('needsFollowUp')"
                      class="px-2 py-1 text-xs rounded-full"
                      [class]="activeQuickFilter === 'needsFollowUp' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                🔔 待跟進
              </button>
              <button (click)="quickFilter('highIntent')"
                      class="px-2 py-1 text-xs rounded-full"
                      [class]="activeQuickFilter === 'highIntent' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                🎯 高意向
              </button>
              <button (click)="quickFilter('newReplies')"
                      class="px-2 py-1 text-xs rounded-full"
                      [class]="activeQuickFilter === 'newReplies' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                💬 新回覆
              </button>
              <button (click)="quickFilter('')"
                      class="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600">
                清除
              </button>
            </div>
          </div>
          
          <!-- 客戶列表 -->
          <div class="flex-1 overflow-y-auto">
            @for (lead of filteredLeads(); track lead.id) {
              <div (click)="selectLead(lead)"
                   class="p-3 border-b border-slate-700/50 hover:bg-slate-800 cursor-pointer transition-colors"
                   [class.bg-slate-800]="selectedLead()?.id === lead.id">
                <div class="flex items-start gap-3">
                  <!-- 頭像 -->
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {{ getInitial(lead) }}
                  </div>
                  
                  <!-- 信息 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-white truncate">{{ lead.displayName }}</span>
                      @if (lead.username) {
                        <span class="text-xs text-slate-500">&#64;{{ lead.username }}</span>
                      }
                    </div>
                    
                    <div class="flex items-center gap-2 mt-1">
                      <!-- 階段標籤 -->
                      <span class="px-1.5 py-0.5 text-xs rounded" [class]="getStageClass(lead.stage)">
                        {{ getStageName(lead.stage) }}
                      </span>
                      
                      <!-- 評分 -->
                      <span class="text-xs text-slate-400">
                        評分: {{ lead.scores.overall }}
                      </span>
                      
                      <!-- 在線狀態 -->
                      @if (lead.onlineStatus === 'online') {
                        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                      }
                    </div>
                    
                    <!-- 下次跟進 -->
                    @if (lead.nextFollowUpAt) {
                      <div class="text-xs text-slate-500 mt-1">
                        下次跟進: {{ formatDate(lead.nextFollowUpAt) }}
                      </div>
                    }
                  </div>
                  
                  <!-- 快捷操作 -->
                  <div class="flex flex-col gap-1">
                    <button (click)="$event.stopPropagation(); quickFollowUp(lead, 'business')"
                            class="p-1 text-slate-400 hover:text-cyan-400" title="業務跟進">
                      💼
                    </button>
                    <button (click)="$event.stopPropagation(); quickFollowUp(lead, 'casual')"
                            class="p-1 text-slate-400 hover:text-pink-400" title="情感維護">
                      💬
                    </button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center text-slate-500">
                <p class="text-4xl mb-2">👥</p>
                <p>暫無客戶數據</p>
                <p class="text-sm mt-2">從資源發現添加客戶開始培育</p>
              </div>
            }
          </div>
        </div>
        
        <!-- 右側：詳情/今日任務 -->
        <div class="flex-1 flex flex-col overflow-hidden">
          @if (selectedLead()) {
            <!-- 客戶詳情 -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="max-w-3xl mx-auto space-y-6">
                <!-- 客戶頭部信息 -->
                <div class="bg-slate-800 rounded-xl p-6">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-4">
                      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                        {{ getInitial(selectedLead()!) }}
                      </div>
                      <div>
                        <h2 class="text-xl font-bold text-white">{{ selectedLead()!.displayName }}</h2>
                        @if (selectedLead()!.username) {
                          <p class="text-slate-400">&#64;{{ selectedLead()!.username }}</p>
                        }
                        <div class="flex items-center gap-2 mt-2">
                          <span class="px-2 py-1 text-sm rounded" [class]="getStageClass(selectedLead()!.stage)">
                            {{ getStageName(selectedLead()!.stage) }}
                          </span>
                          @for (tag of selectedLead()!.tags; track tag) {
                            <span class="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded-full">{{ tag }}</span>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- 評分卡 -->
                    <div class="text-right">
                      <div class="text-3xl font-bold text-cyan-400">{{ selectedLead()!.scores.overall }}</div>
                      <div class="text-sm text-slate-400">綜合評分</div>
                    </div>
                  </div>
                  
                  <!-- 評分詳情 -->
                  <div class="grid grid-cols-4 gap-4 mt-6">
                    <div class="text-center">
                      <div class="text-lg font-bold text-blue-400">{{ selectedLead()!.scores.trust }}</div>
                      <div class="text-xs text-slate-400">信任度</div>
                    </div>
                    <div class="text-center">
                      <div class="text-lg font-bold text-green-400">{{ selectedLead()!.scores.engagement }}</div>
                      <div class="text-xs text-slate-400">參與度</div>
                    </div>
                    <div class="text-center">
                      <div class="text-lg font-bold text-orange-400">{{ selectedLead()!.scores.intent }}</div>
                      <div class="text-xs text-slate-400">購買意向</div>
                    </div>
                    <div class="text-center">
                      <div class="text-lg font-bold text-red-400">{{ selectedLead()!.scores.urgency }}</div>
                      <div class="text-xs text-slate-400">緊迫度</div>
                    </div>
                  </div>
                </div>
                
                <!-- 操作按鈕 -->
                <div class="flex gap-3">
                  <button (click)="generateAndSend('business')"
                          class="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                    <span>💼</span> AI業務跟進
                  </button>
                  <button (click)="generateAndSend('casual')"
                          class="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                    <span>💬</span> AI情感維護
                  </button>
                  <button (click)="toggleNurturing(selectedLead()!)"
                          class="px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
                          [class]="selectedLead()!.isNurturing ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'">
                    {{ selectedLead()!.isNurturing ? '⏸️ 暫停培育' : '▶️ 開始培育' }}
                  </button>
                </div>
                
                <!-- AI生成預覽 -->
                @if (generatedContent()) {
                  <div class="bg-slate-800 rounded-xl p-4 border border-cyan-500/30">
                    <div class="flex items-center justify-between mb-3">
                      <h3 class="font-medium text-white">🤖 AI生成內容</h3>
                      <div class="flex gap-2">
                        <button (click)="regenerateContent()" class="text-sm text-slate-400 hover:text-white">🔄 重新生成</button>
                      </div>
                    </div>
                    <div class="p-4 bg-slate-700 rounded-lg text-white whitespace-pre-wrap">{{ generatedContent() }}</div>
                    <div class="flex gap-3 mt-4">
                      <button (click)="sendGeneratedContent()" 
                              class="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium">
                        ✓ 發送
                      </button>
                      <button (click)="editContent()" 
                              class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg">
                        ✏️ 編輯
                      </button>
                      <button (click)="generatedContent.set('')" 
                              class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg">
                        ✕ 取消
                      </button>
                    </div>
                  </div>
                }
                
                <!-- 統計和活動 -->
                <div class="grid grid-cols-2 gap-4">
                  <!-- 統計 -->
                  <div class="bg-slate-800 rounded-xl p-4">
                    <h3 class="font-medium text-white mb-3">📊 互動統計</h3>
                    <div class="space-y-2">
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-400">對話次數</span>
                        <span class="text-white">{{ selectedLead()!.stats.totalConversations }}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-400">發送消息</span>
                        <span class="text-white">{{ selectedLead()!.stats.messagesSent }}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-400">收到回覆</span>
                        <span class="text-white">{{ selectedLead()!.stats.messagesReceived }}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-400">回覆率</span>
                        <span class="text-white">{{ (selectedLead()!.stats.responseRate * 100).toFixed(0) }}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 時間線 -->
                  <div class="bg-slate-800 rounded-xl p-4">
                    <h3 class="font-medium text-white mb-3">📅 時間線</h3>
                    <div class="space-y-2">
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-400">首次接觸</span>
                        <span class="text-white">{{ formatDate(selectedLead()!.firstContactAt) }}</span>
                      </div>
                      @if (selectedLead()!.lastInteractionAt) {
                        <div class="flex justify-between text-sm">
                          <span class="text-slate-400">最後互動</span>
                          <span class="text-white">{{ formatDate(selectedLead()!.lastInteractionAt!) }}</span>
                        </div>
                      }
                      @if (selectedLead()!.nextFollowUpAt) {
                        <div class="flex justify-between text-sm">
                          <span class="text-slate-400">下次跟進</span>
                          <span class="text-cyan-400">{{ formatDate(selectedLead()!.nextFollowUpAt!) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
                
                <!-- 最近活動 -->
                <div class="bg-slate-800 rounded-xl p-4">
                  <h3 class="font-medium text-white mb-3">🕐 最近活動</h3>
                  <div class="space-y-3">
                    @for (activity of getRecentActivities(selectedLead()!.id); track activity.id) {
                      <div class="flex items-start gap-3 text-sm">
                        <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          {{ getActivityIcon(activity.type) }}
                        </div>
                        <div class="flex-1">
                          <p class="text-white">{{ activity.description }}</p>
                          <p class="text-slate-500 text-xs">{{ formatDateTime(activity.createdAt) }}</p>
                        </div>
                      </div>
                    } @empty {
                      <p class="text-slate-500 text-sm">暫無活動記錄</p>
                    }
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <!-- 今日跟進任務 -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="max-w-3xl mx-auto">
                <h2 class="text-lg font-bold text-white mb-4">📋 今日跟進任務</h2>
                
                @if (leadService.todayFollowUps().length > 0) {
                  <div class="space-y-3">
                    @for (followUp of leadService.todayFollowUps(); track followUp.id) {
                      <div class="bg-slate-800 rounded-xl p-4">
                        @if (getLeadForFollowUp(followUp); as lead) {
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {{ getInitial(lead) }}
                              </div>
                              <div>
                                <p class="font-medium text-white">{{ lead.displayName }}</p>
                                <p class="text-sm text-slate-400">
                                  {{ followUp.type === 'business' ? '💼 業務跟進' : '💬 情感維護' }}
                                  · {{ formatTime(followUp.scheduledAt) }}
                                </p>
                              </div>
                            </div>
                            
                            <div class="flex gap-2">
                              <button (click)="executeFollowUp(followUp)"
                                      class="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg">
                                執行
                              </button>
                              <button (click)="skipFollowUp(followUp)"
                                      class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">
                                跳過
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="bg-slate-800 rounded-xl p-8 text-center">
                    <p class="text-4xl mb-2">✅</p>
                    <p class="text-slate-400">今日任務已完成</p>
                  </div>
                }
                
                <!-- 銷售漏斗 -->
                <h2 class="text-lg font-bold text-white mt-8 mb-4">📊 銷售漏斗</h2>
                <div class="bg-slate-800 rounded-xl p-4">
                  <div class="space-y-3">
                    @for (stage of funnelStages; track stage.key) {
                      <div class="flex items-center gap-3">
                        <div class="w-20 text-sm text-slate-400">{{ stage.name }}</div>
                        <div class="flex-1 h-6 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-300"
                               [class]="stage.color"
                               [style.width.%]="getFunnelPercentage(stage.key)"></div>
                        </div>
                        <div class="w-12 text-right text-sm text-white">{{ leadService.leadsByStage()[stage.key] }}</div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- 通知面板 -->
      @if (showNotifications) {
        <div class="absolute right-0 top-14 w-96 max-h-[80vh] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          <div class="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 class="font-bold text-white">🔔 通知</h3>
            <button (click)="notificationCenter.markAllAsRead()" class="text-sm text-cyan-400 hover:text-cyan-300">
              全部已讀
            </button>
          </div>
          
          <div class="max-h-96 overflow-y-auto">
            @for (notification of notificationCenter.notifications().slice(0, 20); track notification.id) {
              <div class="p-4 border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer"
                   [class.bg-slate-700/30]="!notification.isRead"
                   (click)="handleNotificationClick(notification)">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center"
                       [class]="getNotificationIconClass(notification.priority)">
                    {{ getNotificationIcon(notification.type) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ notification.title }}</p>
                    <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">{{ notification.message }}</p>
                    <p class="text-xs text-slate-500 mt-1">{{ formatDateTime(notification.createdAt) }}</p>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center text-slate-500">
                <p>暫無通知</p>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- Phase 3: AI 設置面板 -->
      @if (showAISettings()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div class="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="text-2xl">🤖</span>
                AI 服務設置
              </h2>
              <button (click)="showAISettings.set(false)"
                      class="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="p-4 space-y-6">
              <!-- AI 提供者配置 -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span>📡</span> AI 提供者
                </h3>
                
                @for (provider of aiProvider.providers(); track provider.type) {
                  <div class="bg-slate-700/50 rounded-lg p-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                             [class]="provider.type === 'gemini' ? 'bg-blue-500/20 text-blue-400' : 
                                      provider.type === 'openai' ? 'bg-green-500/20 text-green-400' : 
                                      provider.type === 'claude' ? 'bg-orange-500/20 text-orange-400' : 
                                      'bg-purple-500/20 text-purple-400'">
                          {{ provider.type === 'gemini' ? '🔷' : provider.type === 'openai' ? '🟢' : provider.type === 'claude' ? '🟠' : '💻' }}
                        </div>
                        <div>
                          <div class="text-sm font-medium text-white">{{ provider.type | titlecase }}</div>
                          <div class="text-xs text-slate-400">{{ provider.defaultModel }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button (click)="testAIProvider(provider.type)"
                                class="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded">
                          測試
                        </button>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" 
                                 [checked]="provider.enabled"
                                 (change)="toggleAIProvider(provider.type, $event)"
                                 class="sr-only peer">
                          <div class="w-9 h-5 bg-slate-600 peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                      </div>
                    </div>
                    
                    @if (provider.enabled && provider.type !== 'local') {
                      <div class="mt-3 pt-3 border-t border-slate-600">
                        <label class="block text-xs text-slate-400 mb-1">API Key</label>
                        <input type="password" 
                               [value]="provider.apiKey || ''"
                               (blur)="setAIApiKey(provider.type, $event)"
                               placeholder="輸入 API Key..."
                               class="w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:ring-1 focus:ring-cyan-500">
                      </div>
                    }
                  </div>
                }
                
                @if (aiTestResult()) {
                  <div class="p-2 rounded text-sm"
                       [class]="aiTestResult()?.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                    {{ aiTestResult()?.message }}
                  </div>
                }
              </div>
              
              <!-- AI 使用統計 -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span>📊</span> 使用統計
                </h3>
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div class="text-2xl font-bold text-cyan-400">{{ aiProvider.usageStats().totalRequests }}</div>
                    <div class="text-xs text-slate-400">總請求數</div>
                  </div>
                  <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div class="text-2xl font-bold text-green-400">{{ formatTokens(aiProvider.usageStats().todayTokens) }}</div>
                    <div class="text-xs text-slate-400">今日Token</div>
                  </div>
                  <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div class="text-2xl font-bold text-yellow-400">\${{ aiProvider.usageStats().todayCost.toFixed(4) }}</div>
                    <div class="text-xs text-slate-400">今日費用</div>
                  </div>
                </div>
              </div>
              
              <!-- 對話風格設置 -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span>💬</span> 對話風格
                </h3>
                <div class="bg-slate-700/50 rounded-lg p-3 space-y-3">
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">語調</label>
                    <select (change)="updateConversationTone($event)"
                            class="w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded text-sm text-white">
                      <option value="professional">專業正式</option>
                      <option value="friendly" selected>友好親切</option>
                      <option value="casual">輕鬆隨意</option>
                      <option value="warm">溫暖關懷</option>
                    </select>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-slate-300">使用表情符號</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" 
                             [checked]="aiConversationManager.promptConfig().personality.useEmoji"
                             (change)="toggleEmoji($event)"
                             class="sr-only peer">
                      <div class="w-9 h-5 bg-slate-600 peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">最大消息長度</label>
                    <input type="number" 
                           [value]="aiConversationManager.promptConfig().constraints.maxMessageLength"
                           (blur)="updateMaxMessageLength($event)"
                           min="50" max="500"
                           class="w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded text-sm text-white">
                  </div>
                </div>
              </div>
              
              <!-- 話題統計 -->
              <div class="space-y-3">
                <h3 class="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span>📝</span> 話題庫
                </h3>
                <div class="bg-slate-700/50 rounded-lg p-3">
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-slate-400">總話題數</span>
                      <span class="text-white">{{ topicGenerator.topics().length }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">熱點話題</span>
                      <span class="text-white">{{ topicGenerator.trendingTopics().length }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="sticky bottom-0 bg-slate-800 p-4 border-t border-slate-700 flex justify-end gap-2">
              <button (click)="showAISettings.set(false)"
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                關閉
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class LeadManagementComponent implements OnInit, OnDestroy {
  // 服務注入
  leadService = inject(LeadService);
  scheduler = inject(FollowUpSchedulerService);
  nurturingEngine = inject(NurturingEngineService);
  notificationCenter = inject(NotificationCenterService);
  // Phase 2 服務
  orchestrator = inject(NurturingOrchestratorService);
  onlineMonitor = inject(OnlineStatusMonitorService);
  optimalTiming = inject(OptimalTimingService);
  fatigueController = inject(FatigueControllerService);
  conversationStrategy = inject(ConversationStrategyService);
  // Phase 3 AI 服務
  aiProvider = inject(AIProviderService);
  sentimentAnalyzer = inject(SentimentAnalyzerService);
  topicGenerator = inject(DynamicTopicGeneratorService);
  aiConversationManager = inject(AIConversationManagerService);

  // 狀態
  selectedLead = signal<Lead | null>(null);
  searchQuery = '';
  
  // Phase 3 狀態
  showAISettings = signal(false);
  aiTestResult = signal<{ success: boolean; message: string } | null>(null);
  selectedStage = '';
  activeQuickFilter = '';
  showNotifications = false;
  generatedContent = signal('');
  currentGenerationType = signal<ConversationType>('business');
  // Phase 2 UI 狀態
  showAdvancedPanel = signal(false);
  selectedTab = signal<'overview' | 'tasks' | 'settings'>('overview');
  
  // 漏斗階段配置
  funnelStages = [
    { key: 'stranger' as FunnelStage, name: '陌生人', color: 'bg-slate-500' },
    { key: 'visitor' as FunnelStage, name: '訪客', color: 'bg-blue-500' },
    { key: 'lead' as FunnelStage, name: '潛在客戶', color: 'bg-cyan-500' },
    { key: 'qualified' as FunnelStage, name: '高意向', color: 'bg-purple-500' },
    { key: 'customer' as FunnelStage, name: '客戶', color: 'bg-green-500' }
  ];
  
  // 過濾後的客戶列表
  filteredLeads = computed(() => {
    let leads = this.leadService.leads();
    
    // 搜索過濾
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      leads = leads.filter(l =>
        l.displayName.toLowerCase().includes(query) ||
        l.username?.toLowerCase().includes(query)
      );
    }
    
    // 階段過濾
    if (this.selectedStage) {
      leads = leads.filter(l => l.stage === this.selectedStage);
    }
    
    // 快速過濾
    if (this.activeQuickFilter === 'needsFollowUp') {
      leads = this.leadService.leadsNeedingFollowUp();
    } else if (this.activeQuickFilter === 'highIntent') {
      leads = leads.filter(l => l.scores.intent >= 70);
    }
    
    // 按評分排序
    return leads.sort((a, b) => b.scores.overall - a.scores.overall);
  });
  
  ngOnInit(): void {
    // 啟動協調器（使用半自動模式）
    this.orchestrator.start('semi-auto');

    // 註冊通知動作回調
    this.notificationCenter.onAction('view_lead', (result) => {
      const leadId = result.data?.params?.leadId;
      if (leadId) {
        const lead = this.leadService.getLead(leadId);
        if (lead) this.selectLead(lead);
      }
    });
    
    // 註冊任務執行回調
    this.notificationCenter.onAction('execute_task', (result) => {
      const taskId = result.data?.params?.taskId;
      if (taskId) {
        this.orchestrator.confirmTask(taskId);
      }
    });
    
    // 註冊確認發送回調
    this.notificationCenter.onAction('confirm_send', (result) => {
      const taskId = result.data?.params?.taskId;
      if (taskId) {
        this.orchestrator.confirmTask(taskId);
      }
    });
  }

  ngOnDestroy(): void {
    this.notificationCenter.offAction('view_lead');
    this.notificationCenter.offAction('execute_task');
    this.notificationCenter.offAction('confirm_send');
    this.orchestrator.stop();
  }
  
  // 選擇客戶
  selectLead(lead: Lead): void {
    this.selectedLead.set(lead);
    this.generatedContent.set('');
  }
  
  // 快速過濾
  quickFilter(filter: string): void {
    this.activeQuickFilter = filter === this.activeQuickFilter ? '' : filter;
  }
  
  // 切換調度器
  toggleScheduler(): void {
    if (this.orchestrator.isRunning()) {
      this.orchestrator.stop();
    } else {
      this.orchestrator.start('semi-auto');
    }
  }
  
  // 切換模式
  toggleMode(): void {
    const currentMode = this.orchestrator.mode();
    this.orchestrator.setMode(currentMode === 'auto' ? 'semi-auto' : 'auto');
  }
  
  // 獲取客戶的疲勞度狀態
  getLeadFatigue(leadId: string) {
    return this.fatigueController.getFatigueStatus(leadId);
  }
  
  // 獲取客戶的在線狀態
  getLeadOnlineStatus(leadId: string) {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return null;
    return this.onlineMonitor.getOnlineStatus(lead.peerId);
  }
  
  // 獲取最佳聯繫時間
  getBestContactTime(leadId: string) {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return null;
    return this.optimalTiming.getRecommendation(lead);
  }
  
  // 獲取對話策略
  getConversationStrategy(leadId: string) {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return null;
    return this.conversationStrategy.getStrategy(lead);
  }
  
  // 獲取待處理任務
  getPendingTasks() {
    return this.orchestrator.taskQueue().filter(t => 
      t.status === 'pending' || t.status === 'ready'
    );
  }
  
  // 執行任務
  async executeTask(taskId: string): Promise<void> {
    const task = this.orchestrator.getTask(taskId);
    if (task) {
      await this.orchestrator.confirmTask(taskId);
    }
  }
  
  // 跳過任務
  skipTask(taskId: string): void {
    this.orchestrator.skipTask(taskId, '手動跳過');
  }

  // 切換培育狀態
  toggleNurturing(lead: Lead): void {
    if (lead.isNurturing) {
      this.nurturingEngine.stopNurturing(lead.id);
    } else {
      this.nurturingEngine.startNurturing(lead.id);
    }
    // 重新獲取更新後的數據
    const updated = this.leadService.getLead(lead.id);
    if (updated) this.selectedLead.set(updated);
  }
  
  // 生成並發送
  async generateAndSend(type: ConversationType): Promise<void> {
    const lead = this.selectedLead();
    if (!lead) return;
    
    this.currentGenerationType.set(type);
    
    try {
      const response = await this.nurturingEngine.generateContent({
        leadId: lead.id,
        type
      });
      
      this.generatedContent.set(response.content);
    } catch (e) {
      console.error('Failed to generate content:', e);
    }
  }
  
  // 重新生成
  async regenerateContent(): Promise<void> {
    const lead = this.selectedLead();
    if (!lead) return;
    
    const response = await this.nurturingEngine.generateContent({
      leadId: lead.id,
      type: this.currentGenerationType()
    });
    
    this.generatedContent.set(response.content);
  }
  
  // 發送生成的內容
  sendGeneratedContent(): void {
    const lead = this.selectedLead();
    const content = this.generatedContent();
    if (!lead || !content) return;
    
    // 添加消息記錄
    this.leadService.addMessage(lead.id, content, 'assistant', {
      isAIGenerated: true,
      conversationType: this.currentGenerationType()
    });
    
    // 清空生成內容
    this.generatedContent.set('');
    
    // 刷新客戶數據
    const updated = this.leadService.getLead(lead.id);
    if (updated) this.selectedLead.set(updated);
  }
  
  // 編輯內容
  editContent(): void {
    // 這裡可以打開編輯對話框
    console.log('Edit content');
  }
  
  // 快速跟進
  async quickFollowUp(lead: Lead, type: ConversationType): Promise<void> {
    this.selectLead(lead);
    await this.generateAndSend(type);
  }
  
  // 執行跟進
  async executeFollowUp(followUp: FollowUp): Promise<void> {
    await this.scheduler.executeFollowUpNow(followUp.id);
  }
  
  // 跳過跟進
  skipFollowUp(followUp: FollowUp): void {
    this.scheduler.skipFollowUp(followUp.id);
  }
  
  // 獲取跟進對應的客戶
  getLeadForFollowUp(followUp: FollowUp): Lead | undefined {
    return this.leadService.getLead(followUp.leadId);
  }
  
  // 獲取新回覆數量
  getNewRepliesCount(): number {
    return this.notificationCenter.notifications()
      .filter(n => n.type === 'new_reply' && !n.isRead).length;
  }
  
  // 獲取最近活動
  getRecentActivities(leadId: string) {
    return this.leadService.getActivities(leadId, 10);
  }
  
  // 獲取漏斗百分比
  getFunnelPercentage(stage: FunnelStage): number {
    const total = this.leadService.leads().length;
    if (total === 0) return 0;
    return (this.leadService.leadsByStage()[stage] / total) * 100;
  }
  
  // 處理通知點擊
  handleNotificationClick(notification: LeadNotification): void {
    this.notificationCenter.markAsRead(notification.id);
    
    if (notification.leadId && notification.leadId !== 'test') {
      const lead = this.leadService.getLead(notification.leadId);
      if (lead) {
        this.selectLead(lead);
        this.showNotifications = false;
      }
    }
  }
  
  // ============ 輔助方法 ============
  
  getInitial(lead: Lead): string {
    return (lead.displayName || lead.username || '?')[0].toUpperCase();
  }
  
  getStageName(stage: FunnelStage): string {
    return this.leadService.getStageName(stage);
  }
  
  getStageClass(stage: FunnelStage): string {
    const classes: Record<FunnelStage, string> = {
      stranger: 'bg-slate-600 text-slate-200',
      visitor: 'bg-blue-500/20 text-blue-400',
      lead: 'bg-cyan-500/20 text-cyan-400',
      qualified: 'bg-purple-500/20 text-purple-400',
      customer: 'bg-green-500/20 text-green-400',
      advocate: 'bg-yellow-500/20 text-yellow-400',
      dormant: 'bg-slate-500/20 text-slate-400'
    };
    return classes[stage];
  }
  
  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      'first_contact': '👋',
      'message_sent': '📤',
      'message_received': '📩',
      'stage_changed': '📈',
      'follow_up_executed': '✅',
      'score_updated': '📊'
    };
    return icons[type] || '📌';
  }
  
  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'purchase_intent': '💰',
      'keyword_trigger': '🔑',
      'new_reply': '💬',
      'follow_up_due': '⏰',
      'stage_change': '📈',
      'negative_sentiment': '😟'
    };
    return icons[type] || '🔔';
  }
  
  getNotificationIconClass(priority: string): string {
    const classes: Record<string, string> = {
      'urgent': 'bg-red-500/20',
      'important': 'bg-orange-500/20',
      'normal': 'bg-slate-700',
      'low': 'bg-slate-700'
    };
    return classes[priority] || 'bg-slate-700';
  }
  
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }
  
  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }
  
  formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // ============ Phase 3: AI 服務方法 ============
  
  // 測試AI提供者
  async testAIProvider(type: string): Promise<void> {
    this.aiTestResult.set(null);
    try {
      const result = await this.aiProvider.testProvider(type as any);
      this.aiTestResult.set({
        success: result.success,
        message: result.success 
          ? `✓ ${type} 連接成功 (${result.latency}ms)` 
          : `✗ ${result.message}`
      });
    } catch (e: any) {
      this.aiTestResult.set({
        success: false,
        message: `✗ 測試失敗: ${e.message}`
      });
    }
    
    // 3秒後清除結果
    setTimeout(() => this.aiTestResult.set(null), 3000);
  }
  
  // 切換AI提供者
  toggleAIProvider(type: string, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.aiProvider.toggleProvider(type as any, enabled);
  }
  
  // 設置AI API Key
  setAIApiKey(type: string, event: Event): void {
    const apiKey = (event.target as HTMLInputElement).value;
    if (apiKey) {
      this.aiProvider.setApiKey(type as any, apiKey);
    }
  }
  
  // 更新對話語調
  updateConversationTone(event: Event): void {
    const tone = (event.target as HTMLSelectElement).value as any;
    this.aiConversationManager.updatePromptConfig({
      personality: { tone, useEmoji: true, formality: 'medium' }
    });
  }
  
  // 切換表情符號
  toggleEmoji(event: Event): void {
    const useEmoji = (event.target as HTMLInputElement).checked;
    const current = this.aiConversationManager.promptConfig().personality;
    this.aiConversationManager.updatePromptConfig({
      personality: { ...current, useEmoji }
    });
  }
  
  // 更新最大消息長度
  updateMaxMessageLength(event: Event): void {
    const maxLength = parseInt((event.target as HTMLInputElement).value, 10);
    if (maxLength >= 50 && maxLength <= 500) {
      const current = this.aiConversationManager.promptConfig().constraints;
      this.aiConversationManager.updatePromptConfig({
        constraints: { ...current, maxMessageLength: maxLength }
      });
    }
  }
  
  // 格式化Token數
  formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return (tokens / 1000000).toFixed(1) + 'M';
    }
    if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'K';
    }
    return tokens.toString();
  }
}
