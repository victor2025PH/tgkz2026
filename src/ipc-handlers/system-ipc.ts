/**
 * Phase 9-1a: System management, resource batch, one-click, queue, analytics, alerts
 * Extracted from AppComponent.setupIpcListeners()
 */
import { LogEntry, TelegramAccount, CapturedLead, KeywordConfig, QueueStatus, QueueMessage, Alert } from '../models';
import { TimeSeriesData } from '../analytics-charts.component';

export function setupSystemIpcHandlers(this: any): void {
    // ==================== Phase 5: System Management Events ====================
    
    // Migration Events
    this.ipcService.on('migration-status', (data: any) => {
      this.isLoadingMigration.set(false);
      if (!data.error) {
        this.migrationStatus.set({
          currentVersion: data.current_version || 0,
          latestVersion: data.latest_version || 0,
          appliedCount: data.applied_count || 0,
          pendingCount: data.pending_count || 0,
          appliedMigrations: data.applied_migrations || [],
          pendingMigrations: data.pending_migrations || []
        });
      }
    });
    
    this.ipcService.on('migration-completed', (data: any) => {
      this.isRunningMigration.set(false);
      if (data.error) {
        this.toastService.error(`遷移失敗: ${data.error}`);
      } else {
        this.toastService.success('✅ 數據庫遷移完成');
        this.loadMigrationStatus();
      }
    });
    
    this.ipcService.on('rollback-completed', (data: any) => {
      this.isRunningMigration.set(false);
      if (data.error) {
        this.toastService.error(`回滾失敗: ${data.error}`);
      } else {
        this.toastService.success('✅ 數據庫回滾完成');
        this.loadMigrationStatus();
      }
    });
    
    // Scheduler Events
    this.ipcService.on('scheduler-status', (data: any) => {
      if (data.success !== false) {
        this.schedulerStatus.set({
          isRunning: data.is_running || false,
          tasks: data.tasks || []
        });
      }
    });
    
    this.ipcService.on('scheduler-started', (data: any) => {
      if (data.success) {
        this.toastService.success('✅ 調度器已啟動');
        this.loadSchedulerStatus();
      }
    });
    
    this.ipcService.on('scheduler-stopped', (data: any) => {
      if (data.success) {
        this.toastService.info('調度器已停止');
        this.loadSchedulerStatus();
      }
    });
    
    this.ipcService.on('scheduler-task-result', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 任務 ${data.taskName} 執行完成`);
      } else {
        this.toastService.error(`任務執行失敗: ${data.error}`);
      }
      this.loadSchedulerStatus();
    });
    
    // Log File Events
    this.ipcService.on('log-files', (data: any) => {
      this.isLoadingLogs.set(false);
      if (data.files) {
        this.logFiles.set(data.files.map((f: any) => ({
          name: f.name,
          size: f.size,
          sizeFormatted: this.formatFileSize(f.size),
          modifiedAt: f.modified_at,
          isCompressed: f.name.endsWith('.gz')
        })));
      }
    });
    
    this.ipcService.on('log-stats', (data: any) => {
      if (!data.error) {
        this.logStats.set({
          totalFiles: data.total_files || 0,
          totalSize: data.total_size || 0,
          totalSizeFormatted: this.formatFileSize(data.total_size || 0),
          compressedFiles: data.compressed_files || 0,
          oldestFile: data.oldest_file,
          newestFile: data.newest_file
        });
      }
    });
    
    this.ipcService.on('logs-rotated', (data: any) => {
      this.isRotatingLogs.set(false);
      if (data.success) {
        this.toastService.success(`✅ 日誌輪轉完成，輪轉了 ${data.rotated_count || 0} 個文件`);
        this.loadLogFiles();
        this.loadLogStats();
      } else {
        this.toastService.error(`日誌輪轉失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('log-file-content', (data: any) => {
      if (data.content) {
        this.logFileContent.set(data.content);
      }
    });
    
    this.ipcService.on('log-file-deleted', (data: any) => {
      if (data.success) {
        this.toastService.success('✅ 日誌文件已刪除');
        this.loadLogFiles();
        this.loadLogStats();
      }
    });
    
    // Resource Batch Events
    this.ipcService.on('resources-batch-updated', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 已更新 ${data.count || 0} 個資源`);
        this.loadResources();
      }
    });
    
    this.ipcService.on('resources-batch-deleted', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 已刪除 ${data.count || 0} 個資源`);
        this.loadResources();
      }
    });

    this.ipcService.on('resources-cleared', (data: any) => {
      if (data.success) {
        this.toastService.success(`🗑️ 已清空所有資源，共 ${data.deletedCount || 0} 條`);
        this.refreshResourceStats();
      } else {
        this.toastService.error(`清空失敗: ${data.error}`);
      }
    });
    
    // 🆕 清理資源完成
    this.ipcService.on('clear-resources-complete', (data: { success: boolean, deleted_count?: number, type?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`🧹 清理完成，已刪除 ${data.deleted_count || 0} 條記錄`);
        this.discoveredResources.set([]);
        this.refreshResourceStats();
      } else {
        this.toastService.error(`清理失敗: ${data.error}`);
      }
    });

    // 用戶列表事件
    this.ipcService.on('users-with-profiles', (data: any) => {
        console.log('[Frontend] Received users-with-profiles:', data.users?.length || 0);
        if (!data.error) {
            this.usersWithProfiles.set(data);
        }
    });
    
    // === 一鍵啟動事件 ===
    this.ipcService.on('one-click-start-progress', (data: {step: string, message: string, progress: number}) => {
        console.log('[Frontend] One-click progress:', data);
        this.oneClickProgress.set(data.progress);
        this.oneClickMessage.set(data.message);
    });
    
    // 🆕 群組加入進度事件（漸進式更新）
    this.ipcService.on('group-join-progress', (data: {current: number, total: number, url: string}) => {
        const progressMsg = `👥 正在檢查群組 ${data.current}/${data.total}...`;
        this.oneClickMessage.set(progressMsg);
        // 計算進度：群組階段佔 42-48%
        const groupProgress = 42 + (data.current / data.total) * 6;
        this.oneClickProgress.set(Math.round(groupProgress));
    });
    
    // 🆕 群組加入完成事件
    this.ipcService.on('group-join-complete', (data: {success_count: number, pending_count: number, failed_count: number, total: number, skipped_cached?: number}) => {
        console.log('[Frontend] Group join complete:', data);
        const cachedInfo = data.skipped_cached ? ` (${data.skipped_cached} 個緩存命中)` : '';
        this.oneClickMessage.set(`✅ 群組加入完成: ${data.success_count}/${data.total} 成功${cachedInfo}`);
    });
    
    this.ipcService.on('one-click-start-result', (data: any) => {
        console.log('[Frontend] One-click result:', data);
        this.oneClickStarting.set(false);
        this.oneClickStartReport.set(data);  // 保存報告
        this.showStartReport.set(true);  // 顯示報告面板
        if (data.overall_success) {
            this.toastService.success('🎉 一鍵啟動成功！系統已就緒', 5000);
        } else {
            this.toastService.warning('⚠️ 部分功能啟動失敗，請檢查日誌', 5000);
        }
        // 刷新系統狀態
        this.loadSystemStatus();
    });
    
    this.ipcService.on('one-click-stop-result', (data: {success: boolean, error?: string}) => {
        console.log('[Frontend] One-click stop result:', data);
        if (data.success) {
            this.toastService.info('🛑 所有服務已停止', 3000);
        }
        this.loadSystemStatus();
    });
    
    this.ipcService.on('system-status', (data: any) => {
        console.log('[Frontend] System status:', data);
        if (!data.error) {
            this.systemStatus.set(data);
        }
    });
    
    // 觸發規則變更後刷新系統狀態
    this.ipcService.on('trigger-rules-result', (data: any) => {
        if (data.success) {
            // 延遲刷新以確保後端數據已更新
            setTimeout(() => this.loadSystemStatus(), 100);
        }
    });
    
    this.ipcService.on('ai-settings-updated', (data: any) => {
        console.log('[Frontend] AI settings updated:', data);
        if (data.auto_chat_enabled !== undefined) {
            this.aiAutoChatEnabled.set(data.auto_chat_enabled);
        }
        if (data.auto_chat_mode) {
            this.aiAutoChatMode.set(data.auto_chat_mode);
        }
    });
    
    // 批量更新完成事件
    this.ipcService.on('bulk-update-complete', (data: {success: boolean, type?: string, count?: number, error?: string}) => {
        console.log('[Frontend] Bulk update complete:', data);
        if (data.success) {
            this.toastService.success(`已更新 ${data.count} 個用戶`);
            this.selectedUserIds.set([]);
            this.loadUsersWithProfiles();
        } else {
            this.toastService.error(`更新失敗: ${data.error}`);
        }
    });
    
    this.ipcService.on('settings-updated', (settings: any) => {
        if (settings) {
            this.spintaxEnabled.set(settings.spintaxEnabled ?? true);
            this.autoReplyEnabled.set(settings.autoReplyEnabled ?? false);
            this.autoReplyMessage.set(settings.autoReplyMessage || "Thanks for getting back to me! I'll read your message and respond shortly.");
            this.smartSendingEnabled.set(settings.smartSendingEnabled ?? true);
        }
    });
    
    this.ipcService.on('queue-status', (status: QueueStatus | Record<string, QueueStatus>) => {
        if (typeof status === 'object' && 'phone' in status) {
            // Single account status
            const singleStatus = status as QueueStatus;
            this.queueStatuses.update(statuses => ({
                ...statuses,
                [singleStatus.phone]: singleStatus
            }));
        } else {
            // Multiple account statuses
            const statuses = status as Record<string, QueueStatus>;
            this.queueStatuses.set(statuses);
        }
        
        // 更新整體隊列統計
        const allStatuses: QueueStatus[] = Object.values(this.queueStatuses()) as QueueStatus[];
        const totalPending = allStatuses.reduce((sum, s) => sum + (s.pending || 0), 0);
        const totalSending = allStatuses.reduce((sum, s) => sum + (s.processing || 0), 0);
        const totalSent = allStatuses.reduce((sum, s) => sum + (s.stats?.completed || 0), 0);
        const totalFailed = allStatuses.reduce((sum, s) => sum + (s.failed || 0), 0);
        const total = totalSent + totalFailed;
        
        this.queueStats.set({
          pending: totalPending,
          sending: totalSending,
          sent: totalSent,
          failed: totalFailed,
          retrying: allStatuses.reduce((sum, s) => sum + (s.retrying || 0), 0),
          totalToday: total,
          successRate: total > 0 ? totalSent / total : 0,
          avgSendTime: allStatuses.reduce((sum, s) => sum + (s.stats?.avg_time || 0), 0) / (allStatuses.length || 1)
        });
    });
    
    this.ipcService.on('queue-messages', (data: { phone?: string, messages: QueueMessage[], count: number }) => {
        this.queueMessages.set(data.messages);
    });
    
    this.ipcService.on('sending-stats', (data: { stats: any[], days: number, phone?: string }) => {
        const chartData: TimeSeriesData = {
            labels: data.stats.map(s => s.date),
            datasets: [{
                label: '成功发送',
                data: data.stats.map(s => s.successful || 0),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true
            }, {
                label: '失败',
                data: data.stats.map(s => s.failed || 0),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true
            }]
        };
        this.sendingStatsData.set(chartData);
    });
    
    this.ipcService.on('queue-length-history', (data: { history: any[], days: number }) => {
        const chartData: TimeSeriesData = {
            labels: data.history.map(h => h.date),
            datasets: [{
                label: '队列长度',
                data: data.history.map(h => h.queue_length || 0),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        };
        this.queueLengthHistoryData.set(chartData);
    });
    
    this.ipcService.on('account-sending-comparison', (data: { comparison: any[], days: number }) => {
        const chartData: TimeSeriesData = {
            labels: data.comparison.map(c => c.phone),
            datasets: [{
                label: '总发送',
                data: data.comparison.map(c => c.total_sent || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.8)'
            }, {
                label: '成功',
                data: data.comparison.map(c => c.successful || 0),
                backgroundColor: 'rgba(34, 197, 94, 0.8)'
            }, {
                label: '失败',
                data: data.comparison.map(c => c.failed || 0),
                backgroundColor: 'rgba(239, 68, 68, 0.8)'
            }]
        };
        this.accountComparisonData.set(chartData);
    });
    
    this.ipcService.on('campaign-performance-stats', (data: { stats: any[], days: number }) => {
        const chartData: TimeSeriesData = {
            labels: data.stats.map(s => s.campaign_name || 'Unknown'),
            datasets: [{
                label: '捕获潜在客户',
                data: data.stats.map(s => s.leads_captured || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.8)'
            }, {
                label: '已联系',
                data: data.stats.map(s => s.leads_contacted || 0),
                backgroundColor: 'rgba(34, 197, 94, 0.8)'
            }, {
                label: '已回复',
                data: data.stats.map(s => s.leads_replied || 0),
                backgroundColor: 'rgba(168, 85, 247, 0.8)'
            }]
        };
        this.campaignPerformanceData.set(chartData);
    });
    
    // AI Greeting Suggestion
    this.ipcService.on('ai-greeting-suggestion', (data: any) => {
        console.log('[AI] Received greeting suggestion:', data);
        this.aiGreetingSuggestion.set(data);
        this.showAiGreetingDialog.set(true);
        this.toastService.info(`🤖 AI 已為 @${data.username || data.firstName} 生成問候建議`, 5000);
    });
    
    this.ipcService.on('alert-triggered', (alert: Alert) => {
        alert.timestamp = new Date(alert.timestamp).toISOString();
        this.alerts.update(alerts => {
            // Check if alert already exists (avoid duplicates)
            const exists = alerts.some(a => 
                a.alert_type === alert.alert_type && 
                a.message === alert.message &&
                Math.abs(new Date(a.timestamp).getTime() - new Date(alert.timestamp).getTime()) < 60000 // Within 1 minute
            );
            if (!exists) {
                return [alert, ...alerts].slice(0, 100); // Keep last 100 alerts
            }
            return alerts;
        });
        // Show browser notification if available
        this.showBrowserNotification(alert);
        // 也顯示通用通知
        this.showNotification(
            `告警: ${alert.level.toUpperCase()}`,
            alert.message,
            { requireInteraction: alert.level === 'critical' }
        );
    });
    
    // Alert rules events
    this.ipcService.on('alert-rules-loaded', (data: { success: boolean, rules?: any[], error?: string }) => {
      if (data.success && data.rules) {
        this.alertRules.set(data.rules);
      }
    });
    
    this.ipcService.on('alert-rule-updated', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.toastService.success('告警规则已更新');
        this.loadAlertRules();
      } else {
        this.toastService.error(data.error || '更新失败');
      }
    });
    
    // Alert history events
    this.ipcService.on('alert-history-loaded', (data: { success: boolean, history?: any[], error?: string }) => {
      if (data.success && data.history) {
        this.alertHistory.set(data.history);
      }
    });
    
    this.ipcService.on('alerts-loaded', (data: { alerts: Alert[], count: number }) => {
      this.alerts.set(data.alerts);
    });
    
}
