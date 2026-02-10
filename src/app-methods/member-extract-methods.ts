// @ts-nocheck
/**
 * Phase 9-1b: Member DB events, Extraction config
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 */

class MemberExtractMethodsMixin {
  // ==================== 成員資料庫事件處理 ====================
  
  /**
   * 處理從成員資料庫發送消息事件
   * 將 ExtractedMember 轉換為 CapturedLead 格式，並打開統一的發消息對話框
   */
  handleMemberSendMessage(member: ExtractedMember): void {
    // 將成員轉換為 CapturedLead 格式
    const lead = this.convertMemberToLead(member);
    
    // 使用統一的發消息對話框
    this.openLeadDetailModal(lead);
    this.toastService.info(`💬 準備發送消息給 ${member.first_name || member.username || member.user_id}`);
  }
  
  /**
   * 處理從成員資料庫加入漏斗事件
   * 創建新的 Lead 並加入潛在客戶列表
   */
  handleMemberAddToFunnel(member: ExtractedMember): void {
    // 檢查是否已存在該 Lead
    const existingLead = this.leads().find(l => l.userId === member.user_id);
    if (existingLead) {
      this.toastService.warning(`⚠️ ${member.first_name || member.username || member.user_id} 已在銷售漏斗中`);
      // 直接跳轉到潛在客戶頁面並選中該 Lead
      this.currentView.set('leads');
      setTimeout(() => this.openLeadDetailModal(existingLead), 100);
      return;
    }
    
    // 創建新的 Lead
    const newLead: CapturedLead = this.convertMemberToLead(member);
    
    // 發送到後端保存
    this.ipcService.send('add-lead', {
      user_id: member.user_id,
      username: member.username,
      first_name: member.first_name,
      last_name: member.last_name,
      source_chat_title: member.source_chat_title,
      source_chat_id: member.source_chat_id,
      notes: `從成員資料庫添加 (${member.value_level}級)`
    });
    
    // 樂觀更新本地數據
    this.leads.update(leads => [newLead, ...leads]);
    
    this.toastService.success(`✅ 已將 ${member.first_name || member.username || member.user_id} 加入銷售漏斗`);
    
    // 跳轉到潛在客戶頁面
    this.currentView.set('leads');
  }
  
  /**
   * 處理從資源中心發送消息事件
   */
  handleResourceSendMessage(contact: any): void {
    // 將統一聯繫人轉換為 CapturedLead 格式
    const lead: CapturedLead = {
      id: 0,
      userId: contact.telegram_id,
      username: contact.username || '',
      firstName: contact.first_name,
      lastName: contact.last_name,
      sourceGroup: contact.source_name || '',
      triggeredKeyword: '',
      timestamp: new Date(contact.created_at),
      status: 'New',
      onlineStatus: 'Unknown',
      interactionHistory: [],
      doNotContact: false
    };
    
    this.openLeadDetailModal(lead);
    this.toastService.info(`💬 準備發送消息給 ${contact.display_name || contact.username || contact.telegram_id}`);
  }
  
  /**
   * 處理從資源中心查看詳情事件
   */
  handleResourceViewDetail(contact: any): void {
    // 狀態映射
    let leadStatus: LeadStatus = 'New';
    if (contact.status === 'converted') leadStatus = 'Closed-Won';
    else if (contact.status === 'contacted') leadStatus = 'Contacted';
    else if (contact.status === 'interested') leadStatus = 'Replied';
    
    // 轉換為 Lead 格式並打開詳情
    const lead: CapturedLead = {
      id: 0,
      userId: contact.telegram_id,
      username: contact.username || '',
      firstName: contact.first_name,
      lastName: contact.last_name,
      sourceGroup: contact.source_name || '',
      triggeredKeyword: '',
      timestamp: new Date(contact.created_at),
      status: leadStatus,
      onlineStatus: 'Unknown',
      interactionHistory: [],
      doNotContact: false
    };
    
    this.openLeadDetailModal(lead);
  }
  
