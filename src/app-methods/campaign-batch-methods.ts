// @ts-nocheck
/**
 * Phase 9-1b: Batch, Ads, Tracking, Campaign, Multi-Role
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 *
 * 🔧 孤兒方法清理（Stage 4）：本檔案原有 133 個方法，經逐一核實呼叫關係（模板綁定、
 * 其他 .ts 文件呼叫、IPC 監聽器回呼）後確認，121 個方法已無任何呼叫者，屬於過往重構
 * 留下的孤兒代碼（批量操作/標籤、廣告發送系統、用戶追蹤系統、營銷活動協調器、多角色
 * 協作的大部分方法均已被新版 AdSystemService / UserTrackingService /
 * CampaignManagementService 等獨立服務取代，或對應 UI 入口已從模板中移除）。
 * 僅保留仍有真實呼叫者的 11 個方法：clearLeadSelection、executeDeleteLeads、
 * cancelDeleteLeads、undoBatchOperation（由 app.component.html 的
 * <app-delete-confirm-dialog>/<app-batch-operation-history-dialog> 綁定呼叫）、
 * loadBackups（由 ipc-handlers/data-sync-ipc.ts 在備份建立/刪除成功回呼中呼叫），
 * 以及 loadMultiRoleData 與其內部呼叫的 6 個 loadXxx 方法（由 app.component.html
 * 側邊欄「多角色協作」點擊事件呼叫）。
 */

class CampaignBatchMethodsMixin {
  // ==================== Lead 選取與刪除（仍在使用） ====================

  clearLeadSelection() {
    this.selectedLeadIds.set(new Set());
    this.isSelectAllLeads.set(false);
    this.showBatchOperationMenu.set(false);
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

  // Undo batch operation
  undoBatchOperation(operationId: string) {
    if (!confirm('確定要撤銷此操作嗎？')) {
      return;
    }
    
    this.ipcService.send('undo-batch-operation', { operationId });
  }

  // 加載備份列表（仍被 data-sync-ipc.ts 在備份建立/刪除成功後呼叫）
  loadBackups() {
    this.ipcService.send('list-backups', {});
  }

  // ==================== Multi-Role Methods (多角色協作，仍在使用) ====================
  
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

}

export const campaign_batch_methods_descriptors = Object.getOwnPropertyDescriptors(CampaignBatchMethodsMixin.prototype);
