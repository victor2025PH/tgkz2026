// @ts-nocheck
/**
 * Phase 9-1b: Discussion, Knowledge, Voice
 * Mixin class — methods are merged into AppComponent.prototype at module load.
 */

class KnowledgeVoiceMethodsMixin {
  // ==================== Discussion Watcher Methods ====================
  
  // 初始化討論組監控
  initDiscussionWatcher() {
    this.ipcService.send('init-discussion-watcher', {});
  }
  
  // 發現頻道的討論組
  discoverDiscussion() {
    if (!this.discoverChannelId.trim()) {
      this.toastService.error('請輸入頻道 ID 或 username');
      return;
    }
    this.ipcService.send('discover-discussion', {
      channelId: this.discoverChannelId.trim()
    });
    this.discoverChannelId = '';
  }
  
  // 從已發現的資源中發現討論組
  discoverDiscussionsFromResources() {
    this.ipcService.send('discover-discussions-from-resources', {});
  }
  
  // 加載頻道-討論組列表
  loadChannelDiscussions() {
    this.ipcService.send('get-channel-discussions', { activeOnly: true });
  }
  
  // 刷新討論組統計
  refreshDiscussionStats() {
    this.ipcService.send('get-discussion-stats', {});
  }
  
  // 開始監控討論組
  startDiscussionMonitoring(discussionId: string) {
    this.ipcService.send('start-discussion-monitoring', {
      discussionId: discussionId
    });
  }
  
  // 停止監控討論組
  stopDiscussionMonitoring(discussionId: string) {
    this.ipcService.send('stop-discussion-monitoring', {
      discussionId: discussionId
    });
  }
  
  // 加載討論組消息
  loadDiscussionMessages(discussionId: string) {
    this.selectedDiscussionId.set(discussionId);
    this.isLoadingDiscussionMessages.set(true);
    this.ipcService.send('get-discussion-messages', {
      discussionId: discussionId,
      limit: 50,
      matchedOnly: false
    });
  }
  
  // 回復討論組消息
  replyToDiscussion(messageId: number, discussionId: string, replyText: string) {
    if (!replyText || !replyText.trim()) {
      this.toastService.error('請輸入回復內容');
      return;
    }
    this.ipcService.send('reply-to-discussion', {
      discussionId: discussionId,
      messageId: messageId,
      replyText: replyText.trim()
    });
    this.discussionReplyText.set('');
  }
  
  // ==================== Knowledge Base Methods ====================
  
  // 初始化知識庫
  initKnowledgeBase() {
    this.ipcService.send('init-knowledge-base', {});
  }
  
  // 加載知識庫數據
  loadKnowledgeData() {
    this.isLoadingKnowledge.set(true);
    
    // 獲取統計
    this.ipcService.send('get-knowledge-stats', {});
    
    // 根據當前標籤加載數據
    this.refreshCurrentKnowledgeTab();
  }
  
  // 刷新當前知識庫標籤
  refreshCurrentKnowledgeTab() {
    const tab = this.knowledgeTab();
    
    switch (tab) {
      case 'documents':
        this.ipcService.send('get-documents', {});
        break;
      case 'images':
        this.ipcService.send('get-media', { mediaType: 'image' });
        break;
      case 'videos':
        this.ipcService.send('get-media', { mediaType: 'video' });
        break;
      case 'qa':
        this.ipcService.send('get-qa-pairs', {});
        break;
    }
  }
  
  // 切換知識庫標籤
  switchKnowledgeTab(tab: 'documents' | 'images' | 'videos' | 'qa') {
    this.knowledgeTab.set(tab);
    this.refreshCurrentKnowledgeTab();
  }
  
  // 添加文檔
  addDocument() {
    const doc = this.newDocument();
    if (!doc.title && !doc.content) {
      this.toastService.error(this.t('documentTitle') + ' required', 2000);
      return;
    }
    
    this.ipcService.send('add-document', {
      title: doc.title,
      content: doc.content,
      category: doc.category,
      tags: doc.tags.split(',').map(t => t.trim()).filter(t => t)
    });
    
    this.showAddDocumentDialog.set(false);
    this.newDocument.set({title: '', category: 'general', tags: '', content: ''});
  }
  
  // 上傳文檔文件
  async uploadDocumentFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const doc = this.newDocument();
    