  /**
   * 處理從資源中心批量發送事件
   */
  handleResourceBatchSend(contacts: any[]): void {
    if (contacts.length === 0) return;
    
    // 轉換為批量發送目標格式（包含來源信息用於變量替換）
    const targets: BatchSendTarget[] = contacts.map(contact => ({
      telegramId: contact.telegram_id,
      username: contact.username || '',
      firstName: contact.first_name,
      lastName: contact.last_name,
      displayName: contact.display_name || contact.first_name || contact.username || contact.telegram_id,
      // 來源信息
      groupName: contact.source_name || contact.source_chat_title || '',
      keyword: contact.triggered_keyword || '',
      source: contact.source_type || ''
    }));
    
    this.batchSendTargets.set(targets);
    this.showBatchMessageDialogState.set(true);
    this.toastService.info(`📨 準備向 ${contacts.length} 個用戶發送批量消息`);
  }
  
  /**
   * 處理批量發送完成
   */
  handleBatchSendComplete(result: { success: number; failed: number }): void {
    this.showBatchMessageDialogState.set(false);
    this.batchSendTargets.set([]);
    this.toastService.success(`✅ 批量發送完成：成功 ${result.success}，失敗 ${result.failed}`);
  }
  
  /**
   * 關閉批量發送對話框
   */
  closeBatchSendDialog(): void {
    this.showBatchMessageDialogState.set(false);
    this.batchSendTargets.set([]);
  }
  
  /**
   * 為選中的 Leads 打開批量發送對話框
   */
  openBatchSendForLeads(): void {
    const selectedLeads = this.leads().filter(l => this.selectedLeadIds().has(l.id));
    if (selectedLeads.length === 0) {
      this.toastService.warning('請先選擇要發送消息的客戶');
      return;
    }
    
    const targets: BatchSendTarget[] = selectedLeads.map(lead => ({
      telegramId: lead.userId || String(lead.id),
      username: lead.username,
      firstName: lead.firstName,
      lastName: lead.lastName,
      displayName: lead.firstName || lead.username || '未知',
      // 添加來源信息，用於變量替換
      groupName: lead.sourceGroup || '',
      keyword: lead.triggeredKeyword || '',
      source: lead.sourceType || ''
    }));
    
    this.batchSendTargets.set(targets);
    this.showBatchMessageDialogState.set(true);
    this.toastService.info(`📨 準備向 ${selectedLeads.length} 個客戶發送批量消息`);
  }
  
  /**
   * 為選中的 Leads 打開批量拉群對話框
   */
  openBatchInviteForLeads(): void {
    const selectedLeads = this.leads().filter(l => this.selectedLeadIds().has(l.id));
    if (selectedLeads.length === 0) {
      this.toastService.warning('請先選擇要拉群的客戶');
      return;
    }
    
    const targets: BatchInviteTarget[] = selectedLeads.map(lead => ({
      telegramId: lead.userId || String(lead.id),
      username: lead.username,
      firstName: lead.firstName,
      displayName: lead.firstName || lead.username || '未知'
    }));
    
    this.batchInviteTargets.set(targets);
    this.showBatchInviteDialogState.set(true);
    this.toastService.info(`👥 準備將 ${selectedLeads.length} 個客戶拉入群組`);
  }
  
  /**
   * 關閉批量拉群對話框
   */
  closeBatchInviteDialog(): void {
    this.showBatchInviteDialogState.set(false);
    this.batchInviteTargets.set([]);
  }
  
  /**
   * 處理批量拉群完成
   */
  handleBatchInviteComplete(result: { success: number; failed: number; skipped: number }): void {
    this.showBatchInviteDialogState.set(false);
    this.batchInviteTargets.set([]);
    this.toastService.success(`✅ 批量拉群完成：成功 ${result.success}，跳過 ${result.skipped}，失敗 ${result.failed}`);
  }
  
  // ==================== 成員提取配置對話框 ====================
  
  /**
   * 打開成員提取配置對話框
   * 由監控群組頁面調用
   */
  openMemberExtractionDialog(group: any): void {
    // 構造群組信息
    const groupInfo: ExtractionGroupInfo = {
      id: String(group.id),
      name: group.name || group.title || '未知群組',
      url: group.url || '',
      telegramId: group.telegramId || group.telegram_id || '',  // 🔧 添加 Telegram ID
      memberCount: group.memberCount || group.member_count || 0,
      accountPhone: group.accountPhone,
      resourceType: group.resourceType || group.resource_type || 'group'  // 🆕 資源類型
    };
    
    this.memberExtractionGroup.set(groupInfo);
    this.showMemberExtractionDialog.set(true);
  }
  
  /**
   * 關閉成員提取配置對話框
   */
  closeMemberExtractionDialog(): void {
    this.showMemberExtractionDialog.set(false);
    this.memberExtractionGroup.set(null);
  }
  
