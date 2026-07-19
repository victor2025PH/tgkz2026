// @ts-nocheck
/**
 * Phase 9-1b: RAG, Memory, Resource Discovery, Search, Join, Keywords
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 *
 * 🔧 孤兒方法清理（Stage 4）：本檔案原有 90 個方法，經逐一核實呼叫關係（模板綁定、
 * 其他 .ts 文件呼叫、IPC 監聽器回呼）後確認，70 個方法已無任何呼叫者，屬於過往重構
 * 留下的孤兒代碼：
 *   - RAG / 向量記憶：對應的新版 RagService / VectorMemoryService 已完全獨立實作，
 *     舊版觸發方法均無讀取者（僅 refreshRagStats 仍被 app.component.ts 直接呼叫）。
 *   - 資源卡片渲染（openTelegramLink / copyUsername / getResourceTypeIcon 等）：
 *     搜索結果 UI 已遷移到獨立的 search-discovery.component.ts（自帶
 *     copyLink/copyId/joinResource 等同功能方法），discoveredResources signal
 *     已不再被 app.component.html 讀取。
 *   - 加入並監控對話框、搜索渠道管理、批量加入：對應 UI 入口已從模板移除，
 *     search-discovery.component.ts 改用更簡化的 'join-resource' 命令
 *     （僅加入不自動監控），舊版完整流程已無入口可觸發。
 * 僅保留仍有真實呼叫者的 20 個方法（含 4 個私有輔助方法）。
 */

class ResourceMethodsMixin {
  // 刷新 RAG 統計（仍由 app.component.ts 的視圖切換邏輯呼叫）
  refreshRagStats() {
    this.ipcService.send('get-rag-stats', {});
  }

  // ==================== Resource Discovery Methods（仍在使用） ====================

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

  // 加載資源列表
  loadResources() {
    this.ipcService.send('get-resources', {
      status: this.resourceFilterStatus() || undefined,
      type: this.resourceFilterType() || undefined,
      limit: 100,
      offset: 0
    });
  }

  // 刷新資源統計
  refreshResourceStats() {
    this.ipcService.send('get-resource-stats', {});
  }

  // ==================== 搜索渠道管理（僅保留仍在使用的讀取方法） ====================

  // 加載搜索渠道列表
  loadSearchChannels() {
    this.ipcService.send('get-search-channels', {});
  }

  // ==================== 加入並監控（僅保留仍由 IPC 回呼觸發的方法） ====================

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

  // 關閉批量加入對話框
  closeBatchJoinMonitorDialog() {
    this.showBatchJoinMonitorDialog.set(false);
    this.batchJoinResources.set([]);
  }

}

export const resource_methods_descriptors = Object.getOwnPropertyDescriptors(ResourceMethodsMixin.prototype);
