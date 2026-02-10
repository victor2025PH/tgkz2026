// @ts-nocheck
/**
 * Phase 9-1b: RAG, Memory, Resource Discovery, Search, Join, Keywords
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 */

class ResourceMethodsMixin {
  // ==================== Telegram RAG System Methods ====================
  
  // 初始化 RAG 系統
  initRagSystem() {
    this.isInitializingRag.set(true);
    this.ipcService.send('init-rag-system', {});
  }
  
  // 觸發 RAG 學習
  triggerRagLearning() {
    this.isRagLearning.set(true);
    this.ipcService.send('trigger-rag-learning', {});
  }
  
  // 重新索引高價值對話
  reindexHighValueConversations() {
    this.isReindexing.set(true);
    this.ipcService.send('reindex-conversations', {
      highValueOnly: true,
      days: 30
    });
  }
  
  // 清理 RAG 知識庫
  cleanupRagKnowledge() {
    this.isCleaningRag.set(true);
    this.ipcService.send('cleanup-rag-knowledge', {
      minScore: 0.2,
      daysOld: 30,
      mergeSimilar: true
    });
  }
  
  // 重新索引對話
  reindexConversations() {
    this.isReindexing.set(true);
    this.ipcService.send('reindex-conversations', {
      highValueOnly: true,
      days: 30
    });
    this.toastService.info('開始重建索引...');
  }
  
  // 刷新 RAG 統計
  refreshRagStats() {
    this.ipcService.send('get-rag-stats', {});
  }
  
  // 搜索 RAG 知識庫
  searchRagKnowledge() {
    if (!this.ragSearchQuery.trim()) return;
    this.isSearchingRag.set(true);
    this.ipcService.send('search-rag', {
      query: this.ragSearchQuery,
      limit: 10
    });
  }
  
  // 發送 RAG 反饋
  sendRagFeedback(knowledgeId: number, isPositive: boolean) {
    this.ipcService.send('rag-feedback', {
      knowledgeId,
      isPositive
    });
    this.toastService.info(isPositive ? '👍 感謝反饋！' : '👎 已記錄反饋');
  }
  
  // 添加手動知識
  addRagKnowledge() {
    if (!this.newRagKnowledge.answer.trim()) {
      this.toastService.error('請填寫回答內容');
      return;
    }
    
    this.ipcService.send('add-rag-knowledge', {
      type: this.newRagKnowledge.type,
      question: this.newRagKnowledge.question,
      answer: this.newRagKnowledge.answer,
      context: this.newRagKnowledge.context
    });
    
    // 重置表單
    this.newRagKnowledge = {type: 'qa', question: '', answer: '', context: ''};
    this.showAddRagKnowledgeDialog.set(false);
  }
  
  // ==================== Vector Memory Methods ====================
  
  // 搜索向量記憶
  searchVectorMemory() {
    if (!this.vectorMemorySearchQuery.trim()) return;
    this.isSearchingMemory.set(true);
    this.ipcService.send('search-vector-memories', {
      userId: this.selectedMemoryUserId() || '',
      query: this.vectorMemorySearchQuery,
      limit: 10
    });
  }
  
  // 添加向量記憶
  addVectorMemory() {
    if (!this.newMemory.content.trim()) {
      this.toastService.error('請填寫記憶內容');
      return;
    }
    
    this.isAddingMemory.set(true);
    this.ipcService.send('add-vector-memory', {
      userId: this.newMemory.userId || 'manual',
      content: this.newMemory.content,
      type: this.newMemory.type,
      importance: this.newMemory.importance
    });
  }
  
  // 獲取記憶統計
  refreshMemoryStats() {
    this.ipcService.send('get-memory-stats', { userId: '' });
  }
  
  // 刪除向量記憶
  deleteVectorMemory(memoryId: number) {
    this.ipcService.send('delete-vector-memory', { memoryId });
  }
  
  // 獲取用戶列表
  loadMemoryUserList() {
    this.ipcService.send('get-memory-user-list', {});
  }
  
  // 清理舊記憶
  cleanupOldMemories() {
    this.ipcService.send('cleanup-old-memories', { daysOld: 90 });
  }
  
  // 合併相似記憶
  mergeSimilarMemories() {
    const userId = this.selectedMemoryUserId();
    if (!userId) {
      this.toastService.error('請先選擇用戶');
      return;
    }
    this.ipcService.send('merge-similar-memories', { userId, threshold: 0.85 });
  }
  
  // ==================== Resource Discovery Methods ====================
  
  // 獲取資源發現可用的帳號列表（優先探索號，其次監控號，最後任意在線帳號）
  getResourceDiscoveryAccounts(): TelegramAccount[] {
    const onlineAccounts = this.accounts().filter(a => a.status === 'Online');
    // 優先級排序：Explorer > Listener > Sender > 其他
    return onlineAccounts.sort((a, b) => {
      const priority: Record<string, number> = {
        'Explorer': 1,
        'Listener': 2,
        'Sender': 3,
        'AI': 4,
        'Backup': 5,
        'Unassigned': 6
      };
      return (priority[a.role] || 99) - (priority[b.role] || 99);
    });
  }
  
  // 獲取當前資源發現使用的帳號
  getSelectedResourceAccount(): TelegramAccount | null {
    const accountId = this.resourceAccountId();
    if (accountId) {
      return this.accounts().find(a => a.id === accountId) || null;
    }
    // 自動選擇優先級最高的在線帳號
    const accounts = this.getResourceDiscoveryAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }
  
