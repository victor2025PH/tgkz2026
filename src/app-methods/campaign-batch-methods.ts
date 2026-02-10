// @ts-nocheck
/**
 * Phase 9-1b: Batch, Ads, Tracking, Campaign, Multi-Role
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 */

class CampaignBatchMethodsMixin {
  // ==================== Batch Operations (批量操作) ====================
  
  toggleLeadSelection(leadId: number) {
    this.selectedLeadIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(leadId)) {
        newIds.delete(leadId);
      } else {
        newIds.add(leadId);
      }
      return newIds;
    });
    // Update select all state
    this.isSelectAllLeads.set(this.selectedLeadIds().size === this.leads().length);
  }
  
  toggleSelectAllLeads() {
    if (this.isSelectAllLeads()) {
      // 取消全選
      this.selectedLeadIds.set(new Set());
      this.isSelectAllLeads.set(false);
    } else {
      // 全選當前已加載的數據
      const currentLeads = this.leads();
      const allIds = new Set(currentLeads.map(l => l.id));
      this.selectedLeadIds.set(allIds);
      this.isSelectAllLeads.set(true);
      
      if (allIds.size > 0) {
        this.toastService.success(`已選擇 ${allIds.size} 個客戶`);
      }
    }
  }
  
  clearLeadSelection() {
    this.selectedLeadIds.set(new Set());
    this.isSelectAllLeads.set(false);
    this.showBatchOperationMenu.set(false);
  }
  
  isLeadSelected(leadId: number): boolean {
    return this.selectedLeadIds().has(leadId);
  }
  
  // 全選當前篩選的 leads
  selectAllFilteredLeads() {
    const currentLeads = this.filteredLeads();
    const allIds = new Set(currentLeads.map(l => l.id));
    this.selectedLeadIds.set(allIds);
    
    if (allIds.size > 0) {
      this.toastService.success(`已選擇 ${allIds.size} 個客戶`);
    }
  }
  
  // 刪除確認狀態
  // 確認刪除單個 lead
  confirmDeleteLead(lead: CapturedLead) {
    this.deleteConfirmDialog.set({
      show: true,
      type: 'single',
      lead
    });
  }
  
  // 確認批量刪除
  confirmBatchDeleteLeads() {
    const count = this.selectedLeadsCount();
    if (count === 0) {
      this.toastService.warning('請先選擇要刪除的客戶');
      return;
    }
    this.deleteConfirmDialog.set({
      show: true,
      type: 'batch',
      count
    });
  }
  
  // 執行刪除
  executeDeleteLeads() {
    const dialog = this.deleteConfirmDialog();
    
    // 先關閉對話框
    this.deleteConfirmDialog.set({ show: false, type: 'single' });
    
    if (dialog.type === 'single' && dialog.lead) {
      // 單個刪除
      this.ipcService.send('delete-lead', { leadId: dialog.lead.id });
      this.leads.update(leads => leads.filter(l => l.id !== dialog.lead!.id));
      this.toastService.success(`已刪除客戶 @${dialog.lead.username || dialog.lead.userId}`);
    } else if (dialog.type === 'batch') {
      // 批量刪除
      const leadIds = Array.from(this.selectedLeadIds());
      
      if (leadIds.length === 0) {
        this.toastService.warning('沒有選中的客戶');
        return;
      }
      
      // 設置進度狀態
      this.batchOperationInProgress.set(true);
      this.showBatchOperationMenu.set(false);
      
      // 發送刪除請求
      this.ipcService.send('batch-delete-leads', { leadIds });
      
      // 立即更新本地狀態
      this.leads.update(leads => leads.filter(l => !this.selectedLeadIds().has(l.id)));
      this.toastService.success(`正在刪除 ${leadIds.length} 個客戶...`);
      this.clearLeadSelection();
    }
  }
  
  // 取消刪除
  cancelDeleteLeads() {
    this.deleteConfirmDialog.set({ show: false, type: 'single' });
  }
  
  // 導出選中的 leads
  exportSelectedLeads() {
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇要導出的客戶');
      return;
    }
    const selectedLeads = this.leads().filter(l => leadIds.includes(l.id));
    // 生成 CSV
    const headers = ['ID', '用戶名', '姓名', '狀態', '來源', '關鍵詞', '時間'];
    const rows = selectedLeads.map(l => [
      l.userId,
      l.username || '',
      `${l.firstName || ''} ${l.lastName || ''}`.trim(),
      l.status,
      l.sourceGroup,
      l.triggeredKeyword,
      new Date(l.timestamp).toLocaleString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success(`已導出 ${selectedLeads.length} 個客戶`);
  }
  
  // Batch update status
  batchUpdateLeadStatus(newStatus: LeadStatus) {
    // 检查批量操作权限
    if (!this.membershipService.hasFeature('batchOperations')) {
      this.toastService.warning(`🥇 批量操作功能需要 黃金大師 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-update-lead-status', {
      leadIds,
      newStatus
    });
  }
  
  // Batch add tag
  batchAddTag(tag: string) {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    if (!tag || !tag.trim()) {
      this.toastService.warning('請輸入標籤名稱');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchTagSelector.set(false);
    
    this.ipcService.send('batch-add-tag', {
      leadIds,
      tag: tag.trim()
    });
  }
  
  // Batch remove tag
  batchRemoveTag(tag: string) {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    
    this.ipcService.send('batch-remove-tag', {
      leadIds,
      tag
    });
  }
  
  // Batch add to DNC
  batchAddToDnc() {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    if (!confirm(`確定要將 ${leadIds.length} 個 Lead 添加到 DNC 列表嗎？`)) {
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-add-to-dnc', { leadIds });
  }
  
  // Batch remove from DNC
  batchRemoveFromDnc() {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-remove-from-dnc', { leadIds });
  }
  
  // Batch update funnel stage
  batchUpdateFunnelStage(newStage: string) {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-update-funnel-stage', {
      leadIds,
      newStage
    });
  }
  
  // Batch delete leads - 使用統一的確認對話框
  batchDeleteLeads() {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    // 使用統一的確認對話框
    this.confirmBatchDeleteLeads();
  }
  
  // Undo batch operation
  undoBatchOperation(operationId: string) {
    if (!confirm('確定要撤銷此操作嗎？')) {
      return;
    }
    
    this.ipcService.send('undo-batch-operation', { operationId });
  }
  
  // Load batch operation history
  loadBatchOperationHistory() {
    this.ipcService.send('get-batch-operation-history', {
      limit: 50,
      offset: 0
    });
    this.showBatchOperationHistory.set(true);
  }
  
  // 打開批量操作菜單（帶權限檢查）
  openBatchOperationMenu() {
    // 檢查批量操作權限
    if (!this.membershipService.hasFeature('batchOperations')) {
      this.toastService.warning(`🥇 批量操作功能需要 黃金大師 或以上會員，點擊升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      this.showLeadsActionMenu.set(false);
      return;
    }
    
    // 有權限則打開批量操作工具欄
    this.showBatchOperationMenu.set(!this.showBatchOperationMenu());
    this.loadAllTags();
    this.showLeadsActionMenu.set(false);
  }
  
  // Load all tags
  loadAllTags() {
    this.ipcService.send('get-all-tags', {});
  }
  
  // Create new tag
  createTag() {
    const name = this.newTagName().trim();
    if (!name) {
      this.toastService.warning('請輸入標籤名稱');
      return;
    }
    
    this.ipcService.send('create-tag', {
      name,
      color: this.newTagColor()
    });
    
    this.newTagName.set('');
    this.showAddTagDialog.set(false);
  }
  
  // Delete tag
  deleteTag(tagName: string) {
    if (!confirm(`確定要刪除標籤 "${tagName}" 嗎？此標籤將從所有 Lead 中移除。`)) {
      return;
    }
    
    this.ipcService.send('delete-tag', { name: tagName });
  }
  
  // Full-text search for leads
  onLeadSearchInput() {
    // Debounce search
    if (this.leadSearchTimeout) {
      clearTimeout(this.leadSearchTimeout);
    }
    
    const query = this.leadSearchQuery().trim();
    if (!query || query.length < 2) {
      this.leadSearchResults.set([]);
      return;
    }
    
    this.leadSearchTimeout = setTimeout(() => {
      this.searchLeads();
    }, 500);
  }
  
  searchLeads() {
    const query = this.leadSearchQuery().trim();
    if (!query || query.length < 2) {
      this.leadSearchResults.set([]);
      return;
    }
    
    this.isSearchingLeads.set(true);
    this.ipcService.send('search-leads', {
      query,
      limit: 100
    });
  }
  
  clearLeadSearch() {
    this.leadSearchQuery.set('');
    this.leadSearchResults.set([]);
    if (this.leadSearchTimeout) {
      clearTimeout(this.leadSearchTimeout);
      this.leadSearchTimeout = null;
    }
  }
  
  // Backup management functions
  createBackup() {
    this.isCreatingBackup.set(true);
    this.ipcService.send('create-backup', {
      name: `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`,
      description: 'Manual backup'
    });
  }
  
  loadBackups() {
    this.ipcService.send('list-backups', {});
  }
  
  restoreBackup(backupId: string) {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖！')) {
      return;
    }
    
    this.isRestoringBackup.set(true);
    this.ipcService.send('restore-backup', {
      backupId
    });
  }
  
  deleteBackup(backupId: string) {
    if (!confirm('确定要删除此备份吗？此操作无法撤销！')) {
      return;
    }
    
    this.ipcService.send('delete-backup', {
      backupId
    });
  }
  
  // Handle batch operation result
  private handleBatchOperationResult(data: any) {
    this.batchOperationInProgress.set(false);
    
    if (data.success) {
      const successCount = data.successCount || 0;
      const failureCount = data.failureCount || 0;
      
      if (failureCount > 0) {
        this.toastService.warning(`批量操作完成: ${successCount} 成功, ${failureCount} 失敗`);
      } else {
        this.toastService.success(`批量操作完成: ${successCount} 項已處理`);
      }
      
      // Clear selection after successful operation
      this.clearLeadSelection();
      
      // Refresh leads data
      this.ipcService.send('get-initial-state', {});
    } else {
      this.toastService.error(`批量操作失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Handle batch operation progress
  private handleBatchOperationProgress(data: any) {
    // Update progress dialog
    this.progressDialog.set({
      show: true,
      title: '批量操作進行中...',
      progress: {
        current: data.current,
        total: data.total,
        message: data.message
      },
      cancellable: false
    });
    
    // Hide progress dialog when complete
    if (data.current >= data.total) {
      setTimeout(() => {
        this.progressDialog.update(p => ({ ...p, show: false }));
      }, 500);
    }
  }
  
  // Handle batch undo result
  private handleBatchUndoResult(data: any) {
    if (data.success) {
      this.toastService.success('操作已撤銷');
      // Refresh leads and history
      this.ipcService.send('get-initial-state', {});
      this.loadBatchOperationHistory();
    } else {
      this.toastService.error(`撤銷失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Handle batch operation history
  private handleBatchOperationHistory(data: any) {
    if (data.success) {
      this.batchOperationHistory.set(data.operations || []);
    }
  }
  
  // Handle all tags response
  private handleAllTags(data: any) {
    if (data.success) {
      this.allTags.set(data.tags || []);
    }
  }
  
  // Handle tag created
  private handleTagCreated(data: any) {
    if (data.success) {
      this.toastService.success('標籤創建成功');
      this.loadAllTags();
    } else {
      this.toastService.error(`創建標籤失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Handle tag deleted
  private handleTagDeleted(data: any) {
    if (data.success) {
      this.toastService.success('標籤已刪除');
      this.loadAllTags();
    } else {
      this.toastService.error(`刪除標籤失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Get operation type display name
  getOperationTypeName(type: string): string {
    const names: Record<string, string> = {
      'update_status': '更新狀態',
      'add_tag': '添加標籤',
      'remove_tag': '移除標籤',
      'add_to_dnc': '添加到 DNC',
      'remove_from_dnc': '從 DNC 移除',
      'update_funnel_stage': '更新漏斗階段',
      'delete': '刪除'
    };
    return names[type] || type;
  }
  
  // Format date for display
  formatBatchOperationDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ==================== Ad System Methods (廣告發送系統) ====================
  
  loadAdTemplates() {
    this.ipcService.send('get-ad-templates', { activeOnly: false });
  }
  
  loadAdSchedules() {
    this.ipcService.send('get-ad-schedules', { activeOnly: false });
  }
  
  loadAdSendLogs() {
    this.ipcService.send('get-ad-send-logs', { limit: 100 });
  }
  
  loadAdOverviewStats() {
    this.ipcService.send('get-ad-overview-stats', { days: 7 });
  }
  
  loadAdSystemData() {
    this.loadAdTemplates();
    this.loadAdSchedules();
    this.loadAdOverviewStats();
  }
  
  createAdTemplate() {
    // 检查广告发送权限
    if (!this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning(`🥈 廣告發送功能需要 白銀精英 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.newAdTemplate();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入模板名稱');
      return;
    }
    if (!form.content.trim()) {
      this.toastService.warning('請輸入模板內容');
      return;
    }
    
    this.ipcService.send('create-ad-template', {
      name: form.name,
      content: form.content,
      mediaType: form.mediaType
    });
    
    this.newAdTemplate.set({ name: '', content: '', mediaType: 'text' });
    this.showAdTemplateForm.set(false);
  }
  
  deleteAdTemplate(templateId: number) {
    if (!confirm('確定要刪除此廣告模板嗎？')) return;
    this.ipcService.send('delete-ad-template', { templateId });
  }
  
  toggleAdTemplateStatus(templateId: number) {
    this.ipcService.send('toggle-ad-template-status', { templateId });
  }
  
  previewSpintax(content: string) {
    if (!content.trim()) {
      this.spintaxPreview.set([]);
      return;
    }
    this.isPreviewingSpintax.set(true);
    this.ipcService.send('validate-spintax', { content });
  }
  
  createAdSchedule() {
    // 检查广告发送权限
    if (!this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning(`🥈 廣告發送功能需要 白銀精英 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.newAdSchedule();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入計劃名稱');
      return;
    }
    if (!form.templateId) {
      this.toastService.warning('請選擇廣告模板');
      return;
    }
    if (form.targetGroups.length === 0) {
      this.toastService.warning('請選擇目標群組');
      return;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning('請選擇發送帳號');
      return;
    }
    
    this.ipcService.send('create-ad-schedule', form);
    
    this.newAdSchedule.set({
      name: '',
      templateId: 0,
      targetGroups: [],
      sendMode: 'scheduled',
      scheduleType: 'once',
      scheduleTime: '',
      intervalMinutes: 60,
      triggerKeywords: [],
      accountStrategy: 'rotate',
      assignedAccounts: []
    });
    this.showAdScheduleForm.set(false);
  }
  
  deleteAdSchedule(scheduleId: number) {
    if (!confirm('確定要刪除此廣告計劃嗎？')) return;
    this.ipcService.send('delete-ad-schedule', { scheduleId });
  }
  
  toggleAdScheduleStatus(scheduleId: number) {
    this.ipcService.send('toggle-ad-schedule-status', { scheduleId });
  }
  
  runAdScheduleNow(scheduleId: number) {
    if (!confirm('確定要立即執行此計劃嗎？')) return;
    this.ipcService.send('run-ad-schedule-now', { scheduleId });
    this.toastService.info('正在執行...');
  }
  
  getSendModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      'scheduled': '定時發送',
      'triggered': '關鍵詞觸發',
      'relay': '接力發送',
      'interval': '間隔循環'
    };
    return labels[mode] || mode;
  }
  
  getScheduleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'once': '一次性',
      'daily': '每日',
      'interval': '間隔',
      'cron': 'Cron'
    };
    return labels[type] || type;
  }
  
  getAccountStrategyLabel(strategy: string): string {
    const labels: Record<string, string> = {
      'single': '單一帳號',
      'rotate': '輪換帳號',
      'relay': '接力發送',
      'random': '隨機選擇'
    };
    return labels[strategy] || strategy;
  }
  
  getAdStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'sent': 'bg-green-500/20 text-green-400',
      'failed': 'bg-red-500/20 text-red-400',
      'deleted': 'bg-yellow-500/20 text-yellow-400',
      'banned': 'bg-red-600/20 text-red-500'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  toggleAccountForSchedule(phone: string) {
    this.newAdSchedule.update(s => {
      const accounts = [...s.assignedAccounts];
      const idx = accounts.indexOf(phone);
      if (idx >= 0) {
        accounts.splice(idx, 1);
      } else {
        accounts.push(phone);
      }
      return { ...s, assignedAccounts: accounts };
    });
  }
  
  updateScheduleTargetGroups(value: string) {
    const groups = value.split('\n')
      .map(g => g.trim())
      .filter(g => g.length > 0);
    this.newAdSchedule.update(s => ({ ...s, targetGroups: groups }));
  }
  
  // Handle ad system events
  private handleAdTemplates(data: any) {
    if (data.success) {
      this.adTemplates.set(data.templates || []);
    }
  }
  
  private handleAdSchedules(data: any) {
    if (data.success) {
      this.adSchedules.set(data.schedules || []);
    }
  }
  
  private handleAdSendLogs(data: any) {
    if (data.success) {
      this.adSendLogs.set(data.logs || []);
    }
  }
  
  private handleAdOverviewStats(data: any) {
    if (data.success) {
      this.adOverviewStats.set(data.overview || null);
    }
  }
  
  private handleAdTemplateCreated(data: any) {
    if (data.success) {
      this.toastService.success('廣告模板已創建');
      this.loadAdTemplates();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleAdTemplateDeleted(data: any) {
    if (data.success) {
      this.toastService.success('廣告模板已刪除');
      this.loadAdTemplates();
    }
  }
  
  private handleAdScheduleCreated(data: any) {
    if (data.success) {
      this.toastService.success('廣告計劃已創建');
      this.loadAdSchedules();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleAdScheduleDeleted(data: any) {
    if (data.success) {
      this.toastService.success('廣告計劃已刪除');
      this.loadAdSchedules();
    }
  }
  
  private handleSpintaxValidated(data: any) {
    this.isPreviewingSpintax.set(false);
    if (data.success || data.valid) {
      this.spintaxPreview.set(data.variants || []);
    } else {
      this.toastService.error(`Spintax 語法錯誤: ${data.error}`);
      this.spintaxPreview.set([]);
    }
  }
  
  private handleAdScheduleRunResult(data: any) {
    if (data.success) {
      this.toastService.success(`計劃執行完成: ${data.sent || 0} 成功, ${data.failed || 0} 失敗`);
      this.loadAdSendLogs();
      this.loadAdOverviewStats();
    } else {
      this.toastService.error(`執行失敗: ${data.error}`);
    }
  }

  // ==================== User Tracking Methods (用戶追蹤系統) ====================
  
  loadTrackedUsers() {
    this.ipcService.send('get-tracked-users', { 
      limit: 100,
      valueLevel: this.userValueFilter() || undefined
    });
  }
  
  loadTrackingStats() {
    this.ipcService.send('get-tracking-stats', {});
  }
  
  loadHighValueGroups() {
    this.ipcService.send('get-high-value-groups', { limit: 50 });
  }
  
  loadUserTrackingData() {
    this.loadTrackedUsers();
    this.loadTrackingStats();
    this.loadHighValueGroups();
  }
  
  addUserToTrack() {
    const form = this.newTrackedUser();
    if (!form.userId.trim()) {
      this.toastService.warning('請輸入用戶 ID');
      return;
    }
    
    this.ipcService.send('add-user-to-track', {
      userId: form.userId.trim(),
      username: form.username.trim() || undefined,
      notes: form.notes.trim() || undefined,
      source: 'manual'
    });
    
    this.newTrackedUser.set({ userId: '', username: '', notes: '' });
    this.showAddUserForm.set(false);
  }
  
  addLeadToTracking(leadId: number) {
    this.ipcService.send('add-user-from-lead', { leadId });
  }
  
  removeTrackedUser(userId: string) {
    if (!confirm('確定要移除此用戶追蹤嗎？')) return;
    this.ipcService.send('remove-tracked-user', { userId });
  }
  
  trackUserGroups(userId: string) {
    const onlineAccounts = this.accounts().filter(a => a.status === 'Online');
    if (onlineAccounts.length === 0) {
      this.toastService.warning('沒有在線帳號可用於追蹤');
      return;
    }
    
    this.isTrackingUser.set(true);
    this.ipcService.send('track-user-groups', {
      userId,
      accountPhone: onlineAccounts[0].phone
    });
  }
  
  viewUserGroups(user: any) {
    this.selectedTrackedUser.set(user);
    this.ipcService.send('get-user-groups', { userId: user.userId });
  }
  
  updateUserValueLevel(userId: string, valueLevel: string) {
    this.ipcService.send('update-user-value-level', { userId, valueLevel });
  }
  
  getValueLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'vip': 'VIP',
      'high': '高價值',
      'medium': '中等',
      'low': '低'
    };
    return labels[level] || level;
  }
  
  getValueLevelColor(level: string): string {
    const colors: Record<string, string> = {
      'vip': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'medium': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'low': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[level] || 'bg-slate-500/20 text-slate-400';
  }
  
  getTrackingStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '待追蹤',
      'tracking': '追蹤中',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  getTrackingStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'tracking': 'bg-blue-500/20 text-blue-400',
      'completed': 'bg-green-500/20 text-green-400',
      'failed': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  // Handle user tracking events
  private handleTrackedUsers(data: any) {
    if (data.success) {
      this.trackedUsers.set(data.users || []);
    }
  }
  
  private handleUserGroups(data: any) {
    if (data.success) {
      this.userGroups.set(data.groups || []);
    }
  }
  
  private handleHighValueGroups(data: any) {
    if (data.success) {
      this.highValueGroups.set(data.groups || []);
    }
  }
  
  private handleTrackingStats(data: any) {
    if (data.success) {
      this.trackingStats.set(data.stats || null);
    }
  }
  
  private handleUserAddedToTrack(data: any) {
    if (data.success) {
      this.toastService.success('用戶已添加到追蹤列表');
      this.loadTrackedUsers();
    } else {
      this.toastService.error(`添加失敗: ${data.error}`);
    }
  }
  
  private handleUserRemoved(data: any) {
    if (data.success) {
      this.toastService.success('用戶已移除');
      this.loadTrackedUsers();
    }
  }
  
  private handleUserTrackingCompleted(data: any) {
    this.isTrackingUser.set(false);
    if (data.success) {
      this.toastService.success(`追蹤完成: 發現 ${data.groupsFound} 個群組, ${data.highValueGroups} 個高價值`);
      this.loadTrackedUsers();
      this.loadTrackingStats();
      this.loadHighValueGroups();
    }
  }
  
  private handleUserTrackingFailed(data: any) {
    this.isTrackingUser.set(false);
    this.toastService.error(`追蹤失敗: ${data.error}`);
    this.loadTrackedUsers();
  }

  // ==================== Campaign Methods (營銷活動協調器) ====================
  
  loadCampaigns() {
    this.ipcService.send('get-campaigns', { limit: 50 });
  }
  
  loadUnifiedOverview() {
    this.ipcService.send('get-unified-overview', { days: 7 });
  }
  
  loadFunnelAnalysis() {
    this.ipcService.send('get-funnel-analysis', {});
  }
  
  loadCampaignData() {
    this.loadCampaigns();
    this.loadUnifiedOverview();
    this.loadFunnelAnalysis();
  }
  
  createCampaignFromForm() {
    // 检查营销活动权限
    if (!this.membershipService.hasFeature('aiSalesFunnel')) {
      this.toastService.warning(`💎 營銷活動功能需要 鑽石王牌 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.campaignFormData();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入活動名稱');
      return;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning('請選擇帳號');
      return;
    }
    
    this.ipcService.send('create-campaign', {
      name: form.name,
      description: form.description,
      phases: form.phases,
      keywords: form.keywords,
      targetGroups: form.targetGroups,
      assignedAccounts: form.assignedAccounts
    });
    
    this.campaignFormData.set({
      name: '',
      description: '',
      phases: ['discovery', 'monitoring', 'outreach'],
      keywords: [],
      targetGroups: [],
      assignedAccounts: []
    });
    this.showCampaignForm.set(false);
  }
  
  startCampaign(campaignId: string) {
    if (!confirm('確定要啟動此活動嗎？')) return;
    this.ipcService.send('start-campaign', { campaignId });
  }
  
  pauseCampaign(campaignId: string) {
    this.ipcService.send('pause-campaign', { campaignId });
  }
  
  resumeCampaign(campaignId: string) {
    this.ipcService.send('resume-campaign', { campaignId });
  }
  
  stopCampaign(campaignId: string) {
    if (!confirm('確定要停止此活動嗎？')) return;
    this.ipcService.send('stop-campaign', { campaignId });
  }
  
  deleteCampaign(campaignId: string) {
    if (!confirm('確定要刪除此活動嗎？')) return;
    this.ipcService.send('delete-campaign', { campaignId });
  }
  
  viewCampaignDetails(campaign: any) {
    this.selectedCampaign.set(campaign);
    this.ipcService.send('get-campaign-logs', { campaignId: campaign.id });
  }
  
  getCampaignStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': '草稿',
      'scheduled': '已排程',
      'running': '運行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  getCampaignStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'draft': 'bg-slate-500/20 text-slate-400',
      'scheduled': 'bg-blue-500/20 text-blue-400',
      'running': 'bg-green-500/20 text-green-400',
      'paused': 'bg-yellow-500/20 text-yellow-400',
      'completed': 'bg-cyan-500/20 text-cyan-400',
      'failed': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      'discovery': '資源發現',
      'monitoring': '監控獲客',
      'outreach': '廣告觸達',
      'tracking': '用戶追蹤',
      'conversion': '轉化成交'
    };
    return labels[phase] || phase;
  }
  
  toggleCampaignPhase(phase: string) {
    this.campaignFormData.update(c => {
      const phases = [...c.phases];
      const idx = phases.indexOf(phase);
      if (idx >= 0) {
        phases.splice(idx, 1);
      } else {
        phases.push(phase);
      }
      return { ...c, phases };
    });
  }
  
  addCampaignKeyword() {
    const keyword = this.campaignKeywordInput().trim();
    if (!keyword) return;
    
    this.campaignFormData.update(c => ({
      ...c,
      keywords: [...c.keywords, keyword]
    }));
    this.campaignKeywordInput.set('');
  }
  
  removeCampaignKeyword(keyword: string) {
    this.campaignFormData.update(c => ({
      ...c,
      keywords: c.keywords.filter(k => k !== keyword)
    }));
  }
  
  toggleCampaignAccount(phone: string) {
    this.campaignFormData.update(c => {
      const accounts = [...c.assignedAccounts];
      const idx = accounts.indexOf(phone);
      if (idx >= 0) {
        accounts.splice(idx, 1);
      } else {
        accounts.push(phone);
      }
      return { ...c, assignedAccounts: accounts };
    });
  }
  
  // Handle campaign events
  private handleCampaigns(data: any) {
    if (data.success) {
      this.campaigns.set(data.campaigns || []);
    }
  }
  
  private handleCampaignCreated(data: any) {
    if (data.success) {
      this.toastService.success('營銷活動已創建');
      this.loadCampaigns();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleCampaignDeleted(data: any) {
    if (data.success) {
      this.toastService.success('營銷活動已刪除');
      this.loadCampaigns();
    }
  }
  
  private handleUnifiedOverview(data: any) {
    if (data.success) {
      this.unifiedOverview.set(data);
    }
  }
  
  private handleFunnelAnalysis(data: any) {
    if (data.success) {
      this.funnelAnalysis.set(data);
    }
  }

  // ==================== Multi-Role Methods (多角色協作) ====================
  
  loadRoleTemplates() {
    this.ipcService.send('get-role-templates', {});
  }
  
  loadAllRoles() {
    this.ipcService.send('get-all-roles', { activeOnly: true });
  }
  
  loadScriptTemplates() {
    this.ipcService.send('get-script-templates', { activeOnly: true });
  }
  
  loadCollabGroups() {
    this.ipcService.send('get-collab-groups', { limit: 50 });
  }
  
  loadCollabStats() {
    this.ipcService.send('get-collab-stats', {});
  }
  
  loadRoleStats() {
    this.ipcService.send('get-role-stats', {});
  }
  
  loadMultiRoleData() {
    this.loadRoleTemplates();
    this.loadAllRoles();
    this.loadScriptTemplates();
    this.loadCollabGroups();
    this.loadCollabStats();
    this.loadRoleStats();
  }
  
  assignRole() {
    const form = this.newRoleAssign();
    if (!form.accountPhone) {
      this.toastService.warning('請選擇帳號');
      return;
    }
    if (!form.roleName.trim()) {
      this.toastService.warning('請輸入角色名稱');
      return;
    }
    
    this.ipcService.send('assign-role', {
      accountPhone: form.accountPhone,
      roleType: form.roleType,
      roleName: form.roleName
    });
    
    this.newRoleAssign.set({ accountPhone: '', roleType: 'seller', roleName: '' });
    this.showRoleAssignForm.set(false);
  }
  
  removeRole(roleId: number) {
    if (!confirm('確定要移除此角色嗎？')) return;
    this.ipcService.send('remove-role', { roleId });
  }
  
  getRoleIcon(roleType: string): string {
    const icons: Record<string, string> = {
      'seller': '🧑‍💼',
      'expert': '👨‍🔬',
      'satisfied': '😊',
      'hesitant': '🤔',
      'converted': '🎉',
      'curious': '❓',
      'manager': '👔',
      'support': '🛠️'
    };
    return icons[roleType] || '👤';
  }
  
  getRoleLabel(roleType: string): string {
    const labels: Record<string, string> = {
      'seller': '銷售顧問',
      'expert': '專業顧問',
      'satisfied': '滿意客戶',
      'hesitant': '猶豫客戶',
      'converted': '成交客戶',
      'curious': '好奇者',
      'manager': '經理主管',
      'support': '售後客服'
    };
    return labels[roleType] || roleType;
  }
  
  getScenarioLabel(scenario: string): string {
    const labels: Record<string, string> = {
      'group_conversion': '群聊轉化',
      'private_followup': '私聊跟進',
      'objection_handling': '異議處理',
      'product_intro': '產品介紹',
      'trust_building': '建立信任',
      'urgency_creation': '製造緊迫感',
      'custom': '自定義'
    };
    return labels[scenario] || scenario;
  }
  
  getCollabStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'warming': '預熱中',
      'active': '活躍中',
      'completed': '已完成',
      'archived': '已歸檔'
    };
    return labels[status] || status;
  }
  
  getCollabStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'warming': 'bg-yellow-500/20 text-yellow-400',
      'active': 'bg-green-500/20 text-green-400',
      'completed': 'bg-blue-500/20 text-blue-400',
      'archived': 'bg-slate-500/20 text-slate-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  // Handle multi-role events
  private handleRoleTemplates(data: any) {
    if (data.success) {
      this.roleTemplates.set(data.templates || {});
    }
  }
  
  private handleAllRoles(data: any) {
    if (data.success) {
      this.allRoles.set(data.roles || []);
    }
  }
  
  private handleScriptTemplates(data: any) {
    if (data.success) {
      this.scriptTemplates.set(data.templates || []);
    }
  }
  
  private handleCollabGroups(data: any) {
    if (data.success) {
      this.collabGroups.set(data.groups || []);
    }
  }
  
  private handleCollabStats(data: any) {
    if (data.success) {
      this.collabStats.set(data);
    }
  }
  
  private handleRoleStats(data: any) {
    if (data.success) {
      this.roleStats.set(data);
    }
  }

}

export const campaign_batch_methods_descriptors = Object.getOwnPropertyDescriptors(CampaignBatchMethodsMixin.prototype);
