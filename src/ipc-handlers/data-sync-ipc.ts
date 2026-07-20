/**
 * Phase 9-1a: Sessions, initial state, keyword/group/template/lead/funnel updates
 * Extracted from AppComponent.setupIpcListeners()
 */
import { LogEntry, TelegramAccount, CapturedLead, KeywordConfig, QueueStatus, QueueMessage, Alert } from '../models';
import { TimeSeriesData } from '../analytics-charts.component';

function shouldSkipStateByOwner(ctx: any, state: any): boolean {
    const responseOwnerId = state?.owner_user_id;
    const currentUserId = ctx.authService?.user()?.id;
    if (responseOwnerId === undefined || responseOwnerId === '' || currentUserId === undefined || currentUserId === null) return false;
    return String(responseOwnerId) !== String(currentUserId);
}

export function setupDataSyncIpcHandlers(this: any): void {
    // === Session 導入事件 ===
    this.ipcService.on('session-import-result', (data: {success: boolean, message: string, phone?: string, count?: number}) => {
        console.log('[Frontend] Session import result:', data);
        if (data.success) {
            this.toastService.success(data.phone ? `✅ Session 導入成功: ${data.phone}` : `✅ 導入完成: ${data.count || 1} 個帳號`, 3000);
            // 刷新帳號列表
            this.ipcService.send('get-initial-state');
        } else {
            this.toastService.error(`導入失敗: ${data.message}`, 4000);
        }
    });

    this.ipcService.on('session-import-needs-credentials', (data: {filePath: string, phoneNumber: string, message: string}) => {
        console.log('[Frontend] Session import needs credentials:', data);
        this.toastService.warning(`⚠️ 導入 ${data.phoneNumber} 需要 API 憑據`, 4000);
        // 可以在這裡打開一個對話框讓用戶輸入 API 憑據
        // 暫時提示用戶去 API 憑據池頁面獲取
        this.toastService.info('請先在「API 憑據池」頁面添加 API 憑據，然後重試導入', 5000);
    });

    // === 孤立 Session 檢測事件 ===
    this.ipcService.on('orphan-sessions-detected', (data: {count: number, sessions: any[], message: string}) => {
        console.log('[Frontend] Orphan sessions detected:', data);
        if (data.count > 0) {
            this.orphanSessions.set(data.sessions);
            this.showOrphanSessionDialog.set(true);
            this.toastService.warning(`發現 ${data.count} 個需要手動恢復的 Session 文件`, 5000);
        }
    });

    this.ipcService.on('orphan-sessions-scanned', (data: {success: boolean, orphan_sessions: any[], message: string}) => {
        console.log('[Frontend] Orphan sessions scanned:', data);
        if (data.success && data.orphan_sessions.length > 0) {
            this.orphanSessions.set(data.orphan_sessions);
        }
    });

    this.ipcService.on('orphan-sessions-recovered', (data: {success: boolean, recovered_count: number, failed_count: number, message: string}) => {
        console.log('[Frontend] Orphan sessions recovered:', data);
        this.isRecoveringOrphanSessions.set(false);
        if (data.success) {
            this.toastService.success(`成功恢復 ${data.recovered_count} 個帳號`, 3000);
            this.showOrphanSessionDialog.set(false);
            this.orphanSessions.set([]);
            // 刷新帳號列表
            this.ipcService.send('get-accounts');
        } else {
            this.toastService.error(`恢復失敗: ${data.message}`, 4000);
        }
    });

    // Validation error handlers for automation center
    this.ipcService.on('keyword-set-validation-error', (data: {errors: string[], name?: string}) => {
        console.error('[Frontend] Keyword set validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加关键词集失败';
        this.toastService.error(`关键词集错误: ${errorMsg}`);
    });
    
    this.ipcService.on('keyword-set-error', (data: {success: boolean, error?: string, message?: string, keywordSetId?: number, name?: string, details?: string}) => {
        console.log('[Frontend] Keyword set error event:', data);
        if (data.success) {
            if (data.message) {
                this.toastService.success(data.message);
            }
            // Clear the input field on success
            this.newKeywordSet.set({ name: '' });
        } else {
            const errorMsg = data.error || '添加关键词集失败';
            console.warn('[Frontend] Keyword set error:', errorMsg, data.details);
            
            // Check if it's a duplicate error - show as warning, not error
            if (errorMsg.includes('已存在') || errorMsg.includes('already exists')) {
                this.toastService.warning(`关键词集已存在`, 3000);
            } else if (errorMsg.includes('不存在') || errorMsg.includes('not found')) {
                // Already deleted - this is fine, don't show error
                console.log('[Frontend] Keyword set already deleted, ignoring');
            } else if (errorMsg.includes('数据庫') || errorMsg.includes('数据库') || errorMsg.includes('損壞') || errorMsg.includes('损坏')) {
                // Database corruption - show prominent warning
                this.toastService.error(`数据库错误: ${errorMsg}。请使用 rebuild_database.py 重建数据库。`, 10000);
            } else {
                // Other errors
                this.toastService.error(`关键词集错误: ${errorMsg}`);
            }
        }
    });
    
    this.ipcService.on('keyword-validation-error', (data: {errors: string[], keyword?: string, is_regex?: boolean}) => {
        console.error('[Frontend] Keyword validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加关键词失败';
        this.toastService.error(`关键词错误: ${errorMsg}`);
    });
    
    this.ipcService.on('group-validation-error', (data: {errors: string[], url?: string, name?: string}) => {
        console.error('[Frontend] Group validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加群组失败';
        this.toastService.error(`群组错误: ${errorMsg}`);
    });
    
    // 群組成員狀態檢查結果
    this.ipcService.on('group-membership-status', (data: {
        url: string,
        status: {
            is_member?: boolean,
            can_join?: boolean,
            is_private?: boolean,
            account?: string,
            chat_title?: string,
            reason?: string
        }
    }) => {
        console.log('[Frontend] Group membership status:', data);
        
        if (data.status.is_member) {
            this.toastService.success(`✓ 監控號已在群組中: ${data.status.chat_title || data.url}`, 3000);
        } else if (data.status.can_join) {
            if (data.status.is_private) {
                this.toastService.warning(`⚠ 監控號未加入此私有群組，需要手動將監控號加入群組`, 5000);
            } else {
                this.toastService.info(`ℹ 監控號未加入此群組，啟動監控時將自動加入`, 4000);
            }
        }
    });
    
    // 群組加入結果
    this.ipcService.on('group-join-result', (data: {
        success: boolean,
        phone: string,
        groupUrl: string,
        chatTitle?: string,
        chatId?: number,
        alreadyMember?: boolean,
        error?: string
    }) => {
        console.log('[Frontend] Group join result:', data);
        
        if (data.success) {
            if (data.alreadyMember) {
                this.toastService.success(`${data.phone} 已經在群組 ${data.chatTitle || data.groupUrl} 中`, 3000);
            } else {
                this.toastService.success(`${data.phone} 成功加入群組 ${data.chatTitle || data.groupUrl}`, 4000);
            }
        } else {
            this.toastService.error(`加入群組失敗: ${data.error}`, 5000);
        }
    });
    
    this.ipcService.on('template-validation-error', (data: {errors: string[], template_data?: any}) => {
        console.error('[Frontend] Template validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加模板失败';
        this.toastService.error(`模板错误: ${errorMsg}`);
    });
    
    this.ipcService.on('campaign-validation-error', (data: {errors: string[], campaign_data?: any}) => {
        console.error('[Frontend] Campaign validation error:', data);
        const errorMsg = data.errors?.join('; ') || '创建活动失败';
        this.toastService.error(`活动错误: ${errorMsg}`);
    });
    
    this.ipcService.on('login-requires-code', (data: {accountId: number, phone: string, phoneCodeHash: string, sendType?: string, message?: string, canRetrySMS?: boolean, waitSeconds?: number}) => {
        console.log('[Frontend] Received login-requires-code event:', data);
        console.log('[Frontend] Current loginState before update:', this.loginState());
        this.loginState.set({
            accountId: data.accountId,
            phone: data.phone,
            requiresCode: true,
            requires2FA: false,
            phoneCodeHash: data.phoneCodeHash,
            isSubmittingCode: false,  // Reset submitting state
            canRetrySMS: data.canRetrySMS || false,
            waitSeconds: data.waitSeconds
        } as any);
        console.log('[Frontend] Updated loginState:', this.loginState());
        console.log('[Frontend] requiresCode value:', this.loginState().requiresCode);
        this.loginCode.set('');
        
        // Show message based on send type
        if (data.message) {
            // Use the message from backend (which is optimized for APP-only)
            if (data.sendType === 'app') {
                this.toastService.info(data.message, 8000);
            } else {
                this.toastService.info(data.message);
            }
        } else if (data.sendType === 'app') {
            this.toastService.info('验证码已发送到您的 Telegram 应用。请检查您手机上已登录的 Telegram 应用，查看验证码消息。', 8000);
        } else if (data.sendType === 'sms') {
            this.toastService.info(`验证码已发送到 ${data.phone} 的短信，请输入验证码`);
        } else {
            this.toastService.info(`验证码已发送到 ${data.phone}，请输入验证码`);
        }
    });
    
    this.ipcService.on('login-requires-2fa', (data: {accountId: number, phone: string}) => {
        console.log('[Frontend] Received login-requires-2fa event:', data);
        this.loginState.set({
            accountId: data.accountId,
            phone: data.phone,
            requiresCode: false,
            requires2FA: true,
            phoneCodeHash: null,
            isSubmittingCode: false  // Reset submitting state
        });
        this.login2FAPassword.set('');
        this.toastService.info('请输入 2FA 密码');
    });
    
    this.ipcService.on('account-login-error', (data: {accountId: number, phone: string, status: string, message: string, friendlyMessage: string, codeExpired?: boolean, floodWait?: number}) => {
        console.error('[Frontend] Account login error:', data);
        
        // Handle FloodWait error with friendly time format
        if (data.floodWait) {
            const waitSeconds = data.floodWait;
            const hours = Math.floor(waitSeconds / 3600);
            const minutes = Math.floor((waitSeconds % 3600) / 60);
            const seconds = waitSeconds % 60;
            
            let timeStr = '';
            if (hours > 0) {
                timeStr = `${hours} 小时`;
                if (minutes > 0) {
                    timeStr += ` ${minutes} 分钟`;
                }
            } else if (minutes > 0) {
                timeStr = `${minutes} 分钟`;
                if (seconds > 0) {
                    timeStr += ` ${seconds} 秒`;
                }
            } else {
                timeStr = `${seconds} 秒`;
            }
            
            const floodWaitMsg = `请求过于频繁，请等待 ${timeStr} 后再试。验证码未发送。`;
            this.toastService.error(floodWaitMsg);
            console.error('FloodWait error:', { waitSeconds, timeStr });
        } else {
            this.toastService.error(data.friendlyMessage || data.message);
        }
        
        // Show detailed error in console for debugging
        console.error('Login error details:', {
            accountId: data.accountId,
            phone: data.phone,
            status: data.status,
            message: data.message,
            codeExpired: data.codeExpired,
            floodWait: data.floodWait
        });
        
        // Reset submitting state
        const state = this.loginState();
        this.loginState.set({
            accountId: state.accountId,
            phone: state.phone,
            requiresCode: state.requiresCode,
            requires2FA: state.requires2FA,
            phoneCodeHash: state.phoneCodeHash,
            isSubmittingCode: false
        });
        
        // If FloodWait, close dialog and reset state
        if (data.floodWait) {
            this.cancelLogin();
            return;
        }
        
        // If code expired, reset login state to allow resending
        if (data.codeExpired) {
            this.loginState.set({
                accountId: state.accountId,
                phone: state.phone,
                requiresCode: false,  // Reset to allow resending
                requires2FA: false,
                phoneCodeHash: null,
                isSubmittingCode: false
            });
            this.loginCode.set('');
        } else {
            // For other errors, keep dialog open if it's a temporary error
            // (don't close for invalid code, but close for permanent errors like banned)
            if (data.message && (data.message.includes('banned') || data.message.includes('invalid phone'))) {
                // Close dialog for permanent errors
                this.cancelLogin();
            } else if (data.message && data.message.includes('Invalid verification code')) {
                // For invalid code, show dialog again to allow retry
                this.loginState.set({
                    accountId: state.accountId,
                    phone: state.phone,
                    requiresCode: true,  // Show code dialog again
                    requires2FA: false,
                    phoneCodeHash: state.phoneCodeHash,
                    isSubmittingCode: false
                });
            }
        }
    });
    
    this.ipcService.on('account-status-updated', (data: any) => {
        // Account status was updated, refresh accounts list
        // The accounts-updated event will be sent separately
    });

    // P2-1: Session 過期全局通知 + 快速登入 Action
    this.ipcService.on('account-session-expired', (data: { accountId: number; phone: string; timestamp: string }) => {
        console.log('[Frontend] Account session expired:', data);
        const maskedPhone = data.phone ? data.phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2') : String(data.accountId);
        
        this.toastService.withActions(
            'warning',
            `⚠️ 帳號 ${maskedPhone} Session 已過期，需要重新登入`,
            [
                {
                    label: '立即登入',
                    variant: 'primary',
                    handler: () => {
                        // 從 accounts 列表找到該帳號並直接觸發登入（account-card-list 會自動打開驗證碼 modal）
                        const accounts = this.accounts();
                        const account = accounts.find((a: any) => a.id === data.accountId);
                        if (account) {
                            this.ipcService.send('login-account', {
                                phone: account.phone,
                                apiId: account.apiId,
                                apiHash: account.apiHash
                            });
                            this.toastService.info(`正在為 ${maskedPhone} 發送驗證碼...`, 3000);
                        } else {
                            // 帳號不在列表，刷新後再試
                            this.ipcService.send('get-accounts', {});
                            this.toastService.info('正在刷新帳號列表，請稍後再點擊登入', 3000);
                        }
                    }
                },
                {
                    label: '稍後',
                    variant: 'secondary',
                    handler: () => {}
                }
            ],
            0  // 不自動關閉，直到用戶操作
        );
    });

    // P2-1: 重連成功通知（來自 connection monitor）
    this.ipcService.on('account-reconnected', (data: { phone: string; accountId: number }) => {
        const maskedPhone = data.phone ? data.phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2') : String(data.accountId);
        this.toastService.success(`✅ 帳號 ${maskedPhone} 已自動重連成功`, 4000);
    });

    // 🆕 漸進式載入：分階段接收數據，讓 UI 盡快顯示
    this.ipcService.on('initial-state-core', (state: any) => {
        if (shouldSkipStateByOwner(this, state)) return;
        console.log('[Frontend] 🚀 Received initial-state-core (accounts + settings)');
        if (state?.accounts) {
            this.accounts.set(state.accounts);
            console.log('[Frontend] Accounts loaded:', state.accounts.length);
        }
        if (state?.settings) {
            // 設置分散的 settings signals
            this.spintaxEnabled.set(state.settings.spintaxEnabled ?? true);
            this.autoReplyEnabled.set(state.settings.autoReplyEnabled ?? false);
            this.autoReplyMessage.set(state.settings.autoReplyMessage || "Thanks for getting back to me! I'll read your message and respond shortly.");
            this.smartSendingEnabled.set(state.settings.smartSendingEnabled ?? true);
        }
        if (state?.isMonitoring !== undefined) {
            this.isMonitoring.set(state.isMonitoring);
        }
        // 標記核心數據已載入，UI 可以開始渲染
        console.log('[App] Setting coreDataLoaded to true');
        this.coreDataLoaded.set(true);
        console.log('[App] coreDataLoaded is now:', this.coreDataLoaded());
    });
    
    this.ipcService.on('initial-state-config', (state: any) => {
        if (shouldSkipStateByOwner(this, state)) return;
        console.log('[Frontend] 📋 Received initial-state-config');
        if (state?.keywordSets) {
            this.keywordSets.set(state.keywordSets);
        }
        if (state?.monitoredGroups) {
            this.monitoredGroups.set(state.monitoredGroups);
        }
        if (state?.campaigns) {
            this.campaigns.set(state.campaigns);
        }
        if (state?.messageTemplates) {
            this.messageTemplates.set(state.messageTemplates);
        }
    });
    
    this.ipcService.on('initial-state-data', (state: any) => {
        if (shouldSkipStateByOwner(this, state)) return;
        console.log('[Frontend] 📊 Received initial-state-data (leads + logs)');
        console.log('[Frontend] leads count:', state?.leads?.length, 'total:', state?.leadsTotal, 'hasMore:', state?.leadsHasMore);
        
        if (state?.leads) {
            const mappedLeads = (state.leads || []).map((l: any) => this.mapLeadFromBackend(l));
            this.leads.set(mappedLeads);
            // 同步到資源中心
            this.contactsService.importLeadsDirectly(mappedLeads);
            console.log('[Frontend] Initial leads synced to resource center:', mappedLeads.length);
        }
        if (state?.leadsTotal !== undefined) {
            this.leadsTotal.set(state.leadsTotal);
        }
        if (state?.leadsHasMore !== undefined) {
            this.leadsHasMore.set(state.leadsHasMore);
        }
        // 🆕 如果初始數據少於總數，自動加載全部
        if (state?.leads && state?.leadsTotal && state.leads.length < state.leadsTotal) {
            console.log('[Frontend] 🔄 Auto-loading remaining leads...');
            this.leadsHasMore.set(true);
            this.leadsLoading.set(false);  // 🆕 確保 loading 狀態為 false
            setTimeout(() => this.loadRemainingLeads(), 500);
        }
        if (state?.logs) {
            this.logs.set(state.logs);
        }
    });
    
    this.ipcService.on('initial-state', (state: any) => {
        if (shouldSkipStateByOwner(this, state)) return;
        console.log('[Frontend] ★★★ Received initial-state event ★★★');
        console.log('[Frontend] initial-state payload:', state);
        console.log('[Frontend] accounts in payload:', state?.accounts?.length || 0);
        
        // Debounce rapid initial-state updates (min 500ms between updates to reduce memory pressure)
        const now = Date.now();
        if (now - this.lastInitialStateTime < 500) {
            // Clear existing timer and set a new one
            if (this.initialStateDebounceTimer) {
                clearTimeout(this.initialStateDebounceTimer);
            }
            this.initialStateDebounceTimer = setTimeout(() => {
                try {
                    this.applyInitialState(state);
                } catch (error) {
                    console.error('[Frontend] Error applying initial state:', error);
                } finally {
                    this.initialStateDebounceTimer = undefined;
                }
            }, 500);
            return;
        }
        this.lastInitialStateTime = now;
        try {
            this.applyInitialState(state);
        } catch (error) {
            console.error('[Frontend] Error applying initial state:', error);
        }
    });
    
    // Partial update event listeners - more efficient than full state refresh
    // 添加防抖機制，防止頻繁更新
    this.ipcService.on('keyword-sets-updated', (data: {keywordSets: any[]}) => {
        // 只在開發模式下記錄詳細日誌，減少生產環境的內存開銷
        if (typeof console !== 'undefined' && console.log) {
            console.log('[Frontend] Received keyword-sets-updated:', data.keywordSets?.length || 0);
        }
        
        // 清除之前的防抖計時器
        if (this.keywordSetsUpdateDebounceTimer) {
            clearTimeout(this.keywordSetsUpdateDebounceTimer);
            this.keywordSetsUpdateDebounceTimer = undefined;
        }
        
        // 使用後端返回的數據同步狀態（這會覆蓋樂觀更新，確保數據一致性）
        if (data.keywordSets && Array.isArray(data.keywordSets)) {
            // 防抖處理：延遲 150ms 更新，如果 150ms 內收到新的更新，則取消之前的更新
            // 增加延遲時間以減少更新頻率
            this.keywordSetsUpdateDebounceTimer = setTimeout(() => {
                try {
                    // 去重處理：確保每個關鍵詞集和關鍵詞都是唯一的
                    const seenSetIds = new Set<number>();
                    const deduplicatedSets = data.keywordSets
                        .filter(set => {
                            // 驗證 set 對象的有效性
                            if (!set || typeof set.id !== 'number') {
                                return false;
                            }
                            // 基於 ID 去重關鍵詞集
                            if (seenSetIds.has(set.id)) {
                                return false;
                            }
                            seenSetIds.add(set.id);
                            return true;
                        })
                        .map(set => {
                            // 確保 keywords 是數組
                            const keywords = Array.isArray(set.keywords) ? set.keywords : [];
                            // 對關鍵詞進行去重（基於 keyword + isRegex 組合）
                            const seenKeywords = new Set<string>();
                            const uniqueKeywords = keywords
                                .filter((k: KeywordConfig) => {
                                    if (!k || typeof k.keyword !== 'string') {
                                        return false;
                                    }
                                    const key = `${k.keyword}_${k.isRegex}`;
                                    if (seenKeywords.has(key)) {
                                        return false;
                                    }
                                    seenKeywords.add(key);
                                    return true;
                                });
                            return {
                                ...set,
                                keywords: uniqueKeywords
                            };
                        });
                    
                    // 只在狀態實際改變時更新，避免不必要的重渲染
                    const currentSets = this.keywordSets();
                    const hasChanged = JSON.stringify(currentSets) !== JSON.stringify(deduplicatedSets);
                    if (hasChanged) {
                        this.keywordSets.set(deduplicatedSets);
                    }
                } catch (error) {
                    // 捕獲任何錯誤，避免崩潰
                    console.error('[Frontend] Error processing keyword-sets-updated:', error);
                } finally {
                    this.keywordSetsUpdateDebounceTimer = undefined;
                }
            }, 150);
        } else {
            // 如果數據無效，設置為空數組（但只在當前不是空數組時更新）
            const currentSets = this.keywordSets();
            if (currentSets.length > 0) {
                this.keywordSets.set([]);
            }
        }
    });
    
    // 監聽關鍵詞驗證錯誤事件
    this.ipcService.on('keyword-validation-error', (data: {errors: string[], keyword?: string}) => {
        console.log('[Frontend] Keyword validation error:', data);
        if (data.errors && data.errors.length > 0) {
            this.toastService.error(`關鍵詞驗證失敗: ${data.errors.join(', ')}`, 4000);
            // 如果驗證失敗，需要恢復狀態（撤銷樂觀更新）
            // 但不要立即請求初始狀態，而是等待後端發送更新事件
            // 後端應該在驗證錯誤後發送 keyword-sets-updated 事件來同步狀態
            // 如果 1 秒後還沒有收到更新，再請求初始狀態
            setTimeout(() => {
                // 檢查是否已經收到了更新（通過檢查 keywordSets 是否已更新）
                // 這裡我們依賴後端發送的更新事件，而不是主動請求
            }, 1000);
        }
    });
    
    this.ipcService.on('groups-updated', (data: {monitoredGroups: any[]}) => {
        console.log('[Frontend] Received groups-updated:', data.monitoredGroups?.length || 0);
        this.monitoredGroups.set(data.monitoredGroups || []);
    });
    
    this.ipcService.on('templates-updated', (data: {messageTemplates: any[]}) => {
        console.log('[Frontend] Received templates-updated:', data.messageTemplates?.length || 0);
        this.messageTemplates.set(data.messageTemplates || []);
    });
    
    this.ipcService.on('campaigns-updated', (data: {campaigns: any[]}) => {
        console.log('[Frontend] Received campaigns-updated:', data.campaigns?.length || 0);
        this.campaigns.set(data.campaigns || []);
        // 重置提交狀態
        this.isSubmittingCampaign.set(false);
    });
    
    // 監聽活動已存在事件
    this.ipcService.on('campaign-already-exists', (data: {campaignId: number, name: string, message: string}) => {
        console.log('[Frontend] Campaign already exists:', data);
        this.toastService.warning(data.message || `活動 "${data.name}" 已存在`, 4000);
        // 重置提交狀態
        this.isSubmittingCampaign.set(false);
    });
    
    // 監聽活動驗證錯誤事件
    this.ipcService.on('campaign-validation-error', (data: {errors: string[], campaign_data?: any}) => {
        console.log('[Frontend] Campaign validation error:', data);
        if (data.errors && data.errors.length > 0) {
            this.toastService.error(`活動驗證失敗: ${data.errors.join(', ')}`, 4000);
        }
        // 重置提交狀態
        this.isSubmittingCampaign.set(false);
    });
    
    // Search leads result
    this.ipcService.on('search-leads-result', (data: { success: boolean, results?: any[], error?: string }) => {
      this.isSearchingLeads.set(false);
      if (data.success && data.results) {
        this.leadSearchResults.set(data.results);
        if (data.results.length === 0) {
          this.toastService.info('未找到匹配的潜在客户');
        }
      } else {
        this.toastService.error(data.error || '搜索失败');
        this.leadSearchResults.set([]);
      }
    });
    
    // Backup management events
    this.ipcService.on('backup-created', (data: { success: boolean, backupId?: string, error?: string }) => {
      this.isCreatingBackup.set(false);
      if (data.success) {
        this.toastService.success('备份创建成功');
        this.loadBackups();
      } else {
        this.toastService.error(data.error || '备份创建失败');
      }
    });
    
    this.ipcService.on('backups-list', (data: { success: boolean, backups?: any[], error?: string }) => {
      if (data.success && data.backups) {
        this.backups.set(data.backups);
      }
    });
    
    this.ipcService.on('backup-restored', (data: { success: boolean, error?: string }) => {
      this.isRestoringBackup.set(false);
      if (data.success) {
        this.toastService.success('备份恢复成功，请刷新页面');
      } else {
        this.toastService.error(data.error || '备份恢复失败');
      }
    });
    
    this.ipcService.on('backup-deleted', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.toastService.success('备份已删除');
        this.loadBackups();
      } else {
        this.toastService.error(data.error || '删除备份失败');
      }
    });
    
    this.ipcService.on('leads-updated', (data: {leads: any[], total?: number}) => {
        const total = data.total ?? data.leads?.length ?? 0;
        console.log('[Frontend] Received leads-updated:', data.leads?.length || 0, 'total:', total);
        const mappedLeads = (data.leads || []).map((l: any) => this.mapLeadFromBackend(l));
        this.leads.set(mappedLeads);
        this.leadsTotal.set(total);
        
        // 🆕 同時更新資源中心，使用同一份數據
        this.contactsService.importLeadsDirectly(mappedLeads);
    });
    
    // 🆕 處理分頁加載的 leads 數據
    this.ipcService.on('leads-paginated', (data: {leads: any[], total: number, hasMore: boolean}) => {
        console.log('[Frontend] Received leads-paginated:', data.leads?.length || 0, 'total:', data.total);
        this.leadsLoading.set(false);
        
        if (data.leads && data.leads.length > 0) {
            const mappedLeads = data.leads.map((l: any) => this.mapLeadFromBackend(l));
            this.leads.set(mappedLeads);
            this.leadsTotal.set(data.total);
            this.leadsHasMore.set(data.hasMore);
            
            this.contactsService.importLeadsDirectly(mappedLeads);
            console.log('[Frontend] ✅ Synced to resource center:', mappedLeads.length, 'leads');
            // 多用户一库：同一会话内仅弹一次「数据加载完成」，避免切换标签/窗口重复提示
            if (!data.hasMore && !(this as any).hasShownLeadsLoadedToast) {
                this.toastService.success(`數據加載完成：共 ${mappedLeads.length} 條`);
                (this as any).hasShownLeadsLoadedToast = true;
            }
        }
    });
    
    // Marketing Stats 事件 (Phase 4)
    this.ipcService.on('marketing-stats', (data: any) => {
      this.isLoadingMarketing.set(false);
      if (data.success !== false) {
        this.marketingStats.set({
          totalCampaigns: data.total_campaigns || 0,
          running: data.running || 0,
          completed: data.completed || 0,
          totalMessages: data.total_messages || 0,
          totalInvites: data.total_invites || 0,
          successRate: data.success_rate || 0
        });
      }
    });
    
    // Marketing Campaigns 事件 (Phase 4)
    this.ipcService.on('marketing-campaigns', (data: any) => {
      if (data.success && data.campaigns) {
        this.marketingCampaigns.set(data.campaigns);
      }
    });
    
    // Campaign Created 事件 (Phase 4)
    this.ipcService.on('campaign-created', (data: any) => {
      if (data.success) {
        this.toastService.success('✅ 營銷活動已創建');
        this.showCreateCampaignDialog.set(false);
        this.newMarketingCampaign = { name: '', type: 'pm', targetGroup: '', messageTemplate: '' };
        this.loadMarketingCampaigns();
      } else {
        this.toastService.error(`創建失敗: ${data.error}`);
      }
    });
    
    // Campaign Started/Complete 事件 (Phase 4)
    this.ipcService.on('campaign-started', (data: any) => {
      if (data.success) {
        this.toastService.info('🚀 營銷活動已啟動');
        this.loadMarketingCampaigns();
      }
    });
    
    this.ipcService.on('campaign-complete', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 活動完成！成功: ${data.stats?.success || 0}, 失敗: ${data.stats?.failed || 0}`);
        this.loadMarketingStats();
        this.loadMarketingCampaigns();
      }
    });
    
    // Warmup Progress 事件 (Phase 4)
    this.ipcService.on('warmup-progress', (data: any) => {
      if (data.success && data.accountId) {
        this.warmupDetails.update(details => ({
          ...details,
          [data.accountId]: {
            enabled: data.enabled || false,
            startDate: data.start_date || null,
            stage: data.stage?.stage || 0,
            stageName: data.stage?.stage_name || '',
            daysCompleted: data.days_completed || 0,
            totalDays: data.total_days || 14,
            progressPercent: data.progress_percentage || 0,
            dailyLimit: data.stage?.daily_limit || 0,
            allowedActions: data.stage?.allowed_actions || []
          }
        }));
      }
    });
    
}
