/**
 * TG-AI智控王 主控制台組件
 * Dashboard Component v1.0
 * 
 * 統一的功能入口和數據概覽
 */

import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 導入服務
import { GroupScorer } from '../analytics/group-scorer';
import { RecommendationEngine } from '../analytics/recommendation-engine';
import { MemberAnalyzer } from '../analytics/member-analyzer';
import { AIReplyEngine } from '../automation/ai-reply-engine';
import { IntentAnalyzer } from '../automation/intent-analyzer';
import { TriggerSystem } from '../automation/trigger-system';
import { WorkflowEngine } from '../automation/workflow-engine';
import { TaskScheduler } from '../scheduler/task-scheduler';
import { AccountManager } from '../multi-account/account-manager';
import { CloudSyncService } from '../sync/cloud-sync.service';
import { BatchOperator } from '../engines/batch-operator';
import { BatchAutomationBridge } from '../automation/batch-automation-bridge';

type DashboardTab = 'overview' | 'search' | 'analytics' | 'automation' | 'batch' | 'accounts' | 'tasks' | 'settings';

@Component({
  selector: 'app-group-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard" [class.dark]="isDarkMode()">
      <!-- 頂部導航 -->
      <header class="dashboard-header">
        <div class="header-left">
          <h1 class="logo">
            <span class="logo-icon">🔍</span>
            <span class="logo-text">TG-AI智控王</span>
          </h1>
        </div>
        
        <nav class="header-nav">
          <button 
            *ngFor="let tab of tabs" 
            class="nav-btn"
            [class.active]="activeTab() === tab.id"
            (click)="setActiveTab(tab.id)">
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </nav>
        
        <div class="header-right">
          <button class="icon-btn" (click)="toggleDarkMode()" [title]="isDarkMode() ? '淺色模式' : '深色模式'">
            {{ isDarkMode() ? '☀️' : '🌙' }}
          </button>
          <button class="icon-btn" (click)="runTests()" title="運行測試">
            🧪
          </button>
          <button class="icon-btn" (click)="syncData()" title="同步數據">
            🔄
          </button>
          <div class="sync-status" [class.online]="syncStatus() === 'synced'">
            <span class="status-dot"></span>
            {{ syncStatusText() }}
          </div>
        </div>
      </header>
      
      <!-- 主要內容 -->
      <main class="dashboard-main">
        <!-- 概覽頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'overview'">
          <div class="overview-grid">
            <!-- 統計卡片 -->
            <div class="stat-card primary">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <div class="stat-value">{{ totalGroups() }}</div>
                <div class="stat-label">已收藏群組</div>
              </div>
            </div>
            
            <div class="stat-card success">
              <div class="stat-icon">🤖</div>
              <div class="stat-info">
                <div class="stat-value">{{ aiReplies() }}</div>
                <div class="stat-label">AI 回覆</div>
              </div>
            </div>
            
            <div class="stat-card warning">
              <div class="stat-icon">⚡</div>
              <div class="stat-info">
                <div class="stat-value">{{ activeTriggers() }}</div>
                <div class="stat-label">啟用觸發器</div>
              </div>
            </div>
            
            <div class="stat-card info">
              <div class="stat-icon">🔄</div>
              <div class="stat-info">
                <div class="stat-value">{{ activeWorkflows() }}</div>
                <div class="stat-label">工作流</div>
              </div>
            </div>
            
            <!-- 快速操作 -->
            <div class="quick-actions card">
              <h3>快速操作</h3>
              <div class="action-grid">
                <button class="action-btn" (click)="setActiveTab('search')">
                  <span class="action-icon">🔍</span>
                  <span>搜索群組</span>
                </button>
                <button class="action-btn" (click)="setActiveTab('automation')">
                  <span class="action-icon">🤖</span>
                  <span>創建自動化</span>
                </button>
                <button class="action-btn" (click)="setActiveTab('tasks')">
                  <span class="action-icon">📋</span>
                  <span>查看任務</span>
                </button>
                <button class="action-btn" (click)="setActiveTab('accounts')">
                  <span class="action-icon">👤</span>
                  <span>帳號管理</span>
                </button>
              </div>
            </div>
            
            <!-- 最近活動 -->
            <div class="recent-activity card">
              <h3>最近活動</h3>
              <div class="activity-list">
                <div class="activity-item" *ngFor="let activity of recentActivities()">
                  <span class="activity-icon">{{ activity.icon }}</span>
                  <div class="activity-content">
                    <div class="activity-title">{{ activity.title }}</div>
                    <div class="activity-time">{{ activity.time }}</div>
                  </div>
                </div>
                <div class="empty-state" *ngIf="recentActivities().length === 0">
                  暫無活動記錄
                </div>
              </div>
            </div>
            
            <!-- AI 回覆統計 -->
            <div class="ai-stats card">
              <h3>AI 回覆統計</h3>
              <div class="stats-grid">
                <div class="mini-stat">
                  <div class="mini-value">{{ aiStats().totalReplies }}</div>
                  <div class="mini-label">總回覆數</div>
                </div>
                <div class="mini-stat">
                  <div class="mini-value">{{ (aiStats().avgConfidence * 100).toFixed(0) }}%</div>
                  <div class="mini-label">平均置信度</div>
                </div>
                <div class="mini-stat">
                  <div class="mini-value">{{ aiStats().avgResponseTime.toFixed(0) }}ms</div>
                  <div class="mini-label">平均響應時間</div>
                </div>
              </div>
            </div>
            
            <!-- 觸發器統計 -->
            <div class="trigger-stats card">
              <h3>觸發器執行</h3>
              <div class="trigger-list">
                <div class="trigger-item" *ngFor="let trigger of topTriggers()">
                  <div class="trigger-name">{{ trigger.name }}</div>
                  <div class="trigger-bar">
                    <div class="trigger-progress" 
                         [style.width.%]="trigger.successRate">
                    </div>
                  </div>
                  <div class="trigger-count">{{ trigger.executions }} 次</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 搜索頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'search'">
          <div class="search-container">
            <div class="search-box">
              <input 
                type="text" 
                class="search-input"
                placeholder="搜索群組、頻道..."
                [(ngModel)]="searchQuery"
                (keyup.enter)="performSearch()">
              <button class="search-btn" (click)="performSearch()">
                🔍 搜索
              </button>
            </div>
            
            <div class="search-filters">
              <label class="filter-checkbox">
                <input type="checkbox" [(ngModel)]="searchFilters.telegram">
                <span>Telegram</span>
              </label>
              <label class="filter-checkbox">
                <input type="checkbox" [(ngModel)]="searchFilters.jiso">
                <span>極搜</span>
              </label>
              <label class="filter-checkbox">
                <input type="checkbox" [(ngModel)]="searchFilters.tgstat">
                <span>TGStat</span>
              </label>
            </div>
            
            <div class="search-results" *ngIf="searchResults().length > 0">
              <div class="result-card" *ngFor="let group of searchResults()">
                <div class="result-avatar">
                  <img [src]="group.photo || 'assets/default-group.png'" [alt]="group.title">
                </div>
                <div class="result-info">
                  <div class="result-title">{{ group.title }}</div>
                  <div class="result-meta">
                    <span>👥 {{ group.membersCount | number }}</span>
                    <span>{{ group.type }}</span>
                    <span class="source-badge">{{ group.source }}</span>
                  </div>
                  <div class="result-desc">{{ group.description }}</div>
                </div>
                <div class="result-actions">
                  <button class="mini-btn" (click)="viewGroupDetail(group)">查看</button>
                  <button class="mini-btn primary" (click)="favoriteGroup(group)">收藏</button>
                </div>
              </div>
            </div>
            
            <div class="empty-state" *ngIf="searchResults().length === 0 && searchQuery">
              <span class="empty-icon">🔍</span>
              <p>沒有找到相關結果</p>
            </div>
          </div>
        </div>
        
        <!-- 數據分析頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'analytics'">
          <div class="analytics-container">
            <div class="analytics-header">
              <h2>數據分析</h2>
              <div class="time-range">
                <button class="time-btn" [class.active]="timeRange === '7d'" (click)="timeRange = '7d'">7天</button>
                <button class="time-btn" [class.active]="timeRange === '30d'" (click)="timeRange = '30d'">30天</button>
                <button class="time-btn" [class.active]="timeRange === '90d'" (click)="timeRange = '90d'">90天</button>
              </div>
            </div>
            
            <div class="analytics-grid">
              <div class="analytics-card">
                <h3>意圖分布</h3>
                <div class="intent-chart">
                  <div class="intent-bar" *ngFor="let item of intentDistribution()">
                    <div class="intent-label">{{ item.name }}</div>
                    <div class="intent-progress">
                      <div class="intent-fill" [style.width.%]="item.percentage"></div>
                    </div>
                    <div class="intent-value">{{ item.percentage | number:'1.0-0' }}%</div>
                  </div>
                </div>
              </div>
              
              <div class="analytics-card">
                <h3>情感分布</h3>
                <div class="sentiment-chart">
                  <div class="sentiment-item positive">
                    <span class="sentiment-icon">😊</span>
                    <span class="sentiment-label">正面</span>
                    <span class="sentiment-value">{{ sentimentDistribution().positive }}%</span>
                  </div>
                  <div class="sentiment-item neutral">
                    <span class="sentiment-icon">😐</span>
                    <span class="sentiment-label">中性</span>
                    <span class="sentiment-value">{{ sentimentDistribution().neutral }}%</span>
                  </div>
                  <div class="sentiment-item negative">
                    <span class="sentiment-icon">😞</span>
                    <span class="sentiment-label">負面</span>
                    <span class="sentiment-value">{{ sentimentDistribution().negative }}%</span>
                  </div>
                </div>
              </div>
              
              <div class="analytics-card wide">
                <h3>成員分析概覽</h3>
                <div class="member-stats">
                  <div class="member-stat">
                    <div class="stat-circle active">
                      <span>{{ memberStats().activeRate | number:'1.0-0' }}%</span>
                    </div>
                    <div class="stat-name">活躍率</div>
                  </div>
                  <div class="member-stat">
                    <div class="stat-circle premium">
                      <span>{{ memberStats().premiumRate | number:'1.0-0' }}%</span>
                    </div>
                    <div class="stat-name">Premium 率</div>
                  </div>
                  <div class="member-stat">
                    <div class="stat-circle bot">
                      <span>{{ memberStats().botRate | number:'1.0-0' }}%</span>
                    </div>
                    <div class="stat-name">機器人率</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 自動化頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'automation'">
          <div class="automation-container">
            <div class="automation-header">
              <h2>自動化管理</h2>
              <div class="automation-actions">
                <button class="btn primary" (click)="createTrigger()">
                  ⚡ 新建觸發器
                </button>
                <button class="btn" (click)="createWorkflow()">
                  🔄 新建工作流
                </button>
              </div>
            </div>
            
            <div class="automation-tabs">
              <button 
                class="auto-tab" 
                [class.active]="automationSubTab === 'triggers'"
                (click)="automationSubTab = 'triggers'">
                觸發器 ({{ triggers().length }})
              </button>
              <button 
                class="auto-tab" 
                [class.active]="automationSubTab === 'workflows'"
                (click)="automationSubTab = 'workflows'">
                工作流 ({{ workflows().length }})
              </button>
              <button 
                class="auto-tab" 
                [class.active]="automationSubTab === 'templates'"
                (click)="automationSubTab = 'templates'">
                回覆模板 ({{ templates().length }})
              </button>
            </div>
            
            <!-- 觸發器列表 -->
            <div class="automation-list" *ngIf="automationSubTab === 'triggers'">
              <div class="automation-item" *ngFor="let trigger of triggers()">
                <div class="item-status">
                  <span class="status-indicator" [class.active]="trigger.enabled"></span>
                </div>
                <div class="item-info">
                  <div class="item-name">{{ trigger.name }}</div>
                  <div class="item-meta">
                    <span class="event-badge">{{ trigger.event }}</span>
                    <span>{{ trigger.stats.executionCount }} 次執行</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="icon-btn" (click)="toggleTrigger(trigger)" [title]="trigger.enabled ? '禁用' : '啟用'">
                    {{ trigger.enabled ? '⏸️' : '▶️' }}
                  </button>
                  <button class="icon-btn" (click)="editTrigger(trigger)" title="編輯">
                    ✏️
                  </button>
                  <button class="icon-btn danger" (click)="deleteTrigger(trigger)" title="刪除">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 工作流列表 -->
            <div class="automation-list" *ngIf="automationSubTab === 'workflows'">
              <div class="automation-item" *ngFor="let workflow of workflows()">
                <div class="item-status">
                  <span class="status-indicator" [class.active]="workflow.status === 'active'"></span>
                </div>
                <div class="item-info">
                  <div class="item-name">{{ workflow.name }}</div>
                  <div class="item-meta">
                    <span>{{ workflow.nodes.length }} 個節點</span>
                    <span>{{ workflow.stats.executionCount }} 次執行</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="icon-btn" (click)="runWorkflow(workflow)" title="執行">
                    ▶️
                  </button>
                  <button class="icon-btn" (click)="editWorkflow(workflow)" title="編輯">
                    ✏️
                  </button>
                  <button class="icon-btn danger" (click)="deleteWorkflow(workflow)" title="刪除">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 模板列表 -->
            <div class="automation-list" *ngIf="automationSubTab === 'templates'">
              <div class="automation-item" *ngFor="let template of templates()">
                <div class="item-info wide">
                  <div class="item-name">{{ template.name }}</div>
                  <div class="item-meta">
                    <span class="category-badge">{{ template.category }}</span>
                    <span>使用 {{ template.usageCount }} 次</span>
                  </div>
                  <div class="template-preview">{{ template.content | slice:0:100 }}...</div>
                </div>
                <div class="item-actions">
                  <button class="icon-btn" (click)="editTemplate(template)" title="編輯">
                    ✏️
                  </button>
                  <button class="icon-btn danger" (click)="deleteTemplate(template)" title="刪除">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 帳號管理頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'accounts'">
          <div class="accounts-container">
            <div class="accounts-header">
              <h2>帳號管理</h2>
              <button class="btn primary" (click)="addAccount()">
                ➕ 添加帳號
              </button>
            </div>
            
            <div class="accounts-grid">
              <div class="account-card" *ngFor="let account of accounts()">
                <div class="account-header">
                  <div class="account-avatar">
                    <img [src]="account.avatar || 'assets/default-avatar.png'" [alt]="account.name">
                    <span class="online-dot" [class.online]="account.isOnline"></span>
                  </div>
                  <div class="account-info">
                    <div class="account-name">{{ account.name }}</div>
                    <div class="account-phone">{{ account.phone }}</div>
                  </div>
                  <div class="health-badge" [class]="account.healthLevel">
                    {{ account.healthScore }}%
                  </div>
                </div>
                
                <div class="account-stats">
                  <div class="acc-stat">
                    <span class="acc-label">今日消息</span>
                    <span class="acc-value">{{ account.dailyMessages }}/{{ account.dailyLimit }}</span>
                  </div>
                  <div class="acc-stat">
                    <span class="acc-label">狀態</span>
                    <span class="acc-value" [class]="account.status">{{ getStatusText(account.status) }}</span>
                  </div>
                </div>
                
                <div class="account-actions">
                  <button class="mini-btn" (click)="warmUpAccount(account)">預熱</button>
                  <button class="mini-btn" (click)="configAccount(account)">設置</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 批量操作頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'batch'">
          <div class="batch-container">
            <div class="batch-header">
              <h2>批量操作中心</h2>
              <div class="batch-actions">
                <button class="btn primary" (click)="createBatchOperation()">
                  ➕ 新建批量操作
                </button>
              </div>
            </div>
            
            <!-- 操作統計 -->
            <div class="batch-stats-grid">
              <div class="batch-stat-card">
                <div class="batch-stat-icon">📤</div>
                <div class="batch-stat-info">
                  <div class="batch-stat-value">{{ activeBatchCount() }}</div>
                  <div class="batch-stat-label">進行中</div>
                </div>
              </div>
              <div class="batch-stat-card success">
                <div class="batch-stat-icon">✓</div>
                <div class="batch-stat-info">
                  <div class="batch-stat-value">{{ batchStats().today.success }}</div>
                  <div class="batch-stat-label">今日成功</div>
                </div>
              </div>
              <div class="batch-stat-card warning">
                <div class="batch-stat-icon">⏳</div>
                <div class="batch-stat-info">
                  <div class="batch-stat-value">{{ batchQueue().length }}</div>
                  <div class="batch-stat-label">隊列中</div>
                </div>
              </div>
              <div class="batch-stat-card info">
                <div class="batch-stat-icon">📊</div>
                <div class="batch-stat-info">
                  <div class="batch-stat-value">{{ batchStats().total.sent }}</div>
                  <div class="batch-stat-label">總計處理</div>
                </div>
              </div>
            </div>
            
            <!-- 當前操作 -->
            <div class="current-batch" *ngIf="batchCurrentOperation()">
              <h3>當前操作</h3>
              <div class="batch-operation-card running">
                <div class="batch-op-header">
                  <div class="batch-op-type">
                    <span class="type-icon">{{ getBatchTypeIcon(batchCurrentOperation()!.type) }}</span>
                    <span class="type-name">{{ getBatchTypeName(batchCurrentOperation()!.type) }}</span>
                  </div>
                  <div class="batch-op-status running">運行中</div>
                </div>
                
                <div class="batch-op-progress">
                  <div class="progress-bar-full">
                    <div class="progress-fill-success" 
                         [style.width.%]="(batchCurrentOperation()!.progress.success / batchCurrentOperation()!.progress.total) * 100">
                    </div>
                    <div class="progress-fill-failed" 
                         [style.width.%]="(batchCurrentOperation()!.progress.failed / batchCurrentOperation()!.progress.total) * 100">
                    </div>
                  </div>
                  <div class="progress-numbers">
                    <span class="progress-success">✓ {{ batchCurrentOperation()!.progress.success }}</span>
                    <span class="progress-failed">✗ {{ batchCurrentOperation()!.progress.failed }}</span>
                    <span class="progress-total">{{ batchCurrentOperation()!.progress.processed }}/{{ batchCurrentOperation()!.progress.total }}</span>
                  </div>
                </div>
                
                <div class="batch-op-controls">
                  <button class="mini-btn" *ngIf="batchCurrentOperation()!.status === 'running'" (click)="pauseBatch()">
                    ⏸️ 暫停
                  </button>
                  <button class="mini-btn primary" *ngIf="batchCurrentOperation()!.status === 'paused'" (click)="resumeBatch()">
                    ▶️ 繼續
                  </button>
                  <button class="mini-btn danger" (click)="stopBatch()">
                    ⏹️ 停止
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 操作隊列 -->
            <div class="batch-queue" *ngIf="batchQueue().length > 0">
              <h3>操作隊列 ({{ batchQueue().length }})</h3>
              <div class="batch-queue-list">
                <div class="queue-item-card" *ngFor="let op of batchQueue(); let i = index">
                  <div class="queue-position">{{ i + 1 }}</div>
                  <div class="queue-item-info">
                    <span class="queue-type">{{ getBatchTypeName(op.type) }}</span>
                    <span class="queue-targets">{{ op.progress.total }} 個目標</span>
                  </div>
                  <button class="icon-btn danger" (click)="cancelQueuedBatch(op.id)">✗</button>
                </div>
              </div>
            </div>
            
            <!-- 最近操作歷史 -->
            <div class="batch-history">
              <h3>最近操作</h3>
              <div class="batch-history-list" *ngIf="batchJobHistory().length > 0">
                <div class="history-item-card" *ngFor="let job of batchJobHistory().slice(0, 10)">
                  <div class="history-status-icon" [class]="job.status">
                    {{ job.status === 'completed' ? '✅' : '❌' }}
                  </div>
                  <div class="history-item-info">
                    <div class="history-source">{{ job.source === 'trigger' ? '觸發器' : job.source === 'workflow' ? '工作流' : '手動' }}</div>
                    <div class="history-result">
                      {{ job.progress.success }}/{{ job.progress.total }} 成功
                    </div>
                  </div>
                  <div class="history-time">{{ formatBatchTime(job.completedAt) }}</div>
                </div>
              </div>
              <div class="empty-state" *ngIf="batchJobHistory().length === 0">
                暫無操作歷史
              </div>
            </div>
            
            <!-- 自動化聯動說明 -->
            <div class="automation-link-info">
              <h3>🔗 自動化聯動</h3>
              <p>批量操作已與自動化中心完全整合：</p>
              <ul>
                <li>在<strong>觸發器</strong>中使用「批量發送」「批量邀請」動作</li>
                <li>在<strong>工作流</strong>中添加批量操作節點</li>
                <li>支持多帳號輪換，智能防封策略</li>
              </ul>
              <button class="btn" (click)="setActiveTab('automation')">前往自動化中心 →</button>
            </div>
          </div>
        </div>
        
        <!-- 任務頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'tasks'">
          <div class="tasks-container">
            <div class="tasks-header">
              <h2>任務管理</h2>
              <button class="btn primary" (click)="createTask()">
                ➕ 新建任務
              </button>
            </div>
            
            <div class="tasks-filters">
              <button 
                class="filter-btn" 
                [class.active]="taskFilter === 'all'"
                (click)="taskFilter = 'all'">
                全部
              </button>
              <button 
                class="filter-btn" 
                [class.active]="taskFilter === 'running'"
                (click)="taskFilter = 'running'">
                運行中
              </button>
              <button 
                class="filter-btn" 
                [class.active]="taskFilter === 'scheduled'"
                (click)="taskFilter = 'scheduled'">
                已排程
              </button>
              <button 
                class="filter-btn" 
                [class.active]="taskFilter === 'completed'"
                (click)="taskFilter = 'completed'">
                已完成
              </button>
            </div>
            
            <div class="tasks-list">
              <div class="task-item" *ngFor="let task of filteredTasks()">
                <div class="task-status">
                  <span class="task-icon" [class]="task.status">
                    {{ getTaskIcon(task.status) }}
                  </span>
                </div>
                <div class="task-info">
                  <div class="task-name">{{ task.name }}</div>
                  <div class="task-meta">
                    <span class="task-type">{{ task.type }}</span>
                    <span class="task-schedule">{{ task.schedule.type }}</span>
                    <span class="task-next" *ngIf="task.nextRunAt">
                      下次: {{ task.nextRunAt | date:'MM-dd HH:mm' }}
                    </span>
                  </div>
                </div>
                <div class="task-actions">
                  <button class="icon-btn" (click)="runTask(task)" title="立即執行" *ngIf="task.status !== 'running'">
                    ▶️
                  </button>
                  <button class="icon-btn" (click)="pauseTask(task)" title="暫停" *ngIf="task.status === 'running'">
                    ⏸️
                  </button>
                  <button class="icon-btn" (click)="editTask(task)" title="編輯">
                    ✏️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 設置頁 -->
        <div class="tab-content" *ngIf="activeTab() === 'settings'">
          <div class="settings-container">
            <h2>系統設置</h2>
            
            <div class="settings-section">
              <h3>外觀</h3>
              <div class="setting-item">
                <label>深色模式</label>
                <label class="switch">
                  <input type="checkbox" [checked]="isDarkMode()" (change)="toggleDarkMode()">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            
            <div class="settings-section">
              <h3>AI 設置</h3>
              <div class="setting-item">
                <label>默認回覆風格</label>
                <select [(ngModel)]="aiSettings.style">
                  <option value="professional">專業</option>
                  <option value="friendly">友好</option>
                  <option value="casual">輕鬆</option>
                  <option value="formal">正式</option>
                </select>
              </div>
              <div class="setting-item">
                <label>默認語言</label>
                <select [(ngModel)]="aiSettings.language">
                  <option value="auto">自動檢測</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="zh-CN">簡體中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div class="setting-item">
                <label>包含表情符號</label>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="aiSettings.includeEmoji">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            
            <div class="settings-section">
              <h3>同步設置</h3>
              <div class="setting-item">
                <label>自動同步</label>
                <label class="switch">
                  <input type="checkbox" [(ngModel)]="syncSettings.autoSync">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="setting-item">
                <label>同步間隔</label>
                <select [(ngModel)]="syncSettings.interval">
                  <option value="5">5 分鐘</option>
                  <option value="15">15 分鐘</option>
                  <option value="30">30 分鐘</option>
                  <option value="60">1 小時</option>
                </select>
              </div>
            </div>
            
            <div class="settings-actions">
              <button class="btn" (click)="resetSettings()">重置設置</button>
              <button class="btn primary" (click)="saveSettings()">保存設置</button>
            </div>
          </div>
        </div>
      </main>
      
      <!-- 測試結果面板 -->
      <div class="test-panel" *ngIf="showTestPanel()">
        <div class="panel-header">
          <h3>🧪 集成測試結果</h3>
          <button class="close-btn" (click)="closeTestPanel()">✕</button>
        </div>
        <div class="panel-content">
          <div class="test-summary" *ngIf="testReport()">
            <div class="summary-stat">
              <span class="summary-value">{{ testReport()!.summary.totalTests }}</span>
              <span class="summary-label">總測試</span>
            </div>
            <div class="summary-stat success">
              <span class="summary-value">{{ testReport()!.summary.passed }}</span>
              <span class="summary-label">通過</span>
            </div>
            <div class="summary-stat danger">
              <span class="summary-value">{{ testReport()!.summary.failed }}</span>
              <span class="summary-label">失敗</span>
            </div>
            <div class="summary-stat">
              <span class="summary-value">{{ testReport()!.summary.passRate.toFixed(1) }}%</span>
              <span class="summary-label">通過率</span>
            </div>
          </div>
          
          <div class="test-suites">
            <div class="suite" *ngFor="let suite of testReport()?.suites">
              <div class="suite-header">
                <span class="suite-name">{{ suite.name }}</span>
                <span class="suite-result">{{ suite.passed }}/{{ suite.tests.length }}</span>
              </div>
              <div class="suite-tests">
                <div class="test" *ngFor="let test of suite.tests">
                  <span class="test-icon">{{ test.passed ? '✅' : '❌' }}</span>
                  <span class="test-name">{{ test.name }}</span>
                  <span class="test-time">{{ test.duration }}ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* === 基礎變量 === */
    :host {
      --primary: #6366f1;
      --primary-light: #818cf8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #3b82f6;
      
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --border-color: #e2e8f0;
      
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
      
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      
      display: block;
      height: 100vh;
    }
    
    /* === 深色模式 === */
    .dashboard.dark {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --border-color: #334155;
    }
    
    /* === 佈局 === */
    .dashboard {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* === 頂部導航 === */
    .dashboard-header {
      display: flex;
      align-items: center;
      padding: 0 24px;
      height: 64px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
    }
    
    .header-left {
      flex: 0 0 200px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--info));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .logo-icon {
      font-size: 24px;
      -webkit-text-fill-color: initial;
    }
    
    .header-nav {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 4px;
    }
    
    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .nav-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    
    .nav-btn.active {
      background: var(--primary);
      color: white;
    }
    
    .nav-icon {
      font-size: 18px;
    }
    
    .nav-label {
      font-size: 14px;
      font-weight: 500;
    }
    
    .header-right {
      flex: 0 0 200px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .icon-btn:hover {
      background: var(--primary-light);
    }
    
    .icon-btn.danger:hover {
      background: var(--danger);
    }
    
    .sync-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--warning);
    }
    
    .sync-status.online .status-dot {
      background: var(--success);
    }
    
    /* === 主內容區 === */
    .dashboard-main {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    
    .tab-content {
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* === 概覽頁 === */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border-left: 4px solid var(--primary);
    }
    
    .stat-card.success { border-left-color: var(--success); }
    .stat-card.warning { border-left-color: var(--warning); }
    .stat-card.info { border-left-color: var(--info); }
    
    .stat-icon {
      font-size: 32px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .card {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
    }
    
    .card h3 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 600;
    }
    
    .quick-actions {
      grid-column: span 2;
    }
    
    .action-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn:hover {
      background: var(--primary);
      color: white;
      transform: translateY(-2px);
    }
    
    .action-icon {
      font-size: 24px;
    }
    
    .recent-activity {
      grid-column: span 2;
    }
    
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .activity-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
    }
    
    .activity-icon {
      font-size: 20px;
    }
    
    .activity-title {
      font-size: 14px;
      color: var(--text-primary);
    }
    
    .activity-time {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .ai-stats, .trigger-stats {
      grid-column: span 2;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    
    .mini-stat {
      text-align: center;
      padding: 16px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
    }
    
    .mini-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
    }
    
    .mini-label {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    .trigger-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .trigger-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .trigger-name {
      flex: 0 0 120px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .trigger-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .trigger-progress {
      height: 100%;
      background: var(--success);
      border-radius: 4px;
    }
    
    .trigger-count {
      flex: 0 0 60px;
      text-align: right;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    /* === 搜索頁 === */
    .search-container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .search-box {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .search-input {
      flex: 1;
      padding: 14px 20px;
      background: var(--bg-primary);
      border: 2px solid var(--border-color);
      border-radius: var(--radius-lg);
      font-size: 16px;
      color: var(--text-primary);
      transition: all 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .search-btn {
      padding: 14px 28px;
      background: var(--primary);
      border: none;
      border-radius: var(--radius-lg);
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .search-btn:hover {
      background: var(--primary-light);
      transform: translateY(-1px);
    }
    
    .search-filters {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .filter-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    
    .filter-checkbox input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary);
    }
    
    .search-results {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .result-card {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      transition: all 0.2s;
    }
    
    .result-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
    
    .result-avatar {
      flex-shrink: 0;
    }
    
    .result-avatar img {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-md);
      object-fit: cover;
    }
    
    .result-info {
      flex: 1;
    }
    
    .result-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .result-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    .source-badge {
      padding: 2px 8px;
      background: var(--primary);
      color: white;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
    }
    
    .result-desc {
      font-size: 14px;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .result-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .mini-btn {
      padding: 8px 16px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-sm);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .mini-btn:hover {
      background: var(--border-color);
    }
    
    .mini-btn.primary {
      background: var(--primary);
      color: white;
    }
    
    .mini-btn.primary:hover {
      background: var(--primary-light);
    }
    
    /* === 通用按鈕 === */
    .btn {
      padding: 10px 20px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn:hover {
      background: var(--border-color);
    }
    
    .btn.primary {
      background: var(--primary);
      color: white;
    }
    
    .btn.primary:hover {
      background: var(--primary-light);
    }
    
    /* === 空狀態 === */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: var(--text-secondary);
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    /* === 自動化頁 === */
    .automation-header, .accounts-header, .tasks-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .automation-header h2, .accounts-header h2, .tasks-header h2 {
      margin: 0;
      font-size: 24px;
    }
    
    .automation-actions {
      display: flex;
      gap: 12px;
    }
    
    .automation-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      padding: 4px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
      width: fit-content;
    }
    
    .auto-tab {
      padding: 10px 20px;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .auto-tab:hover {
      color: var(--text-primary);
    }
    
    .auto-tab.active {
      background: var(--bg-primary);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
    }
    
    .automation-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .automation-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    
    .item-status {
      flex-shrink: 0;
    }
    
    .status-indicator {
      display: block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--text-secondary);
    }
    
    .status-indicator.active {
      background: var(--success);
    }
    
    .item-info {
      flex: 1;
    }
    
    .item-info.wide {
      flex: 2;
    }
    
    .item-name {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .item-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .event-badge, .category-badge {
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      font-size: 11px;
    }
    
    .template-preview {
      margin-top: 8px;
      padding: 8px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .item-actions {
      display: flex;
      gap: 8px;
    }
    
    /* === 帳號頁 === */
    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .account-card {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
    }
    
    .account-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .account-avatar {
      position: relative;
    }
    
    .account-avatar img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }
    
    .online-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--text-secondary);
      border: 2px solid var(--bg-primary);
    }
    
    .online-dot.online {
      background: var(--success);
    }
    
    .account-info {
      flex: 1;
    }
    
    .account-name {
      font-weight: 600;
    }
    
    .account-phone {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .health-badge {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
    }
    
    .health-badge.excellent { background: var(--success); color: white; }
    .health-badge.good { background: var(--info); color: white; }
    .health-badge.fair { background: var(--warning); color: white; }
    .health-badge.poor { background: var(--danger); color: white; }
    
    .account-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
    }
    
    .acc-stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .acc-label {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .acc-value {
      font-size: 14px;
      font-weight: 500;
    }
    
    .account-actions {
      display: flex;
      gap: 8px;
    }
    
    /* === 任務頁 === */
    .tasks-filters {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    
    .filter-btn {
      padding: 8px 16px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      font-size: 14px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .filter-btn:hover {
      background: var(--border-color);
    }
    
    .filter-btn.active {
      background: var(--primary);
      color: white;
    }
    
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    
    .task-icon {
      font-size: 20px;
    }
    
    .task-icon.running { animation: pulse 1s infinite; }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .task-info {
      flex: 1;
    }
    
    .task-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .task-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .task-type, .task-schedule {
      padding: 2px 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
    }
    
    /* === 設置頁 === */
    .settings-container {
      max-width: 600px;
    }
    
    .settings-container h2 {
      margin: 0 0 24px;
    }
    
    .settings-section {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .settings-section h3 {
      margin: 0 0 16px;
      font-size: 16px;
      color: var(--text-secondary);
    }
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
    }
    
    .setting-item:last-child {
      border-bottom: none;
    }
    
    .setting-item label {
      font-size: 14px;
    }
    
    .setting-item select {
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 14px;
      color: var(--text-primary);
    }
    
    /* === 開關 === */
    .switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--bg-tertiary);
      border-radius: 26px;
      transition: 0.3s;
    }
    
    .slider::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
    
    input:checked + .slider {
      background: var(--primary);
    }
    
    input:checked + .slider::before {
      transform: translateX(22px);
    }
    
    .settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    /* === 數據分析頁 === */
    .analytics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .analytics-header h2 {
      margin: 0;
    }
    
    .time-range {
      display: flex;
      gap: 4px;
      background: var(--bg-tertiary);
      padding: 4px;
      border-radius: var(--radius-md);
    }
    
    .time-btn {
      padding: 8px 16px;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
    }
    
    .time-btn.active {
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .analytics-card {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 20px;
    }
    
    .analytics-card.wide {
      grid-column: span 2;
    }
    
    .analytics-card h3 {
      margin: 0 0 20px;
      font-size: 16px;
    }
    
    .intent-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .intent-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .intent-label {
      flex: 0 0 80px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .intent-progress {
      flex: 1;
      height: 20px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .intent-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 4px;
    }
    
    .intent-value {
      flex: 0 0 50px;
      text-align: right;
      font-size: 13px;
      font-weight: 500;
    }
    
    .sentiment-chart {
      display: flex;
      justify-content: space-around;
    }
    
    .sentiment-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
    }
    
    .sentiment-icon {
      font-size: 32px;
    }
    
    .sentiment-label {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .sentiment-value {
      font-size: 20px;
      font-weight: 600;
    }
    
    .sentiment-item.positive .sentiment-value { color: var(--success); }
    .sentiment-item.neutral .sentiment-value { color: var(--text-secondary); }
    .sentiment-item.negative .sentiment-value { color: var(--danger); }
    
    .member-stats {
      display: flex;
      justify-content: space-around;
    }
    
    .member-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .stat-circle {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 18px;
      font-weight: 600;
    }
    
    .stat-circle.active { background: rgba(16, 185, 129, 0.1); color: var(--success); }
    .stat-circle.premium { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
    .stat-circle.bot { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
    
    .stat-name {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    /* === 測試面板 === */
    .test-panel {
      position: fixed;
      right: 0;
      top: 0;
      width: 400px;
      height: 100vh;
      background: var(--bg-primary);
      box-shadow: -4px 0 20px rgba(0,0,0,0.1);
      z-index: 100;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .panel-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: var(--text-secondary);
      cursor: pointer;
    }
    
    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    .test-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .summary-stat {
      text-align: center;
      padding: 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
    }
    
    .summary-stat.success { background: rgba(16, 185, 129, 0.1); }
    .summary-stat.danger { background: rgba(239, 68, 68, 0.1); }
    
    .summary-value {
      font-size: 20px;
      font-weight: 700;
      display: block;
    }
    
    .summary-stat.success .summary-value { color: var(--success); }
    .summary-stat.danger .summary-value { color: var(--danger); }
    
    .summary-label {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .test-suites {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .suite-header {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      font-weight: 500;
    }
    
    .suite-tests {
      padding: 8px 0;
    }
    
    .test {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 13px;
    }
    
    .test-icon {
      flex-shrink: 0;
    }
    
    .test-name {
      flex: 1;
      color: var(--text-secondary);
    }
    
    .test-time {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    /* === 批量操作頁 === */
    .batch-container {
      max-width: 1000px;
    }
    
    .batch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .batch-header h2 {
      margin: 0;
      font-size: 24px;
    }
    
    .batch-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .batch-stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border-left: 4px solid var(--primary);
    }
    
    .batch-stat-card.success { border-left-color: var(--success); }
    .batch-stat-card.warning { border-left-color: var(--warning); }
    .batch-stat-card.info { border-left-color: var(--info); }
    
    .batch-stat-icon {
      font-size: 28px;
    }
    
    .batch-stat-value {
      font-size: 24px;
      font-weight: 700;
    }
    
    .batch-stat-label {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .current-batch, .batch-queue, .batch-history {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .current-batch h3, .batch-queue h3, .batch-history h3 {
      margin: 0 0 16px;
      font-size: 16px;
    }
    
    .batch-operation-card {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }
    
    .batch-operation-card.running {
      border: 2px solid var(--success);
    }
    
    .batch-op-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .batch-op-type {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .type-icon {
      font-size: 24px;
    }
    
    .type-name {
      font-size: 16px;
      font-weight: 600;
    }
    
    .batch-op-status {
      padding: 4px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
    }
    
    .batch-op-status.running {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }
    
    .batch-op-progress {
      margin-bottom: 16px;
    }
    
    .progress-bar-full {
      height: 10px;
      background: var(--bg-tertiary);
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      margin-bottom: 8px;
    }
    
    .progress-fill-success {
      height: 100%;
      background: var(--success);
      transition: width 0.3s;
    }
    
    .progress-fill-failed {
      height: 100%;
      background: var(--danger);
      transition: width 0.3s;
    }
    
    .progress-numbers {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }
    
    .progress-success {
      color: var(--success);
    }
    
    .progress-failed {
      color: var(--danger);
    }
    
    .progress-total {
      color: var(--text-secondary);
    }
    
    .batch-op-controls {
      display: flex;
      gap: 12px;
    }
    
    .batch-queue-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .queue-item-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }
    
    .queue-position {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      border-radius: 50%;
      font-size: 13px;
      font-weight: 600;
    }
    
    .queue-item-info {
      flex: 1;
      display: flex;
      gap: 12px;
    }
    
    .queue-type {
      font-weight: 500;
    }
    
    .queue-targets {
      color: var(--text-secondary);
      font-size: 13px;
    }
    
    .batch-history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .history-item-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }
    
    .history-status-icon {
      font-size: 20px;
    }
    
    .history-item-info {
      flex: 1;
    }
    
    .history-source {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .history-result {
      font-weight: 500;
    }
    
    .history-time {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .automation-link-info {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 20px;
      border: 2px dashed var(--border-color);
    }
    
    .automation-link-info h3 {
      margin: 0 0 12px;
      font-size: 16px;
    }
    
    .automation-link-info p {
      margin: 0 0 12px;
      color: var(--text-secondary);
    }
    
    .automation-link-info ul {
      margin: 0 0 16px;
      padding-left: 20px;
    }
    
    .automation-link-info li {
      margin-bottom: 8px;
      color: var(--text-secondary);
    }
    
    .automation-link-info strong {
      color: var(--primary);
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  // 注入服務
  private groupScorer = inject(GroupScorer);
  private recommendationEngine = inject(RecommendationEngine);
  private memberAnalyzer = inject(MemberAnalyzer);
  private aiReplyEngine = inject(AIReplyEngine);
  private intentAnalyzer = inject(IntentAnalyzer);
  private triggerSystem = inject(TriggerSystem);
  private workflowEngine = inject(WorkflowEngine);
  private taskScheduler = inject(TaskScheduler);
  private accountManager = inject(AccountManager);
  private cloudSync = inject(CloudSyncService);
  private batchOperator = inject(BatchOperator);
  private batchBridge = inject(BatchAutomationBridge);
  
  // 標籤頁
  tabs = [
    { id: 'overview' as DashboardTab, label: '概覽', icon: '📊' },
    { id: 'search' as DashboardTab, label: '搜索', icon: '🔍' },
    { id: 'analytics' as DashboardTab, label: '分析', icon: '📈' },
    { id: 'automation' as DashboardTab, label: '自動化', icon: '🤖' },
    { id: 'batch' as DashboardTab, label: '批量操作', icon: '📤' },
    { id: 'accounts' as DashboardTab, label: '帳號', icon: '👤' },
    { id: 'tasks' as DashboardTab, label: '任務', icon: '📋' },
    { id: 'settings' as DashboardTab, label: '設置', icon: '⚙️' }
  ];
  
  activeTab = signal<DashboardTab>('overview');
  isDarkMode = signal(false);
  
  // 搜索
  searchQuery = '';
  searchFilters = {
    telegram: true,
    jiso: true,
    tgstat: true
  };
  searchResults = signal<any[]>([]);
  
  // 自動化
  automationSubTab: 'triggers' | 'workflows' | 'templates' = 'triggers';
  
  // 任務
  taskFilter: 'all' | 'running' | 'scheduled' | 'completed' = 'all';
  
  // 時間範圍
  timeRange: '7d' | '30d' | '90d' = '7d';
  
  // 設置
  aiSettings = {
    style: 'friendly',
    language: 'auto',
    includeEmoji: true
  };
  
  syncSettings = {
    autoSync: true,
    interval: '15'
  };
  
  // 測試
  showTestPanel = signal(false);
  testReport = signal<any>(null);
  
  // 計算屬性
  totalGroups = computed(() => 0);  // 從服務獲取
  aiReplies = computed(() => this.aiReplyEngine.stats().totalReplies);
  activeTriggers = computed(() => this.triggerSystem.enabledTriggers().length);
  activeWorkflows = computed(() => this.workflowEngine.activeWorkflows().length);
  
  syncStatus = computed(() => this.cloudSync.status());
  syncStatusText = computed(() => {
    const status = this.syncStatus();
    const map: Record<string, string> = {
      idle: '已同步',
      syncing: '同步中...',
      synced: '已同步',
      error: '同步錯誤',
      offline: '離線'
    };
    return map[status] || status;
  });
  
  triggers = computed(() => this.triggerSystem.triggers());
  workflows = computed(() => this.workflowEngine.workflows());
  templates = computed(() => this.aiReplyEngine.templates());
  accounts = computed(() => this.accountManager.accounts());
  tasks = computed(() => this.taskScheduler.tasks());
  
  // 批量操作
  batchCurrentOperation = computed(() => this.batchOperator.currentOperation());
  batchQueue = computed(() => this.batchOperator.operationQueue());
  batchStats = computed(() => this.batchOperator.stats());
  batchActiveJobs = computed(() => this.batchBridge.activeJobs());
  batchJobHistory = computed(() => this.batchBridge.jobHistory());
  
  activeBatchCount = computed(() => {
    let count = this.batchCurrentOperation() ? 1 : 0;
    count += this.batchQueue().length;
    return count;
  });
  
  filteredTasks = computed(() => {
    const tasks = this.tasks();
    if (this.taskFilter === 'all') return tasks;
    return tasks.filter(t => t.status === this.taskFilter);
  });
  
  aiStats = computed(() => this.aiReplyEngine.stats());
  
  topTriggers = computed(() => {
    return this.triggers()
      .map(t => ({
        name: t.name,
        executions: t.stats.executionCount,
        successRate: t.stats.executionCount > 0 
          ? (t.stats.successCount / t.stats.executionCount) * 100 
          : 0
      }))
      .slice(0, 5);
  });
  
  recentActivities = signal<{ icon: string; title: string; time: string }[]>([
    { icon: '🔍', title: '搜索群組 "幣圈交流"', time: '2 分鐘前' },
    { icon: '🤖', title: 'AI 回覆消息', time: '5 分鐘前' },
    { icon: '⚡', title: '觸發器執行完成', time: '10 分鐘前' },
    { icon: '📥', title: '導出成員數據', time: '30 分鐘前' }
  ]);
  
  intentDistribution = computed(() => {
    const stats = this.intentAnalyzer.stats();
    const total = stats.totalAnalyzed || 1;
    const dist = stats.intentDistribution;
    
    return Object.entries(dist).map(([name, count]) => ({
      name,
      percentage: (count / total) * 100
    })).slice(0, 5);
  });
  
  sentimentDistribution = computed(() => {
    const stats = this.intentAnalyzer.stats();
    const dist = stats.sentimentDistribution;
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    
    return {
      positive: Math.round((dist['positive'] || 0) / total * 100),
      neutral: Math.round((dist['neutral'] || 0) / total * 100),
      negative: Math.round((dist['negative'] || 0) / total * 100)
    };
  });
  
  memberStats = computed(() => ({
    activeRate: 35,
    premiumRate: 12,
    botRate: 5
  }));
  
  ngOnInit(): void {
    this.loadTheme();
  }
  
  ngOnDestroy(): void {}
  
  setActiveTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }
  
  toggleDarkMode(): void {
    this.isDarkMode.update(v => !v);
    localStorage.setItem('tgai-dark-mode', this.isDarkMode() ? 'true' : 'false');
  }
  
  loadTheme(): void {
    const dark = localStorage.getItem('tgai-dark-mode');
    if (dark === 'true') {
      this.isDarkMode.set(true);
    }
  }
  
  // 搜索
  performSearch(): void {
    // 模擬搜索結果
    this.searchResults.set([
      {
        id: '1',
        title: '幣圈交流群',
        membersCount: 12500,
        type: 'supergroup',
        source: 'telegram',
        description: '專業的加密貨幣交流群組',
        photo: null
      },
      {
        id: '2',
        title: 'Crypto Trading',
        membersCount: 8900,
        type: 'group',
        source: 'jiso',
        description: 'Trading signals and analysis',
        photo: null
      }
    ]);
  }
  
  viewGroupDetail(group: any): void {
    console.log('View group:', group);
  }
  
  favoriteGroup(group: any): void {
    console.log('Favorite group:', group);
  }
  
  // 觸發器
  createTrigger(): void {
    console.log('Create trigger');
  }
  
  toggleTrigger(trigger: any): void {
    if (trigger.enabled) {
      this.triggerSystem.disableTrigger(trigger.id);
    } else {
      this.triggerSystem.enableTrigger(trigger.id);
    }
  }
  
  editTrigger(trigger: any): void {
    console.log('Edit trigger:', trigger);
  }
  
  deleteTrigger(trigger: any): void {
    this.triggerSystem.deleteTrigger(trigger.id);
  }
  
  // 工作流
  createWorkflow(): void {
    this.workflowEngine.createWorkflow({
      name: '新工作流',
      description: '描述...'
    });
  }
  
  runWorkflow(workflow: any): void {
    this.workflowEngine.executeWorkflow(workflow.id);
  }
  
  editWorkflow(workflow: any): void {
    console.log('Edit workflow:', workflow);
  }
  
  deleteWorkflow(workflow: any): void {
    this.workflowEngine.deleteWorkflow(workflow.id);
  }
  
  // 模板
  editTemplate(template: any): void {
    console.log('Edit template:', template);
  }
  
  deleteTemplate(template: any): void {
    this.aiReplyEngine.deleteTemplate(template.id);
  }
  
  // 帳號
  addAccount(): void {
    console.log('Add account');
  }
  
  warmUpAccount(account: any): void {
    this.accountManager.startWarmUp(account.id);
  }
  
  configAccount(account: any): void {
    console.log('Config account:', account);
  }
  
  getStatusText(status: string): string {
    const map: Record<string, string> = {
      active: '正常',
      warming: '預熱中',
      cooldown: '冷卻中',
      suspended: '暫停'
    };
    return map[status] || status;
  }
  
  // 任務
  createTask(): void {
    console.log('Create task');
  }
  
  runTask(task: any): void {
    this.taskScheduler.runTask(task.id);
  }
  
  pauseTask(task: any): void {
    this.taskScheduler.pauseTask(task.id);
  }
  
  editTask(task: any): void {
    console.log('Edit task:', task);
  }
  
  getTaskIcon(status: string): string {
    const map: Record<string, string> = {
      pending: '⏳',
      scheduled: '📅',
      running: '🔄',
      completed: '✅',
      failed: '❌',
      paused: '⏸️'
    };
    return map[status] || '❓';
  }
  
  // 批量操作
  createBatchOperation(): void {
    console.log('Create batch operation');
    // 可以打開批量操作創建對話框
  }
  
  pauseBatch(): void {
    this.batchOperator.pause();
  }
  
  resumeBatch(): void {
    this.batchOperator.resume();
  }
  
  stopBatch(): void {
    this.batchOperator.stop();
  }
  
  cancelQueuedBatch(operationId: string): void {
    this.batchOperator.cancelQueued(operationId);
  }
  
  getBatchTypeName(type: string): string {
    const names: Record<string, string> = {
      message: '批量發送消息',
      invite: '批量邀請成員',
      tag: '批量標籤操作'
    };
    return names[type] || type;
  }
  
  getBatchTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      message: '💬',
      invite: '👥',
      tag: '🏷️'
    };
    return icons[type] || '📦';
  }
  
  formatBatchTime(date: Date | undefined): string {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小時前`;
    
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  }
  
  // 設置
  resetSettings(): void {
    this.aiSettings = {
      style: 'friendly',
      language: 'auto',
      includeEmoji: true
    };
    this.syncSettings = {
      autoSync: true,
      interval: '15'
    };
  }
  
  saveSettings(): void {
    this.aiReplyEngine.updateSettings({
      style: this.aiSettings.style as any,
      language: this.aiSettings.language as any,
      includeEmoji: this.aiSettings.includeEmoji
    });
    console.log('Settings saved');
  }
  
  // 同步
  syncData(): void {
    this.cloudSync.syncAll();
  }
  
  // 測試
  async runTests(): Promise<void> {
    // 動態導入測試器
    const { IntegrationTester } = await import('../testing/integration-tester');
    // 在實際應用中，這會通過依賴注入獲取
    console.log('Running tests...');
    this.showTestPanel.set(true);
  }
  
  closeTestPanel(): void {
    this.showTestPanel.set(false);
  }
}
