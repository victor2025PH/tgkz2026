// @ts-nocheck
/**
 * Phase 9-1b: Member dialog, Group messaging
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 */

class MemberMethodsMixin {
  // ==================== 成員列表對話框 ====================

  // 打開成員列表對話框
  openMemberListDialog(resource: any) {
    this.memberListResource.set(resource);
    this.memberListData.set([]);
    this.memberListLoading.set(false);
    this.memberListProgress.set({ extracted: 0, total: resource.member_count || 0, status: '' });
    this.selectedMemberIds.set([]);
    this.memberExtractStarted.set(false); // 重置提取狀態，顯示設置面板
    this.memberListFilter.set('all');
    this.memberExtractConfig.set({
      limit: 500,
      customLimit: 1000,
      backgroundMode: false,
      userTypes: {
        chinese: false,
        overseas: false,
      },
      activityFilters: {
        onlineNow: false,
        within3Days: false,
        within7Days: false,
        within30Days: false,
        longOffline: false,
      },
      accountFeatures: {
        premium: false,
        hasUsername: false,
        hasPhoto: false,
        newAccount: false,
        activeAccount: false,
        verified: false,
      },
      excludeFilters: {
        bots: true,
        scam: true,
        deleted: true,
      }
    });
    this.showMemberListDialog.set(true);
  }

  // 關閉成員列表對話框
  closeMemberListDialog() {
    this.showMemberListDialog.set(false);
    this.memberListResource.set(null);
    this.memberListData.set([]);
  }

  // 加載成員列表
  loadMemberList(resource: any) {
    if (!resource || !resource.telegram_id) {
      this.toastService.error('無效的群組信息');
      return;
    }
    
    this.memberListLoading.set(true);
    this.memberListProgress.update(p => ({ ...p, status: '正在提取成員...' }));
    
    this.ipcService.send('extract-members', {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      // 🔧 FIX: 傳遞已加入群組的帳號
      phone: resource.joined_phone || resource.joined_by_phone || null,
      limit: 200, // 首次加載 200 個
      offset: 0
    });
  }

  // 繼續提取更多成員
  extractMoreMembers() {
    const resource = this.memberListResource();
    const currentCount = this.memberListData().length;
    
    if (!resource) return;
    
    this.memberListLoading.set(true);
    this.memberListProgress.update(p => ({ ...p, status: '正在提取更多成員...' }));
    
    this.ipcService.send('extract-members', {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      // 🔧 FIX: 傳遞已加入群組的帳號
      phone: resource.joined_phone || resource.joined_by_phone || null,
      limit: 200,
      offset: currentCount
    });
  }

  // 切換成員選擇
  toggleMemberIdSelection(memberId: string) {
    const current = this.selectedMemberIds();
    if (current.includes(memberId)) {
      this.selectedMemberIds.set(current.filter(id => id !== memberId));
    } else {
      this.selectedMemberIds.set([...current, memberId]);
    }
  }

  // 全選成員
  selectAllMembers() {
    const allIds = this.memberListData().map(m => m.user_id);
    this.selectedMemberIds.set(allIds);
  }

