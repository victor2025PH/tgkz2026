// @ts-nocheck
/**
 * Phase 9-1b: Discussion, Knowledge, Voice
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 *
 * 🔧 孤兒方法清理（Stage 4）：本檔案原有 44 個方法，經逐一核實呼叫關係（模板綁定、
 * 其他 .ts 文件呼叫、IPC 監聽器回呼）後確認，41 個方法已無任何呼叫者，屬於過往重構
 * 留下的孤兒代碼：
 *   - Discussion Watcher 討論組監聽：全專案無任何組件引用相關 signal 或觸發方法，
 *     對應功能沒有任何 .component.ts/.html 承接（與 chat-ipc.ts 清理紀錄一致）。
 *   - Knowledge Base 文檔/媒體/QA 管理：已由 group-search/ai/knowledge-base.service.ts、
 *     ai-center/knowledge-manage.component.ts 等獨立實作取代，app.component.html
 *     已無對應渲染區塊。
 *   - Voice Clone 語音克隆與錄音：對應 UI 區塊已從 app.component.html 移除，
 *     無任何按鈕可觸發這些方法（loadClonedVoicesFromStorage 例外，因為仍被
 *     loadAiSettings 呼叫用於初始化 clonedVoices signal）。
 * 僅保留仍有真實呼叫者的 3 個方法。
 */

class KnowledgeVoiceMethodsMixin {
  // 格式化文件大小（仍被 system-ipc.ts 的監聽器呼叫）
  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 從 localStorage 加載克隆聲音列表（仍被 loadAiSettings 呼叫）
  private loadClonedVoicesFromStorage() {
    const saved = localStorage.getItem('cloned_voices');
    if (saved) {
      try {
        const voices = JSON.parse(saved).map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt)
        }));
        this.clonedVoices.set(voices);
      } catch (e) {
        console.error('Failed to load cloned voices:', e);
      }
    }
  }

  // 仍被 app.component.ts 的 ngOnInit 呼叫
  loadAiSettings() {
    const savedKey = localStorage.getItem('ai_api_key');
    const savedType = localStorage.getItem('ai_api_type') as 'gemini' | 'openai' | 'custom' | 'local' | null;
    const savedEndpoint = localStorage.getItem('ai_custom_endpoint');
    
    if (savedKey) {
      this.aiApiKey.set(savedKey);
    }
    if (savedType) {
      this.aiApiType.set(savedType);
    }
    if (savedEndpoint) {
      this.customApiEndpoint.set(savedEndpoint);
    }
    
    // 加載本地 AI 設置
    const localAiEndpoint = localStorage.getItem('local_ai_endpoint');
    const localAiModel = localStorage.getItem('local_ai_model');
    if (localAiEndpoint) {
      this.localAiEndpoint.set(localAiEndpoint);
    }
    if (localAiModel) {
      this.localAiModel.set(localAiModel);
    }
    
    // 加載語音服務設置
    const ttsEndpoint = localStorage.getItem('tts_endpoint');
    const ttsEnabled = localStorage.getItem('tts_enabled');
    const ttsVoice = localStorage.getItem('tts_voice');
    const sttEndpoint = localStorage.getItem('stt_endpoint');
    const sttEnabled = localStorage.getItem('stt_enabled');
    
    if (ttsEndpoint) this.ttsEndpoint.set(ttsEndpoint);
    if (ttsEnabled) this.ttsEnabled.set(ttsEnabled === 'true');
    if (ttsVoice) this.ttsVoice.set(ttsVoice);
    if (sttEndpoint) this.sttEndpoint.set(sttEndpoint);
    if (sttEnabled) this.sttEnabled.set(sttEnabled === 'true');
    
    // 加載克隆聲音列表
    this.loadClonedVoicesFromStorage();
    
    // 加載 AI 自動聊天設置
    this.loadAiChatSettings();
  }

}

export const knowledge_voice_methods_descriptors = Object.getOwnPropertyDescriptors(KnowledgeVoiceMethodsMixin.prototype);
