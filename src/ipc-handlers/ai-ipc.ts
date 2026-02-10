/**
 * Phase 9-1a: RAG, memory, batch ops, tags, ads, tracking, campaign automation
 * Extracted from AppComponent.setupIpcListeners()
 */
import { LogEntry, TelegramAccount, CapturedLead, KeywordConfig, QueueStatus, QueueMessage, Alert } from '../models';
import { TimeSeriesData } from '../analytics-charts.component';

export function setupAiIpcHandlers(this: any): void {
    // ==================== Telegram RAG System Events ====================
    this.ipcService.on('rag-initialized', (data: { success: boolean, error?: string }) => {
      this.isInitializingRag.set(false);
      if (data.success) {
        this.ragSystemInitialized.set(true);
        this.toastService.success('✅ RAG 系統初始化完成');
        this.refreshRagStats();
      } else {
        this.toastService.error(`RAG 初始化失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-stats', (data: { success: boolean, rag?: any, indexer?: any, error?: string }) => {
      if (data.success && data.rag) {
        const rag = data.rag;
        const byType = rag.by_type || {};
        
        // 計算 QA 和 Script 數量
        let qaCount = 0;
        let scriptsCount = 0;
        for (const key of Object.keys(byType)) {
          if (key.toLowerCase().includes('qa') || key.toLowerCase().includes('問答')) {
            qaCount += byType[key].count || 0;
          }
          if (key.toLowerCase().includes('script') || key.toLowerCase().includes('話術')) {
            scriptsCount += byType[key].count || 0;
          }
        }
        
        this.ragStats.set({
          total_knowledge: rag.total_knowledge || 0,
          qa_count: qaCount,
          scripts_count: scriptsCount,
          total_uses: rag.total_uses || 0,
          avg_score: rag.avg_score || 0,
          chromadb_enabled: rag.chromadb_enabled || false,
          neural_embedding: rag.neural_embedding || false,
          by_type: byType
        });
        
        // 如果有數據，標記系統已初始化
        if (rag.total_knowledge > 0) {
          this.ragSystemInitialized.set(true);
        }
      }
    });
    
    this.ipcService.on('rag-search-result', (data: { success: boolean, query: string, results?: any[], error?: string }) => {
      this.isSearchingRag.set(false);
      if (data.success && data.results) {
        this.ragSearchResults.set(data.results);
      } else if (data.error) {
        this.toastService.error(`搜索失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-learning-triggered', (data: { success: boolean, conversationsProcessed?: number, knowledgeExtracted?: number, error?: string }) => {
      this.isRagLearning.set(false);
      if (data.success) {
        this.toastService.success(`🎓 學習完成！處理 ${data.conversationsProcessed || 0} 個對話，提取 ${data.knowledgeExtracted || 0} 條知識`);
        this.refreshRagStats();
      } else {
        this.toastService.error(`學習失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-reindex-complete', (data: { success: boolean, conversations_processed?: number, knowledge_extracted?: number, error?: string }) => {
      this.isReindexing.set(false);
      if (data.success) {
        this.toastService.success(`🔄 重新索引完成！處理 ${data.conversations_processed || 0} 個對話`);
        this.refreshRagStats();
      } else {
        this.toastService.error(`重新索引失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-cleanup-complete', (data: { success: boolean, deleted?: number, merged?: number, error?: string }) => {
      this.isCleaningRag.set(false);
      if (data.success) {
        this.toastService.success(`🧹 清理完成！刪除 ${data.deleted || 0} 條，合併 ${data.merged || 0} 條`);
        this.refreshRagStats();
      } else {
        this.toastService.error(`清理失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-knowledge-added', (data: { success: boolean, knowledgeId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 知識已添加');
        this.refreshRagStats();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-feedback-recorded', (data: { success: boolean, knowledgeId?: number, error?: string }) => {
      if (!data.success) {
        this.toastService.error(`反饋記錄失敗: ${data.error}`);
      }
    });
    
    // Vector Memory Events (向量記憶事件)
    this.ipcService.on('memories-searched', (data: { success: boolean, memories?: any[], error?: string }) => {
      this.isSearchingMemory.set(false);
      if (data.success && data.memories) {
        this.vectorMemorySearchResults.set(data.memories.map(m => ({
          id: m.id,
          userId: m.user_id,
          content: m.content,
          memoryType: m.memory_type,
          importance: m.importance,
          similarity: m.similarity || 0,
          createdAt: m.created_at
        })));
      } else if (data.error) {
        this.toastService.error(`搜索失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('memory-added', (data: { success: boolean, memoryId?: number, error?: string }) => {
      this.isAddingMemory.set(false);
      if (data.success) {
        this.toastService.success('✅ 記憶已添加');
        this.newMemory = { userId: '', content: '', type: 'conversation', importance: 0.5 };
        this.showAddMemoryDialog.set(false);
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('memory-stats', (data: { success: boolean, totalMemories?: number, byType?: any, totalUsers?: number, avgImportance?: number, error?: string }) => {
      if (data.success) {
        this.vectorMemoryStats.set({
          totalMemories: data.totalMemories || 0,
          byType: data.byType || {},
          totalUsers: data.totalUsers || 0,
          avgImportance: data.avgImportance || 0
        });
      }
    });
    
    this.ipcService.on('memory-user-list', (data: { success: boolean, users?: string[], error?: string }) => {
      if (data.success && data.users) {
        this.memoryUserList.set(data.users);
      }
    });
    
    this.ipcService.on('memory-deleted', (data: { success: boolean, memoryId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 記憶已刪除');
        this.vectorMemorySearchResults.update(results => 
          results.filter(r => r.id !== data.memoryId)
        );
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`刪除失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('memories-merged', (data: { success: boolean, mergedCount?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 合併完成！合併了 ${data.mergedCount || 0} 條記憶`);
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`合併失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('old-memories-cleaned', (data: { success: boolean, deletedCount?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 清理完成！刪除了 ${data.deletedCount || 0} 條舊記憶`);
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`清理失敗: ${data.error}`);
      }
    });
    
    // Batch Operations Events (批量操作事件)
    this.ipcService.on('batch-operation-result', (data: any) => {
      this.handleBatchOperationResult(data);
    });
    
    this.ipcService.on('batch-operation-progress', (data: any) => {
      this.handleBatchOperationProgress(data);
    });
    
    this.ipcService.on('batch-undo-result', (data: any) => {
      this.handleBatchUndoResult(data);
    });
    
    this.ipcService.on('batch-operation-history', (data: any) => {
      this.handleBatchOperationHistory(data);
    });
    
    this.ipcService.on('all-tags', (data: any) => {
      this.handleAllTags(data);
    });
    
    this.ipcService.on('tag-created', (data: any) => {
      this.handleTagCreated(data);
    });
    
    this.ipcService.on('tag-deleted', (data: any) => {
      this.handleTagDeleted(data);
    });
    
    // Ad System Events (廣告發送系統)
    this.ipcService.on('ad-templates', (data: any) => {
      this.handleAdTemplates(data);
    });
    
    this.ipcService.on('ad-schedules', (data: any) => {
      this.handleAdSchedules(data);
    });
    
    this.ipcService.on('ad-send-logs', (data: any) => {
      this.handleAdSendLogs(data);
    });
    
    this.ipcService.on('ad-overview-stats', (data: any) => {
      this.handleAdOverviewStats(data);
    });
    
    this.ipcService.on('ad-template-created', (data: any) => {
      this.handleAdTemplateCreated(data);
    });
    
    this.ipcService.on('ad-template-deleted', (data: any) => {
      this.handleAdTemplateDeleted(data);
    });
    
    this.ipcService.on('ad-template-toggled', (data: any) => {
      if (data.success) {
        this.loadAdTemplates();
      }
    });
    
    this.ipcService.on('ad-schedule-created', (data: any) => {
      this.handleAdScheduleCreated(data);
    });
    
    this.ipcService.on('ad-schedule-deleted', (data: any) => {
      this.handleAdScheduleDeleted(data);
    });
    
    this.ipcService.on('ad-schedule-toggled', (data: any) => {
      if (data.success) {
        this.loadAdSchedules();
      }
    });
    
    this.ipcService.on('ad-schedule-run-result', (data: any) => {
      this.handleAdScheduleRunResult(data);
    });
    
    this.ipcService.on('spintax-validated', (data: any) => {
      this.handleSpintaxValidated(data);
    });
    
    this.ipcService.on('ad-sent', (data: any) => {
      this.toastService.success(`廣告已發送到 ${data.groupTitle || data.groupId}`);
    });
    
    this.ipcService.on('ad-send-failed', (data: any) => {
      this.toastService.error(`發送失敗: ${data.error}`);
    });
    
    this.ipcService.on('broadcast-progress', (data: any) => {
      this.progressDialog.set({
        show: true,
        title: '廣告發送中...',
        progress: {
          current: data.current,
          total: data.total,
          message: `已發送 ${data.sent}，失敗 ${data.failed}`
        },
        cancellable: false
      });
    });
    
    this.ipcService.on('broadcast-completed', (data: any) => {
      this.progressDialog.update(p => ({ ...p, show: false }));
      this.toastService.success(`廣告發送完成: ${data.sent} 成功, ${data.failed} 失敗`);
      this.loadAdSendLogs();
      this.loadAdOverviewStats();
    });
    
    // User Tracking Events (用戶追蹤系統)
    this.ipcService.on('tracked-users', (data: any) => {
      this.handleTrackedUsers(data);
    });
    
    this.ipcService.on('user-groups', (data: any) => {
      this.handleUserGroups(data);
    });
    
    this.ipcService.on('high-value-groups', (data: any) => {
      this.handleHighValueGroups(data);
    });
    
    this.ipcService.on('tracking-stats', (data: any) => {
      this.handleTrackingStats(data);
    });
    
    this.ipcService.on('user-added-to-track', (data: any) => {
      this.handleUserAddedToTrack(data);
    });
    
    this.ipcService.on('user-added-from-lead', (data: any) => {
      if (data.success) {
        this.toastService.success('Lead 已添加到追蹤列表');
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('user-removed', (data: any) => {
      this.handleUserRemoved(data);
    });
    
    this.ipcService.on('user-tracking-started', (data: any) => {
      this.isTrackingUser.set(true);
    });
    
    this.ipcService.on('user-tracking-completed', (data: any) => {
      this.handleUserTrackingCompleted(data);
    });
    
    this.ipcService.on('user-tracking-failed', (data: any) => {
      this.handleUserTrackingFailed(data);
    });
    
    this.ipcService.on('user-value-updated', (data: any) => {
      if (data.success) {
        this.loadTrackedUsers();
      }
    });
    
    this.ipcService.on('batch-tracking-progress', (data: any) => {
      this.progressDialog.set({
        show: true,
        title: '批量追蹤中...',
        progress: {
          current: data.current,
          total: data.total,
          message: `正在追蹤用戶 ${data.userId}`
        },
        cancellable: false
      });
    });
    
    this.ipcService.on('batch-tracking-completed', (data: any) => {
      this.progressDialog.update(p => ({ ...p, show: false }));
      this.toastService.success(`批量追蹤完成: ${data.completed} 成功, ${data.failed} 失敗`);
      this.loadTrackedUsers();
      this.loadTrackingStats();
    });
    
    // Campaign Events (營銷活動協調器)
    this.ipcService.on('campaigns', (data: any) => {
      this.handleCampaigns(data);
    });
    
    this.ipcService.on('campaign-created', (data: any) => {
      this.handleCampaignCreated(data);
    });
    
    this.ipcService.on('campaign-deleted', (data: any) => {
      this.handleCampaignDeleted(data);
    });
    
    this.ipcService.on('campaign-started', (data: any) => {
      if (data.success !== false) {
        this.toastService.success('營銷活動已啟動');
        this.loadCampaigns();
      }
    });
    
    this.ipcService.on('campaign-paused', (data: any) => {
      if (data.success) {
        this.toastService.info('營銷活動已暫停');
        this.loadCampaigns();
      }
    });
    
    this.ipcService.on('campaign-stopped', (data: any) => {
      if (data.success !== false) {
        this.toastService.info('營銷活動已停止');
        this.loadCampaigns();
      }
    });
    
    this.ipcService.on('campaign-completed', (data: any) => {
      this.toastService.success('營銷活動執行完成');
      this.loadCampaigns();
      this.loadUnifiedOverview();
    });
    
    this.ipcService.on('campaign-step-started', (data: any) => {
      this.progressDialog.set({
        show: true,
        title: '執行營銷活動...',
        progress: {
          current: 0,
          total: 0,
          message: `執行步驟: ${data.actionType}`
        },
        cancellable: false
      });
    });
    
    this.ipcService.on('campaign-step-completed', (data: any) => {
      this.progressDialog.update(p => ({ ...p, show: false }));
    });
    
    this.ipcService.on('unified-overview', (data: any) => {
      this.handleUnifiedOverview(data);
    });
    
    this.ipcService.on('funnel-analysis', (data: any) => {
      this.handleFunnelAnalysis(data);
    });
    
    // Multi-Role Events (多角色協作)
    this.ipcService.on('role-templates', (data: any) => {
      this.handleRoleTemplates(data);
    });
    
    this.ipcService.on('all-roles', (data: any) => {
      this.handleAllRoles(data);
    });
    
    this.ipcService.on('role-assigned', (data: any) => {
      if (data.success) {
        this.toastService.success('角色已分配');
        this.loadAllRoles();
        this.loadRoleStats();
      } else {
        this.toastService.error(`分配失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('role-removed', (data: any) => {
      if (data.success) {
        this.toastService.success('角色已移除');
        this.loadAllRoles();
        this.loadRoleStats();
      }
    });
    
    this.ipcService.on('role-stats', (data: any) => {
      this.handleRoleStats(data);
    });
    
    this.ipcService.on('script-templates', (data: any) => {
      this.handleScriptTemplates(data);
    });
    
    this.ipcService.on('collab-groups', (data: any) => {
      this.handleCollabGroups(data);
    });
    
    this.ipcService.on('collab-stats', (data: any) => {
      this.handleCollabStats(data);
    });
    
    this.ipcService.on('collab-group-created', (data: any) => {
      if (data.success !== false) {
        this.toastService.success('協作群組已創建');
        this.loadCollabGroups();
      }
    });
    
}
