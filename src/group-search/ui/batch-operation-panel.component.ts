/**
 * TG-AI智控王 批量操作面板組件
 * Batch Operation Panel Component v1.0
 * 
 * 功能：
 * - 批量操作進度追蹤
 * - 操作隊列管理
 * - 實時狀態顯示
 * - 操作控制（暫停/繼續/取消）
 */

import { Component, inject, signal, computed, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BatchOperator, BatchOperationEvent, OperationPriority } from '../engines/batch-operator';
import { BatchAutomationBridge, BatchJobStatus } from '../automation/batch-automation-bridge';
import { BatchOperation, BatchOperationType } from '../search.types';

type ViewMode = 'compact' | 'expanded' | 'full';

@Component({
  selector: 'app-batch-operation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="batch-panel" [class.dark]="darkMode" [class.compact]="viewMode === 'compact'" [class.expanded]="viewMode === 'expanded'">
      <!-- 面板標題 -->
      <div class="panel-header" (click)="toggleExpand()">
        <div class="header-left">
          <span class="header-icon">📊</span>
          <span class="header-title">批量操作</span>
          <span class="badge" *ngIf="activeCount() > 0">{{ activeCount() }}</span>
        </div>
        <div class="header-stats">
          <span class="stat" *ngIf="currentOperation()">
            <span class="stat-label">進度</span>
            <span class="stat-value">{{ currentProgress() }}%</span>
          </span>
          <span class="stat">
            <span class="stat-label">隊列</span>
            <span class="stat-value">{{ queuedCount() }}</span>
          </span>
        </div>
        <button class="expand-btn">
          {{ viewMode === 'compact' ? '▼' : '▲' }}
        </button>
      </div>
      
      <!-- 當前操作 -->
      <div class="current-operation" *ngIf="viewMode !== 'compact' && currentOperation()">
        <div class="operation-header">
          <div class="operation-info">
            <span class="operation-type-icon">{{ getTypeIcon(currentOperation()!.type) }}</span>
            <div class="operation-details">
              <span class="operation-type">{{ getTypeName(currentOperation()!.type) }}</span>
              <span class="operation-id">{{ currentOperation()!.id }}</span>
            </div>
          </div>
          <div class="operation-status" [class]="currentOperation()!.status">
            {{ getStatusText(currentOperation()!.status) }}
          </div>
        </div>
        
        <!-- 進度條 -->
        <div class="progress-section">
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill success" [style.width.%]="successPercent()"></div>
              <div class="progress-fill failed" [style.width.%]="failedPercent()"></div>
            </div>
          </div>
          
          <div class="progress-stats">
            <span class="progress-stat">
              <span class="stat-icon">✓</span>
              <span class="stat-value success">{{ currentOperation()!.progress.success }}</span>
            </span>
            <span class="progress-stat">
              <span class="stat-icon">✗</span>
              <span class="stat-value failed">{{ currentOperation()!.progress.failed }}</span>
            </span>
            <span class="progress-stat">
              <span class="stat-icon">📊</span>
              <span class="stat-value">{{ currentOperation()!.progress.processed }}/{{ currentOperation()!.progress.total }}</span>
            </span>
          </div>
        </div>
        
        <!-- 帳號信息 -->
        <div class="account-info" *ngIf="currentAccountId()">
          <span class="account-label">當前帳號:</span>
          <span class="account-value">{{ currentAccountId() }}</span>
        </div>
        
        <!-- 控制按鈕 -->
        <div class="operation-controls">
          <button 
            class="control-btn" 
            *ngIf="currentOperation()!.status === 'running'"
            (click)="pauseOperation()">
            ⏸️ 暫停
          </button>
          <button 
            class="control-btn primary" 
            *ngIf="currentOperation()!.status === 'paused'"
            (click)="resumeOperation()">
            ▶️ 繼續
          </button>
          <button 
            class="control-btn danger" 
            (click)="stopOperation()">
            ⏹️ 停止
          </button>
        </div>
        
        <!-- 預計剩餘時間 -->
        <div class="eta-section" *ngIf="estimatedTimeRemaining() > 0">
          <span class="eta-label">預計剩餘時間:</span>
          <span class="eta-value">{{ formatDuration(estimatedTimeRemaining()) }}</span>
        </div>
      </div>
      
      <!-- 操作隊列 -->
      <div class="queue-section" *ngIf="viewMode === 'expanded' || viewMode === 'full'">
        <div class="section-header">
          <h3>操作隊列</h3>
          <span class="queue-count">{{ queuedCount() }} 個待處理</span>
        </div>
        
        <div class="queue-list" *ngIf="operationQueue().length > 0">
          <div class="queue-item" *ngFor="let op of operationQueue(); let i = index">
            <div class="queue-position">{{ i + 1 }}</div>
            <div class="queue-info">
              <span class="queue-type">{{ getTypeName(op.type) }}</span>
              <span class="queue-count">{{ op.progress.total }} 個目標</span>
              <span class="queue-priority" [class]="getPriority(op)">
                {{ getPriorityText(getPriority(op)) }}
              </span>
            </div>
            <div class="queue-actions">
              <button class="icon-btn" (click)="moveUp(i)" [disabled]="i === 0" title="上移">
                ↑
              </button>
              <button class="icon-btn" (click)="moveDown(i)" [disabled]="i === operationQueue().length - 1" title="下移">
                ↓
              </button>
              <button class="icon-btn danger" (click)="removeFromQueue(op.id)" title="移除">
                ✗
              </button>
            </div>
          </div>
        </div>
        
        <div class="empty-queue" *ngIf="operationQueue().length === 0">
          隊列為空
        </div>
      </div>
      
      <!-- 操作歷史 -->
      <div class="history-section" *ngIf="viewMode === 'full'">
        <div class="section-header">
          <h3>最近操作</h3>
          <button class="text-btn" (click)="clearHistory()">清除歷史</button>
        </div>
        
        <div class="history-list">
          <div class="history-item" *ngFor="let op of recentHistory()">
            <div class="history-icon" [class]="op.status">
              {{ getStatusIcon(op.status) }}
            </div>
            <div class="history-info">
              <span class="history-type">{{ getTypeName(op.type) }}</span>
              <span class="history-result">
                {{ op.progress.success }}/{{ op.progress.total }} 成功
              </span>
              <span class="history-time">{{ formatTime(op.completedAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="empty-history" *ngIf="recentHistory().length === 0">
          暫無歷史記錄
        </div>
      </div>
      
      <!-- 統計摘要 -->
      <div class="stats-summary" *ngIf="viewMode === 'full'">
        <div class="summary-card">
          <div class="summary-value">{{ todayStats().processed }}</div>
          <div class="summary-label">今日處理</div>
        </div>
        <div class="summary-card success">
          <div class="summary-value">{{ todayStats().success }}</div>
          <div class="summary-label">成功</div>
        </div>
        <div class="summary-card failed">
          <div class="summary-value">{{ todayStats().failed }}</div>
          <div class="summary-label">失敗</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">{{ successRate() }}%</div>
          <div class="summary-label">成功率</div>
        </div>
      </div>
      
      <!-- 快速操作 -->
      <div class="quick-actions" *ngIf="viewMode === 'full'">
        <button class="quick-btn" (click)="openNewOperation.emit()">
          ➕ 新建批量操作
        </button>
        <button class="quick-btn" (click)="pauseAll()" [disabled]="!hasRunning()">
          ⏸️ 全部暫停
        </button>
        <button class="quick-btn" (click)="resumeAll()" [disabled]="!hasPaused()">
          ▶️ 全部繼續
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #6366f1;
      --primary-light: #818cf8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --border-color: #e2e8f0;
      
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
    }
    
    .batch-panel.dark {
      --bg-primary: #1e293b;
      --bg-secondary: #0f172a;
      --bg-tertiary: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --border-color: #334155;
    }
    
    .batch-panel {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .batch-panel.compact {
      max-height: 60px;
    }
    
    /* === 面板標題 === */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: var(--bg-secondary);
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .panel-header:hover {
      background: var(--bg-tertiary);
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .header-icon {
      font-size: 20px;
    }
    
    .header-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .badge {
      padding: 2px 8px;
      background: var(--primary);
      color: white;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .header-stats {
      display: flex;
      gap: 20px;
    }
    
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .stat-label {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .expand-btn {
      background: none;
      border: none;
      font-size: 14px;
      color: var(--text-secondary);
      cursor: pointer;
    }
    
    /* === 當前操作 === */
    .current-operation {
      padding: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .operation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .operation-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .operation-type-icon {
      font-size: 28px;
    }
    
    .operation-details {
      display: flex;
      flex-direction: column;
    }
    
    .operation-type {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .operation-id {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .operation-status {
      padding: 4px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
    }
    
    .operation-status.running {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }
    
    .operation-status.paused {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning);
    }
    
    .operation-status.completed {
      background: rgba(99, 102, 241, 0.1);
      color: var(--primary);
    }
    
    .operation-status.failed {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
    }
    
    /* === 進度條 === */
    .progress-section {
      margin-bottom: 16px;
    }
    
    .progress-bar-container {
      margin-bottom: 12px;
    }
    
    .progress-bar {
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }
    
    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .progress-fill.success {
      background: var(--success);
    }
    
    .progress-fill.failed {
      background: var(--danger);
    }
    
    .progress-stats {
      display: flex;
      justify-content: space-around;
    }
    
    .progress-stat {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .progress-stat .stat-icon {
      font-size: 14px;
    }
    
    .progress-stat .stat-value {
      font-size: 14px;
      font-weight: 500;
    }
    
    .progress-stat .stat-value.success {
      color: var(--success);
    }
    
    .progress-stat .stat-value.failed {
      color: var(--danger);
    }
    
    /* === 帳號信息 === */
    .account-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      font-size: 13px;
    }
    
    .account-label {
      color: var(--text-secondary);
    }
    
    .account-value {
      font-weight: 500;
      color: var(--text-primary);
    }
    
    /* === 控制按鈕 === */
    .operation-controls {
      display: flex;
      gap: 12px;
    }
    
    .control-btn {
      flex: 1;
      padding: 10px 16px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .control-btn:hover {
      background: var(--border-color);
    }
    
    .control-btn.primary {
      background: var(--primary);
      color: white;
    }
    
    .control-btn.primary:hover {
      background: var(--primary-light);
    }
    
    .control-btn.danger {
      background: var(--danger);
      color: white;
    }
    
    /* === ETA === */
    .eta-section {
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      display: flex;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .eta-label {
      color: var(--text-secondary);
    }
    
    .eta-value {
      font-weight: 500;
      color: var(--text-primary);
    }
    
    /* === 隊列 === */
    .queue-section, .history-section {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .section-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    
    .queue-count {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .queue-list, .history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .queue-item, .history-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }
    
    .queue-position {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
    }
    
    .queue-info, .history-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .queue-type, .history-type {
      font-weight: 500;
    }
    
    .queue-count {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .queue-priority {
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
    }
    
    .queue-priority.high {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
    }
    
    .queue-priority.normal {
      background: rgba(99, 102, 241, 0.1);
      color: var(--primary);
    }
    
    .queue-priority.low {
      background: rgba(100, 116, 139, 0.1);
      color: var(--text-secondary);
    }
    
    .queue-actions {
      display: flex;
      gap: 4px;
    }
    
    .icon-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .icon-btn:hover:not(:disabled) {
      background: var(--border-color);
    }
    
    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .icon-btn.danger:hover:not(:disabled) {
      background: var(--danger);
      color: white;
    }
    
    .history-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 16px;
    }
    
    .history-icon.completed {
      background: rgba(16, 185, 129, 0.1);
    }
    
    .history-icon.failed {
      background: rgba(239, 68, 68, 0.1);
    }
    
    .history-result {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .history-time {
      font-size: 11px;
      color: var(--text-secondary);
    }
    
    .empty-queue, .empty-history {
      padding: 20px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 13px;
    }
    
    .text-btn {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 12px;
      cursor: pointer;
    }
    
    .text-btn:hover {
      text-decoration: underline;
    }
    
    /* === 統計摘要 === */
    .stats-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .summary-card {
      text-align: center;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }
    
    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .summary-card.success .summary-value {
      color: var(--success);
    }
    
    .summary-card.failed .summary-value {
      color: var(--danger);
    }
    
    .summary-label {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    /* === 快速操作 === */
    .quick-actions {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
    }
    
    .quick-btn {
      flex: 1;
      padding: 10px 16px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .quick-btn:hover:not(:disabled) {
      background: var(--primary);
      color: white;
    }
    
    .quick-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class BatchOperationPanelComponent implements OnInit, OnDestroy {
  @Input() darkMode = false;
  @Input() viewMode: ViewMode = 'expanded';
  
  @Output() openNewOperation = new EventEmitter<void>();
  @Output() operationCompleted = new EventEmitter<BatchOperation>();
  
  private batchOperator = inject(BatchOperator);
  private batchBridge = inject(BatchAutomationBridge);
  
  private eventUnsubscribes: (() => void)[] = [];
  private startTime: Date | null = null;
  
  // 計算屬性
  currentOperation = computed(() => this.batchOperator.currentOperation());
  operationQueue = computed(() => this.batchOperator.operationQueue());
  isOperating = computed(() => this.batchOperator.isOperating());
  
  activeCount = computed(() => {
    let count = 0;
    if (this.currentOperation()) count++;
    count += this.operationQueue().length;
    return count;
  });
  
  queuedCount = computed(() => this.operationQueue().length);
  
  currentProgress = computed(() => {
    const op = this.currentOperation();
    if (!op || op.progress.total === 0) return 0;
    return Math.round((op.progress.processed / op.progress.total) * 100);
  });
  
  successPercent = computed(() => {
    const op = this.currentOperation();
    if (!op || op.progress.total === 0) return 0;
    return (op.progress.success / op.progress.total) * 100;
  });
  
  failedPercent = computed(() => {
    const op = this.currentOperation();
    if (!op || op.progress.total === 0) return 0;
    return (op.progress.failed / op.progress.total) * 100;
  });
  
  currentAccountId = signal<string | null>(null);
  
  recentHistory = computed(() => {
    return this.batchOperator.operationHistory().slice(0, 5);
  });
  
  todayStats = computed(() => {
    const stats = this.batchOperator.stats();
    return {
      processed: stats.today.sent,
      success: stats.today.success,
      failed: stats.today.failed
    };
  });
  
  successRate = computed(() => {
    const stats = this.todayStats();
    if (stats.processed === 0) return 0;
    return Math.round((stats.success / stats.processed) * 100);
  });
  
  estimatedTimeRemaining = computed(() => {
    const op = this.currentOperation();
    if (!op || !this.startTime) return 0;
    
    const elapsed = Date.now() - this.startTime.getTime();
    const processed = op.progress.processed;
    const remaining = op.progress.total - processed;
    
    if (processed === 0) return 0;
    
    const avgTimePerItem = elapsed / processed;
    return remaining * avgTimePerItem;
  });
  
  ngOnInit(): void {
    this.subscribeToEvents();
  }
  
  ngOnDestroy(): void {
    for (const unsubscribe of this.eventUnsubscribes) {
      unsubscribe();
    }
  }
  
  private subscribeToEvents(): void {
    // 訂閱帳號切換事件
    const unsubAccountSwitch = this.batchOperator.on('account_switched', (event) => {
      this.currentAccountId.set(event.data.newAccount);
    });
    this.eventUnsubscribes.push(unsubAccountSwitch);
    
    // 訂閱操作開始事件
    const unsubStart = this.batchOperator.on('operation_started', () => {
      this.startTime = new Date();
    });
    this.eventUnsubscribes.push(unsubStart);
    
    // 訂閱操作完成事件
    const unsubComplete = this.batchOperator.on('operation_completed', (event) => {
      this.startTime = null;
      const op = this.currentOperation();
      if (op) {
        this.operationCompleted.emit(op);
      }
    });
    this.eventUnsubscribes.push(unsubComplete);
  }
  
  toggleExpand(): void {
    if (this.viewMode === 'compact') {
      this.viewMode = 'expanded';
    } else if (this.viewMode === 'expanded') {
      this.viewMode = 'full';
    } else {
      this.viewMode = 'compact';
    }
  }
  
  pauseOperation(): void {
    this.batchOperator.pause();
  }
  
  resumeOperation(): void {
    this.batchOperator.resume();
  }
  
  stopOperation(): void {
    this.batchOperator.stop();
  }
  
  removeFromQueue(operationId: string): void {
    this.batchOperator.cancelQueued(operationId);
  }
  
  moveUp(index: number): void {
    // 調整隊列順序 - 需要在 BatchOperator 中實現
    console.log('Move up:', index);
  }
  
  moveDown(index: number): void {
    // 調整隊列順序 - 需要在 BatchOperator 中實現
    console.log('Move down:', index);
  }
  
  clearHistory(): void {
    // 清除歷史 - 需要在 BatchOperator 中實現
    console.log('Clear history');
  }
  
  pauseAll(): void {
    this.batchOperator.pause();
  }
  
  resumeAll(): void {
    this.batchOperator.resume();
  }
  
  hasRunning(): boolean {
    return this.currentOperation()?.status === 'running';
  }
  
  hasPaused(): boolean {
    return this.currentOperation()?.status === 'paused';
  }
  
  getPriority(op: BatchOperation): OperationPriority {
    return (op as any).extendedConfig?.priority ?? 'normal';
  }
  
  getTypeName(type: BatchOperationType): string {
    const names: Record<BatchOperationType, string> = {
      message: '批量發送消息',
      invite: '批量邀請成員',
      tag: '批量標籤操作'
    };
    return names[type] || type;
  }
  
  getTypeIcon(type: BatchOperationType): string {
    const icons: Record<BatchOperationType, string> = {
      message: '💬',
      invite: '👥',
      tag: '🏷️'
    };
    return icons[type] || '📦';
  }
  
  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      pending: '等待中',
      running: '運行中',
      paused: '已暫停',
      completed: '已完成',
      failed: '失敗',
      cancelled: '已取消'
    };
    return texts[status] || status;
  }
  
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      completed: '✅',
      failed: '❌',
      cancelled: '⏹️'
    };
    return icons[status] || '❓';
  }
  
  getPriorityText(priority: OperationPriority): string {
    const texts: Record<OperationPriority, string> = {
      high: '高優先',
      normal: '正常',
      low: '低優先'
    };
    return texts[priority] || priority;
  }
  
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小時 ${minutes % 60}分鐘`;
    } else if (minutes > 0) {
      return `${minutes}分鐘 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
  
  formatTime(date: Date | undefined): string {
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
}