  // 選擇資源發現帳號
  selectResourceAccount(accountId: number): void {
    this.resourceAccountId.set(accountId);
    const account = this.accounts().find(a => a.id === accountId);
    if (account) {
      this.toastService.success(`資源發現將使用: ${account.phone}`);
    }
    this.showResourceAccountSelector.set(false);
  }

  // 獲取角色名稱
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      'Explorer': '🔍 探索號',
      'Listener': '👁️ 監控號',
      'Sender': '📤 發送號',
      'AI': '🤖 AI號',
      'Backup': '⚡ 備用號',
      'Unassigned': '⭕ 未分配'
    };
    return roleNames[role] || '⭕ 未分配';
  }

  // 初始化資源發現系統
  initResourceDiscovery() {
    // 確保有選中的帳號
    const account = this.getSelectedResourceAccount();
    if (!account) {
      this.toastService.error('沒有可用的在線帳號，請先登入帳號');
      return;
    }
    
    this.toastService.info(`正在使用 ${account.phone} 初始化資源發現系統...`);
    this.ipcService.send('init-resource-discovery', { 
      accountId: account.id,
      phone: account.phone
    });
  }
  
  // 自動初始化（進入頁面時調用）
  autoInitResourceDiscovery() {
    if (!this.resourceDiscoveryInitialized()) {
      this.initResourceDiscovery();
    }
    this.refreshResourceStats();
    this.loadDiscoveryKeywords();
  }
  
  private searchTimeout: any = null;
  
  // 生成搜索會話 ID
  private generateSearchSessionId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  // 🆕 生成搜索緩存鍵
  private generateSearchCacheKey(query: string, sources: string[]): string {
    const normalizedQuery = query.toLowerCase().trim();
    const sortedSources = [...sources].sort().join(',');
    return `${normalizedQuery}|${sortedSources}`;
  }
  
  // 🆕 獲取緩存的搜索結果
  private getSearchCache(cacheKey: string): any[] | null {
    const cached = this.searchResultsCache.get(cacheKey);
    if (!cached) return null;
    
    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.searchResultsCache.delete(cacheKey);
      return null;
    }
    
    return cached.results;
  }
  
  // 🆕 設置搜索結果緩存
  private setSearchCache(cacheKey: string, results: any[]): void {
    // 清理過期緩存（最多保留 20 個）
    if (this.searchResultsCache.size > 20) {
      const entries = Array.from(this.searchResultsCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - 20);
      toDelete.forEach(([key]) => this.searchResultsCache.delete(key));
    }
    
    this.searchResultsCache.set(cacheKey, {
      results: [...results],
      timestamp: Date.now()
    });
    console.log(`[Search Cache] 已緩存搜索結果: "${cacheKey}" (${results.length} 條)`);
  }
  
  // 🆕 清除搜索緩存
  clearSearchCache(): void {
    this.searchResultsCache.clear();
    console.log('[Search Cache] 已清除所有緩存');
  }
  
  // 搜索资源（支持多渠道和多关键词）
  searchResources() {
    if (!this.resourceSearchQuery.trim()) {
      this.toastService.error(this.t('searchPlaceholder'));
      return;
    }
    
    // 检查是否选择了搜索源
    if (this.selectedSearchSources().length === 0) {
      this.toastService.error('请至少选择一个搜索渠道');
      return;
    }
    
    // 🆕 檢查是否有帳號在線（不再需要手動初始化，系統會自動初始化）
    if (this.getOnlineAccountsCount() === 0) {
      this.toastService.error('請先登錄帳號');
      return;
    }
    
    const query = this.resourceSearchQuery.trim();
    const sources = this.selectedSearchSources();
    
    // 🆕 生成緩存鍵（關鍵詞 + 排序後的渠道）
    const cacheKey = this.generateSearchCacheKey(query, sources);
    
    // 🆕 檢查緩存
    const cachedResult = this.getSearchCache(cacheKey);
    if (cachedResult) {
      console.log(`[Search Cache] 使用緩存結果: "${query}" (${cachedResult.length} 條)`);
      this.currentSearchKeyword.set(query);
      this.discoveredResources.set(cachedResult);
      this.showSearchHistory.set(false);
      
      // 更新歷史關鍵詞
      const history = this.searchHistoryKeywords();
      const newHistory = [query, ...history.filter(k => k !== query)].slice(0, 10);
      this.searchHistoryKeywords.set(newHistory);
      return;
    }
    
    // 🆕 生成新的搜索會話 ID
    const sessionId = this.generateSearchSessionId();
    this.currentSearchSessionId.set(sessionId);
    this.currentSearchKeyword.set(query);
    this.showSearchHistory.set(false);  // 切換到當前搜索模式
    
    // 🆕 更新歷史關鍵詞列表（去重，最多保留 10 個）
    const history = this.searchHistoryKeywords();
    const newHistory = [query, ...history.filter(k => k !== query)].slice(0, 10);
    this.searchHistoryKeywords.set(newHistory);
    
    // 清空之前的搜索结果（始終替換，不累加）
    this.discoveredResources.set([]);
    
    // 检查是否是多关键词搜索（用逗号或分号分隔）
    const keywords = query.split(/[,;，；]/).map(k => k.trim()).filter(k => k.length > 0);
    
    if (keywords.length > 1) {
      // 多关键词搜索
      console.log(`[Search] 正在搜索 ${keywords.length} 个关键词...`);
      this.searchMultipleKeywords(keywords);
    } else {
      // 单关键词搜索
      this.isSearchingResources.set(true);
      // 🆕 清除之前的錯誤狀態
      this.searchError.set({ hasError: false, message: '', details: '', suggestions: [] });
      // 🔧 移除搜索中提示，改用 UI 狀態指示
      console.log(`[Search] 正在搜索 "${query}"...`);
      
      // 设置前端超时保护（70秒）
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        if (this.isSearchingResources()) {
          this.isSearchingResources.set(false);
          this.toastService.error('搜索超时，请检查网络或稍后再试');
        }
      }, 70000);
      
      // 根据选择的渠道调用不同的搜索API
      this.executeMultiSourceSearch(query, sources);
    }
  }
  
  // 执行多渠道搜索
  private executeMultiSourceSearch(query: string, sources: string[]) {
    const phone = this.getSelectedResourceAccount()?.phone;
    const sessionId = this.currentSearchSessionId();  // 🆕 當前搜索會話 ID
    
    // Telegram 官方搜索
    if (sources.includes('telegram') || sources.includes('local')) {
      this.ipcService.send('search-resources', {
        query: query,
        phone: phone,
        sources: sources.filter(s => s !== 'jiso'), // 排除 jiso，单独处理
        limit: 50,
        searchType: this.resourceSearchType(),
        minMembers: this.resourceMinMembers(),
        replaceMode: true,  // 🆕 始終替換模式
        searchSessionId: sessionId,  // 🆕 傳遞會話 ID
        searchKeyword: query  // 🆕 傳遞搜索關鍵詞
      });
    }
    
    // 极搜 Bot 搜索
    if (sources.includes('jiso')) {
      // 🔧 移除搜索中提示，改用 UI 狀態指示
      console.log('[Search] 正在通过极搜 Bot 搜索...');
      this.ipcService.send('search-jiso', {
        keyword: query,
        phone: phone,
        limit: 50,
        searchSessionId: sessionId,  // 🆕 傳遞會話 ID
        searchKeyword: query  // 🆕 傳遞搜索關鍵詞
      });
    }
    
    // TGStat 搜索（如果选中且有API key）
    if (sources.includes('tgstat')) {
      // TGStat 目前通过 search-resources 处理
      // 后续可以单独对接 TGStat API
    }
  }
  
  // 多关键词搜索
  private searchMultipleKeywords(keywords: string[]) {
    this.isSearchingResources.set(true);
    const sources = this.selectedSearchSources();
    
    // 设置前端超时保护
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (this.isSearchingResources()) {
        this.isSearchingResources.set(false);
        this.toastService.error('搜索超时');
      }
    }, keywords.length * 10000 + 30000);
    
    // 逐个搜索
    keywords.forEach((keyword, index) => {
      setTimeout(() => {
        this.executeMultiSourceSearch(keyword, sources);
      }, index * 5000); // 每5秒搜索一个，避免频率限制
    });
  }
  
  // 打開群組鏈接
  openTelegramLink(resource: any) {
    const link = resource.username 
      ? `https://t.me/${resource.username}`
      : resource.invite_link;
    if (link) {
      this.ipcService.send('open-external-link', { url: link });
    } else {
      this.toastService.warning('此群組沒有公開鏈接');
    }
  }
  
  // 複製群組鏈接
  copyTelegramLink(resource: any) {
    const link = resource.username
      ? `https://t.me/${resource.username}`
      : resource.invite_link || '';
    if (link) {
      navigator.clipboard.writeText(link);
      this.toastService.success('鏈接已複製');
    } else {
      // 沒有公開鏈接時，複製群組名稱供用戶搜索
      navigator.clipboard.writeText(resource.title);
      this.toastService.warning('此群組無公開鏈接，已複製群組名稱，請在 Telegram 中手動搜索');
    }
  }

  // 複製用戶名
  copyUsername(username: string) {
    const text = `@${username}`;
    navigator.clipboard.writeText(text);
    this.toastService.success('已複製 ' + text);
  }

  // 獲取資源類型圖標
  getResourceTypeIcon(type: string): string {
    switch(type) {
      case 'channel': return '📢';
      case 'supergroup': return '👥';
      case 'group': return '💬';
      default: return '📌';
    }
  }
  
  // 獲取資源類型標籤
  getResourceTypeLabel(type: string): string {
    switch(type) {
      case 'channel': return '頻道';
      case 'supergroup': return '超級群組';
      case 'group': return '群組';
      default: return '未知';
    }
  }
  
  // 格式化成員數
  formatMemberCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }
  
  // 快速加入單個資源
  quickJoinResource(resourceId: number) {
    this.ipcService.send('batch-join-resources', {
      resourceIds: [resourceId]
    });
    this.toastService.info('正在嘗試加入...');
  }
  
  // 加載資源列表
  loadResources() {
    this.ipcService.send('get-resources', {
      status: this.resourceFilterStatus() || undefined,
      type: this.resourceFilterType() || undefined,
      limit: 100,
      offset: 0
    });
  }
  
  // 根據鏈接狀態篩選資源（前端過濾）
  filterResourcesByLink() {
    const filterValue = this.resourceFilterLink();
    if (!filterValue) {
      // 重新加載所有資源
      this.loadResources();
      return;
    }
    
    // 前端過濾
    const allResources = this.discoveredResources();
    const filtered = allResources.filter(r => {
      const hasLink = !!(r.username || r.invite_link);
      if (filterValue === 'has_link') {
        return hasLink;
      } else if (filterValue === 'no_link') {
        return !hasLink;
      }
      return true;
    });
    
    this.discoveredResources.set(filtered);
  }

  // 刷新資源統計
  refreshResourceStats() {
    this.ipcService.send('get-resource-stats', {});
  }

  // ==================== 搜索渠道管理 ====================

  // 打開渠道管理對話框
  openChannelManageDialog() {
    this.loadSearchChannels();
    this.showChannelManageDialog.set(true);
  }

  // 關閉渠道管理對話框
  closeChannelManageDialog() {
    this.showChannelManageDialog.set(false);
  }

  // 加載搜索渠道列表
  loadSearchChannels() {
    this.ipcService.send('get-search-channels', {});
  }

  // 打開添加渠道對話框
  openAddChannelDialog() {
    this.newChannelUsername = '';
    this.newChannelDisplayName = '';
    this.newChannelQueryFormat = '{keyword}';
    this.newChannelPriority = 'backup';
    this.newChannelNotes = '';
    this.showAddChannelDialog.set(true);
  }

  // 關閉添加渠道對話框
  closeAddChannelDialog() {
    this.showAddChannelDialog.set(false);
  }

  // 添加自定義渠道
  addSearchChannel() {
    if (!this.newChannelUsername.trim()) {
      this.toastService.error('請輸入 Bot 用戶名');
      return;
    }

    this.ipcService.send('add-search-channel', {
      botUsername: this.newChannelUsername.trim(),
      displayName: this.newChannelDisplayName.trim() || this.newChannelUsername.trim(),
      queryFormat: this.newChannelQueryFormat,
      priority: this.newChannelPriority,
      notes: this.newChannelNotes
    });
  }

  // 刪除自定義渠道
  deleteSearchChannel(channelId: number) {
    if (channelId < 0) {
      this.toastService.warning('無法刪除系統渠道');
      return;
    }
    if (confirm('確定要刪除這個搜索渠道嗎？')) {
      this.ipcService.send('delete-search-channel', { channelId });
    }
  }

  // 測試渠道
  testSearchChannel(botUsername: string) {
    this.isTestingChannel.set(true);
    this.toastService.info(`正在測試 @${botUsername}...`);
    this.ipcService.send('test-search-channel', { botUsername });
  }

  // 切換渠道啟用狀態
  toggleChannelEnabled(channelId: number, currentEnabled: boolean) {
    if (channelId < 0) {
      this.toastService.warning('無法修改系統渠道');
      return;
    }
    this.ipcService.send('update-search-channel', {
      channelId,
      enabled: !currentEnabled
    });
  }

  // 獲取渠道狀態顏色
  getChannelStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'offline': return 'text-red-400';
      case 'captcha': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }

  // 獲取渠道狀態圖標
  getChannelStatusIcon(status: string): string {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'captcha': return '🟡';
      default: return '⚪';
    }
  }

  // ==================== 加入並監控 ====================

  // 打開加入並監控對話框
  openJoinAndMonitorDialog(resource: any) {
    this.joinMonitorResource.set(resource);
    this.joinMonitorKeywords.set([]); // 清空舊版散列關鍵詞
    this.joinMonitorNewKeyword = '';
    this.joinMonitorAutoEnable.set(true);
    
    // 加載帳號配額信息
    this.loadAccountQuotas();
    
    // 如果資源已加入，預選已加入的帳號
    if (resource.joined_by_phone) {
      this.joinMonitorSelectedPhone.set(resource.joined_by_phone);
    } else {
      this.joinMonitorSelectedPhone.set('');
    }
    
    // 🔑 加載已綁定的關鍵詞集 IDs (從 monitoredGroups 中查找)
    const monitoredGroup = this.monitoredGroups().find(g => 
      g.url === resource.username || 
      g.url === `@${resource.username}` ||
      g.url === resource.telegram_id ||
      g.id === resource.id
    );
    if (monitoredGroup && monitoredGroup.keywordSetIds) {
      this.joinMonitorSelectedKeywordSetIds.set([...monitoredGroup.keywordSetIds]);
    } else {
      this.joinMonitorSelectedKeywordSetIds.set([]);
    }
    
    // 重置快速創建詞集對話框
    this.showQuickCreateKeywordSet.set(false);
    this.quickCreateKeywordSetName = '';
    this.quickCreateKeywordSetKeywords.set([]);
    this.quickCreateKeywordSetNewKeyword = '';
    
    this.showJoinMonitorDialog.set(true);
  }

  // 關閉加入並監控對話框
  closeJoinMonitorDialog() {
    this.showJoinMonitorDialog.set(false);
    this.joinMonitorResource.set(null);
    this.showChangeMonitorAccount.set(false);
  }

  // 獲取可用於監控的帳號列表
  getAvailableAccountsForMonitor(): any[] {
    return this.accounts().filter(acc => acc.status === 'Online');
  }

  // 選擇監控帳號
  selectMonitorAccount(phone: string) {
    this.joinMonitorSelectedPhone.set(phone);
    this.showChangeMonitorAccount.set(false);
  }

  // 停止監控群組（但不退出）
  stopMonitoringGroup(resource: any) {
    if (!resource) return;
    
    // 🆕 使用多種標識符
    const groupId = resource.telegram_id || resource.id || resource.username;
    if (!groupId) {
      this.toastService.error('無法識別群組');
      return;
    }
    
    // 發送停止監控請求（包含更多信息以便後端識別）
    this.ipcService.send('remove-group', { 
      groupId,
      id: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      link: resource.link || resource.invite_link
    });
    
    // 樂觀更新本地狀態
    this.updateResourceStatusLocally(resource, 'joined');
    this.closeJoinMonitorDialog();
    this.closeResourceMenu();
    this.toastService.info('正在停止監控...');
    
    // 刷新數據（延遲執行以確保後端完成）
    setTimeout(() => {
      this.loadResources();
      this.refreshResourceStats();
      this.ipcService.send('get-monitored-groups');
    }, 500);
  }

  // 確認退出群組
  confirmLeaveGroup(resource: any) {
    if (!resource) return;
    
    const title = resource.title || resource.username || '此群組';
    if (confirm(`確定要退出「${title}」嗎？\n\n此操作將：\n• 從 Telegram 退出群組\n• 停止所有監控\n• 刪除相關數據`)) {
      this.leaveGroup(resource);
    }
  }

  // 退出群組
  leaveGroup(resource: any) {
    if (!resource) return;
    
    const phone = resource.joined_by_phone || this.joinMonitorSelectedPhone();
    const groupId = resource.telegram_id || resource.username;
    
    if (!phone) {
      this.toastService.error('無法確定使用的帳號');
      return;
    }
    
    // 發送退出群組請求
    this.ipcService.send('leave-group', { 
      phone,
      groupId,
      resourceId: resource.id
    });
    
    // 更新本地狀態
    this.updateResourceStatusLocally(resource, 'discovered');
    this.closeJoinMonitorDialog();
    this.toastService.info('正在退出群組...');
    
    // 刷新數據
    setTimeout(() => {
      this.loadResources();
      this.refreshResourceStats();
      this.ipcService.send('get-monitored-groups');
    }, 1000);
  }

  // 在 Telegram 中打開資源
  openInTelegram(resource: any) {
    const link = resource.username 
      ? `https://t.me/${resource.username}`
      : resource.invite_link || resource.link;
    
    if (link) {
      window.open(link, '_blank');
    } else {
      this.toastService.warning('沒有可用的鏈接');
    }
  }

  // 刪除資源記錄
  deleteResource(resource: any) {
    if (!resource?.id) return;
    
    if (confirm(`確定要刪除「${resource.title || '此資源'}」的記錄嗎？`)) {
      this.ipcService.send('delete-resource', { resourceId: resource.id });
      
      // 從本地列表移除
      const resources = this.discoveredResources();
      this.discoveredResources.set(resources.filter(r => r.id !== resource.id));
      
      this.toastService.success('已刪除資源記錄');
      this.refreshResourceStats();
    }
  }

  // 🆕 即時更新本地資源狀態（樂觀更新）
  updateResourceStatusLocally(resource: any, newStatus: string, phone?: string, memberCount?: number) {
    if (!resource) return;
    
    const resources = this.discoveredResources();
    const identifier = resource.telegram_id || resource.username || resource.title;
    
    const updated = resources.map(r => {
      const rIdentifier = r.telegram_id || r.username || r.title;
      if (rIdentifier === identifier) {
        // 使用類型斷言來添加額外屬性
        const updatedResource: any = { 
          ...r, 
          status: newStatus,
          joined_at: new Date().toISOString()
        };
        if (phone) {
          updatedResource.joined_by_phone = phone;
        }
        // 🆕 更新成員數
        if (memberCount && memberCount > 0) {
          updatedResource.member_count = memberCount;
        }
        return updatedResource;
      }
      return r;
    });
    
    this.discoveredResources.set(updated);
    console.log(`[Frontend] Updated resource status: ${identifier} -> ${newStatus}`);
  }

  // 🆕 加入成功後的「下一步」選項 Signal

  // 🆕 成功動畫覆蓋層

  // 🆕 顯示加入成功後的「下一步」選項
  showPostJoinOptions(resource: any, phone: string, keywordSetCount: number) {
    // 關閉加入對話框
    this.showJoinMonitorDialog.set(false);
    
    // 🆕 先顯示成功動畫
    this.showSuccessAnimation({
      icon: '🚀',
      title: '加入成功！',
      subtitle: resource?.title || '群組已添加到監控',
      duration: 1200
    });
    
    // 動畫結束後顯示「下一步」對話框
    setTimeout(() => {
      // 保存資源信息以供「下一步」操作使用
      this.postJoinResource.set(resource);
      this.postJoinPhone.set(phone);
      
      // 顯示「下一步」選項對話框
      this.showPostJoinDialog.set(true);
    }, 1200);
  }

  // 🆕 關閉「下一步」對話框
  closePostJoinDialog() {
    this.showPostJoinDialog.set(false);
    this.postJoinResource.set(null);
    this.postJoinPhone.set('');
  }

  // 🆕 顯示成功動畫覆蓋層
  showSuccessAnimation(config: SuccessOverlayConfig) {
    this.successOverlayConfig.set(config);
    this.showSuccessOverlay.set(true);
    
    // 自動隱藏
    const duration = config.duration || 1500;
    setTimeout(() => {
      this.hideSuccessAnimation();
    }, duration);
  }

  // 🆕 隱藏成功動畫
  hideSuccessAnimation() {
    this.showSuccessOverlay.set(false);
    this.successOverlayConfig.set(null);
  }

  // 🆕 執行「下一步」操作：提取成員
  postJoinExtractMembers() {
    const resource = this.postJoinResource();
    if (resource) {
      this.closePostJoinDialog();
      this.openMemberListDialog(resource);
    }
  }

  // 🆕 執行「下一步」操作：發送消息
  postJoinSendMessage() {
    const resource = this.postJoinResource();
    if (resource) {
      this.closePostJoinDialog();
      this.openSingleMessageDialog(resource);
    }
  }

  // 🆕 執行「下一步」操作：繼續加入其他群組
  postJoinContinue() {
    this.closePostJoinDialog();
    this.toastService.info('繼續瀏覽其他群組', 2000);
  }

  // 加載帳號配額信息
  loadAccountQuotas() {
    const accounts = this.accounts();
    const quotasRaw = accounts
      .filter(acc => acc.status === 'Online')
      .map(acc => {
        // 計算已加入群組數（從 dailySendCount 估算）
        const joinedGroups = Math.floor(acc.dailySendCount / 10) || 0;
        const dailyLimit = 20; // 每天加群上限
        const dailyUsed = Math.floor(acc.dailySendCount / 5) || 0;
        
        // 🆕 計算綜合推薦分數（0-100）
        // 權重：健康分 50% + 配額剩餘率 50%
        const healthScore = acc.healthScore || 0;
        const quotaRemaining = dailyLimit > 0 ? ((dailyLimit - dailyUsed) / dailyLimit) * 100 : 0;
        const recommendScore = healthScore * 0.5 + quotaRemaining * 0.5;
        
        return {
          phone: acc.phone,
          nickname: acc.group || acc.phone,
          joinedGroups,
          dailyLimit,
          dailyUsed: Math.min(dailyUsed, dailyLimit),
          isRecommended: false, // 稍後設置
          recommendScore,
          healthScore
        };
      })
      .sort((a, b) => b.recommendScore - a.recommendScore); // 按推薦分數排序
    
    // 🆕 智能推薦：只推薦最佳帳號（最多 2 個，且必須滿足基本條件）
    const quotas = quotasRaw.map((q, index) => {
      // 只有前 2 名且滿足條件才顯示推薦
      const meetsBasicCriteria = q.healthScore >= 70 && q.dailyUsed < q.dailyLimit * 0.8;
      const isTopAccount = index < 2 && meetsBasicCriteria;
      return {
        ...q,
        isRecommended: isTopAccount
      };
    });
    
    this.accountQuotas.set(quotas);
    
    // 自動選擇推薦帳號
    if (!this.joinMonitorSelectedPhone()) {
      const recommended = quotas.find(q => q.isRecommended);
      if (recommended) {
        this.joinMonitorSelectedPhone.set(recommended.phone);
      } else if (quotas.length > 0) {
        this.joinMonitorSelectedPhone.set(quotas[0].phone);
      }
    }
  }

  // ==================== 關鍵詞集選擇（新版） ====================
  
  // 切換關鍵詞集選擇
  toggleKeywordSetSelection(setId: number) {
    const current = this.joinMonitorSelectedKeywordSetIds();
    
    if (current.includes(setId)) {
      // 取消選擇
      this.joinMonitorSelectedKeywordSetIds.set(current.filter(id => id !== setId));
    } else {
      // 🆕 驗證關鍵詞集是否為空
      const keywordSet = this.keywordSets().find(s => s.id === setId);
      if (keywordSet && (!keywordSet.keywords || keywordSet.keywords.length === 0)) {
        // 空關鍵詞集警告
        this.toastService.warning(`⚠️ 「${keywordSet.name}」沒有關鍵詞，請先添加關鍵詞再使用`);
        return; // 不允許選擇空關鍵詞集
      }
      this.joinMonitorSelectedKeywordSetIds.set([...current, setId]);
    }
  }
  
  // 檢查關鍵詞集是否被選中
  isKeywordSetSelected(setId: number): boolean {
    return this.joinMonitorSelectedKeywordSetIds().includes(setId);
  }
  
  // 打開快速創建關鍵詞集對話框
  openQuickCreateKeywordSet() {
    this.showQuickCreateKeywordSet.set(true);
    this.quickCreateKeywordSetName = '';
    this.quickCreateKeywordSetKeywords.set([]);
    this.quickCreateKeywordSetNewKeyword = '';
  }
  
  // 關閉快速創建關鍵詞集對話框
  closeQuickCreateKeywordSet() {
    this.showQuickCreateKeywordSet.set(false);
  }
  
  // 快速創建詞集：添加關鍵詞
  addQuickKeyword() {
    const keyword = this.quickCreateKeywordSetNewKeyword.trim();
    if (keyword && !this.quickCreateKeywordSetKeywords().includes(keyword)) {
      this.quickCreateKeywordSetKeywords.update(kws => [...kws, keyword]);
      this.quickCreateKeywordSetNewKeyword = '';
    }
  }
  
  // 快速創建詞集：移除關鍵詞
  removeQuickKeyword(keyword: string) {
    this.quickCreateKeywordSetKeywords.update(kws => kws.filter(k => k !== keyword));
  }
  
  // 快速創建詞集：添加推薦關鍵詞
  addQuickRecommendedKeyword(keyword: string) {
    if (!this.quickCreateKeywordSetKeywords().includes(keyword)) {
      this.quickCreateKeywordSetKeywords.update(kws => [...kws, keyword]);
    }
  }
  
  // 執行快速創建關鍵詞集並綁定
  executeQuickCreateKeywordSet() {
    const name = this.quickCreateKeywordSetName.trim();
    const keywords = this.quickCreateKeywordSetKeywords();
    
    if (!name) {
      this.toastService.warning('請輸入詞集名稱');
      return;
    }
    if (keywords.length === 0) {
      this.toastService.warning('請至少添加一個關鍵詞');
      return;
    }
    
    // 發送創建請求到後端
    this.ipcService.send('add-keyword-set', { name });
    
    // 監聯創建完成事件，然後添加關鍵詞並綁定
    const handler = (data: any) => {
      if (data.success && data.setId) {
        // 添加關鍵詞
        for (const keyword of keywords) {
          this.ipcService.send('add-keyword', { setId: data.setId, keyword, isRegex: false });
        }
        // 自動選中新創建的詞集
        this.joinMonitorSelectedKeywordSetIds.update(ids => [...ids, data.setId]);
        this.toastService.success(`已創建並綁定關鍵詞集「${name}」`);
        this.closeQuickCreateKeywordSet();
        
        // 刷新關鍵詞集列表
        this.ipcService.send('get-keyword-sets');
      }
      // 移除監聽器
      this.ipcService.off('keyword-set-added', handler);
    };
    this.ipcService.on('keyword-set-added', handler);
  }
  
  // ==================== 舊版散列關鍵詞（向後兼容） ====================
  
  // 添加監控關鍵詞
  addMonitorKeyword() {
    const keyword = this.joinMonitorNewKeyword.trim();
    if (keyword && !this.joinMonitorKeywords().includes(keyword)) {
      this.joinMonitorKeywords.update(kws => [...kws, keyword]);
      this.joinMonitorNewKeyword = '';
    }
  }

  // 移除監控關鍵詞
  removeMonitorKeyword(keyword: string) {
    this.joinMonitorKeywords.update(kws => kws.filter(k => k !== keyword));
  }

  // 添加推薦關鍵詞
  addRecommendedKeyword(keyword: string) {
    if (!this.joinMonitorKeywords().includes(keyword)) {
      this.joinMonitorKeywords.update(kws => [...kws, keyword]);
    }
  }

  // 獲取推薦關鍵詞（基於群組標題）
  getRecommendedKeywords(): string[] {
    const resource = this.joinMonitorResource();
    if (!resource) return [];
    
    const title = resource.title || '';
    const recommendations: string[] = [];
    
    // 基於標題的關鍵詞推薦
    if (title.includes('二手') || title.includes('交易')) {
      recommendations.push('求購', '出售', '轉讓');
    }
    if (title.includes('招聘') || title.includes('求職')) {
      recommendations.push('招人', '求職', '兼職');
    }
    if (title.includes('華人') || title.includes('海外')) {
      recommendations.push('合作', '資源', '求助');
    }
    
    // 通用推薦
    if (recommendations.length === 0) {
      recommendations.push('求購', '合作', '諮詢');
    }
    
    return recommendations.filter(r => !this.joinMonitorKeywords().includes(r));
  }

  // 獲取關鍵詞預覽文本（用於模板顯示）
  getKeywordPreview(keywords: any[]): string {
    if (!keywords || keywords.length === 0) return '';
    const preview = keywords.slice(0, 3).map(k => k.keyword || k.text || k).join(', ');
    return keywords.length > 3 ? preview + '...' : preview;
  }

  // 執行加入並監控
  executeJoinAndMonitor() {
    const resource = this.joinMonitorResource();
    const phone = this.joinMonitorSelectedPhone();
    
    if (!resource) {
      this.toastService.error('請選擇要加入的群組');
      return;
    }
    
    // 如果是未加入的群組，需要選擇帳號
    if (resource.status !== 'joined' && resource.status !== 'monitoring' && !phone) {
      this.toastService.error('請選擇加入帳號');
      return;
    }
    
    this.isJoiningResource.set(true);
    
    // 使用新版 keywordSetIds 替代舊版 keywords
    const keywordSetIds = this.joinMonitorSelectedKeywordSetIds();
    
    // 🆕 如果 resource.id === 0（搜索結果未保存），傳遞 resourceInfo
    const payload: any = {
      resourceId: resource.id || 0,
      phone: phone,
      keywordSetIds: keywordSetIds, // 新版：關鍵詞集 IDs
      keywords: this.joinMonitorKeywords(), // 保留向後兼容
      autoEnableMonitor: this.joinMonitorAutoEnable()
    };
    
    // 🆕 如果資源 ID 為 0，傳遞資源信息供後端創建
    if (!resource.id || resource.id === 0) {
      // 🔑 獲取並驗證加入方式
      let link = resource.link || resource.invite_link || '';
      let username = resource.username || '';
      
      // 🔑 過濾無效的 username（搜索機器人）
      if (username && username.toLowerCase().endsWith('bot')) {
        console.log(`[Frontend] 過濾 bot username: ${username}`);
        username = '';
      }
      
      // 🔑 過濾消息鏈接（t.me/username/messageId）
      if (link && /t\.me\/[^/]+\/\d+/.test(link)) {
        console.log(`[Frontend] 過濾消息鏈接: ${link}`);
        link = '';
      }
      
      // 🔑 驗證是否有足夠的信息加入群組
      if (!link && !username) {
        const title = resource.title || '此群組';
        this.toastService.error(
          `無法加入「${title}」：\n` +
          '• 此搜索結果沒有提供群組的邀請鏈接\n' +
          '• 請在 Telegram 中點擊搜索機器人的結果\n' +
          '• 手動獲取群組鏈接後再試'
        );
        this.isJoiningResource.set(false);
        return;
      }
      
      // 🔑 生成有效的 telegram_id（不使用 title 或 bot username）
      let validTelegramId = '';
      if (resource.telegram_id && 
          resource.telegram_id !== resource.title &&
          !resource.telegram_id.toLowerCase().endsWith('bot')) {
        validTelegramId = resource.telegram_id;
      } else if (username) {
        validTelegramId = username;
      }
      
      payload.resourceInfo = {
        username: username,
        telegram_id: validTelegramId,
        title: resource.title || username || '未命名群組',
        description: resource.description || '',
        member_count: resource.member_count || 0,
        resource_type: resource.resource_type || 'supergroup',
        // 🔑 確保 link 正確傳遞
        link: link || (username ? `https://t.me/${username}` : '')
      };
      
      console.log('[Frontend] Sending resourceInfo:', payload.resourceInfo);
    }
    
    this.ipcService.send('join-and-monitor-with-account', payload);
    
    // 如果資源已加入（只是更新監控設置），直接同步群組配置
    if (resource.status === 'joined' || resource.status === 'monitoring') {
      // 使用 add-group 更新群組的關鍵詞集綁定
      const url = resource.username ? `@${resource.username}` : resource.telegram_id;
      this.ipcService.send('add-group', { 
        url: url, 
        keywordSetIds: keywordSetIds 
      });
    }
  }

  // 打開監控設置（已加入的群組）
  openMonitorSettings(resource: any) {
    this.openJoinAndMonitorDialog(resource);
  }

  // ==================== 批量加入並監控 ====================

  // 打開批量加入並監控對話框
  openBatchJoinMonitorDialog() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.warning('請先選擇要加入的群組');
      return;
    }

    const resources = this.discoveredResources().filter(r => selectedIds.includes(r.id));
    this.batchJoinResources.set(resources);
    this.joinMonitorSelectedPhones.set([]);
    this.joinMonitorKeywords.set([]);
    this.joinMonitorSelectedKeywordSetIds.set([]); // 重置關鍵詞集選擇
    this.joinMonitorBatchMode.set(true);
    this.joinMonitorBatchInterval.set(45);
    this.loadAccountQuotas();
    this.showBatchJoinMonitorDialog.set(true);
  }

  // 計算批量加入群組的總成員數
  getBatchJoinTotalMembers(): number {
    return this.batchJoinResources().reduce((sum, r) => sum + (r.member_count || 0), 0);
  }

  // 關閉批量加入對話框
  closeBatchJoinMonitorDialog() {
    this.showBatchJoinMonitorDialog.set(false);
    this.batchJoinResources.set([]);
  }

  // 切換帳號選擇（多選）
  toggleAccountSelection(phone: string) {
    const current = this.joinMonitorSelectedPhones();
    if (current.includes(phone)) {
      this.joinMonitorSelectedPhones.set(current.filter(p => p !== phone));
    } else {
      this.joinMonitorSelectedPhones.set([...current, phone]);
    }
  }

  // 全選帳號
  selectAllAccounts() {
    const allPhones = this.accountQuotas().map(a => a.phone);
    this.joinMonitorSelectedPhones.set(allPhones);
  }

  // 執行批量加入並監控
  executeBatchJoinMonitor() {
    const resources = this.batchJoinResources();
    const phones = this.joinMonitorSelectedPhones();
    
    if (resources.length === 0) {
      this.toastService.error('沒有選擇群組');
      return;
    }
    
    if (phones.length === 0) {
      this.toastService.error('請選擇至少一個帳號');
      return;
    }
    
    this.isJoiningResource.set(true);
    this.batchJoinProgress.set({ current: 0, total: resources.length, status: '準備中...' });
    
    // 使用新版 keywordSetIds
    const keywordSetIds = this.joinMonitorSelectedKeywordSetIds();
    
    // 發送批量加入請求
    this.ipcService.send('batch-join-and-monitor', {
      resourceIds: resources.map(r => r.id),
      phones: phones,
      keywordSetIds: keywordSetIds, // 新版：關鍵詞集 IDs
      keywords: this.joinMonitorKeywords(), // 保留向後兼容
      autoEnableMonitor: this.joinMonitorAutoEnable(),
      batchMode: this.joinMonitorBatchMode(),
      batchInterval: this.joinMonitorBatchInterval()
    });
    
    this.toastService.info(`🚀 開始批量加入 ${resources.length} 個群組，使用 ${phones.length} 個帳號`);
  }

}

export const resource_methods_descriptors = Object.getOwnPropertyDescriptors(ResourceMethodsMixin.prototype);