  // 導出成員為 CSV（包含所有欄位）
  exportMembersToCSV() {
    const members = this.getFilteredMembers();
    if (members.length === 0) {
      this.toastService.warning('沒有可導出的成員');
      return;
    }

    const resource = this.memberListResource();
    const filename = `members_${resource?.username || resource?.telegram_id}_${new Date().toISOString().slice(0,10)}.csv`;

    // CSV 內容（完整欄位）
    const headers = [
      '用戶ID', '用戶名', '名字', '姓氏', '全名', '電話號碼',
      '個人簡介', '語言', 'DC', '在線狀態', '最後上線',
      '角色', '加入日期', 'Premium', '已認證', 'Bot', 
      '有頭像', '詐騙', '假帳號', '受限制', '已刪除',
      '華人', '活躍度', '價值等級', '來源群組', '提取時間'
    ];
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const rows = members.map(m => [
      m.user_id,
      m.username || '',
      m.first_name || '',
      m.last_name || '',
      m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
      m.phone || '',
      escapeCSV(m.bio || ''),
      m.language_code || '',
      m.dc_id || '',
      m.online_status || '',
      m.last_online || '',
      m.chat_member_status || 'member',
      m.joined_date || '',
      m.is_premium ? '是' : '否',
      m.is_verified ? '是' : '否',
      m.is_bot ? '是' : '否',
      m.has_photo ? '是' : '否',
      m.is_scam ? '是' : '否',
      m.is_fake ? '是' : '否',
      m.is_restricted ? '是' : '否',
      m.is_deleted ? '是' : '否',
      this.isChineseMember(m) ? '是' : '否',
      m.activity_score ? (m.activity_score * 100).toFixed(0) + '%' : '',
      m.value_level || '',
      m.source_chat_title || '',
      m.extracted_at || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    this.toastService.success(`✅ 已導出 ${members.length} 個成員`);
  }

  // 設置提取數量限制
  setMemberExtractLimit(limit: number) {
    this.memberExtractConfig.update(c => ({ ...c, limit }));
  }
  
  // 🆕 應用快捷預設
  applyExtractPreset(presetId: string) {
    this.selectedPreset.set(presetId);
    const preset = this.extractPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    // 重置所有篩選器
    this.memberExtractConfig.update(c => ({
      ...c,
      userTypes: { chinese: false, overseas: false },
      activityFilters: { onlineNow: false, within3Days: false, within7Days: false, within30Days: false, longOffline: false },
      accountFeatures: { premium: false, hasUsername: false, hasPhoto: false, newAccount: false, activeAccount: false, verified: false },
    }));
    
    // 應用預設配置
    if (preset.config.userTypes) {
      this.memberExtractConfig.update(c => ({
        ...c,
        userTypes: { ...c.userTypes, ...preset.config.userTypes }
      }));
    }
    if (preset.config.activityFilters) {
      this.memberExtractConfig.update(c => ({
        ...c,
        activityFilters: { ...c.activityFilters, ...preset.config.activityFilters }
      }));
    }
    if (preset.config.accountFeatures) {
      this.memberExtractConfig.update(c => ({
        ...c,
        accountFeatures: { ...c.accountFeatures, ...preset.config.accountFeatures }
      }));
    }
    
    this.toastService.info(`已應用「${preset.name}」預設`);
  }
  
  // 🆕 切換用戶類型篩選
  toggleUserType(type: 'chinese' | 'overseas') {
    this.selectedPreset.set(''); // 清除預設選擇
    this.memberExtractConfig.update(c => ({
      ...c,
      userTypes: { ...c.userTypes, [type]: !c.userTypes[type] }
    }));
  }
  
  // 🆕 切換活躍度篩選
  toggleActivityFilter(filter: 'onlineNow' | 'within3Days' | 'within7Days' | 'within30Days' | 'longOffline') {
    this.selectedPreset.set('');
    this.memberExtractConfig.update(c => ({
      ...c,
      activityFilters: { ...c.activityFilters, [filter]: !c.activityFilters[filter] }
    }));
  }
  
  // 🆕 切換帳號特徵篩選
  toggleAccountFeature(feature: 'premium' | 'hasUsername' | 'hasPhoto' | 'newAccount' | 'activeAccount' | 'verified') {
    this.selectedPreset.set('');
    this.memberExtractConfig.update(c => ({
      ...c,
      accountFeatures: { ...c.accountFeatures, [feature]: !c.accountFeatures[feature] }
    }));
  }
  
  // 🆕 切換排除項
  toggleExcludeFilter(filter: 'bots' | 'scam' | 'deleted') {
    this.memberExtractConfig.update(c => ({
      ...c,
      excludeFilters: { ...c.excludeFilters, [filter]: !c.excludeFilters[filter] }
    }));
  }
  
  // 🆕 獲取當前篩選條件數量
  getActiveFilterCount(): number {
    const config = this.memberExtractConfig();
    let count = 0;
    
    Object.values(config.userTypes).forEach(v => v && count++);
    Object.values(config.activityFilters).forEach(v => v && count++);
    Object.values(config.accountFeatures).forEach(v => v && count++);
    
    return count;
  }
  
  // 🆕 清除所有篩選
  clearAllFilters() {
    this.selectedPreset.set('');
    this.memberExtractConfig.update(c => ({
      ...c,
      userTypes: { chinese: false, overseas: false },
      activityFilters: { onlineNow: false, within3Days: false, within7Days: false, within30Days: false, longOffline: false },
      accountFeatures: { premium: false, hasUsername: false, hasPhoto: false, newAccount: false, activeAccount: false, verified: false },
    }));
    this.toastService.info('已清除所有篩選條件');
  }

  // 開始成員提取
  startMemberExtraction() {
    console.log('[Frontend] startMemberExtraction called');
    const resource = this.memberListResource();
    console.log('[Frontend] Resource:', resource);
    
    if (!resource) {
      console.error('[Frontend] No resource selected');
      this.toastService.error('請先選擇一個群組');
      return;
    }

    this.memberExtractStarted.set(true);
    this.memberListLoading.set(true);
    this.memberListData.set([]);
    this.extractionStartTime.set(Date.now()); // 🆕 記錄提取開始時間

    const config = this.memberExtractConfig();
    const limit = config.limit === -1 ? config.customLimit : (config.limit === 0 ? 99999 : config.limit);
    
    console.log('[Frontend] Extraction config:', { limit, config });

    this.memberListProgress.set({
      extracted: 0,
      total: resource.member_count || 0,
      status: '正在提取成員...'
    });

    const payload = {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      // 🔧 FIX: 傳遞已加入群組的帳號
      phone: resource.joined_phone || resource.joined_by_phone || null,
      limit: limit,
      offset: 0,
      filters: {
        onlineOnly: config.activityFilters.onlineNow,
        chineseOnly: config.userTypes.chinese,
        premiumOnly: config.accountFeatures.premium,
        hasUsername: config.accountFeatures.hasUsername,
        excludeBots: config.excludeFilters.bots
      }
    };
    
    console.log('[Frontend] Sending extract-members IPC:', payload);
    this.toastService.info('📤 正在發送提取請求...');
    this.ipcService.send('extract-members', payload);
    
    if (config.backgroundMode) {
      this.toastService.info('📤 成員提取已轉為後台運行');
      this.closeMemberListDialog();
    }
  }

  // 暫停成員提取
  pauseMemberExtraction() {
    this.memberListLoading.set(false);
    this.memberListProgress.update(p => ({ ...p, status: '已暫停' }));
    this.toastService.info('⏸️ 成員提取已暫停');
  }

  // 停止成員提取
  stopMemberExtraction() {
    this.memberListLoading.set(false);
    this.memberListProgress.update(p => ({ ...p, status: '已停止' }));
    this.toastService.info('⏹️ 成員提取已停止');
  }

  // 切換後台運行
  toggleMemberExtractBackground() {
    this.toastService.info('📤 成員提取已轉為後台運行，完成後會通知您');
    this.closeMemberListDialog();
  }

  // 處理成員提取錯誤
  handleMemberExtractionError(data: { 
    error?: string, 
    error_code?: string, 
    error_details?: { reason?: string, suggestion?: string, can_auto_join?: boolean, alternative?: string, attempts?: number }
  }) {
    const errorCode = data.error_code || 'UNKNOWN';
    const details = data.error_details || {};
    
    // 更新進度狀態
    this.memberListProgress.update(p => ({ ...p, status: '提取失敗' }));
    
    // 根據錯誤類型顯示不同的提示
    switch (errorCode) {
      case 'PEER_ID_INVALID':
      case 'NOT_PARTICIPANT':
      case 'CHANNEL_PRIVATE':
        // 🆕 P0 修復：區分是否已重試過
        const attempts = details.attempts || 0;
        const hasRetried = attempts > 1;
        
        if (hasRetried) {
          // 已重試多次仍失敗，可能是 Telegram 同步問題
          this.showExtractionErrorWithAction(
            '⚠️ 群組同步未完成',
            details.reason || `已嘗試 ${attempts} 次，Telegram 服務器尚未同步`,
            details.suggestion || '請等待 30 秒後再試，或重新加入群組',
            undefined  // 不提供自動加入，因為可能已經加入了
          );
        } else {
          // 首次失敗，需要先加入群組
          this.showExtractionErrorWithAction(
            '⚠️ 無法提取成員',
            details.reason || '帳號尚未加入此群組',
            details.suggestion || '請先加入群組再嘗試提取',
            details.can_auto_join ? 'join' : undefined
          );
        }
        break;
        
      case 'ADMIN_REQUIRED':
        // 需要管理員權限
        this.showExtractionErrorWithAction(
          '🔒 成員列表受限',
          details.reason || '群組設置限制了成員列表訪問',
          details.suggestion || '可嘗試監控群組消息收集活躍用戶',
          details.alternative === 'monitor_messages' ? 'monitor' : undefined
        );
        break;
        
      case 'FLOOD_WAIT':
        // 頻率限制
        this.toastService.warning(`⏳ ${data.error}\n\n${details.suggestion || '請稍後重試'}`);
        break;
        
      case 'CHANNEL_INVALID':
        // 無效群組
        this.toastService.error(`❌ ${data.error}\n\n${details.suggestion || '請刷新資源列表'}`);
        break;
        
      // 🆕 Phase2: 結構化錯誤碼支持 — 現在後端會自動嘗試加入，此錯誤表示最終失敗
      case 'E4001_NOT_SYNCED': {
        const triedPhones = (details as any).tried_phones || [];
        const actionType = (details as any).action;
        
        if (actionType === 'retry_later') {
          // 後端已自動加入成功但提取仍失敗 → 引導用戶等待後重試
          this.showExtractionErrorWithAction(
            '⏳ 已加入群組，等待同步',
            details.reason || '帳號已成功加入群組，Telegram 正在同步',
            details.suggestion || '請等待 30 秒後重新提取',
            undefined
          );
        } else if (actionType === 'auto_join' && details.can_auto_join) {
          // 後端自動加入也失敗了 → 引導手動加入
          this.showExtractionErrorWithAction(
            '⚠️ 帳號未加入群組',
            details.reason || '所有帳號均無法訪問此群組',
            (triedPhones.length > 1 
              ? `已嘗試 ${triedPhones.length} 個帳號。` 
              : '') + (details.suggestion || '請手動加入群組後重試'),
            'join'
          );
        } else {
          this.showExtractionErrorWithAction(
            '⚠️ 提取失敗',
            details.reason || '無法訪問群組成員列表',
            details.suggestion || '請確認帳號已加入此群組',
            undefined
          );
        }
        break;
      }
        
      case 'E4002_ADMIN_REQUIRED':
        this.showExtractionErrorWithAction(
          '🔒 成員列表受限',
          details.reason || '群組限制了成員列表訪問權限',
          details.suggestion || '可嘗試使用「監控群組消息」方式收集活躍用戶',
          'monitor'
        );
        break;
        
      case 'E4003_RATE_LIMITED':
        const retrySeconds = (details as any).retry_after_seconds || 120;
        this.toastService.warning(`⏳ Telegram 速率限制\n\n請等待 ${retrySeconds} 秒後再試`, retrySeconds > 60 ? 10000 : 5000);
        break;
        
      case 'E4004_NO_CHAT_ID':
        this.toastService.warning(`⚠️ 無法確定群組標識\n\n${details.suggestion || '請先通過搜索發現獲取群組信息'}`, 5000);
        break;
        
      // 🆕 Phase5: 配額超限
      case 'E4005_QUOTA_EXCEEDED': {
        const quota = (details as any).daily_quota;
        this.toastService.warning(
          `📊 今日提取配額已達上限\n\n已提取 ${quota?.used || '?'} / ${quota?.limit || '?'} 人\n明天將自動重置`,
          10000
        );
        this.memberListProgress.update(p => ({ ...p, status: '今日配額已用完' }));
        break;
      }
        
      default:
        // 其他錯誤
        this.toastService.error(`❌ 提取失敗: ${data.error}`);
    }
  }

  // 顯示帶有操作按鈕的錯誤提示
  showExtractionErrorWithAction(title: string, reason: string, suggestion: string, action?: 'join' | 'monitor') {
    const resource = this.memberListResource();
    
    // 構建提示消息
    let message = `${title}\n\n原因：${reason}\n\n💡 ${suggestion}`;
    
    if (action === 'join' && resource) {
      // 提示用戶可以加入群組
      message += '\n\n點擊「加入群組」按鈕後重試';
      this.toastService.warning(message);
      
      // 更新狀態提示用戶操作
      this.memberListProgress.update(p => ({ 
        ...p, 
        status: '需要先加入群組' 
      }));
    } else if (action === 'monitor' && resource) {
      message += '\n\n建議：啟動消息監控來收集活躍用戶';
      this.toastService.warning(message);
      
      this.memberListProgress.update(p => ({ 
        ...p, 
        status: '建議使用消息監控' 
      }));
    } else {
      this.toastService.error(message);
    }
  }

  // 嘗試自動加入群組並重新提取
  async autoJoinAndExtract() {
    const resource = this.memberListResource();
    if (!resource) return;
    
    this.toastService.info('🚀 正在嘗試加入群組...');
    
    // 發送加入群組請求
    const firstAccount = this.accounts().find(a => a.status === 'Online');
    if (firstAccount) {
      this.ipcService.send('join-group', {
        phone: firstAccount.phone,
        groupUrl: resource.username ? `https://t.me/${resource.username}` : resource.invite_link
      });
      
      // 監聯加入結果
      this.ipcService.once('group-join-result', (result: any) => {
        if (result.success) {
          this.toastService.success('✅ 成功加入群組，正在重新提取...');
          // 延遲後重新提取
          setTimeout(() => {
            this.startMemberExtraction();
          }, 2000);
        } else {
          this.toastService.error(`❌ 加入群組失敗: ${result.error}`);
        }
      });
    } else {
      this.toastService.error('沒有可用的在線帳號');
    }
  }

  // 獲取第一個在線帳號
  getFirstOnlineAccount(): any {
    return this.accounts().find(a => a.status === 'Online');
  }

  // 🆕 計算並顯示提取結果摘要
  calculateAndShowExtractionSummary(members: any[]) {
    const resource = this.memberListResource();
    const startTime = this.extractionStartTime();
    const duration = startTime > 0 ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    // 計算各類統計
    let onlineCount = 0;
    let recentlyCount = 0;
    let premiumCount = 0;
    let chineseCount = 0;
    let hasUsernameCount = 0;
    let botCount = 0;
    const valueLevelDistribution = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    
    for (const member of members) {
      // 在線狀態
      if (member.online_status === 'online') {
        onlineCount++;
      } else if (member.online_status === 'recently') {
        recentlyCount++;
      }
      
      // Premium
      if (member.is_premium) {
        premiumCount++;
      }
      
      // 華人判斷
      if (this.isChineseMember(member)) {
        chineseCount++;
      }
      
      // 有用戶名
      if (member.username) {
        hasUsernameCount++;
      }
      
      // Bot
      if (member.is_bot) {
        botCount++;
      }
      
      // 價值評級分布
      const level = member.value_level || this.calculateMemberValueLevel(member);
      if (level && valueLevelDistribution.hasOwnProperty(level)) {
        valueLevelDistribution[level as keyof typeof valueLevelDistribution]++;
      }
    }
    
    // 設置摘要數據
    this.extractionSummary.set({
      groupName: resource?.title || resource?.name || '未知群組',
      groupUrl: resource?.username ? `t.me/${resource.username}` : (resource?.url || ''),
      totalExtracted: members.length,
      totalInGroup: resource?.member_count || 0,
      onlineCount,
      recentlyCount,
      premiumCount,
      chineseCount,
      hasUsernameCount,
      botCount,
      valueLevelDistribution,
      extractedAt: new Date().toLocaleString('zh-TW'),
      duration
    });
    
    // 顯示摘要對話框
    this.showExtractionSummaryDialog.set(true);
    
    // 同時顯示 toast 通知
    this.toastService.success(`✅ 成功提取 ${members.length} 個成員`);
  }
  
  // 🆕 計算成員價值評級
  calculateMemberValueLevel(member: any): string {
    let score = 0;
    
    // Premium 用戶加分
    if (member.is_premium) score += 30;
    
    // 活躍度加分
    if (member.online_status === 'online') score += 25;
    else if (member.online_status === 'recently') score += 20;
    else if (member.online_status === 'last_week') score += 10;
    
    // 有用戶名加分
    if (member.username) score += 15;
    
    // 華人用戶加分（本地化營銷更有效）
    if (this.isChineseMember(member)) score += 10;
    
    // Bot 減分
    if (member.is_bot) score -= 50;
    
    // 活躍分數加成
    if (member.activity_score) {
      score += Math.min(member.activity_score, 20);
    }
    
    // 評級
    if (score >= 70) return 'S';
    if (score >= 50) return 'A';
    if (score >= 30) return 'B';
    if (score >= 10) return 'C';
    return 'D';
  }
  
  // 🆕 關閉提取結果摘要對話框
  closeExtractionSummaryDialog() {
    this.showExtractionSummaryDialog.set(false);
  }
  
  // 🆕 從摘要頁面跳轉到成員資料庫
  goToMemberDatabaseFromSummary() {
    this.closeExtractionSummaryDialog();
    this.closeMemberListDialog();
    this.currentView.set('member-database');
  }
  
  // 🆕 從摘要頁面發起批量營銷
  startBatchMarketingFromSummary() {
    this.closeExtractionSummaryDialog();
    // 保持成員列表對話框開啟，用戶可以選擇成員
    this.toastService.info('💡 請在成員列表中選擇要營銷的用戶，然後點擊「批量發送」');
  }
  
  // 🆕 獲取價值等級的百分比
  getValueLevelPercent(level: string): number {
    const summary = this.extractionSummary();
    const total = summary.totalExtracted;
    if (total === 0) return 0;
    const count = summary.valueLevelDistribution[level as keyof typeof summary.valueLevelDistribution] || 0;
    return Math.round((count / total) * 100);
  }

  // 設置成員列表篩選
  setMemberFilter(filter: string) {
    this.memberListFilter.set(filter);
  }

  // 獲取篩選後的成員列表
  getFilteredMembers() {
    const members = this.memberListData();
    const filter = this.memberListFilter();
    
    switch (filter) {
      case 'chinese':
        return members.filter(m => this.isChineseMember(m));
      case 'online':
        return members.filter(m => m.online_status === 'online' || m.online_status === 'recently');
      case 'premium':
        return members.filter(m => m.is_premium);
      case 'hasUsername':
        return members.filter(m => !!m.username);
      default:
        return members;
    }
  }

  // 判斷是否為華人用戶（中文字符檢測）
  isChineseMember(member: any): boolean {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const name = (member.first_name || '') + (member.last_name || '');
    return chineseRegex.test(name);
  }

  // 獲取華人成員數量
  getChineseMemberCount(): number {
    return this.memberListData().filter(m => this.isChineseMember(m)).length;
  }

  // 獲取在線成員數量
  getOnlineMemberCount(): number {
    return this.memberListData().filter(m => m.online_status === 'online' || m.online_status === 'recently').length;
  }

  // 獲取 Premium 成員數量
  getPremiumMemberCount(): number {
    return this.memberListData().filter(m => m.is_premium).length;
  }

  // 獲取提取進度百分比
  getMemberExtractPercent(): number {
    const progress = this.memberListProgress();
    if (progress.total === 0) return 0;
    return Math.min(100, Math.round((this.memberListData().length / progress.total) * 100));
  }

  // 是否全選成員
  isAllMembersSelected(): boolean {
    const filtered = this.getFilteredMembers();
    return filtered.length > 0 && filtered.every(m => this.selectedMemberIds().includes(m.user_id));
  }

  // 切換全選成員（成員列表對話框用）
  toggleSelectAllMembersList() {
    const filtered = this.getFilteredMembers();
    if (this.isAllMembersSelected()) {
      this.selectedMemberIds.set([]);
    } else {
      this.selectedMemberIds.set(filtered.map(m => m.user_id));
    }
  }

  // 發送私信
  sendPrivateMessage(member: any) {
    if (!member.username) {
      this.toastService.warning('該用戶沒有用戶名，無法發送私信');
      return;
    }
    this.toastService.info(`📨 準備發送私信給 @${member.username}`);
    // TODO: 打開私信對話框
  }

  // 批量發送私信
  batchSendPrivateMessage() {
    const count = this.selectedMemberIds().length;
    this.toastService.info(`📨 準備批量發送私信給 ${count} 個成員`);
    // TODO: 打開批量私信對話框
  }

  // 批量添加好友
  batchAddFriend() {
    const count = this.selectedMemberIds().length;
    this.toastService.info(`➕ 準備批量添加 ${count} 個好友`);
    // TODO: 實現批量加好友邏輯
  }
  
  // 🆕 將成員加入營銷漏斗
  addMemberToFunnel(member: any) {
    // 創建 Lead 數據
    const leadData = {
      userId: member.user_id,
      username: member.username || '',
      firstName: member.first_name || '',
      lastName: member.last_name || '',
      sourceGroup: this.memberListResource()?.title || '',
      triggeredKeyword: '手動添加',
      onlineStatus: member.online_status || 'unknown'
    };
    
    // 發送創建 Lead 請求
    this.ipcService.send('add-lead', leadData);
    this.toastService.success(`🎯 已將 ${member.first_name || member.username || 'ID:' + member.user_id} 加入營銷漏斗`);
  }
  
  // 🆕 批量加入漏斗
  batchAddToFunnel() {
    const selectedIds = this.selectedMemberIds();
    const members = this.memberListData().filter(m => selectedIds.includes(m.user_id));
    
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    let count = 0;
    for (const member of members) {
      const leadData = {
        userId: member.user_id,
        username: member.username || '',
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        sourceGroup: this.memberListResource()?.title || '',
        triggeredKeyword: '批量添加',
        onlineStatus: member.online_status || 'unknown'
      };
      this.ipcService.send('add-lead', leadData);
      count++;
    }
    
    this.toastService.success(`🎯 已將 ${count} 個成員加入營銷漏斗`);
    this.clearMemberSelection();
  }
  
  // 🆕 清除成員選擇
  clearMemberSelection() {
    this.selectedMemberIds.set([]);
  }
  
  // 🆕 導出選中的成員
  exportSelectedMembersToCSV() {
    const selectedIds = this.selectedMemberIds();
    const members = this.memberListData().filter(m => selectedIds.includes(m.user_id));
    
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    const headers = ['用戶ID', '用戶名', '名字', '姓氏', '評級', '在線狀態', 'Premium', '來源群組'];
    const rows = members.map(m => [
      m.user_id,
      m.username || '',
      m.first_name || '',
      m.last_name || '',
      this.calculateMemberValueLevel(m),
      m.online_status || 'unknown',
      m.is_premium ? '是' : '否',
      this.memberListResource()?.title || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected-members-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    this.toastService.success(`📥 已導出 ${members.length} 個成員`);
  }
  
  // 🆕 Phase4: 一鍵複製用戶名列表
  copyMemberUsernames(onlySelected: boolean = false) {
    const members = onlySelected 
      ? this.memberListData().filter(m => this.selectedMemberIds().includes(m.user_id))
      : this.getFilteredMembers();
    
    const usernames = members
      .filter(m => m.username)
      .map(m => `@${m.username}`);
    
    if (usernames.length === 0) {
      this.toastService.warning('沒有可複製的用戶名');
      return;
    }
    
    navigator.clipboard.writeText(usernames.join('\n')).then(() => {
      this.toastService.success(`📋 已複製 ${usernames.length} 個用戶名`);
    }).catch(() => {
      // 降級方案
      const textarea = document.createElement('textarea');
      textarea.value = usernames.join('\n');
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.toastService.success(`📋 已複製 ${usernames.length} 個用戶名`);
    });
  }
  
  // 🆕 Phase4: 複製用戶 ID 列表
  copyMemberIds(onlySelected: boolean = false) {
    const members = onlySelected 
      ? this.memberListData().filter(m => this.selectedMemberIds().includes(m.user_id))
      : this.getFilteredMembers();
    
    const ids = members.map(m => m.user_id);
    
    if (ids.length === 0) {
      this.toastService.warning('沒有可複製的用戶 ID');
      return;
    }
    
    navigator.clipboard.writeText(ids.join('\n')).then(() => {
      this.toastService.success(`📋 已複製 ${ids.length} 個用戶 ID`);
    }).catch(() => {
      this.toastService.error('複製失敗');
    });
  }

  // 🆕 選擇高價值成員（S/A 級）
  selectHighValueMembers() {
    const members = this.memberListData();
    const highValueIds = members
      .filter(m => {
        const level = this.calculateMemberValueLevel(m);
        return level === 'S' || level === 'A';
      })
      .map(m => m.user_id);
    
    this.selectedMemberIds.set(highValueIds);
    this.toastService.info(`✓ 已選擇 ${highValueIds.length} 個 S/A 級成員`);
  }
  
  // 🆕 選擇在線成員
  selectOnlineMembers() {
    const members = this.memberListData();
    const onlineIds = members
      .filter(m => m.online_status === 'online' || m.online_status === 'recently')
      .map(m => m.user_id);
    
    this.selectedMemberIds.set(onlineIds);
    this.toastService.info(`✓ 已選擇 ${onlineIds.length} 個在線/最近活躍成員`);
  }
  
  // 🆕 選擇所有成員
  selectAllMembersInList() {
    const filtered = this.getFilteredMembers();
    this.selectedMemberIds.set(filtered.map(m => m.user_id));
    this.toastService.info(`✓ 已選擇 ${filtered.length} 個成員`);
  }

  // 批量提取成員（多個群組）
  openBatchMemberExtractDialog() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.warning('請先選擇群組');
      return;
    }
    
    this.toastService.info(`🚀 開始批量提取 ${selectedIds.length} 個群組的成員`);
    
    // 發送批量提取請求
    this.ipcService.send('batch-extract-members', {
      resourceIds: selectedIds,
      limit: 100, // 每個群組提取 100 個
      safeMode: true // 安全模式：分批分時提取
    });
  }

  // ==================== 單個群組發消息 ====================

  // 打開單個群組發消息對話框
  openSingleMessageDialog(resource: any) {
    this.singleMessageResource.set(resource);
    this.singleMessageContent = '';
    this.singleMessageScheduled.set(false);
    this.singleMessageScheduleTime = '';
    this.singleMessageAccountId.set('');
    this.loadAccountQuotas();
    this.showSingleMessageDialog.set(true);
  }

  // 關閉單個群組發消息對話框
  closeSingleMessageDialog() {
    this.showSingleMessageDialog.set(false);
    this.singleMessageResource.set(null);
  }

  // 發送單個群組消息
  executeSingleMessage() {
    const resource = this.singleMessageResource();
    const content = this.singleMessageContent.trim();
    
    if (!resource) {
      this.toastService.error('無效的群組');
      return;
    }
    
    if (!content) {
      this.toastService.error('請輸入消息內容');
      return;
    }
    
    const accountId = this.singleMessageAccountId();
    if (!accountId) {
      this.toastService.error('請選擇發送帳號');
      return;
    }
    
    if (this.singleMessageScheduled() && this.singleMessageScheduleTime) {
      // 定時發送
      this.ipcService.send('schedule-message', {
        resourceId: resource.id,
        telegramId: resource.telegram_id,
        content: content,
        accountPhone: accountId,
        scheduledTime: this.singleMessageScheduleTime
      });
      this.toastService.success(`⏰ 消息已排程，將於 ${this.singleMessageScheduleTime} 發送`);
    } else {
      // 立即發送
      this.ipcService.send('send-group-message', {
        resourceId: resource.id,
        telegramId: resource.telegram_id,
        content: content,
        accountPhone: accountId
      });
      this.toastService.info('📨 正在發送消息...');
    }
    
    this.closeSingleMessageDialog();
  }

  // 刷新全部資源數據
  refreshAllResources() {
    this.isRefreshing.set(true);
    this.toastService.info('正在刷新資源數據...');
    
    // 刷新統計和列表
    this.refreshResourceStats();
    this.loadResources();
    this.loadDiscoveryKeywords();
    
    // 2秒後重置刷新狀態
    setTimeout(() => {
      this.isRefreshing.set(false);
      this.toastService.success('刷新完成');
    }, 2000);
  }
  
  // 清空搜索結果（清空前端顯示 + 刪除數據庫中的所有資源）
  clearSearchResults() {
    const resourceCount = this.discoveredResources().length;
    if (resourceCount === 0) {
      this.toastService.warning('沒有可清空的資源');
      return;
    }
    
    // 確認刪除
    if (!confirm(`確定要清空所有 ${resourceCount} 條搜索結果嗎？\n\n此操作將刪除數據庫中的所有資源記錄，不可恢復。`)) {
      return;
    }
    
    // 🔧 修復：使用 NgZone.run 確保在 Angular zone 內執行更新
    // confirm() 對話框會阻斷 Angular zone，導致後續更新無法觸發變更檢測
    this.ngZone.run(() => {
      // 調用後端清空所有資源
      this.ipcService.send('clear-all-resources', {});
      
      // 清空前端顯示
      this.discoveredResources.set([]);
      this.selectedResourceIds.set([]);
      
      // 更新統計
      this.refreshResourceStats();
      
      // 強制觸發變更檢測，確保輸入框可用
      this.cdr.detectChanges();
    });
  }
  
  // 刪除所有未處理的資源（從數據庫）
  deleteAllDiscoveredResources() {
    const discoveredIds = this.discoveredResources()
      .filter(r => r.status === 'discovered')
      .map(r => r.id);
    
    if (discoveredIds.length === 0) {
      this.toastService.info('沒有可刪除的未處理資源');
      return;
    }
    
    if (confirm('確定要刪除所有未處理的資源嗎？此操作不可恢復。')) {
      this.ipcService.send('delete-resources-batch', { resourceIds: discoveredIds });
      this.toastService.success(`🗑️ 已刪除 ${discoveredIds.length} 個資源`);
      setTimeout(() => this.loadResources(), 500);
    }
  }
  
  /**
   * 清空當前搜索結果（僅前端）
   */
  clearDiscoveredResources() {
    this.discoveredResources.set([]);
    this.selectedResourceIds.set([]);
    this.currentSearchSessionId.set('');
    this.currentSearchKeyword.set('');
    this.toastService.info('已清空當前搜索結果');
  }
  
  /**
   * 🆕 一鍵清理歷史數據
   */
  clearHistoryData(type: 'all' | 'old_data' | 'search_history' = 'all') {
    const typeNames = {
      'all': '所有資源數據',
      'old_data': '舊數據',
      'search_history': '搜索歷史（保留收藏）'
    };
    
    if (confirm(`確定要清理 ${typeNames[type]} 嗎？此操作不可恢復。`)) {
      this.toastService.info('🧹 正在清理...');
      this.ipcService.send('clear-resources', { 
        type,
        daysToKeep: type === 'old_data' ? 7 : 0
      });
    }
  }
  
  /**
   * 清空所有搜索歷史（前端 + 數據庫）
   */
  clearAllSearchHistory() {
    if (confirm('確定要清空所有搜索歷史嗎？此操作會刪除數據庫中的所有搜索結果。')) {
      this.ipcService.send('clear-all-resources', {});
      this.discoveredResources.set([]);
      this.selectedResourceIds.set([]);
      this.searchHistoryKeywords.set([]);
      this.currentSearchSessionId.set('');
      this.currentSearchKeyword.set('');
      this.showSearchHistory.set(false);
      this.toastService.success('已清空所有搜索歷史');
    }
  }
  
  /**
   * 切換顯示模式（當前搜索 / 歷史記錄）
   */
  toggleSearchHistoryMode() {
    const showHistory = !this.showSearchHistory();
    this.showSearchHistory.set(showHistory);
    
    if (showHistory) {
      // 顯示歷史：從數據庫載入所有資源
      this.loadResources();
      this.toastService.info('正在載入歷史搜索結果...');
    } else {
      // 顯示當前：清空列表（需要重新搜索）
      if (!this.currentSearchKeyword()) {
        this.discoveredResources.set([]);
      }
    }
  }
  
  /**
   * 從歷史記錄中搜索
   */
  searchFromHistory(keyword: string) {
    this.resourceSearchQuery = keyword;
    this.showSearchHistory.set(false);
    this.searchResources();
  }
  
  /**
   * 🆕 處理搜索發現組件的搜索事件
   */
  handleSearchDiscoverySearch(event: { query: string; sources: string[] }) {
    this.resourceSearchQuery = event.query;
    this.selectedSearchSources.set(event.sources);
    this.searchResources();
  }
  
  /**
   * 🆕 處理搜索發現組件的帳號選擇事件
   */
  handleSearchDiscoverySelectAccount(account: { id: number; phone: string; status: string }) {
    this.selectResourceAccount(account.id);
  }
  
  /**
   * 🆕 处理引导组件的导航事件
   */
  handleOnboardingNavigate(target: string): void {
    console.log('[Onboarding] 导航到:', target);
    this.changeView(target as any);
  }
  
  /**
   * 🆕 打开新手引导
   */
  openOnboarding(): void {
    if (this.onboardingComponent) {
      this.onboardingComponent.open();
    }
  }
  
  /**
   * 🆕 重置新手引导（清除历史记录）
   */
  resetOnboarding(): void {
    if (this.onboardingComponent) {
      this.onboardingComponent.reset();
      this.onboardingComponent.open();
    }
  }
  
  /**
   * 🆕 C方案：收藏資源（保存到數據庫）
   */
  saveResource(resource: any) {
    if (!resource.telegram_id) {
      this.toastService.error('無法收藏：缺少資源 ID');
      return;
    }
    
    // 發送保存請求到後端
    this.ipcService.send('save-resource', {
      telegram_id: resource.telegram_id,
      username: resource.username,
      title: resource.title,
      description: resource.description,
      member_count: resource.member_count,
      resource_type: resource.resource_type,
      overall_score: resource.overall_score,
      discovery_keyword: this.currentSearchKeyword()
    });
    
    // 更新本地狀態
    const saved = new Set(this.savedResources());
    saved.add(resource.telegram_id);
    this.savedResources.set(saved);
    
    // 更新資源的 is_saved 標記
    const resources = this.discoveredResources();
    const updated = resources.map(r => 
      r.telegram_id === resource.telegram_id ? { ...r, is_saved: true } : r
    );
    this.discoveredResources.set(updated);
    
    this.toastService.success(`⭐ 已收藏「${resource.title}」`);
  }
  
  /**
   * 🆕 C方案：取消收藏
   */
  unsaveResource(resource: any) {
    if (!resource.telegram_id) return;
    
    // 發送刪除請求到後端
    this.ipcService.send('unsave-resource', {
      telegram_id: resource.telegram_id
    });
    
    // 更新本地狀態
    const saved = new Set(this.savedResources());
    saved.delete(resource.telegram_id);
    this.savedResources.set(saved);
    
    // 更新資源的 is_saved 標記
    const resources = this.discoveredResources();
    const updated = resources.map(r => 
      r.telegram_id === resource.telegram_id ? { ...r, is_saved: false } : r
    );
    this.discoveredResources.set(updated);
    
    this.toastService.info(`已取消收藏「${resource.title}」`);
  }
  
  /**
   * 🆕 C方案：批量收藏選中的資源
   */
  batchSaveResources() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.warning('請先選擇要收藏的資源');
      return;
    }
    
    const resources = this.discoveredResources().filter(r => 
      selectedIds.includes(r.id) || selectedIds.some(id => String(id) === r.telegram_id)
    );
    
    resources.forEach(r => this.saveResource(r));
    this.toastService.success(`⭐ 已收藏 ${resources.length} 個資源`);
  }
  
