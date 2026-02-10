/**
 * Phase 9-1a: Ollama, local AI, first run, discussion watcher, chat history
 * Extracted from AppComponent.setupIpcListeners()
 */
import { LogEntry, TelegramAccount, CapturedLead, KeywordConfig, QueueStatus, QueueMessage, Alert } from '../models';
import { TimeSeriesData } from '../analytics-charts.component';

export function setupChatIpcHandlers(this: any): void {
    
    // Ollama 模型列表事件
    this.ipcService.on('ollama-models', (data: { success: boolean, models?: string[], error?: string }) => {
      if (data.success && data.models) {
        this.availableOllamaModels.set(data.models);
        this.toastService.success(`找到 ${data.models.length} 個模型`);
      } else if (data.error) {
        this.toastService.error(`獲取模型列表失敗: ${data.error}`);
      }
    });
    
    // 本地 AI 測試結果
    this.ipcService.on('local-ai-test-result', (data: { success: boolean, message?: string, error?: string }) => {
      this.isTestingLocalAi.set(false);
      if (data.success) {
        this.localAiStatus.set('success');
        this.aiConnectionStatus.set('success');
        this.toastService.success(data.message || '連接成功');
      } else {
        this.localAiStatus.set('error');
        this.localAiError.set(data.error || '連接失敗');
        this.toastService.error(data.error || '連接失敗');
      }
    });
    
    // 首次運行狀態
    this.ipcService.on('first-run-status', (data: { isFirstRun: boolean, userDataPath?: string }) => {
      this.isFirstRun.set(data.isFirstRun);
      if (data.isFirstRun) {
        console.log('[App] 首次運行，後台靜默配置 AI（不強制顯示向導）');
        // 不強制顯示向導，用戶可以直接使用程序
        // this.showWelcomeDialog.set(true);
        // 後台靜默檢測 Ollama
        setTimeout(() => this.detectOllama(), 1000);
      }
    });
    
    // 後端狀態監聽
    this.ipcService.on('backend-status', (data: { running: boolean, error?: string, suggestion?: string }) => {
      console.log('[App] Backend status:', data);
      this.backendRunning.set(data.running);
      if (!data.running && data.error) {
        this.backendError.set(data.error);
        this.showBackendErrorDialog.set(true);
        this.toastService.error('❌ Python 後端未運行，部分功能無法使用');
      }
    });
    
    // Ollama 檢測結果
    this.ipcService.on('ollama-detected', (data: { success: boolean, available?: boolean, models?: string[], error?: string }) => {
      this.isDetectingOllama.set(false);
      if (data.success) {
        this.ollamaDetected.set(data.available || false);
        if (data.models && data.models.length > 0) {
          this.detectedOllamaModels.set(data.models);
          // 自動選擇最佳模型
          const preferredModels = ['qwen2:7b', 'qwen:7b', 'llama3:8b', 'mistral:7b'];
          const bestModel = preferredModels.find(m => data.models!.some(dm => dm.includes(m.split(':')[0]))) || data.models[0];
          this.autoSelectedModel.set(bestModel);
          this.localAiModel.set(bestModel);
        }
      }
    });
    
    // 首次設置保存結果
    this.ipcService.on('first-run-settings-saved', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        console.log('[App] 首次設置已保存');
      } else {
        console.error('[App] 首次設置保存失敗:', data.error);
      }
    });
    
    this.ipcService.on('discovery-keywords', (data: { success: boolean, keywords?: any[], error?: string }) => {
      if (data.success && data.keywords) {
        this.discoveryKeywords.set(data.keywords);
      }
    });
    
    this.ipcService.on('discovery-keyword-added', (data: { success: boolean, keywordId?: number, keyword?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`➕ 關鍵詞已添加: ${data.keyword}`);
        this.showAddKeywordDialog.set(false);
        this.newResourceKeyword = '';
        this.loadDiscoveryKeywords();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    // Discussion Watcher Events
    this.ipcService.on('discussion-watcher-initialized', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.discussionWatcherInitialized.set(true);
        this.toastService.success('✅ 討論組監控服務已初始化');
        this.loadChannelDiscussions();
        this.refreshDiscussionStats();
      } else {
        this.toastService.error(`初始化失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('discussion-discovered', (data: { success: boolean, discussion?: any, error?: string }) => {
      if (data.success && data.discussion) {
        this.toastService.success(`✅ 發現討論組: ${data.discussion.discussion_title}`);
        this.loadChannelDiscussions();
      } else {
        this.toastService.error(data.error || '未找到討論組');
      }
    });
    
    this.ipcService.on('discussions-batch-discovered', (data: { success: boolean, count?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 發現了 ${data.count} 個討論組`);
        this.loadChannelDiscussions();
      } else {
        this.toastService.error(`發現失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('channel-discussions-list', (data: { success: boolean, discussions?: any[], error?: string }) => {
      if (data.success && data.discussions) {
        this.channelDiscussions.set(data.discussions);
      }
    });
    
    this.ipcService.on('discussion-monitoring-status', (data: { success: boolean, discussion_id?: string, status?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`${data.status === 'monitoring' ? '🟢 開始' : '🔴 停止'}監控討論組`);
        this.loadChannelDiscussions();
      } else {
        this.toastService.error(`操作失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('discussion-messages', (data: { success: boolean, discussion_id?: string, messages?: any[], error?: string }) => {
      this.isLoadingDiscussionMessages.set(false);
      if (data.success && data.messages) {
        this.discussionMessages.set(data.messages);
      } else {
        this.toastService.error(data.error || '加载消息失败');
        this.discussionMessages.set([]);
      }
    });
    
    this.ipcService.on('discussion-message', (data: { discussion_id: string, message_id: number, username: string, text: string, is_matched: boolean, keywords: string[] }) => {
      // 實時消息 - 可以添加到列表或顯示通知
      if (data.is_matched) {
        this.toastService.info(`🎯 關鍵詞匹配: @${data.username} - ${data.keywords.join(', ')}`);
      }
    });
    
    this.ipcService.on('discussion-lead-captured', (data: { discussion_id: string, username: string, keywords: string[] }) => {
      this.toastService.success(`👤 新潛在客戶: @${data.username}`);
      this.refreshDiscussionStats();
    });
    
    this.ipcService.on('discussion-reply-result', (data: { success: boolean, reply_message_id?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 回復已發送');
        if (this.selectedDiscussionId()) {
          this.loadDiscussionMessages(this.selectedDiscussionId());
        }
      } else {
        this.toastService.error(`回復失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('discussion-stats', (data: any) => {
      if (data.success) {
        this.discussionStats.set({
          total_discussions: data.total_discussions || 0,
          monitoring_count: data.monitoring_count || 0,
          total_messages: data.total_messages || 0,
          matched_messages: data.matched_messages || 0,
          leads_from_discussions: data.leads_from_discussions || 0,
          today_messages: data.today_messages || 0,
          today_leads: data.today_leads || 0
        });
        if (data.total_discussions > 0) {
          this.discussionWatcherInitialized.set(true);
        }
      }
    });

    // Chat History Events
    this.ipcService.on('chat-list', (data: { success: boolean, chats?: any[], total?: number, error?: string }) => {
      if (data.success && data.chats) {
        this.chatList.set(data.chats);
      } else {
        console.error('[Frontend] Chat list error:', data.error);
      }
    });
    
    this.ipcService.on('chat-history-full', (data: { success: boolean, messages?: any[], profile?: any, tags?: any[], hasMore?: boolean, total?: number, error?: string }) => {
      console.log('[Frontend] Received chat-history-full event:', data);
      if (data.success && data.messages) {
        const page = this.chatHistoryPage();
        
        if (page === 0) {
          // 第一頁，重置
          this.chatHistoryAllMessages.set(data.messages);
          this.chatHistory.set(data.messages);
          console.log('[Frontend] Loaded first page:', data.messages.length, 'messages');
        } else {
          // 追加新頁
          const existing = this.chatHistoryAllMessages();
          const combined = [...existing, ...data.messages];
          this.chatHistoryAllMessages.set(combined);
          this.chatHistory.set(combined);
          console.log('[Frontend] Loaded page', page, ':', data.messages.length, 'messages, total:', combined.length);
        }
        
        this.chatHistoryHasMore.set(data.hasMore || false);
        this.isLoadingChatHistory.set(false);
        this.chatHistoryLoadingMore.set(false);
        console.log('[Frontend] Chat history loaded. Has more:', data.hasMore, 'Total:', data.total);
      } else {
        console.error('[Frontend] Chat history error:', data.error);
        this.isLoadingChatHistory.set(false);
        this.chatHistoryLoadingMore.set(false);
      }
    });
    
    this.ipcService.on('chat-message-received', (data: { userId: string, message: string, timestamp: string }) => {
      // 實時更新聊天記錄
      if (this.selectedChatUserId() === data.userId) {
        this.loadChatHistory(data.userId);
      }
      // 更新聊天列表
      this.loadChatList();
    });
    
    this.ipcService.on('ai-response-generated', (data: { userId: string, aiResponse: string, mode: string, autoSent: boolean }) => {
      // AI 回復生成後，更新聊天記錄
      if (this.selectedChatUserId() === data.userId) {
        this.loadChatHistory(data.userId);
      }
    });
    
    this.ipcService.on('monitoring-status', (data: { success: boolean, isMonitoring?: boolean, listenerAccounts?: any[], senderAccounts?: any[] }) => {
      if (data.success) {
        console.log('[Frontend] Monitoring status:', data);
      }
    });
    
    this.ipcService.on('monitoring-health', (data: { success: boolean, isHealthy?: boolean, issues?: string[], warnings?: string[] }) => {
      if (data.success) {
        if (data.issues && data.issues.length > 0) {
          console.warn('[Frontend] Monitoring issues:', data.issues);
        }
        if (data.warnings && data.warnings.length > 0) {
          console.warn('[Frontend] Monitoring warnings:', data.warnings);
        }
      }
    });
    
    this.ipcService.on('alerts-loaded', (data: { alerts: Alert[], count: number }) => {
        const alerts = data.alerts.map(a => ({
            ...a,
            timestamp: new Date(a.timestamp).toISOString(),
            acknowledged_at: a.acknowledged_at ? new Date(a.acknowledged_at).toISOString() : undefined,
            resolved_at: a.resolved_at ? new Date(a.resolved_at).toISOString() : undefined
        }));
        this.alerts.set(alerts);
    });
}