  /**
   * 🔧 P0: 統一關閉成員提取對話框（同時關閉 DialogService 和本地狀態）
   */
  closeMemberExtractionDialogUnified(): void {
    // 關閉本地狀態
    this.showMemberExtractionDialog.set(false);
    this.memberExtractionGroup.set(null);
    // 關閉 DialogService 狀態
    this.dialogService.closeMemberExtraction();
  }
  
  /**
   * 🆕 處理成員數刷新結果
   * 更新對話框和群組列表中的成員數
   */
  handleMemberCountRefreshed(event: { groupId: string; memberCount: number }): void {
    console.log('[Frontend] Member count refreshed:', event);
    
    // 更新對話框中的群組信息
    const currentGroup = this.memberExtractionGroup();
    if (currentGroup && currentGroup.id === event.groupId) {
      this.memberExtractionGroup.set({
        ...currentGroup,
        memberCount: event.memberCount
      });
    }
    
    // 同時更新 monitoredGroups 中的數據
    this.monitoredGroups.update(groups => 
      groups.map(g => 
        String(g.id) === event.groupId 
          ? { ...g, memberCount: event.memberCount, member_count: event.memberCount }
          : g
      )
    );
  }
  
  /**
   * 處理成員提取開始
   * 從對話框接收配置並執行提取
   */
  handleMemberExtractionStart(event: { group: ExtractionGroupInfo; config: MemberExtractionConfig }): void {
    // 關閉對話框
    this.showMemberExtractionDialog.set(false);
    
    // 調用 MonitoringGroupsComponent 的提取方法（如果存在）
    if (this.monitoringGroupsRef) {
      this.monitoringGroupsRef.executeExtraction({
        limit: event.config.limit,
        filters: event.config.filters,
        advanced: event.config.advanced
      });
    } else {
      // 直接發送 IPC 命令
      const group = event.group;
      let chatId = '';
      if (group.url) {
        const match = group.url.match(/t\.me\/([+\w]+)/);
        if (match) {
          chatId = match[1];
        }
      }
      
      this.ipcService.send('extract-members', {
        chatId: chatId || group.url,
        username: chatId,
        telegramId: group.telegramId,  // 🔧 添加 telegramId
        resourceId: group.id,
        groupName: group.name,
        // 🔧 P0 修復：傳遞已加入群組的帳號
        phone: event.config.accountPhone || group.accountPhone || null,
        limit: event.config.limit === -1 ? undefined : event.config.limit,
        filters: {
          bots: !event.config.filters.excludeBots,
          // 🔧 修復：直接傳遞 onlineStatus 字符串，而不是布爾值
          onlineStatus: event.config.filters.onlineStatus,  // 'all', 'online', 'recently', 'offline'
          offline: event.config.filters.onlineStatus === 'offline',
          online: event.config.filters.onlineStatus === 'online',
          chinese: event.config.filters.hasChinese,
          hasUsername: event.config.filters.hasUsername,
          isPremium: event.config.filters.isPremium,
          excludeAdmins: event.config.filters.excludeAdmins
        },
        autoSave: event.config.advanced.autoSaveToResources,
        skipDuplicates: event.config.advanced.skipDuplicates
      });
      
      this.toastService.info(`🔄 正在提取 ${group.name} 的成員...`);
    }
  }
  
  /**
   * 處理監控群組配置動作
   */
  handleMonitoringConfigAction(action: string): void {
    switch (action) {
      case 'goto-resource-center':
        this.currentView.set('resource-center');
        break;
      case 'goto-search-discovery':
        this.currentView.set('search-discovery');
        break;
      case 'goto-accounts':
        this.currentView.set('monitoring-accounts');
        break;
      case 'goto-keywords':
        this.currentView.set('keyword-sets');
        break;
      case 'goto-templates':
        this.currentView.set('chat-templates');
        break;
      case 'goto-triggers':
        this.currentView.set('trigger-rules');
        break;
      default:
        console.log('[Frontend] Unknown config action:', action);
    }
  }
  
  /**
   * 處理從資源中心發送到 AI 銷售事件
   */
  handleResourceSendToAISales(contacts: any[]): void {
    if (contacts.length === 0) return;
    
    // 將聯繫人加入 AI 銷售隊列
    this.ipcService.send('ai-team:add-targets', {
      targets: contacts.map(c => ({
        telegramId: c.telegram_id,
        username: c.username,
        displayName: c.display_name,
        sourceType: c.source_type
      }))
    });
    
    // 切換到 AI 團隊銷售頁面
    this.currentView.set('ai-team');
    this.toastService.success(`🤖 已將 ${contacts.length} 個聯繫人加入 AI 銷售隊列`);
  }
  
