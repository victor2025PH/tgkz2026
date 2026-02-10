/**
 * Phase 9-1a: Resource discovery, search, join, member extraction
 * Extracted from AppComponent.setupIpcListeners()
 */
import { LogEntry, TelegramAccount, CapturedLead, KeywordConfig, QueueStatus, QueueMessage, Alert } from '../models';
import { TimeSeriesData } from '../analytics-charts.component';

export function setupResourceIpcHandlers(this: any): void {
    // Resource Discovery Events
    this.ipcService.on('resource-discovery-initialized', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.resourceDiscoveryInitialized.set(true);
        this.toastService.success('✅ 資源發現系統已初始化');
        this.refreshResourceStats();
        this.loadDiscoveryKeywords();
        
        // 如果有待搜索的關鍵詞，自動執行搜索
        if (this.pendingSearchQuery) {
          const query = this.pendingSearchQuery;
          this.pendingSearchQuery = '';
          this.toastService.info(`正在搜索 "${query}"...`);
          setTimeout(() => this.searchResources(), 500);
        }
      } else {
        this.toastService.error(`初始化失敗: ${data.error}`);
      }
    });
    
    // 🆕 C方案：搜索結果直接顯示（不存數據庫）
    this.ipcService.on('search-results-direct', (data: { success: boolean, query?: string, results?: any[], error?: string }) => {
      // 清除超时计时器
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      this.isSearchingResources.set(false);
      if (data.success && data.results) {
        // 直接使用搜索結果，不從數據庫加載
        const results = data.results;
        
        // 按相關度排序（標題包含關鍵詞優先）
        const query = data.query?.toLowerCase() || '';
        const sortedResults = results.sort((a: any, b: any) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          const aContains = aTitle.includes(query) ? 1 : 0;
          const bContains = bTitle.includes(query) ? 1 : 0;
          if (aContains !== bContains) return bContains - aContains;
          return (b.overall_score || 0) - (a.overall_score || 0);
        });
        
        // 去重（基於 telegram_id）
        const seen = new Set<string>();
        const uniqueResults = sortedResults.filter((r: any) => {
          if (seen.has(r.telegram_id)) return false;
          seen.add(r.telegram_id);
          return true;
        });
        
        this.discoveredResources.set(uniqueResults);
        this.currentSearchKeyword.set(query);
        
        // 🆕 更新搜索緩存
        if (uniqueResults.length > 0) {
          const cacheKey = this.generateSearchCacheKey(data.query || '', this.selectedSearchSources());
          this.setSearchCache(cacheKey, uniqueResults);
        }
        
        // 🔧 移除搜索完成 Toast，結果直接顯示在 UI 中
        if (uniqueResults.length === 0) {
          console.log(`[Search] 未找到與「${data.query}」相關的結果`);
        } else {
          console.log(`[Search] 找到 ${uniqueResults.length} 個與「${data.query}」相關的結果`);
        }
      } else if (data.error) {
        this.toastService.error(`搜索失敗: ${data.error}`);
      }
    });
    
    // 舊版兼容（保存到數據庫的模式）
    this.ipcService.on('search-resources-complete', (data: { success: boolean, query?: string, found?: number, new?: number, updated?: number, error?: string }) => {
      // 清除超时计时器
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      this.isSearchingResources.set(false);
      if (data.success) {
        // 🔧 移除搜索完成 Toast，結果直接顯示在 UI 中
        if (data.found === 0) {
          console.log(`[Search] 搜索完成：没有找到相关结果`);
        } else {
          console.log(`[Search] 搜索完成：找到 ${data.found} 个`);
        }
        // 🆕 C方案：不再調用 loadResources()，搜索結果已經直接設置
        // this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`搜索失败: ${data.error}`);
      }
    });

    // 极搜搜索完成事件
    this.ipcService.on('search-jiso-complete', (data: { success: boolean, results?: any[], total?: number, cached?: boolean, error?: string, bot?: string }) => {
      if (data.success && data.results) {
        const resultCount = data.results.length;
        // 🔧 移除极搜完成 Toast，結果直接顯示在 UI 中
        if (resultCount === 0) {
          console.log('[Search] 极搜：没有找到相关结果');
        } else {
          const cacheTag = data.cached ? '（缓存）' : '';
          const botTag = data.bot ? `（來自 @${data.bot}）` : '';
          console.log(`[Search] 极搜完成${cacheTag}：找到 ${resultCount} 个群组${botTag}`);
          
          // 🆕 合併极搜結果到 discoveredResources
          const existingResources = this.discoveredResources();
          const existingIds = new Set(existingResources.map(r => r.telegram_id || r.username));
          
          const newResults = data.results
            .filter((r: any) => !existingIds.has(r.telegram_id) && !existingIds.has(r.username))
            .map((r: any) => {
              // 🔑 驗證 username 是否有效（不是搜索機器人）
              let validUsername = r.username || '';
              if (validUsername && validUsername.toLowerCase().endsWith('bot')) {
                validUsername = '';  // 清空 bot username
              }
              
              // 🔑 驗證 link 是否為有效的群組鏈接（不是消息鏈接）
              let validLink = r.link || '';
              if (validLink && /t\.me\/[^/]+\/\d+/.test(validLink)) {
                // 這是消息鏈接（t.me/username/messageId），不是群組鏈接
                validLink = '';
              }
              
              // 🔧 修復：telegram_id 只存儲真正的數字 ID，不用 username/title 作為回退
              const numericId = r.telegram_id && /^-?\d+$/.test(String(r.telegram_id)) 
                ? String(r.telegram_id) 
                : '';
              
              return {
                id: 0,  // 未保存到數據庫
                telegram_id: numericId,  // 只保存真正的數字 ID
                username: validUsername,
                title: r.title || '',
                description: r.description || '',
                member_count: r.member_count || 0,
                // 🔧 修復：使用後端傳來的類型，而不是硬編碼
                resource_type: r.chat_type || r.resource_type || 'group',
                activity_score: 0.5,
                relevance_score: 0.6,
                overall_score: 0.6,  // 極搜結果默認評分
                status: 'discovered',
                discovery_source: 'jiso',
                discovery_keyword: this.currentSearchKeyword(),
                created_at: new Date().toISOString(),
                invite_link: validLink,
                // 🆕 只有有效的 username 才生成鏈接
                link: validLink || (validUsername ? `https://t.me/${validUsername}` : ''),
                is_saved: false,
                // 🆕 標記是否可直接加入
                can_join: !!(validLink || validUsername)
              };
            });
          
          if (newResults.length > 0) {
            const mergedResults = [...existingResources, ...newResults];
            this.discoveredResources.set(mergedResults);
            // 🔧 移除合并提示，結果數量直接顯示在 UI 中
            console.log(`[Search] 已合併 ${newResults.length} 個新結果`);
            
            // 🆕 更新搜索緩存（含合併結果）
            const currentKeyword = this.currentSearchKeyword();
            if (currentKeyword && mergedResults.length > 0) {
              const cacheKey = this.generateSearchCacheKey(currentKeyword, this.selectedSearchSources());
              this.setSearchCache(cacheKey, mergedResults);
            }
          }
        }
        this.refreshResourceStats();
      } else if (data.error) {
        // 🆕 優化錯誤提示
        const errorMsg = data.error;
        let suggestions: string[] = [];
        let details = '';
        
        if (errorMsg.includes('Username not found') || errorMsg.includes('不可用')) {
          suggestions = [
            '搜索機器人首次使用需要激活',
            '請在 Telegram 中打開 @smss 並發送 /start',
            '或者打開 @jisou3 並發送 /start',
            '激活後重新搜索'
          ];
          details = '搜索機器人尚未激活';
        } else if (errorMsg.includes('FloodWait') || errorMsg.includes('限制')) {
          suggestions = [
            '等待幾分鐘後重試',
            '減少搜索頻率',
            '使用其他帳號搜索'
          ];
          details = 'Telegram 請求頻率限制';
        } else if (errorMsg.includes('没有可用')) {
          suggestions = [
            '檢查帳號是否已登錄',
            '確保至少有一個帳號在線'
          ];
          details = '沒有可用帳號';
        } else {
          suggestions = ['重試搜索', '使用不同關鍵詞'];
        }
        
        this.searchError.set({
          hasError: true,
          message: errorMsg,
          details,
          suggestions
        });
        this.toastService.error(`极搜失敗: ${details || errorMsg}`);
      }
      
      // 如果只选择了极搜渠道，则停止搜索状态
      const sources = this.selectedSearchSources();
      if (sources.length === 1 && sources[0] === 'jiso') {
        this.isSearchingResources.set(false);
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
          this.searchTimeout = null;
        }
      }
    });

    // 极搜进度事件
    this.ipcService.on('jiso-search-progress', (data: { status: string, message: string }) => {
      // 🔧 移除搜索進度 Toast，改用 UI 狀態指示
      if (data.status === 'searching') {
        console.log(`[Search] 极搜：${data.message}`);
      } else if (data.status === 'waiting') {
        console.log(`[Search] 极搜等待：${data.message}`);
      }
    });

    // 搜索渠道管理事件
    this.ipcService.on('search-channels-list', (data: { success: boolean, system_channels?: any[], custom_channels?: any[], error?: string }) => {
      if (data.success) {
        this.systemChannels.set(data.system_channels || []);
        this.customChannels.set(data.custom_channels || []);
      }
    });

    this.ipcService.on('search-channel-added', (data: { success: boolean, channelId?: number, botUsername?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 已添加渠道 @${data.botUsername}`);
        this.showAddChannelDialog.set(false);
        this.loadSearchChannels();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });

    this.ipcService.on('search-channel-updated', (data: { success: boolean, channelId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 渠道已更新');
        this.loadSearchChannels();
      } else {
        this.toastService.error(`更新失敗: ${data.error}`);
      }
    });

    this.ipcService.on('search-channel-deleted', (data: { success: boolean, channelId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('🗑️ 渠道已刪除');
        this.loadSearchChannels();
      } else {
        this.toastService.error(`刪除失敗: ${data.error}`);
      }
    });

    this.ipcService.on('search-channel-tested', (data: { success: boolean, botUsername?: string, status?: string, responseTime?: number, error?: string }) => {
      this.isTestingChannel.set(false);
      if (data.success) {
        this.toastService.success(`✅ @${data.botUsername} 測試成功 (${data.responseTime?.toFixed(1)}s)`);
        this.loadSearchChannels();
      } else {
        this.toastService.warning(`❌ @${data.botUsername} 測試失敗: ${data.error}`);
        this.loadSearchChannels();
      }
    });

    this.ipcService.on('resources-list', (data: { success: boolean, resources?: any[], total?: number, error?: string }) => {
      // 🆕 C方案：如果正在搜索模式，忽略數據庫加載的結果
      if (this.isInSearchResultMode()) {
        console.log('[資源中心] 忽略 resources-list，當前處於搜索結果模式');
        return;
      }
      
      if (data.success && data.resources) {
        this.discoveredResources.set(data.resources);
        
        // 自動驗證尚未驗證類型的資源（批量處理，避免 FloodWait）
        const unverifiedResources = data.resources.filter(r => !r.type_verified && r.username);
        if (unverifiedResources.length > 0) {
          // 限制每次最多驗證 10 個資源
          const toVerify = unverifiedResources.slice(0, 10);
          const resourceIds = toVerify.map(r => r.id);
          this.ipcService.send('batch-verify-resource-types', { resourceIds });
        }
      }
    });
    
    this.ipcService.on('resource-stats', (data: { success: boolean, total_resources?: number, by_status?: any, by_type?: any, today_discovered?: number, pending_joins?: number, joined_count?: number, avg_score?: number, error?: string }) => {
      if (data.success) {
        this.resourceStats.set({
          total_resources: data.total_resources || 0,
          by_status: data.by_status || {},
          by_type: data.by_type || {},
          today_discovered: data.today_discovered || 0,
          pending_joins: data.pending_joins || 0,
          joined_count: data.joined_count || 0,
          avg_score: data.avg_score || 0
        });
        if (data.total_resources && data.total_resources > 0) {
          this.resourceDiscoveryInitialized.set(true);
        }
      }
    });
    
    this.ipcService.on('resource-added', (data: { success: boolean, resourceId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 資源已添加');
        this.showAddResourceDialog.set(false);
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });

    // 資源類型驗證結果
    this.ipcService.on('resource-type-verified', (data: { success: boolean, resourceId?: number, oldType?: string, newType?: string, title?: string, error?: string }) => {
      if (data.success) {
        if (data.oldType !== data.newType) {
          this.toastService.success(`✅ 類型已更新: ${data.oldType} → ${data.newType}`);
        } else {
          this.toastService.info(`📋 類型確認: ${data.newType}`);
        }
        this.loadResources();
      } else {
        this.toastService.error(`驗證失敗: ${data.error}`);
      }
    });
    
    // 批量類型驗證完成
    this.ipcService.on('resources-types-verified', (data: { success: boolean, count?: number }) => {
      if (data.success && data.count && data.count > 0) {
        this.loadResources();
      }
    });
    
    this.ipcService.on('resource-deleted', (data: { success: boolean, resourceId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('🗑️ 資源已刪除');
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`刪除失敗: ${data.error}`);
      }
    });
    
    // 退出群組完成事件
    this.ipcService.on('leave-group-complete', (data: { success: boolean, groupId?: string, phone?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`🚪 已退出群組`);
        this.loadResources();
        this.refreshResourceStats();
        this.ipcService.send('get-monitored-groups');
      } else {
        this.toastService.error(`退出群組失敗: ${data.error}`);
      }
    });
    
    // 🆕 移除監控群組結果
    this.ipcService.on('remove-group-result', (data: { success: boolean, groupId?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 已停止監控群組`);
        this.loadResources();
        this.refreshResourceStats();
        this.ipcService.send('get-monitored-groups');
      } else {
        this.toastService.error(`停止監控失敗: ${data.error || '未知錯誤'}`);
        // 回滾樂觀更新
        this.loadResources();
      }
    });
    
    this.ipcService.on('join-queue-updated', (data: { success: boolean, added?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`📋 已添加 ${data.added} 個資源到加入隊列`);
        this.refreshResourceStats();
        this.selectedResourceIds.set([]);
      } else {
        this.toastService.error(`添加到隊列失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('join-queue-processed', (data: { success: boolean, processed?: number, successCount?: number, failed?: number, error?: string }) => {
      this.isProcessingJoinQueue.set(false);
      if (data.success) {
        this.toastService.success(`🚀 處理完成：成功 ${data.successCount}，失敗 ${data.failed}`);
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`處理失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('batch-join-started', (data: { success: boolean, count?: number, error?: string }) => {
      if (data.success) {
        this.toastService.info(`🚀 開始批量加入 ${data.count} 個資源`);
      }
    });
    
    this.ipcService.on('batch-join-complete', (data: { success: boolean, total?: number, successCount?: number, failed?: number, skipped?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 批量加入完成：成功 ${data.successCount}，失敗 ${data.failed}，跳過 ${data.skipped}`);
        this.loadResources();
        this.refreshResourceStats();
      }
    });
    
    // 加入並監控事件
    this.ipcService.on('join-and-monitor-complete', (data: { success: boolean, resourceId?: number, error?: string }) => {
      this.isJoiningResource.set(false);
      if (data.success) {
        this.toastService.success('✅ 已加入並添加到監控');
        this.showJoinMonitorDialog.set(false);
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`加入失敗: ${data.error}`);
      }
    });

    // 帶帳號選擇的加入並監控事件
    this.ipcService.on('join-and-monitor-with-account-complete', (data: { success: boolean, resourceId?: number, phone?: string, error?: string, status?: string, message?: string, memberCount?: number }) => {
      this.isJoiningResource.set(false);
      
      if (data.success) {
        const keywordSetCount = this.joinMonitorSelectedKeywordSetIds().length;
        const currentResource = this.joinMonitorResource();
        
        // 🆕 即時更新本地資源狀態（樂觀更新）+ 成員數
        const newStatus = data.status === 'pending_approval' ? 'pending_approval' : 'joined';
        this.updateResourceStatusLocally(currentResource, newStatus, data.phone, data.memberCount);
        
        // 🆕 根據加入狀態顯示不同的提示
        if (data.status === 'pending_approval') {
          // 等待管理員批准
          this.toastService.info(`📨 加入請求已發送，等待管理員批准\n帳號: ${data.phone}`, 5000);
          this.showJoinMonitorDialog.set(false);
        } else {
          // 成功加入 - 顯示「下一步」選項
          this.showPostJoinOptions(currentResource, data.phone, keywordSetCount);
        }
        
        // 刷新數據
        this.loadResources();
        this.refreshResourceStats();
        this.ipcService.send('get-monitored-groups');
      } else {
        // 🆕 更詳細的錯誤提示
        const errorMsg = data.error || '未知錯誤';
        if (errorMsg.includes('缺少加入方式') || errorMsg.includes('username')) {
          this.toastService.error(`❌ 無法加入：此群組沒有提供有效的加入鏈接\n請在 Telegram 中手動獲取群組鏈接`, 6000);
        } else {
          this.toastService.error(`❌ 加入失敗: ${errorMsg}`, 5000);
        }
      }
    });
    
    // 批量加入並監控事件
    this.ipcService.on('batch-join-and-monitor-complete', (data: { success: boolean, total?: number, successCount?: number, failed?: number, error?: string }) => {
      this.isJoiningResource.set(false);
      this.closeBatchJoinMonitorDialog();
      if (data.success) {
        const keywordSetCount = this.joinMonitorSelectedKeywordSetIds().length;
        const message = keywordSetCount > 0 
          ? `✅ 批量加入監控完成：成功 ${data.successCount}，失敗 ${data.failed}，已綁定 ${keywordSetCount} 個關鍵詞集`
          : `✅ 批量加入監控完成：成功 ${data.successCount}，失敗 ${data.failed}`;
        this.toastService.success(message);
        this.loadResources();
        this.refreshResourceStats();
        this.selectedResourceIds.set([]);
        // 刷新監控群組列表以同步關鍵詞集綁定
        this.ipcService.send('get-monitored-groups');
      } else {
        this.toastService.error(`批量操作失敗: ${data.error}`);
      }
    });

    // 成員提取進度事件 — 🆕 Phase2: 支持 auto_joining 狀態 + message 字段
    this.ipcService.on('members-extraction-progress', (data: { resourceId: number, extracted: number, total: number, status: string, message?: string }) => {
      // 使用 message 字段（更詳細的進度描述），回退到 status
      const displayStatus = data.message || data.status;
      this.memberListProgress.set({
        extracted: data.extracted,
        total: data.total,
        status: displayStatus
      });
    });

    // 成員提取完成事件 — 🆕 Phase3: 支持 syncStats + lastExtraction
    this.ipcService.on('members-extracted', (data: { 
      success: boolean, 
      resourceId?: number, 
      telegramId?: string,
      members?: any[], 
      total?: number, 
      error?: string,
      error_code?: string,
      error_details?: { reason?: string, suggestion?: string, can_auto_join?: boolean, alternative?: string, attempts?: number },
      limit_warning?: { total_in_group?: number, api_limit?: number, extracted?: number, suggestion?: string, message?: string },
      syncStats?: { new?: number, updated?: number, duplicate?: number },
      lastExtraction?: { lastCount?: number, lastNewCount?: number, lastTime?: string },
      usedPhone?: string,
      insights?: { 
        chinesePercent?: number, premiumPercent?: number, onlinePercent?: number,
        usernamePercent?: number, botPercent?: number, highValueCount?: number,
        valueLevelDistribution?: Record<string, number>,
        recommendations?: string[] 
      },
      dailyQuota?: { used?: number, limit?: number, remaining?: number }
    }) => {
      this.memberListLoading.set(false);
      if (data.success && data.members) {
        // 追加成員數據
        const existingIds = new Set(this.memberListData().map(m => m.user_id));
        const newMembers = data.members.filter(m => !existingIds.has(m.user_id));
        this.memberListData.update(current => [...current, ...newMembers]);
        this.memberListProgress.update(p => ({
          ...p,
          extracted: this.memberListData().length,
          status: `已提取 ${this.memberListData().length} 個成員`
        }));
        
        // 🆕 Phase3: 顯示同步統計（新增/已有/更新）
        if (data.syncStats) {
          const s = data.syncStats;
          if (s.new && s.new > 0) {
            this.toastService.success(
              `📊 資源中心同步：新增 ${s.new} 個聯繫人` + 
              (s.updated ? `，更新 ${s.updated} 個` : ''),
              5000
            );
          }
        }
        
        // 🆕 Phase3: 顯示與上次提取的對比
        if (data.lastExtraction?.lastCount) {
          const last = data.lastExtraction;
          const diff = (data.members?.length || 0) - (last.lastCount || 0);
          if (diff > 0) {
            this.toastService.info(`📈 比上次多提取 ${diff} 人`, 4000);
          } else if (diff < 0) {
            this.toastService.info(`📉 比上次少 ${Math.abs(diff)} 人（可能有成員退群）`, 4000);
          }
        }
        
        // 🆕 計算並顯示提取結果摘要
        if (newMembers.length > 0) {
          this.calculateAndShowExtractionSummary(newMembers);
        } else {
          this.toastService.info('沒有更多新成員');
        }
        
        // 🆕 Phase5: 顯示智能分析建議
        if (data.insights?.recommendations?.length) {
          setTimeout(() => {
            for (const rec of data.insights!.recommendations!.slice(0, 3)) {
              this.toastService.info(rec, 6000);
            }
          }, 2000);
        }
        
        // 🆕 Phase5: 顯示每日配額提醒
        if (data.dailyQuota) {
          const q = data.dailyQuota;
          const pct = Math.round(((q.used || 0) / (q.limit || 5000)) * 100);
          if (pct >= 90) {
            this.toastService.warning(`⚠️ 今日提取配額即將用完：${q.used}/${q.limit} (${pct}%)`, 8000);
          } else if (pct >= 70) {
            this.toastService.info(`📊 今日提取配額：${q.used}/${q.limit} (剩餘 ${q.remaining})`, 5000);
          }
        }

        // 🆕 Phase4: 大群組上限提醒 + 消息歷史提取建議
        if (data.limit_warning) {
          const w = data.limit_warning;
          this.toastService.warning(
            `⚠️ 此群組有 ${(w.total_in_group || 0).toLocaleString()} 成員，` +
            `Telegram 限制最多提取 ${(w.api_limit || 10000).toLocaleString()}。` +
            `可使用「提取活躍用戶」從消息歷史中補充發現更多用戶。`,
            10000
          );
          // 自動觸發消息歷史提取（補充 10K 之外的活躍用戶）
          if (data.resourceId) {
            setTimeout(() => {
              this.ipcService.send('extract-active-users', {
                resourceId: data.resourceId,
                telegramId: data.telegramId,
                messageLimit: 2000
              });
              this.toastService.info('📊 正在從消息歷史中補充提取活躍用戶...', 5000);
            }, 2000);  // 2秒後自動啟動
          }
        }
      } else if (data.error) {
        // 顯示結構化錯誤信息
        this.handleMemberExtractionError(data);
      }
    });

    // 🆕 Phase4: 活躍用戶提取完成事件
    this.ipcService.on('active-users-extracted', (data: {
      success: boolean, resourceId?: number, members?: any[], extracted?: number,
      unique_users?: number, messages_scanned?: number, new_members?: number, error?: string
    }) => {
      if (data.success) {
        const newCount = data.new_members || 0;
        if (newCount > 0) {
          this.toastService.success(
            `📊 活躍用戶提取完成：掃描 ${data.messages_scanned} 條消息，` +
            `發現 ${data.unique_users} 用戶 (新增 ${newCount})`,
            6000
          );
          // 追加到現有成員列表
          if (data.members) {
            const existingIds = new Set(this.memberListData().map(m => m.user_id));
            const newMembers = data.members.filter(m => !existingIds.has(m.user_id));
            if (newMembers.length > 0) {
              this.memberListData.update(current => [...current, ...newMembers]);
            }
          }
        } else {
          this.toastService.info(`📊 消息歷史中未發現新用戶 (掃描 ${data.messages_scanned} 條消息)`);
        }
      } else if (data.error) {
        this.toastService.warning(`活躍用戶提取失敗: ${data.error}`);
      }
    });

    // 🆕 Phase4: 批量提取進度事件
    this.ipcService.on('batch-extraction-progress', (data: { 
      status: string, totalGroups: number, completed: number, 
      currentGroup?: string, currentIndex?: number, totalMembers?: number 
    }) => {
      if (data.status === 'extracting' && data.currentGroup) {
        this.toastService.info(
          `📦 [${data.currentIndex || data.completed + 1}/${data.totalGroups}] 正在提取: ${data.currentGroup}`,
          3000
        );
      }
    });

    // 批量成員提取完成事件 — 🆕 Phase4: 增強結果顯示
    this.ipcService.on('batch-members-extracted', (data: { 
      success: boolean, totalGroups?: number, completed?: number, 
      failed?: number, totalMembers?: number, error?: string,
      results?: Array<{ resourceId: number, title: string, success: boolean, error?: string }>
    }) => {
      if (data.success || (data.completed && data.completed > 0)) {
        const failInfo = data.failed ? `，${data.failed} 個失敗` : '';
        this.toastService.success(
          `✅ 批量提取完成：${data.completed}/${data.totalGroups} 個群組成功${failInfo}，共 ${data.totalMembers || 0} 個成員`,
          8000
        );
        // 刷新資源列表和統計
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`批量提取失敗: ${data.error}`);
      }
    });
    
    // 群組消息發送結果事件
    this.ipcService.on('group-message-sent', (data: { success: boolean, resourceId?: number, messageId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 消息已成功發送到群組');
      } else {
        this.toastService.error(`❌ 發送失敗: ${data.error || '未知錯誤'}`);
      }
    });

    // 私信消息進入隊列事件
    this.ipcService.on('message-queued', (data: { messageId: string, leadId: number, accountPhone: string, userId: string }) => {
      console.log('[Frontend] Message queued:', data);
      this.toastService.info(`📤 消息已加入發送隊列`);
    });

    // 私信消息發送結果事件
    this.ipcService.on('message-sent', (data: { leadId: number, accountPhone: string, userId: string, success: boolean, error?: string, messageId?: string }) => {
      console.log('[Frontend] Message sent result:', data);
      if (data.success) {
        this.toastService.success(`✅ 消息已成功發送`);
        // 關閉發消息對話框
        this.closeLeadDetailModal();
        // 重新加載 leads 數據以更新狀態
        this.ipcService.send('get-leads', {});
      } else {
        this.toastService.error(`❌ 發送失敗: ${data.error || '未知錯誤'}`);
      }
    });

    // 鏈接分析事件
    this.ipcService.on('link-analysis-complete', (data: any) => {
      this.isAnalyzingLink.set(false);
      if (data.success) {
        if (data.isPrivate) {
          this.toastService.warning(data.message || '這是私有鏈接');
        } else {
          this.toastService.success('✅ 分析完成');
          // TODO: 顯示分析結果
          console.log('Link analysis result:', data);
        }
      } else {
        this.toastService.error(`分析失敗: ${data.error}`);
      }
    });
}