  /**
   * 🆕 C方案：檢查資源是否已收藏
   */
  isResourceSaved(resource: any): boolean {
    return resource.is_saved || this.savedResources().has(resource.telegram_id);
  }
  
  /**
   * 同步聯繫人數據
   */
  syncContactsData() {
    this.contactsService.syncFromSources();
    this.toastService.info('正在同步數據...', 2000);
  }
  
  // 加入群組並添加到監控
  joinAndMonitor(resourceId: number) {
    const resource = this.discoveredResources().find(r => r.id === resourceId);
    if (!resource) {
      this.toastService.error('找不到該資源');
      return;
    }
    
    this.toastService.info(`正在加入並監控: ${resource.title}`);
    
    // 發送加入並監控的請求
    this.ipcService.send('join-and-monitor-resource', {
      resourceId: resourceId,
      username: resource.username,
      telegramId: resource.telegram_id,
      title: resource.title
    });
  }
  
  // 批量加入並監控
  batchJoinAndMonitor() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.error('請先選擇要加入的群組');
      return;
    }
    
    this.toastService.info(`正在批量加入並監控 ${selectedIds.length} 個群組...`);
    
    this.ipcService.send('batch-join-and-monitor', {
      resourceIds: selectedIds
    });
  }
  
  // 加載搜索關鍵詞
  loadDiscoveryKeywords() {
    this.ipcService.send('get-discovery-keywords', {});
  }
  
  // 添加搜索關鍵詞
  addDiscoveryKeyword() {
    if (!this.newResourceKeyword.trim()) {
      this.toastService.error('請輸入關鍵詞');
      return;
    }
    
    this.ipcService.send('add-discovery-keyword', {
      keyword: this.newResourceKeyword.trim(),
      category: 'general',
      priority: 5
    });
  }
  
  // 使用關鍵詞搜索
  searchWithKeyword(keyword: string) {
    this.resourceSearchQuery = keyword;
    this.searchResources();
  }
  
  // 切換資源選擇
  toggleResourceSelection(resourceId: number) {
    const current = this.selectedResourceIds();
    if (current.includes(resourceId)) {
      this.selectedResourceIds.set(current.filter(id => id !== resourceId));
    } else {
      this.selectedResourceIds.set([...current, resourceId]);
    }
  }
  
  // 全選/取消全選
  toggleSelectAllResources() {
    const resources = this.discoveredResources();
    const currentSelected = this.selectedResourceIds();
    
    if (currentSelected.length === resources.length) {
      this.selectedResourceIds.set([]);
    } else {
      this.selectedResourceIds.set(resources.map(r => r.id));
    }
  }
  
  // 添加選中資源到加入隊列
  addSelectedToJoinQueue() {
    const ids = this.selectedResourceIds();
    if (ids.length === 0) {
      this.toastService.error('請先選擇資源');
      return;
    }
    
    this.ipcService.send('add-to-join-queue', {
      resourceIds: ids,
      priority: 5
    });
  }
  
  // 處理加入隊列
  processJoinQueue() {
    this.isProcessingJoinQueue.set(true);
    this.ipcService.send('process-join-queue', {
      limit: 5
    });
  }
  
  // 批量加入選中資源
  // 🔍 多渠道選擇方法（新增）
  toggleSearchSource(source: string): void {
    const current = this.selectedSearchSources();
    if (current.includes(source)) {
      this.selectedSearchSources.set(current.filter(s => s !== source));
    } else {
      this.selectedSearchSources.set([...current, source]);
    }
  }
  
  selectAllSearchSources(): void {
    this.selectedSearchSources.set(['telegram', 'jiso', 'tgstat', 'local']);
  }
  
  // 👥 進入群組（新增）
  enterGroup(resource: any): void {
    // 跳轉到成員提取頁面，使用群組搜索組件
    this.changeView('resources');
    // TODO: 觸發成員提取服務
    this.toastService.info(`準備進入群組：${resource.title}`);
  }
  
  batchEnterGroups(): void {
    const ids = this.selectedResourceIds();
    if (ids.length === 0) {
      this.toastService.error('請先選擇群組');
      return;
    }
    
    const resources = this.discoveredResources().filter(r => ids.includes(r.id));
    this.toastService.info(`準備進入 ${resources.length} 個群組查看成員`);
    // TODO: 實現批量進入群組邏輯
  }
  
  // 📨 批量群發（新增）
  sendGroupMessage(resource: any): void {
    this.selectedResourceIds.set([resource.id]);
    this.showBatchMessageDialog.set(true);
  }
  
  executeBatchMessage(): void {
    const ids = this.selectedResourceIds();
    if (ids.length === 0 || !this.batchMessageContent.trim()) {
      this.toastService.error('請選擇群組並輸入消息內容');
      return;
    }
    
    const resources = this.discoveredResources().filter(r => ids.includes(r.id));
    this.toastService.success(`開始向 ${resources.length} 個群組發送消息`);
    this.showBatchMessageDialog.set(false);
    // TODO: 調用批量發送 API
  }
  
  // ➕ 批量拉群（新增）
  inviteMembersToGroup(resource: any): void {
    this.selectedResourceIds.set([resource.id]);
    this.loadAvailableMembers();
    this.showBatchInviteDialog.set(true);
  }
  
  executeBatchInvite(): void {
    const groupIds = this.selectedResourceIds();
    const memberIds = this.batchInviteConfig.selectedMemberIds;
    
    if (groupIds.length === 0 || memberIds.length === 0) {
      this.toastService.error('請選擇群組和成員');
      return;
    }
    
    this.toastService.success(`開始邀請 ${memberIds.length} 位成員加入 ${groupIds.length} 個群組`);
    this.showBatchInviteDialog.set(false);
    // TODO: 調用批量邀請 API
  }
  
  loadAvailableMembers(): void {
    // 從成員提取服務或數據庫加載可用成員
    this.availableMembersForInvite.set([
      { id: '1', name: '示例成員1', username: 'member1' },
      { id: '2', name: '示例成員2', username: 'member2' }
    ]);
  }
  
  toggleSelectAllMembers(event: any): void {
    const checked = event.target.checked;
    if (checked) {
      this.batchInviteConfig.selectedMemberIds = this.availableMembersForInvite().map(m => m.id);
      this.batchInviteConfig.selectAll = true;
    } else {
      this.batchInviteConfig.selectedMemberIds = [];
      this.batchInviteConfig.selectAll = false;
    }
  }
  
  toggleMemberSelection(memberId: string, event: any): void {
    const checked = event.target.checked;
    const current = this.batchInviteConfig.selectedMemberIds;
    if (checked) {
      this.batchInviteConfig.selectedMemberIds = [...current, memberId];
    } else {
      this.batchInviteConfig.selectedMemberIds = current.filter(id => id !== memberId);
    }
    this.batchInviteConfig.selectAll = 
      this.batchInviteConfig.selectedMemberIds.length === this.availableMembersForInvite().length;
  }
  
  batchJoinSelected() {
    const ids = this.selectedResourceIds();
    if (ids.length === 0) {
      this.toastService.error('請先選擇資源');
      return;
    }
    
    this.ipcService.send('batch-join-resources', {
      resourceIds: ids,
      delayMin: 30,
      delayMax: 60
    });
  }
  
  // 📋 資源操作菜單控制
  toggleResourceMenu(resourceId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.openResourceMenuId() === resourceId) {
      this.openResourceMenuId.set(null);
    } else {
      this.openResourceMenuId.set(resourceId);
    }
  }

  closeResourceMenu() {
    this.openResourceMenuId.set(null);
  }
  
  // 獲取狀態顏色
  getResourceStatusColor(status: string): string {
    const colors: {[key: string]: string} = {
      'discovered': 'bg-blue-500',
      'queued': 'bg-yellow-500',
      'joining': 'bg-orange-500',
      'joined': 'bg-green-500',
      'monitoring': 'bg-emerald-500',
      'left': 'bg-gray-500',
      'blocked': 'bg-red-500',
      'invalid': 'bg-slate-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  // 基於成員數獲取規模等級 (S/A/B/C/D)
  getSizeGrade(memberCount: number): { grade: string; color: string; bgColor: string; label: string } {
    if (memberCount >= 100000) {
      return { grade: 'S', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/50', label: '超大型' };
    } else if (memberCount >= 10000) {
      return { grade: 'A', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50', label: '大型' };
    } else if (memberCount >= 1000) {
      return { grade: 'B', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50', label: '中型' };
    } else if (memberCount >= 100) {
      return { grade: 'C', color: 'text-slate-400', bgColor: 'bg-slate-500/20 border-slate-500/50', label: '小型' };
    } else {
      return { grade: 'D', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50', label: '微型' };
    }
  }

  // 舊方法保留相容性
  getScoreGrade(score: number): { grade: string; color: string; bgColor: string; icon: string } {
    const percent = score * 100;
    if (percent >= 90) {
      return { grade: 'S', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/50', icon: '🏆' };
    } else if (percent >= 75) {
      return { grade: 'A', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50', icon: '⭐' };
    } else if (percent >= 60) {
      return { grade: 'B', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50', icon: '👍' };
    } else if (percent >= 40) {
      return { grade: 'C', color: 'text-slate-400', bgColor: 'bg-slate-500/20 border-slate-500/50', icon: '👌' };
    } else {
      return { grade: 'D', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50', icon: '⚠️' };
    }
  }

  // 獲取評分進度條顏色
  getScoreBarColor(score: number): string {
    const percent = score * 100;
    if (percent >= 90) return 'bg-amber-400';
    if (percent >= 75) return 'bg-green-400';
    if (percent >= 60) return 'bg-blue-400';
    if (percent >= 40) return 'bg-slate-400';
    return 'bg-red-400';
  }
  
  // 獲取狀態顯示名稱
  getResourceStatusName(status: string): string {
    const names: {[key: string]: string} = {
      'discovered': '已發現',
      'queued': '隊列中',
      'joining': '加入中',
      'joined': '已加入',
      'monitoring': '監控中',
      'left': '已退出',
      'blocked': '被封禁',
      'invalid': '無效'
    };
    return names[status] || status;
  }
  
  // 獲取類型顯示名稱
  getResourceTypeName(type: string): string {
    const names: {[key: string]: string} = {
      'group': '群組',
      'supergroup': '超級群組',
      'channel': '頻道',
      'bot': '機器人'
    };
    return names[type] || type;
  }
  
  // 獲取資源類型圖標和樣式
  getResourceTypeStyle(type: string): { icon: string; label: string; bgClass: string; textClass: string; canMessage: boolean; canExtract: boolean } {
    const styles: {[key: string]: { icon: string; label: string; bgClass: string; textClass: string; canMessage: boolean; canExtract: boolean }} = {
      'channel': { icon: '📢', label: '頻道', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400', canMessage: false, canExtract: false },
      'supergroup': { icon: '👥', label: '超級群組', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', canMessage: true, canExtract: true },
      'group': { icon: '💬', label: '群組', bgClass: 'bg-green-500/20', textClass: 'text-green-400', canMessage: true, canExtract: true },
      'bot': { icon: '🤖', label: '機器人', bgClass: 'bg-orange-500/20', textClass: 'text-orange-400', canMessage: true, canExtract: false }
    };
    return styles[type] || { icon: '📌', label: '未知', bgClass: 'bg-slate-500/20', textClass: 'text-slate-400', canMessage: false, canExtract: false };
  }

  // 判斷資源是否為頻道
  isChannel(resource: any): boolean {
    return resource?.resource_type === 'channel';
  }

  // 判斷資源是否可以發送消息（用於資源發現頁面）
  canSendMessageToResource(resource: any): boolean {
    // 頻道不能發送消息
    if (this.isChannel(resource)) return false;
    // TODO: 後續可添加禁言群組檢測
    return true;
  }

  // 判斷資源是否可以提取成員
  canExtractMembers(resource: any): boolean {
    // 頻道不能提取成員
    if (this.isChannel(resource)) return false;
    return true;
  }

  // 顯示頻道無法提取成員的警告
  showChannelMemberWarning() {
    this.toastService.warning('📢 頻道無法提取成員列表\n\nTelegram 不允許查看頻道的訂閱者列表。\n\n💡 建議：尋找該頻道的關聯討論群組');
  }

  // 顯示頻道無法發送消息的警告
  showChannelMessageWarning() {
    this.toastService.warning('📢 頻道無法發送消息\n\n只有頻道管理員可以發布內容。\n\n💡 建議：關注頻道獲取資訊，或尋找討論群組');
  }

  // 驗證資源類型（通過 Telegram API）
  verifyResourceType(resource: any) {
    if (!resource?.id) {
      this.toastService.error('無效的資源');
      return;
    }
    this.toastService.info(`🔍 正在驗證: ${resource.title || resource.username}...`);
    this.ipcService.send('verify-resource-type', { resourceId: resource.id });
  }

  // 獲取資源的權限狀態描述
  getResourcePermissionStatus(resource: any): { icon: string; text: string; class: string } {
    if (this.isChannel(resource)) {
      return { icon: '📢', text: '僅訂閱', class: 'text-purple-400' };
    }
    // TODO: 檢測禁言群組
    return { icon: '✅', text: '可互動', class: 'text-green-400' };
  }

  // 獲取選中的頻道數量
  getSelectedChannelCount(): number {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type === 'channel').length;
  }

  // 獲取選中的群組數量（非頻道）
  getSelectedGroupCount(): number {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type !== 'channel').length;
  }

  // 獲取可發消息的選中資源
  getSelectedMessageableResources(): any[] {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type !== 'channel');
  }

  // 獲取可提取成員的選中資源
  getSelectedExtractableResources(): any[] {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type !== 'channel');
  }

  // 打開批量群發（自動過濾頻道）
  openBatchMessageWithFilter() {
    const channels = this.getSelectedChannelCount();
    if (channels > 0) {
      this.toastService.info(`📢 已自動排除 ${channels} 個頻道，將對 ${this.getSelectedGroupCount()} 個群組發送消息`);
    }
    this.showBatchMessageDialog.set(true);
  }

}

export const member_methods_descriptors = Object.getOwnPropertyDescriptors(MemberMethodsMixin.prototype);