  /**
   * 處理資源中心狀態變更事件
   * 同步狀態變更到發送控制台 (leads)
   */
  handleResourceStatusChanged(event: { contacts: any[]; status: string }): void {
    if (!event.contacts.length) return;
    
    console.log('[Frontend] Syncing status change to leads:', event.contacts.length, 'contacts, status:', event.status);
    
    // 找到對應的 leads 並更新狀態
    const contactTelegramIds = new Set(event.contacts.map((c: any) => c.telegram_id));
    
    // 將資源中心狀態映射到 lead 狀態
    const statusMapping: Record<string, string> = {
      'new': 'New',
      'contacted': 'Contacted',
      'interested': 'Interested',
      'negotiating': 'Negotiating',
      'converted': 'Closed-Won',
      'lost': 'Closed-Lost',
      'blocked': 'Unsubscribed'
    };
    
    const leadStatus = statusMapping[event.status] || event.status;
    
    // 更新 leads 中匹配的記錄
    this.leads.update(leads => leads.map(lead => {
      if (contactTelegramIds.has(String(lead.userId))) {
        return { ...lead, status: leadStatus as LeadStatus };
      }
      return lead;
    }));
    
    // 通知後端同步
    this.ipcService.send('sync-resource-status-to-leads', {
      telegramIds: Array.from(contactTelegramIds),
      status: leadStatus
    });
    
    console.log('[Frontend] Status synced for', event.contacts.length, 'contacts');
  }
  
  /**
   * 🆕 刷新 Leads 數據（資源中心請求刷新時調用）
   */
  refreshLeadsData(): void {
    console.log('[Frontend] Refreshing leads data for resource center...');
    
    // 🆕 先用當前已加載的 leads 同步到資源中心
    const currentLeads = this.leads();
    if (currentLeads.length > 0) {
      this.syncLeadsToResourceCenter(currentLeads);
      console.log('[Frontend] Synced current leads to resource center:', currentLeads.length);
    }
    
    // 如果還有更多數據未加載，觸發加載
    if (this.leadsHasMore() && !this.leadsLoading()) {
      this.loadRemainingLeads();
      this.toastService.info(`正在加載更多數據... (當前 ${currentLeads.length} / ${this.leadsTotal()} 條)`, 2000);
    } else if (this.leadsLoading()) {
      this.toastService.info(`正在加載中... (當前 ${currentLeads.length} / ${this.leadsTotal()} 條)`, 2000);
    } else {
      this.toastService.success(`數據已同步 (共 ${currentLeads.length} 條)`);
    }
  }
  
  /**
   * 處理命令面板導航
   */
  handleCommandNavigation(target: string): void {
    // 處理頁面導航
    if (!target.startsWith('action:') && !target.startsWith('contact:')) {
      this.currentView.set(target as any);
      return;
    }
    
    // 處理動作命令
    if (target.startsWith('action:')) {
      const action = target.replace('action:', '');
      switch (action) {
        case 'send-message':
          // 打開發送消息對話框
          this.toastService.info('請先選擇聯繫人');
          this.currentView.set('resource-center');
          break;
        case 'extract-members':
          this.currentView.set('resource-center');
          break;
        case 'search-groups':
          this.currentView.set('resource-center');
          break;
        case 'start-monitor':
          this.startMonitoring();
          break;
        case 'refresh':
          this.ipcService.send('get-initial-state');
          this.toastService.success('數據已刷新');
          break;
        case 'open-docs':
          window.open('https://docs.tg-matrix.com', '_blank');
          break;
        case 'show-shortcuts':
          this.toastService.info('⌘K 打開命令面板\n⌘R 刷新數據\n⌘N 添加帳號');
          break;
        case 'open-feedback':
          this.toastService.info('請發送郵件至 support@tg-matrix.com');
          break;
      }
      return;
    }
    
    // 處理聯繫人導航
    if (target.startsWith('contact:')) {
      const contactId = target.replace('contact:', '');
      // TODO: 打開聯繫人詳情
      this.toastService.info(`正在查看聯繫人 ${contactId}`);
    }
  }
  
