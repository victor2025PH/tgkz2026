/**
 * 智能运维管理组件
 * 
 * 整合第五阶段智能化功能：
 * 1. 自动扩缩容控制
 * 2. 告警聚合视图
 * 3. 异常检测面板
 * 4. 自动恢复状态
 * 5. 报表生成
 * 6. 审批流程
 */

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';

interface ScalingStatus {
  mode: string;
  policy_enabled: boolean;
  pending_count: number;
  last_scale_up: number;
  last_scale_down: number;
  scale_ups: number;
  scale_downs: number;
}

interface AggregatedAlert {
  id: string;
  type: string;
  level: string;
  count: number;
  sources: string[];
  first_seen: number;
  last_seen: number;
}

interface AnomalySummary {
  total_anomalies: number;
  last_hour: number;
  by_severity: Record<string, number>;
  most_affected: string;
}

interface RecoveryStats {
  total_recoveries: number;
  successful: number;
  failed: number;
  pending_count: number;
}

interface ApprovalRequest {
  id: string;
  title: string;
  operation_type: string;
  status: string;
  created_at: number;
  requester_name: string;
}

@Component({
  selector: 'app-smart-ops',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="smart-ops">
      <header class="page-header">
        <h1>智能运维</h1>
        <p class="subtitle">自动化运维管理与智能决策</p>
      </header>

      <!-- 状态概览卡片 -->
      <section class="status-cards">
        <!-- 自动扩缩容 -->
        <div class="status-card scaling">
          <div class="card-header">
            <span class="card-icon">📊</span>
            <span class="card-title">自动扩缩容</span>
            <span class="status-badge" [class]="scalingStatus()?.mode || 'disabled'">
              {{ getScalingModeText() }}
            </span>
          </div>
          <div class="card-body">
            <div class="stat-row">
              <span>扩容次数</span>
              <span class="value">{{ scalingStatus()?.scale_ups || 0 }}</span>
            </div>
            <div class="stat-row">
              <span>缩容次数</span>
              <span class="value">{{ scalingStatus()?.scale_downs || 0 }}</span>
            </div>
            <div class="stat-row">
              <span>待确认决策</span>
              <span class="value highlight">{{ scalingStatus()?.pending_count || 0 }}</span>
            </div>
          </div>
          <div class="card-actions">
            <select [(ngModel)]="selectedScalingMode" (change)="updateScalingMode()">
              <option value="auto">全自动</option>
              <option value="semi_auto">半自动</option>
              <option value="manual">手动</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
        </div>

        <!-- 告警聚合 -->
        <div class="status-card alerts">
          <div class="card-header">
            <span class="card-icon">🔔</span>
            <span class="card-title">告警聚合</span>
            @if (isStormDetected()) {
              <span class="storm-badge">风暴!</span>
            }
          </div>
          <div class="card-body">
            <div class="stat-row">
              <span>聚合告警</span>
              <span class="value">{{ aggregatedAlerts().length }}</span>
            </div>
            <div class="stat-row">
              <span>已抑制</span>
              <span class="value">{{ alertSummary()?.suppression_count || 0 }}</span>
            </div>
            <div class="stat-row">
              <span>风暴检测</span>
              <span class="value" [class.warning]="isStormDetected()">
                {{ isStormDetected() ? '检测到' : '正常' }}
              </span>
            </div>
          </div>
          <div class="card-actions">
            <button (click)="viewAggregatedAlerts()">查看聚合</button>
          </div>
        </div>

        <!-- 异常检测 -->
        <div class="status-card anomaly">
          <div class="card-header">
            <span class="card-icon">🔍</span>
            <span class="card-title">异常检测</span>
          </div>
          <div class="card-body">
            <div class="stat-row">
              <span>总异常数</span>
              <span class="value">{{ anomalySummary()?.total_anomalies || 0 }}</span>
            </div>
            <div class="stat-row">
              <span>最近一小时</span>
              <span class="value highlight">{{ anomalySummary()?.last_hour || 0 }}</span>
            </div>
            <div class="stat-row">
              <span>主要影响</span>
              <span class="value">{{ anomalySummary()?.most_affected || '-' }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button (click)="viewAnomalies()">查看详情</button>
          </div>
        </div>

        <!-- 自动恢复 -->
        <div class="status-card recovery">
          <div class="card-header">
            <span class="card-icon">🔄</span>
            <span class="card-title">自动恢复</span>
          </div>
          <div class="card-body">
            <div class="stat-row">
              <span>总恢复数</span>
              <span class="value">{{ recoveryStats()?.total_recoveries || 0 }}</span>
            </div>
            <div class="stat-row">
              <span>成功率</span>
              <span class="value success">{{ getRecoverySuccessRate() }}%</span>
            </div>
            <div class="stat-row">
              <span>进行中</span>
              <span class="value">{{ recoveryStats()?.pending_count || 0 }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button (click)="viewRecoveryHistory()">恢复历史</button>
          </div>
        </div>
      </section>

      <!-- 待审批请求 -->
      @if (pendingApprovals().length > 0) {
        <section class="approval-section">
          <h2>
            待审批请求
            <span class="count-badge">{{ pendingApprovals().length }}</span>
          </h2>
          <div class="approval-list">
            @for (approval of pendingApprovals(); track approval.id) {
              <div class="approval-item">
                <div class="approval-info">
                  <span class="approval-type">{{ formatOperationType(approval.operation_type) }}</span>
                  <span class="approval-title">{{ approval.title }}</span>
                  <span class="approval-requester">by {{ approval.requester_name || '系统' }}</span>
                </div>
                <div class="approval-time">
                  {{ formatTime(approval.created_at) }}
                </div>
                <div class="approval-actions">
                  <button class="approve-btn" (click)="approveRequest(approval.id)">批准</button>
                  <button class="reject-btn" (click)="rejectRequest(approval.id)">拒绝</button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- 扩缩容决策 -->
      @if (scalingDecisions().length > 0) {
        <section class="scaling-section">
          <h2>待确认的扩缩容决策</h2>
          <div class="decision-list">
            @for (decision of scalingDecisions(); track decision.timestamp) {
              <div class="decision-item" [class]="decision.action">
                <div class="decision-icon">
                  {{ decision.action === 'scale_up' ? '⬆️' : '⬇️' }}
                </div>
                <div class="decision-content">
                  <div class="decision-action">
                    {{ decision.action === 'scale_up' ? '扩容' : '缩容' }} {{ decision.count }} 个 API
                  </div>
                  <div class="decision-reason">{{ decision.reason }}</div>
                  <div class="decision-confidence">
                    置信度: {{ (decision.confidence * 100) | number:'1.0-0' }}%
                  </div>
                </div>
                <div class="decision-actions">
                  <button class="confirm-btn" (click)="confirmDecision(0)">确认执行</button>
                  <button class="cancel-btn" (click)="rejectDecision(0)">取消</button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- 报表生成 -->
      <section class="report-section">
        <h2>运维报表</h2>
        <div class="report-actions">
          <div class="report-type-select">
            <select [(ngModel)]="selectedReportType">
              <option value="overview">系统概览</option>
              <option value="api_usage">API 使用</option>
              <option value="alerts">告警分析</option>
              <option value="capacity">容量趋势</option>
              <option value="login">登录统计</option>
            </select>
            <select [(ngModel)]="selectedReportPeriod">
              <option value="daily">日报</option>
              <option value="weekly">周报</option>
              <option value="monthly">月报</option>
            </select>
            <button class="generate-btn" (click)="generateReport()" [disabled]="generatingReport()">
              {{ generatingReport() ? '生成中...' : '生成报表' }}
            </button>
          </div>
        </div>

        @if (recentReports().length > 0) {
          <div class="report-list">
            <h3>最近报表</h3>
            @for (report of recentReports(); track report.id) {
              <div class="report-item">
                <div class="report-info">
                  <span class="report-title">{{ report.title }}</span>
                  <span class="report-time">{{ formatTime(report.generated_at) }}</span>
                </div>
                <div class="report-actions">
                  <button (click)="downloadReport(report.id, 'html')">HTML</button>
                  <button (click)="downloadReport(report.id, 'markdown')">MD</button>
                  <button (click)="downloadReport(report.id, 'csv')">CSV</button>
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- 最近异常 -->
      @if (recentAnomalies().length > 0) {
        <section class="anomaly-section">
          <h2>最近检测的异常</h2>
          <div class="anomaly-list">
            @for (anomaly of recentAnomalies(); track anomaly.id) {
              <div class="anomaly-item" [class]="anomaly.severity">
                <span class="anomaly-icon">{{ getAnomalyIcon(anomaly.type) }}</span>
                <div class="anomaly-content">
                  <div class="anomaly-metric">{{ anomaly.metric }}</div>
                  <div class="anomaly-detail">
                    {{ anomaly.type }}: 值={{ anomaly.value | number:'1.2-2' }}，
                    期望={{ anomaly.expected | number:'1.2-2' }}
                  </div>
                </div>
                <div class="anomaly-severity">{{ anomaly.severity }}</div>
                <div class="anomaly-time">{{ formatTime(anomaly.timestamp) }}</div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .smart-ops {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.75rem;
      color: #f1f5f9;
    }

    .subtitle {
      margin: 0.5rem 0 0;
      font-size: 0.9rem;
      color: #6b7280;
    }

    /* 状态卡片 */
    .status-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1200px) {
      .status-cards { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .status-cards { grid-template-columns: 1fr; }
    }

    .status-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .card-icon { font-size: 1.25rem; }

    .card-title {
      flex: 1;
      font-size: 0.9rem;
      font-weight: 500;
      color: #f1f5f9;
    }

    .status-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .status-badge.auto { background: #10b981; color: white; }
    .status-badge.semi_auto { background: #3b82f6; color: white; }
    .status-badge.manual { background: #6b7280; color: white; }
    .status-badge.disabled { background: #374151; color: #9ca3af; }

    .storm-badge {
      background: #ef4444;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.65rem;
      font-weight: 600;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .card-body {
      margin-bottom: 1rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.8rem;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .stat-row:last-child { border-bottom: none; }

    .stat-row .value {
      font-weight: 600;
      color: #f1f5f9;
    }

    .stat-row .value.highlight { color: #3b82f6; }
    .stat-row .value.success { color: #10b981; }
    .stat-row .value.warning { color: #f59e0b; }

    .card-actions {
      display: flex;
      gap: 0.5rem;
    }

    .card-actions select,
    .card-actions button {
      flex: 1;
      padding: 0.5rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.05);
      color: #f1f5f9;
      cursor: pointer;
    }

    .card-actions button:hover {
      background: rgba(255,255,255,0.1);
    }

    /* 审批部分 */
    .approval-section,
    .scaling-section,
    .report-section,
    .anomaly-section {
      background: rgba(30, 41, 59, 0.6);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .approval-section h2,
    .scaling-section h2,
    .report-section h2,
    .anomaly-section h2 {
      margin: 0 0 1rem;
      font-size: 1rem;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .count-badge {
      background: #ef4444;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.75rem;
    }

    .approval-list,
    .decision-list,
    .report-list,
    .anomaly-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .approval-item,
    .decision-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.75rem;
      border-left: 3px solid #3b82f6;
    }

    .approval-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .approval-type {
      font-size: 0.7rem;
      color: #6b7280;
      text-transform: uppercase;
    }

    .approval-title {
      font-size: 0.9rem;
      color: #f1f5f9;
    }

    .approval-requester {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .approval-time {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .approval-actions {
      display: flex;
      gap: 0.5rem;
    }

    .approve-btn,
    .confirm-btn {
      padding: 0.5rem 1rem;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.75rem;
    }

    .reject-btn,
    .cancel-btn {
      padding: 0.5rem 1rem;
      background: transparent;
      color: #ef4444;
      border: 1px solid #ef4444;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.75rem;
    }

    /* 决策项 */
    .decision-item.scale_up { border-left-color: #10b981; }
    .decision-item.scale_down { border-left-color: #f59e0b; }

    .decision-icon { font-size: 1.5rem; }

    .decision-content { flex: 1; }

    .decision-action {
      font-size: 0.9rem;
      font-weight: 500;
      color: #f1f5f9;
    }

    .decision-reason {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    .decision-confidence {
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .decision-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* 报表 */
    .report-actions {
      margin-bottom: 1rem;
    }

    .report-type-select {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .report-type-select select {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.05);
      color: #f1f5f9;
      font-size: 0.8rem;
    }

    .generate-btn {
      padding: 0.5rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .generate-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .report-list h3 {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0 0 0.75rem;
    }

    .report-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.5rem;
    }

    .report-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .report-title {
      font-size: 0.85rem;
      color: #f1f5f9;
    }

    .report-time {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .report-actions button {
      padding: 0.25rem 0.75rem;
      margin-left: 0.5rem;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: #94a3b8;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.7rem;
    }

    .report-actions button:hover {
      background: rgba(255,255,255,0.1);
      color: #f1f5f9;
    }

    /* 异常列表 */
    .anomaly-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.5rem;
      border-left: 3px solid #6b7280;
    }

    .anomaly-item.low { border-left-color: #6b7280; }
    .anomaly-item.medium { border-left-color: #f59e0b; }
    .anomaly-item.high { border-left-color: #f97316; }
    .anomaly-item.critical { border-left-color: #ef4444; }

    .anomaly-icon { font-size: 1rem; }

    .anomaly-content { flex: 1; }

    .anomaly-metric {
      font-size: 0.85rem;
      color: #f1f5f9;
    }

    .anomaly-detail {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .anomaly-severity {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      background: rgba(255,255,255,0.1);
      border-radius: 1rem;
      color: #94a3b8;
    }

    .anomaly-time {
      font-size: 0.7rem;
      color: #6b7280;
    }
  `]
})
export class SmartOpsComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);

  // 状态
  scalingStatus = signal<ScalingStatus | null>(null);
  scalingDecisions = signal<any[]>([]);
  aggregatedAlerts = signal<AggregatedAlert[]>([]);
  alertSummary = signal<any>(null);
  anomalySummary = signal<AnomalySummary | null>(null);
  recentAnomalies = signal<any[]>([]);
  recoveryStats = signal<RecoveryStats | null>(null);
  pendingApprovals = signal<ApprovalRequest[]>([]);
  recentReports = signal<any[]>([]);
  generatingReport = signal(false);

  // 表单
  selectedScalingMode = 'semi_auto';
  selectedReportType = 'overview';
  selectedReportPeriod = 'daily';

  private refreshInterval: any;

  ngOnInit(): void {
    this.loadAllData();
    // 🔧 Phase2: 15s→60s 降低 CPU 開銷
    this.refreshInterval = setInterval(() => this.loadAllData(), 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadAllData(): Promise<void> {
    await Promise.all([
      this.loadScalingStatus(),
      this.loadAlertAggregation(),
      this.loadAnomalySummary(),
      this.loadRecoveryStats(),
      this.loadPendingApprovals(),
      this.loadRecentReports()
    ]);
  }

  async loadScalingStatus(): Promise<void> {
    try {
      const result = await this.ipc.invoke('scaling:status');
      if (result?.success) {
        this.scalingStatus.set(result.data.stats);
        this.scalingDecisions.set(result.data.pending || []);
        this.selectedScalingMode = result.data.stats?.mode || 'semi_auto';
      }
    } catch (e) {
      console.error('Load scaling status failed:', e);
    }
  }

  async loadAlertAggregation(): Promise<void> {
    try {
      const result = await this.ipc.invoke('alerts:aggregated');
      if (result?.success) {
        this.aggregatedAlerts.set(result.data.alerts || []);
        this.alertSummary.set(result.data.summary);
      }
    } catch (e) {
      console.error('Load alert aggregation failed:', e);
    }
  }

  async loadAnomalySummary(): Promise<void> {
    try {
      const result = await this.ipc.invoke('anomaly:summary');
      if (result?.success) {
        this.anomalySummary.set(result.data.summary);
        this.recentAnomalies.set(result.data.recent || []);
      }
    } catch (e) {
      console.error('Load anomaly summary failed:', e);
    }
  }

  async loadRecoveryStats(): Promise<void> {
    try {
      const result = await this.ipc.invoke('recovery:stats');
      if (result?.success) {
        this.recoveryStats.set(result.data);
      }
    } catch (e) {
      console.error('Load recovery stats failed:', e);
    }
  }

  async loadPendingApprovals(): Promise<void> {
    try {
      const result = await this.ipc.invoke('approval:pending');
      if (result?.success) {
        this.pendingApprovals.set(result.data || []);
      }
    } catch (e) {
      console.error('Load pending approvals failed:', e);
    }
  }

  async loadRecentReports(): Promise<void> {
    try {
      const result = await this.ipc.invoke('reports:list');
      if (result?.success) {
        this.recentReports.set(result.data || []);
      }
    } catch (e) {
      console.error('Load recent reports failed:', e);
    }
  }

  // 扩缩容操作
  async updateScalingMode(): Promise<void> {
    try {
      await this.ipc.invoke('scaling:set-mode', { mode: this.selectedScalingMode });
      await this.loadScalingStatus();
    } catch (e) {
      console.error('Update scaling mode failed:', e);
    }
  }

  async confirmDecision(index: number): Promise<void> {
    try {
      await this.ipc.invoke('scaling:confirm', { index });
      await this.loadScalingStatus();
    } catch (e) {
      console.error('Confirm decision failed:', e);
    }
  }

  async rejectDecision(index: number): Promise<void> {
    try {
      await this.ipc.invoke('scaling:reject', { index });
      await this.loadScalingStatus();
    } catch (e) {
      console.error('Reject decision failed:', e);
    }
  }

  // 审批操作
  async approveRequest(requestId: string): Promise<void> {
    try {
      await this.ipc.invoke('approval:approve', { request_id: requestId });
      await this.loadPendingApprovals();
    } catch (e) {
      console.error('Approve request failed:', e);
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    try {
      await this.ipc.invoke('approval:reject', { request_id: requestId });
      await this.loadPendingApprovals();
    } catch (e) {
      console.error('Reject request failed:', e);
    }
  }

  // 报表
  async generateReport(): Promise<void> {
    this.generatingReport.set(true);
    
    try {
      await this.ipc.invoke('reports:generate', {
        type: this.selectedReportType,
        period: this.selectedReportPeriod
      });
      await this.loadRecentReports();
    } catch (e) {
      console.error('Generate report failed:', e);
    } finally {
      this.generatingReport.set(false);
    }
  }

  async downloadReport(reportId: string, format: string): Promise<void> {
    try {
      const result = await this.ipc.invoke('reports:export', { 
        report_id: reportId, 
        format 
      });
      
      if (result?.success && result.data?.content) {
        // 创建下载
        const blob = new Blob([result.data.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format === 'markdown' ? 'md' : format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Download report failed:', e);
    }
  }

  // 辅助方法
  getScalingModeText(): string {
    const modes: Record<string, string> = {
      auto: '全自动',
      semi_auto: '半自动',
      manual: '手动',
      disabled: '已禁用'
    };
    return modes[this.scalingStatus()?.mode || 'disabled'] || '未知';
  }

  isStormDetected(): boolean {
    return this.alertSummary()?.storm_status?.detected || false;
  }

  getRecoverySuccessRate(): string {
    const stats = this.recoveryStats();
    if (!stats || stats.total_recoveries === 0) return '0';
    return ((stats.successful / stats.total_recoveries) * 100).toFixed(1);
  }

  formatOperationType(type: string): string {
    const types: Record<string, string> = {
      'api.delete': 'API 删除',
      'api.batch_delete': 'API 批量删除',
      'api.batch_disable': 'API 批量禁用',
      'system.config_change': '系统配置变更',
      'scaling.execute': '扩缩容执行'
    };
    return types[type] || type;
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAnomalyIcon(type: string): string {
    const icons: Record<string, string> = {
      spike: '📈',
      drop: '📉',
      trend: '📊',
      outlier: '⚠️',
      threshold: '🚨'
    };
    return icons[type] || '❓';
  }

  viewAggregatedAlerts(): void {
    // 导航到告警页面
  }

  viewAnomalies(): void {
    // 导航到异常页面
  }

  viewRecoveryHistory(): void {
    // 导航到恢复历史页面
  }
}
