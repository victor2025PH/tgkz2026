/**
 * Phase 9-1a: Connection, loading, monitoring, accounts, auth, validation
 * Extracted from AppComponent.setupIpcListeners()
 */
import { LogEntry, TelegramAccount, CapturedLead, KeywordConfig, QueueStatus, QueueMessage, Alert } from '../models';
import { TimeSeriesData } from '../analytics-charts.component';

export function setupCoreIpcHandlers(this: any): void {
    // 🔧 超時命令 → 功能名稱映射，方便給用戶看得懂的提示
    const getCommandDisplayName = (command: string): string => {
      const map: Record<string, string> = {
        'get-account-recommendations': '獲取監控帳號推薦',
        'reassign-group-account':      '切換監控帳號',
        'start-monitoring':            '啟動監控',
        'collect-users-from-history':  '從歷史消息收集用戶',
      };
      return map[command] || `操作 (${command})`;
    };

    // 🆕 P0 優化：監聽連接確認事件（HTTP 成功即連接成功）
    this.ipcService.on('connection-confirmed', (data: { mode: string; timestamp: number }) => {
      console.log('[Frontend] ✅ Connection confirmed:', data);
      this.backendConnectionState.set('connected');
      this.backendConnectionProgress.set(100);
      this.backendConnectionMessage.set('連接成功');
      if (this.connectionTimeoutId) {
        clearTimeout(this.connectionTimeoutId);
        this.connectionTimeoutId = null;
      }
      this.hideConnectionIndicator();
    });
    
    // 🆕 P0 優化：監聯連接錯誤事件
    this.ipcService.on('connection-error', (data: { error: string; message: string }) => {
      console.log('[Frontend] ❌ Connection error:', data);
      // 只有在連接中狀態才更新為錯誤
      if (this.backendConnectionState() === 'connecting') {
        this.backendConnectionState.set('error');
        this.backendConnectionMessage.set(data.message || '連接失敗');
      }
    });
    
    // 🔧 Phase3: 全局 IPC 錯誤邊界 - 捕獲所有未被特定組件處理的命令錯誤
    this.ipcService.on('ipc-command-error', (data: { command: string; error: string; isTimeout: boolean }) => {
      // 排除已被特定組件處理的命令（避免重複 toast）
      const silentCommands = [
        'get-system-status', 'get-initial-state', 'get-accounts', 
        'get-monitored-groups', 'get-keyword-sets', 'get-queue-status',
        'get-monitoring-status', 'get-logs', 'get-alerts',
        'add-monitored-group', 'add-group',  // 搜索頁已處理
        'batch-send:start',                   // 批量發送對話框已處理
      ];
      
      if (silentCommands.includes(data.command)) return;
      
      // 超時提示用較溫和的方式（帶功能名稱 + 背景說明）
      if (data.isTimeout) {
        const feature = getCommandDisplayName(data.command);
        console.warn(`[App] Command timeout: ${data.command}`, data.error);
        this.toastService.warning(
          `${feature} 操作超時，後端可能仍在處理，請稍候片刻後點「刷新」查看最新結果。`,
          8000
        );
      } else {
        console.error(`[App] Command error: ${data.command}`, data.error);
        this.toastService.error(`操作失敗 (${data.command}): ${data.error}`, 5000);
      }
    });
    
    // 🆕 P1 優化：監聽連接模式變更（WebSocket ↔ HTTP 輪詢）
    this.ipcService.on('connection-mode-changed', (data: { mode: 'websocket' | 'polling' }) => {
      console.log('[Frontend] Connection mode changed:', data.mode);
      if (data.mode === 'polling') {
        // 降級模式：顯示黃色指示但不阻擋操作
        // 保持 connected 狀態，因為 HTTP 仍然可用
        console.log('[Frontend] ⚠️ Running in degraded mode (HTTP polling)');
      } else if (data.mode === 'websocket') {
        // WebSocket 恢復
        console.log('[Frontend] ✅ WebSocket connection restored');
      }
    });
    
    // 🆕 監聽載入進度事件（非阻塞式更新狀態指示器）
    this.ipcService.on('loading-progress', (data: { step: string; message: string; progress: number; duration?: number }) => {
      console.log('[Frontend] Loading progress:', data);
      
      // 更新連接狀態指示器
      this.backendConnectionProgress.set(data.progress);
      this.backendConnectionMessage.set(data.message);
      
      // 載入完成時更新狀態
      if (data.step === 'complete') {
        this.backendConnectionState.set('connected');
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = null;
        }
        this.hideConnectionIndicator();
      }
    });
    
    this.ipcService.on('log-entry', (log: LogEntry) => {
        // Ensure timestamp is a Date object
        log.timestamp = new Date(log.timestamp);
        this.logs.update(logs => [log, ...logs].slice(0, 100));
    });
    
    // 🆕 批量日誌事件處理（減少 IPC 調用次數）
    this.ipcService.on('log-entries-batch', (data: {entries: LogEntry[]}) => {
        if (data.entries && data.entries.length > 0) {
            const processedEntries = data.entries.map(log => ({
                ...log,
                timestamp: new Date(log.timestamp)
            }));
            this.logs.update(logs => [...processedEntries.reverse(), ...logs].slice(0, 100));
        }
    });

    this.ipcService.on('monitoring-status-changed', (status: boolean) => {
        this.isMonitoring.set(status);
        // 重置啟動狀態
        this.isStartingMonitoring.set(false);
    });
    
    this.ipcService.on('monitoring-start-failed', (data: {reason: string, message: string, failed_accounts?: string[], issues?: any[], warnings?: any[]}) => {
        console.log('[Frontend] Monitoring start failed:', data);
        // 重置啟動狀態
        this.isStartingMonitoring.set(false);
        
        if (data.reason === 'config_check_failed') {
            // 🔧 P1: 優化配置檢查失敗提示，添加操作按鈕
            const issues = data.issues || [];
            const warnings = data.warnings || [];
            
            // 檢查是否是帳號離線問題
            const hasOfflineIssue = issues.some((i: any) => 
                i.message?.includes('離線') || i.message?.includes('offline') || i.code === 'no_online_accounts'
            );
            
            // 顯示嚴重問題（帶操作按鈕）
            if (issues.length > 0) {
                const issueMessages = issues.map((i: any) => `• ${i.message}`).join('\n');
                
                if (hasOfflineIssue) {
                    // 帳號離線問題，提供導航到帳號管理的按鈕
                    this.toastService.withActions('error', `配置檢查失敗：\n${issueMessages}`, [
                        { 
                            label: '📱 前往帳號管理', 
                            variant: 'primary', 
                            handler: () => this.navigateToView('manageAccounts') 
                        },
                        { 
                            label: '關閉', 
                            variant: 'secondary', 
                            handler: () => {} 
                        }
                    ], 15000);
                } else {
                    this.toastService.error(`配置檢查失敗：\n${issueMessages}`, 10000);
                }
            }
            
            // 顯示警告（作為單獨的提示）
            if (warnings.length > 0) {
                setTimeout(() => {
                    const warnMessages = warnings.slice(0, 3).map((w: any) => w.message).join('；');
                    this.toastService.warning(`⚠ 其他問題：${warnMessages}`, 8000);
                }, 1000);
            }
        } else if (data.reason === 'no_online_listeners') {
            // 🔧 P1: 優化提示，添加操作按鈕
            this.toastService.withActions('error', '無法啟動監控：沒有在線的監聽賬戶', [
                { 
                    label: '📱 前往帳號管理', 
                    variant: 'primary', 
                    handler: () => this.navigateToView('manageAccounts') 
                },
                { 
                    label: '關閉', 
                    variant: 'secondary', 
                    handler: () => {} 
                }
            ], 10000);
        } else if (data.reason === 'no_groups') {
            this.toastService.error('無法啟動監控：沒有監控群組。請先添加要監控的群組。', 5000);
        } else if (data.reason === 'no_accessible_groups') {
            // 顯示詳細的無法加入原因
            const cannotJoinList = (data as any).cannot_join_list || [];
            if (cannotJoinList.length > 0) {
                const details = cannotJoinList.map((g: any) => `• ${g.url}: ${g.reason || '未知原因'}`).join('\n');
                this.toastService.error(`無法啟動監控：監控號無法訪問任何群組。\n${details}`, 12000);
            } else {
                this.toastService.error('無法啟動監控：監控號無法訪問任何群組。請確保監控號已加入要監控的群組。', 8000);
            }
        } else if (data.reason === 'exception') {
            this.toastService.error(data.message || '啟動監控時發生錯誤', 8000);
        } else {
            this.toastService.error(data.message || '啟動監控失敗', 5000);
        }
    });
    
    // 監控配置檢查報告事件
    this.ipcService.on('monitoring-config-check', (data: {
        passed: boolean,
        critical_issues: Array<{code: string, message: string, fix: string}>,
        warnings: Array<{code: string, message: string, fix: string}>,
        info: string[],
        summary: {can_monitor: boolean, can_send_messages: boolean, critical_count: number, warning_count: number}
    }) => {
        console.log('[Frontend] Monitoring config check:', data);
        
        // 存儲配置檢查結果供顯示
        this.lastConfigCheck.set(data);
        
        // 如果檢查通過但有警告
        if (data.passed && data.warnings.length > 0) {
            // 顯示主要警告 - 使用帶操作按鈕的 Toast
            const mainWarnings = data.warnings.slice(0, 2);
            for (const warning of mainWarnings) {
                const warningCode = warning.code || '';
                const nav = this.errorNavigationMap[warningCode];
                
                if (nav) {
                    // 使用帶操作按鈕的警告 Toast
                    this.toastService.warningWithAction(
                        `⚠ ${warning.message}`,
                        '去設置',
                        () => this.navigateToError(warningCode)
                    );
                } else {
                    // 沒有導航映射時使用普通警告
                    this.toastService.warning(`⚠ ${warning.message}\n修復: ${warning.fix}`, 8000);
                }
            }
            
            // 如果無法發送消息
            if (!data.summary.can_send_messages) {
                setTimeout(() => {
                    this.toastService.warningWithAction(
                        '監控將運行，但 Lead 不會自動發送消息。',
                        '配置規則',
                        () => this.navigateToError('NO_CAMPAIGN')
                    );
                }, 2000);
            }
        }
    });
    
    // 監控狀態報告事件
    this.ipcService.on('monitoring-status-report', (data: {
        total_groups: number,
        accessible_groups: number,
        groups_needing_join: number,
        accessible_list: Array<{url: string, chat_id?: number, title?: string}>,
        needing_join_list: Array<{url: string, is_private?: boolean, reason?: string}>,
        accounts_checked: number
    }) => {
        console.log('[Frontend] Monitoring status report:', data);
        
        // 顯示狀態報告
        if (data.accessible_groups > 0) {
            const accessibleNames = data.accessible_list.slice(0, 3).map(g => g.title || g.url).join(', ');
            const moreText = data.accessible_groups > 3 ? `等 ${data.accessible_groups} 個群組` : '';
            this.toastService.success(`✓ 可監控群組: ${accessibleNames}${moreText}`, 4000);
        }
        
        if (data.groups_needing_join > 0) {
            const needingNames = data.needing_join_list.slice(0, 2).map(g => g.url).join(', ');
            const moreText = data.groups_needing_join > 2 ? `等 ${data.groups_needing_join} 個` : '';
            this.toastService.warning(`⚠ 監控號未加入群組: ${needingNames}${moreText}。正在嘗試自動加入...`, 6000);
        }
        
        // 如果全部群組都需要加入（監控號未入群）
        if (data.accessible_groups === 0 && data.groups_needing_join > 0) {
            this.toastService.warning(`監控號尚未加入任何監控群組。系統將嘗試自動加入公開群組。`, 5000);
        }
    });
    
    this.ipcService.on('template-already-exists', (data: {templateId: number, name: string, message: string}) => {
        console.log('[Frontend] Template already exists:', data);
        this.toastService.warning(data.message || `模板 "${data.name}" 已存在`, 3000);
    });
    
    this.ipcService.on('accounts-updated', (accounts: TelegramAccount[]) => {
        console.log('[Frontend] Received accounts-updated event:', accounts.length, 'accounts');
        const previousCount = this.accounts().length;
        const oldAccounts = this.accounts();
        this.accounts.set(accounts);
        
        // Check for status changes (especially login status)
        accounts.forEach(newAccount => {
            const oldAccount = oldAccounts.find(a => a.id === newAccount.id);
            if (oldAccount && oldAccount.status !== newAccount.status) {
                console.log(`[Frontend] Account ${newAccount.phone} status changed: ${oldAccount.status} -> ${newAccount.status}`);
                if (newAccount.status === 'Online') {
                    this.toastService.success(`账户 ${newAccount.phone} 登录成功`);
                    // Close login dialogs on success
                    this.cancelLogin();
                } else if (newAccount.status === 'Logging in...') {
                    this.toastService.info(`账户 ${newAccount.phone} 正在登录...`);
                } else if (newAccount.status === 'Waiting Code') {
                    // If we have a login state for this account, show code dialog
                    const currentState = this.loginState();
                    if (currentState.accountId === newAccount.id && !currentState.requiresCode) {
                        // Status changed to Waiting Code but we don't have phone_code_hash yet
                        // Wait for login-requires-code event which will have the hash
                        this.toastService.info(`账户 ${newAccount.phone} 等待验证码`);
                    }
                } else if (newAccount.status === 'Waiting 2FA') {
                    // If we have a login state for this account, show 2FA dialog
                    const currentState = this.loginState();
                    if (currentState.accountId === newAccount.id && !currentState.requires2FA) {
                        // Status changed to Waiting 2FA, show dialog
                        this.loginState.set({
                            accountId: newAccount.id,
                            phone: newAccount.phone,
                            requiresCode: false,
                            requires2FA: true,
                            phoneCodeHash: null,
                            isSubmittingCode: false
                        });
                        this.login2FAPassword.set('');
                        this.toastService.info(`账户 ${newAccount.phone} 等待 2FA 密码`);
                    }
                } else if (newAccount.status.includes('Error') || newAccount.status === 'Error') {
                    this.toastService.error(`账户 ${newAccount.phone} 登录失败`);
                    // Close login dialogs on error
                    this.cancelLogin();
                }
            }
        });
        
        // Show success toast if accounts were added/updated
        if (accounts.length > previousCount) {
          this.toastService.success(`账户列表已更新（${accounts.length} 个账户）`);
        }
    });

    this.ipcService.on('account-validation-error', (data: { errors: string[], field?: string, account_data?: any, error_type?: string }) => {
        console.error('Account validation error:', data);
        const errorMessages = Array.isArray(data.errors) ? data.errors : [data.errors || '验证失败'];
        const errorType = data.error_type || 'validation';
        
        // Check if this is a duplicate error
        const isDuplicateError = errorType === 'duplicate' || errorMessages.some(msg => msg.includes('已存在') || msg.includes('already exists'));
        
        // Always show duplicate errors, as they indicate a real issue
        if (isDuplicateError) {
            this.validationErrors.set({ 'account': errorMessages });
            this.toastService.error(errorMessages.join('; '));
            return;
        }
        
        // For other errors, only show if we don't already have accounts (to avoid showing error after successful add)
        const currentAccountCount = this.accounts().length;
        if (currentAccountCount === 0) {
            this.validationErrors.set({ 'account': errorMessages });
            this.toastService.error(`添加账户失败: ${errorMessages.join('; ')}`);
        } else {
            // If accounts exist, this might be a late error event, log it but don't show to user
            console.warn('Validation error received but accounts already exist, ignoring:', errorMessages);
        }
    });

    this.ipcService.on('new-lead-captured', (lead: CapturedLead) => {
        lead.timestamp = new Date(lead.timestamp);
        lead.interactionHistory.forEach(h => h.timestamp = new Date(h.timestamp));
        this.leads.update(leads => [lead, ...leads]);
    });
    
    // 關鍵詞匹配事件 - 實時更新匹配面板
    this.ipcService.on('keyword-matched', (data: {
      keyword: string;
      groupUrl: string;
      groupName: string;
      userId: string;
      username: string;
      firstName: string;
      messagePreview: string;
      timestamp: string;
    }) => {
      console.log('[Frontend] Keyword matched event:', data);
      
      // 添加到實時匹配列表（最多保留 50 條）
      this.realtimeMatches.update(matches => {
        const newMatches = [data, ...matches];
        return newMatches.slice(0, 50);
      });
      
      // 更新今日統計
      this.todayStats.update(s => ({
        ...s,
        matchCount: s.matchCount + 1
      }));
    });
    
    this.ipcService.on('lead-captured', (lead: CapturedLead) => {
        console.log('[Frontend] Lead captured event received:', lead);
        
        // 更新今日統計
        this.todayStats.update(s => ({
          ...s,
          newLeads: s.newLeads + 1
        }));
        
        // 顯示桌面通知
        this.showNotification(
            '新潛在客戶已捕獲',
            `@${lead.username || lead.firstName || '用戶'} 已捕獲`,
            { requireInteraction: true }
        );
        
        // Ensure required fields have defaults
        if (!lead.interactionHistory) {
            lead.interactionHistory = [];
        }
        if (!lead.status) {
            lead.status = 'New';
        }
        if (lead.doNotContact === undefined) {
            lead.doNotContact = false;
        }
        
        lead.timestamp = new Date(lead.timestamp || new Date());
        if (lead.interactionHistory) {
            lead.interactionHistory.forEach(h => h.timestamp = new Date(h.timestamp));
        }
        
        this.leads.update(leads => {
            // Check if lead already exists
            const existingIndex = leads.findIndex(l => l.userId === lead.userId);
            if (existingIndex >= 0) {
                leads[existingIndex] = lead;
                return [...leads];
            }
            return [lead, ...leads];
        });
        
        // Show toast notification
        const displayName = lead.username ? `@${lead.username}` : (lead.firstName || lead.userId);
        this.toastService.success(`🎯 ${this.t('newLeadCaptured')}: ${displayName}`, 4000);
    });
    
    this.ipcService.on('session-files-cleaned', (data: {deleted_count: number, kept_count: number, deleted_files: string[]}) => {
        this.toastService.success(`清理完成：删除了 ${data.deleted_count} 个孤立文件，保留了 ${data.kept_count} 个有效文件`);
        console.log('[Frontend] Session files cleaned:', data);
    });
    
    this.ipcService.on('session-files-cleanup-error', (data: {error: string}) => {
        this.toastService.error(`清理失败：${data.error}`);
        console.error('[Frontend] Session files cleanup error:', data);
    });

}