    // 讀取文件內容
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      this.ipcService.send('add-document', {
        title: doc.title || file.name.replace(/\.[^/.]+$/, ''),
        content: content,
        category: doc.category,
        tags: doc.tags.split(',').map(t => t.trim()).filter(t => t)
      });
      
      this.showAddDocumentDialog.set(false);
      this.newDocument.set({title: '', category: 'general', tags: '', content: ''});
    };
    
    if (file.type === 'application/pdf') {
      // PDF 需要後端處理
      this.toastService.info('PDF 文件將由後端處理', 2000);
    } else {
      reader.readAsText(file);
    }
    
    input.value = '';
  }
  
  // 刪除文檔
  deleteDocument(id: number) {
    this.ipcService.send('delete-document', { id });
    this.knowledgeDocuments.update(docs => docs.filter(d => d.id !== id));
  }
  
  // 上傳媒體文件
  async uploadMediaFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const media = this.newMedia();
    
    // 確定媒體類型
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';
    
    // 讀取為 base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      
      this.ipcService.send('add-media', {
        base64Data: base64,
        name: media.name || file.name.replace(/\.[^/.]+$/, ''),
        category: media.category,
        description: media.description,
        mediaType: mediaType
      });
      
      this.showAddMediaDialog.set(false);
      this.newMedia.set({name: '', category: 'general', description: '', mediaType: 'image'});
    };
    
    reader.readAsDataURL(file);
    input.value = '';
  }
  
  // 刪除媒體
  deleteMedia(id: number, mediaType: string) {
    this.ipcService.send('delete-media', { id });
    if (mediaType === 'image') {
      this.knowledgeImages.update(imgs => imgs.filter(i => i.id !== id));
    } else {
      this.knowledgeVideos.update(vids => vids.filter(v => v.id !== id));
    }
  }
  
  // 添加問答對
  addQaPair() {
    const qa = this.newQaPair();
    if (!qa.question || !qa.answer) {
      this.toastService.error(this.t('question') + ' & ' + this.t('answer') + ' required', 2000);
      return;
    }
    
    this.ipcService.send('add-qa-pair', {
      question: qa.question,
      answer: qa.answer,
      category: qa.category,
      keywords: qa.keywords.split(',').map(k => k.trim()).filter(k => k)
    });
    
    this.showAddQaDialog.set(false);
    this.newQaPair.set({question: '', answer: '', category: 'general', keywords: ''});
  }
  
  // 刪除問答對
  deleteQaPair(id: number) {
    // 需要後端支持
    this.knowledgeQaPairs.update(qas => qas.filter(q => q.id !== id));
  }
  
  // 打開添加圖片對話框
  openAddImageDialog() {
    this.newMedia.set({name: '', category: 'general', description: '', mediaType: 'image'});
    this.showAddMediaDialog.set(true);
  }
  
  // 打開添加視頻對話框
  openAddVideoDialog() {
    this.newMedia.set({name: '', category: 'general', description: '', mediaType: 'video'});
    this.showAddMediaDialog.set(true);
  }
  
  // 更新新文檔字段
  updateNewDocumentField(field: 'title' | 'category' | 'tags' | 'content', value: string) {
    const current = this.newDocument();
    this.newDocument.set({...current, [field]: value});
  }
  
  // 更新新媒體字段
  updateNewMediaField(field: 'name' | 'category' | 'description', value: string) {
    const current = this.newMedia();
    this.newMedia.set({...current, [field]: value});
  }
  
  // 更新新問答對字段
  updateNewQaPairField(field: 'question' | 'answer' | 'category' | 'keywords', value: string) {
    const current = this.newQaPair();
    this.newQaPair.set({...current, [field]: value});
  }
  
  // 搜索知識庫
  searchKnowledge(query: string) {
    if (!query.trim()) return;
    
    this.ipcService.send('search-knowledge', {
      query: query,
      includeDocs: true,
      includeImages: true,
      includeVideos: true,
      limit: 20
    });
  }
  
  // 發送 AI 問候建議
  sendAiGreeting() {
    const suggestion = this.aiGreetingSuggestion();
    if (!suggestion) return;
    
    this.ipcService.send('send-message', {
      phone: suggestion.accountPhone,
      recipientId: suggestion.userId,
      text: suggestion.suggestedGreeting,
      leadId: suggestion.leadId
    });
    
    this.showAiGreetingDialog.set(false);
    this.aiGreetingSuggestion.set(null);
    this.toastService.success(`✓ 問候消息已發送給 @${suggestion.username || suggestion.firstName}`);
  }
  
  // 編輯 AI 問候
  editAiGreeting(newText: string) {
    const suggestion = this.aiGreetingSuggestion();
    if (suggestion) {
      this.aiGreetingSuggestion.set({...suggestion, suggestedGreeting: newText});
    }
  }
  
  // 拒絕 AI 問候
  dismissAiGreeting() {
    this.showAiGreetingDialog.set(false);
    this.aiGreetingSuggestion.set(null);
  }
  
  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==================== Voice Clone Methods ====================
  
  // 上傳聲音樣本用於克隆
  async uploadVoiceSample(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    
    // 驗證文件類型
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      this.voiceCloneError.set(this.t('invalidAudioFormat'));
      return;
    }
    
    // 驗證文件大小 (最大 50MB)
    if (file.size > 50 * 1024 * 1024) {
      this.voiceCloneError.set(this.t('audioFileTooLarge'));
      return;
    }
    
    this.isUploadingVoice.set(true);
    this.voiceUploadProgress.set(0);
    this.voiceCloneError.set('');
    
    try {
      // 讀取文件為 Base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          this.voiceUploadProgress.set(Math.round((e.loaded / e.total) * 50));
        }
      };
      
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const voiceName = file.name.replace(/\.[^/.]+$/, '');
        
        // 發送到後端保存
        this.ipcService.send('upload-voice-sample', {
          name: voiceName,
          audioData: base64Data,
          fileName: file.name,
          fileType: file.type
        });
        
        this.voiceUploadProgress.set(100);
        
        // 模擬完成（實際應該等待後端響應）
        setTimeout(() => {
          const newVoice = {
            id: Date.now().toString(),
            name: voiceName,
            audioPath: file.name,
            promptText: '',  // 文件上傳沒有提示詞
            createdAt: new Date()
          };
          
          this.clonedVoices.update(voices => [...voices, newVoice]);
          this.saveClonedVoicesToStorage();
          this.isUploadingVoice.set(false);
          this.toastService.success(this.t('voiceUploadSuccess'), 2000);
        }, 500);
      };
      
      reader.onerror = () => {
        this.voiceCloneError.set(this.t('voiceUploadFailed'));
        this.isUploadingVoice.set(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error: any) {
      this.voiceCloneError.set(error.message);
      this.isUploadingVoice.set(false);
    }
    
    // 重置 input
    input.value = '';
  }
  
  // 選擇克隆的聲音
  selectClonedVoice(voiceId: string) {
    this.selectedClonedVoice.set(voiceId);
    const voice = this.clonedVoices().find(v => v.id === voiceId);
    if (voice) {
      this.ttsVoice.set(voice.audioPath);
    }
  }
  
  // 刪除克隆的聲音
  deleteClonedVoice(voiceId: string) {
    this.clonedVoices.update(voices => voices.filter(v => v.id !== voiceId));
    if (this.selectedClonedVoice() === voiceId) {
      this.selectedClonedVoice.set('');
      this.ttsVoice.set('');
    }
    this.saveClonedVoicesToStorage();
    
    // 通知後端刪除文件
    this.ipcService.send('delete-voice-sample', { voiceId });
    this.toastService.success(this.t('voiceDeleted'), 2000);
  }
  
  // 預覽克隆的聲音
  async previewClonedVoice(voiceId: string) {
    const voice = this.clonedVoices().find(v => v.id === voiceId);
    if (!voice) return;
    
    this.ipcService.send('preview-voice-sample', { 
      voiceId,
      audioPath: voice.audioPath 
    });
  }
  
  // 使用克隆聲音生成語音
  async generateWithClonedVoice(text: string) {
    const endpoint = this.ttsEndpoint();
    const voiceId = this.selectedClonedVoice();
    
    if (!endpoint) {
      this.toastService.error(this.t('ttsEndpointRequired'), 2000);
      return;
    }
    
    if (!voiceId) {
      this.toastService.error(this.t('selectVoiceFirst'), 2000);
      return;
    }
    
    const voice = this.clonedVoices().find(v => v.id === voiceId);
    if (!voice) return;
    
    this.ipcService.send('generate-cloned-voice', {
      endpoint,
      text,
      voiceId,
      audioPath: voice.audioPath
    });
  }
  
  // 保存克隆聲音列表到 localStorage
  private saveClonedVoicesToStorage() {
    const voices = this.clonedVoices().map(v => ({
      ...v,
      createdAt: v.createdAt.toISOString()
    }));
    localStorage.setItem('cloned_voices', JSON.stringify(voices));
  }
  
  // 從 localStorage 加載克隆聲音列表
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

  // ==================== Voice Recording Methods ====================
  
  // 打開錄音對話框
  openRecordingDialog() {
    this.showRecordingDialog.set(true);
    this.voiceName.set('');
    this.voicePromptText.set('');
    this.recordedAudioBlob.set(null);
    this.recordedAudioUrl.set('');
    this.voiceCloneError.set('');
    this.recordingTime.set(0);
  }
  
  // 關閉錄音對話框
  closeRecordingDialog() {
    this.stopRecording();
    this.showRecordingDialog.set(false);
    if (this.recordedAudioUrl()) {
      URL.revokeObjectURL(this.recordedAudioUrl());
    }
  }
  
  // 開始錄音
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedAudioBlob.set(audioBlob);
        
        // 創建預覽 URL
        if (this.recordedAudioUrl()) {
          URL.revokeObjectURL(this.recordedAudioUrl());
        }
        this.recordedAudioUrl.set(URL.createObjectURL(audioBlob));
        
        // 停止所有音軌
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start(100);
      this.isRecording.set(true);
      this.recordingTime.set(0);
      
      // 開始計時
      this.recordingTimer = setInterval(() => {
        this.recordingTime.update(t => t + 1);
        
        // 自動停止（最長 10 秒）
        if (this.recordingTime() >= 10) {
          this.stopRecording();
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Recording error:', error);
      this.voiceCloneError.set(this.t('microphoneAccessDenied'));
    }
  }
  
  // 停止錄音
  stopRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    }
  }
  
  // 確認並上傳錄音
  async confirmAndUploadRecording() {
    const audioBlob = this.recordedAudioBlob();
    const name = this.voiceName().trim();
    const promptText = this.voicePromptText().trim();
    
    // 驗證
    if (!name) {
      this.voiceCloneError.set(this.t('voiceNameRequired'));
      return;
    }
    
    if (!audioBlob) {
      this.voiceCloneError.set(this.t('noRecordingToUpload'));
      return;
    }
    
    const duration = this.recordingTime();
    if (duration < 3) {
      this.voiceCloneError.set(this.t('recordingTooShort'));
      return;
    }
    
    this.isUploadingVoice.set(true);
    this.voiceUploadProgress.set(0);
    
    try {
      // 將 Blob 轉換為 Base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          this.voiceUploadProgress.set(Math.round((e.loaded / e.total) * 50));
        }
      };
      
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        // 發送到後端保存
        this.ipcService.send('upload-voice-sample', {
          name: name,
          audioData: base64Data,
          fileName: `${name}.webm`,
          fileType: 'audio/webm',
          promptText: promptText,
          duration: duration
        });
        
        this.voiceUploadProgress.set(100);
        
        // 添加到列表
        const newVoice = {
          id: Date.now().toString(),
          name: name,
          audioPath: `${name}.webm`,
          promptText: promptText,
          createdAt: new Date()
        };
        
        this.clonedVoices.update(voices => [...voices, newVoice]);
        this.saveClonedVoicesToStorage();
        
        this.isUploadingVoice.set(false);
        this.toastService.success(this.t('voiceUploadSuccess'), 2000);
        this.closeRecordingDialog();
      };
      
      reader.onerror = () => {
        this.voiceCloneError.set(this.t('voiceUploadFailed'));
        this.isUploadingVoice.set(false);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error: any) {
      this.voiceCloneError.set(error.message);
      this.isUploadingVoice.set(false);
    }
  }
  
  // 重新錄音
  resetRecording() {
    if (this.recordedAudioUrl()) {
      URL.revokeObjectURL(this.recordedAudioUrl());
    }
    this.recordedAudioBlob.set(null);
    this.recordedAudioUrl.set('');
    this.recordingTime.set(0);
    this.voiceCloneError.set('');
  }

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