  /**
   * 處理批量發送消息事件
   */
  handleMemberBatchSendMessage(members: ExtractedMember[]): void {
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    // 過濾出有用戶名的成員
    const validMembers = members.filter(m => m.username);
    if (validMembers.length === 0) {
      this.toastService.warning('所選成員都沒有用戶名，無法發送消息');
      return;
    }
    
    if (validMembers.length < members.length) {
      this.toastService.warning(`${members.length - validMembers.length} 個成員沒有用戶名，將被跳過`);
    }
    
    // 打開批量發送對話框
    this.batchMessageTargets = validMembers.map(m => ({
      userId: m.user_id,
      username: m.username,
      firstName: m.first_name,
      lastName: m.last_name,
      displayName: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username
    }));
    this.showBatchMessageDialog.set(true);
    this.toastService.info(`📨 準備向 ${validMembers.length} 個成員發送消息`);
  }
  
  /**
   * 處理導航請求
   */
  handleNavigate(viewName: string): void {
    console.log('[Frontend] Navigate to:', viewName);
    this.currentView.set(viewName as View);
  }
  
  /**
   * 處理 AI 策略啟動
   */
  handleAIStrategyStart(strategy: AIStrategyResult): void {
    console.log('[Frontend] AI Strategy started:', strategy);
    
    // 發送策略到後端執行
    this.ipcService.send('execute-ai-strategy', { strategy });
    
    // 切換到自動化中心查看執行狀態
    this.currentView.set('automation');
    this.toastService.success(`🚀 AI 策略已啟動: ${strategy.industry}`);
  }
  
  /**
   * 處理 AI 營銷助手交給 AI 團隊的事件
   * 將策略傳遞給 AI 團隊銷售組件
   */
  handleAIStrategyHandover(strategy: AIStrategyResult): void {
    console.log('[Frontend] Handover strategy to AI Team:', strategy);
    
    // 保存策略到 signal，供 AI 團隊銷售組件使用
    this.aiTeamIncomingStrategy.set(strategy);
    
    // 切換到 AI 團隊銷售頁面
    this.currentView.set('ai-team');
    this.toastService.success(`🤖 已將策略交給 AI 團隊: ${strategy.industry}`);
  }
  
  /**
   * 將 ExtractedMember 轉換為 CapturedLead 格式
   */
  private convertMemberToLead(member: ExtractedMember): CapturedLead {
    return {
      id: parseInt(member.user_id) || Date.now(),
      userId: member.user_id,
      username: member.username,
      firstName: member.first_name,
      lastName: member.last_name,
      sourceGroup: member.source_chat_title,
      triggeredKeyword: '',
      timestamp: new Date(member.extracted_at || new Date()),
      status: member.contacted ? 'Contacted' : 'New',
      onlineStatus: this.mapOnlineStatus(member.online_status),
      interactionHistory: [],
      doNotContact: false,
      intentScore: this.mapValueLevelToScore(member.value_level),
      intentLevel: this.mapValueLevelToIntent(member.value_level),
      sourceType: 'group_extract'
    };
  }
  
  /**
   * 將成員在線狀態映射到 Lead 在線狀態
   */
  private mapOnlineStatus(status: string): OnlineStatus {
    switch (status) {
      case 'online': return 'Online';
      case 'recently': return 'Recently';
      default: return 'Offline';
    }
  }
  
  /**
   * 將價值等級映射到意圖分數
   */
  private mapValueLevelToScore(level: string): number {
    switch (level) {
      case 'S': return 90;
      case 'A': return 75;
      case 'B': return 55;
      case 'C': return 35;
      case 'D': return 15;
      default: return 30;
    }
  }
  
  /**
   * 將價值等級映射到意圖等級
   */
  private mapValueLevelToIntent(level: string): string {
    switch (level) {
      case 'S': return 'HOT';
      case 'A': return 'WARM';
      case 'B': return 'NEUTRAL';
      case 'C': return 'COLD';
      case 'D': return 'NONE';
      default: return 'NEUTRAL';
    }
  }
  
    // Dummy log method for UI feedback until backend sends log event
    log(message: string, type: 'info' | 'success' | 'warning' | 'error') {
        const newLog: LogEntry = { id: Date.now(), timestamp: new Date(), message, type };
        this.logs.update(logs => [newLog, ...logs].slice(0, 100));
    }
}

export const member_extract_methods_descriptors = Object.getOwnPropertyDescriptors(MemberExtractMethodsMixin.prototype);
