/**
 * TG-AI智控王 AI 助手面板組件
 * AI Assistant Panel Component v1.0
 * 
 * 整合知識庫、多模型、對話記憶的統一 AI 交互界面
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KnowledgeBaseService, KnowledgeDocument, SearchResult } from '../ai/knowledge-base.service';
import { ModelProviderService, ModelConfig, ChatResponse, StreamChunk } from '../ai/model-provider.service';
import { ConversationMemoryService, Conversation, ConversationMessage } from '../ai/conversation-memory.service';

type PanelTab = 'chat' | 'knowledge' | 'settings';

@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-panel" [class.expanded]="isExpanded()" [class.dark]="isDarkMode()">
      <!-- 折疊按鈕 -->
      <button class="toggle-btn" (click)="toggle()">
        <span class="toggle-icon">{{ isExpanded() ? '🤖 ✕' : '🤖' }}</span>
      </button>
      
      @if (isExpanded()) {
        <div class="panel-content">
          <!-- 標籤頁 -->
          <div class="panel-tabs">
            <button 
              *ngFor="let tab of tabs"
              class="tab-btn"
              [class.active]="activeTab() === tab.id"
              (click)="setActiveTab(tab.id)">
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          </div>
          
          <!-- 對話頁 -->
          @if (activeTab() === 'chat') {
            <div class="chat-container">
              <!-- 對話列表 -->
              <div class="conversation-selector">
                <select [(ngModel)]="currentConversationId"
                        (change)="switchConversation()"
                        class="conversation-select">
                  <option value="">新對話</option>
                  @for (conv of conversations(); track conv.id) {
                    <option [value]="conv.id">{{ conv.title }}</option>
                  }
                </select>
                <button class="icon-btn small" (click)="newConversation()" title="新對話">
                  ➕
                </button>
              </div>
              
              <!-- 消息列表 -->
              <div class="messages-container" #messagesContainer>
                @if (currentMessages().length === 0) {
                  <div class="empty-chat">
                    <div class="empty-icon">💬</div>
                    <p>開始與 AI 助手對話</p>
                    <div class="quick-prompts">
                      <button (click)="sendMessage('幫我搜索一些加密貨幣群組')">
                        🔍 搜索群組
                      </button>
                      <button (click)="sendMessage('如何批量發送消息？')">
                        📨 發送消息
                      </button>
                      <button (click)="sendMessage('分析最近提取的成員數據')">
                        📊 數據分析
                      </button>
                    </div>
                  </div>
                } @else {
                  @for (msg of currentMessages(); track msg.id) {
                    <div class="message" [class]="msg.role">
                      <div class="message-avatar">
                        {{ msg.role === 'user' ? '👤' : '🤖' }}
                      </div>
                      <div class="message-content">
                        <div class="message-text" [innerHTML]="formatMessage(msg.content)"></div>
                        @if (msg.metadata?.model) {
                          <div class="message-meta">
                            {{ msg.metadata.model }} · {{ formatTime(msg.timestamp) }}
                          </div>
                        }
                      </div>
                    </div>
                  }
                  
                  <!-- 正在回覆 -->
                  @if (isTyping()) {
                    <div class="message assistant">
                      <div class="message-avatar">🤖</div>
                      <div class="message-content">
                        <div class="typing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    </div>
                  }
                  
                  <!-- 流式回覆 -->
                  @if (streamingContent()) {
                    <div class="message assistant">
                      <div class="message-avatar">🤖</div>
                      <div class="message-content">
                        <div class="message-text" [innerHTML]="formatMessage(streamingContent()!)"></div>
                        <div class="streaming-indicator">正在回覆...</div>
                      </div>
                    </div>
                  }
                }
              </div>
              
              <!-- 知識庫上下文提示 -->
              @if (kbResults().length > 0) {
                <div class="kb-context">
                  <div class="kb-header">
                    <span>📚 已找到 {{ kbResults().length }} 條相關知識</span>
                    <button (click)="kbResults.set([])" class="close-btn">✕</button>
                  </div>
                  <div class="kb-items">
                    @for (result of kbResults().slice(0, 3); track result.chunk.id) {
                      <div class="kb-item">
                        <div class="kb-title">{{ result.document.title }}</div>
                        <div class="kb-preview">{{ result.chunk.content.slice(0, 100) }}...</div>
                      </div>
                    }
                  </div>
                </div>
              }
              
              <!-- 輸入區域 -->
              <div class="input-container">
                <div class="input-actions">
                  <button class="action-btn" (click)="searchKnowledge()" title="搜索知識庫">
                    📚
                  </button>
                  <button class="action-btn" (click)="toggleKbContext()" 
                          [class.active]="useKbContext()"
                          title="使用知識庫上下文">
                    {{ useKbContext() ? '✓' : '' }} 知識庫
                  </button>
                </div>
                
                <div class="input-wrapper">
                  <textarea 
                    [(ngModel)]="inputMessage"
                    (keydown.enter)="onEnterPress($event)"
                    placeholder="輸入消息...（Shift+Enter 換行）"
                    rows="1"
                    #inputArea></textarea>
                  <button 
                    class="send-btn"
                    [disabled]="!inputMessage.trim() || isTyping() || !!streamingContent()"
                    (click)="sendMessage()">
                    {{ isTyping() || streamingContent() ? '⏳' : '📤' }}
                  </button>
                </div>
              </div>
            </div>
          }
          
          <!-- 知識庫頁 -->
          @if (activeTab() === 'knowledge') {
            <div class="knowledge-container">
              <div class="kb-header-section">
                <h3>📚 知識庫管理</h3>
                <button class="btn primary" (click)="showAddDocument.set(true)">
                  ➕ 添加文檔
                </button>
              </div>
              
              <!-- 統計 -->
              <div class="kb-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ kbStats().totalDocuments }}</span>
                  <span class="stat-label">文檔數</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ kbStats().totalChunks }}</span>
                  <span class="stat-label">分塊數</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ formatTokens(kbStats().totalTokens) }}</span>
                  <span class="stat-label">Token</span>
                </div>
              </div>
              
              <!-- 文檔列表 -->
              <div class="kb-documents">
                @for (doc of kbDocuments(); track doc.id) {
                  <div class="document-item">
                    <div class="doc-icon">
                      {{ getDocIcon(doc.type) }}
                    </div>
                    <div class="doc-info">
                      <div class="doc-title">{{ doc.title }}</div>
                      <div class="doc-meta">
                        {{ doc.chunks.length }} 分塊 · {{ getDocTypeLabel(doc.type) }}
                      </div>
                    </div>
                    <div class="doc-actions">
                      <button class="icon-btn small" (click)="editDocument(doc)" title="編輯">
                        ✏️
                      </button>
                      <button class="icon-btn small danger" (click)="deleteDocument(doc.id)" title="刪除">
                        🗑️
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-kb">
                    <div class="empty-icon">📚</div>
                    <p>還沒有知識文檔</p>
                    <p class="text-sm">添加文檔來增強 AI 的回答能力</p>
                  </div>
                }
              </div>
              
              <!-- 添加文檔對話框 -->
              @if (showAddDocument()) {
                <div class="modal-overlay" (click)="showAddDocument.set(false)">
                  <div class="modal-content" (click)="$event.stopPropagation()">
                    <h3>添加知識文檔</h3>
                    
                    <div class="form-group">
                      <label>標題</label>
                      <input type="text" [(ngModel)]="newDoc.title" placeholder="文檔標題">
                    </div>
                    
                    <div class="form-group">
                      <label>類型</label>
                      <select [(ngModel)]="newDoc.type">
                        <option value="text">純文本</option>
                        <option value="markdown">Markdown</option>
                        <option value="faq">FAQ 問答</option>
                        <option value="product">產品文檔</option>
                        <option value="policy">政策文檔</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label>內容</label>
                      <textarea [(ngModel)]="newDoc.content" rows="10" placeholder="文檔內容..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                      <button class="btn" (click)="showAddDocument.set(false)">取消</button>
                      <button class="btn primary" 
                              [disabled]="!newDoc.title || !newDoc.content"
                              (click)="addDocument()">
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
          
          <!-- 設置頁 -->
          @if (activeTab() === 'settings') {
            <div class="settings-container">
              <h3>⚙️ AI 設置</h3>
              
              <!-- 模型選擇 -->
              <div class="setting-section">
                <h4>模型選擇</h4>
                <div class="model-list">
                  @for (model of availableModels(); track model.id) {
                    <div class="model-item" 
                         [class.active]="currentModel()?.id === model.id"
                         (click)="selectModel(model.id)">
                      <div class="model-info">
                        <div class="model-name">{{ model.displayName }}</div>
                        <div class="model-provider">{{ model.provider }}</div>
                      </div>
                      <div class="model-meta">
                        <span class="model-cost">\${{ model.costPer1kTokens }}/1K</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
              
              <!-- API Key 設置 -->
              <div class="setting-section">
                <h4>API Key</h4>
                <div class="api-key-form">
                  <div class="form-group">
                    <label>OpenAI</label>
                    <input type="password" 
                           [(ngModel)]="apiKeys.openai"
                           placeholder="sk-..."
                           (change)="saveApiKey('openai')">
                  </div>
                  <div class="form-group">
                    <label>Claude</label>
                    <input type="password" 
                           [(ngModel)]="apiKeys.claude"
                           placeholder="sk-..."
                           (change)="saveApiKey('claude')">
                  </div>
                </div>
              </div>
              
              <!-- 回覆設置 -->
              <div class="setting-section">
                <h4>回覆設置</h4>
                <div class="form-group">
                  <label>回覆風格</label>
                  <select [(ngModel)]="settings.responseStyle" (change)="saveSettings()">
                    <option value="concise">簡潔</option>
                    <option value="detailed">詳細</option>
                    <option value="friendly">友好</option>
                    <option value="formal">正式</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>語言</label>
                  <select [(ngModel)]="settings.language" (change)="saveSettings()">
                    <option value="中文">中文</option>
                    <option value="英文">English</option>
                    <option value="auto">自動</option>
                  </select>
                </div>
                <div class="form-group checkbox">
                  <label>
                    <input type="checkbox" 
                           [(ngModel)]="settings.streamResponse" 
                           (change)="saveSettings()">
                    流式回覆
                  </label>
                </div>
              </div>
              
              <!-- 記憶管理 -->
              <div class="setting-section">
                <h4>記憶管理</h4>
                <div class="memory-actions">
                  <button class="btn small" (click)="clearMemory('shortTerm')">
                    清除短期記憶
                  </button>
                  <button class="btn small" (click)="clearMemory('longTerm')">
                    清除長期記憶
                  </button>
                  <button class="btn small danger" (click)="clearMemory('all')">
                    清除所有記憶
                  </button>
                </div>
              </div>
              
              <!-- 使用統計 -->
              <div class="setting-section">
                <h4>使用統計</h4>
                <div class="usage-stats">
                  <div class="stat-row">
                    <span>總請求</span>
                    <span>{{ modelStats().totalRequests }}</span>
                  </div>
                  <div class="stat-row">
                    <span>總 Token</span>
                    <span>{{ formatTokens(modelStats().totalTokens) }}</span>
                  </div>
                  <div class="stat-row">
                    <span>總成本</span>
                    <span>\${{ modelStats().totalCost.toFixed(4) }}</span>
                  </div>
                  <div class="stat-row">
                    <span>平均延遲</span>
                    <span>{{ modelStats().avgLatency.toFixed(0) }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ai-panel {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .ai-panel.expanded {
      width: 420px;
      height: 600px;
      max-height: calc(100vh - 40px);
    }
    
    .toggle-btn {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      transition: all 0.3s;
      z-index: 10;
    }
    
    .toggle-btn:hover {
      transform: scale(1.1);
    }
    
    .toggle-icon {
      font-size: 24px;
    }
    
    .panel-content {
      position: absolute;
      right: 0;
      bottom: 70px;
      width: 100%;
      height: calc(100% - 70px);
      background: #1e293b;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .dark .panel-content {
      background: #0f172a;
    }
    
    /* 標籤頁 */
    .panel-tabs {
      display: flex;
      padding: 12px;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: transparent;
      color: #94a3b8;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
    }
    
    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .tab-btn.active {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
    }
    
    /* 對話容器 */
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .conversation-selector {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .conversation-select {
      flex: 1;
      padding: 8px 12px;
      background: #334155;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
    }
    
    /* 消息列表 */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .empty-chat {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .quick-prompts {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 20px;
    }
    
    .quick-prompts button {
      padding: 10px 16px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 8px;
      color: #818cf8;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
    }
    
    .quick-prompts button:hover {
      background: rgba(99, 102, 241, 0.2);
    }
    
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .message.user {
      flex-direction: row-reverse;
    }
    
    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .message.user .message-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .message-content {
      max-width: 80%;
    }
    
    .message-text {
      padding: 12px 16px;
      border-radius: 16px;
      background: #334155;
      color: #e2e8f0;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    
    .message.user .message-text {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .message-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      padding: 0 8px;
    }
    
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px;
    }
    
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #64748b;
      border-radius: 50%;
      animation: typing 1.4s infinite both;
    }
    
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
    
    .streaming-indicator {
      font-size: 11px;
      color: #818cf8;
      margin-top: 4px;
    }
    
    /* 知識庫上下文 */
    .kb-context {
      margin: 0 16px 12px;
      padding: 12px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
    }
    
    .kb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #818cf8;
      margin-bottom: 8px;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
    }
    
    .kb-item {
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 6px;
    }
    
    .kb-title {
      font-size: 12px;
      font-weight: 600;
      color: #e2e8f0;
    }
    
    .kb-preview {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    
    /* 輸入區域 */
    .input-container {
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .input-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .action-btn {
      padding: 6px 12px;
      background: #334155;
      border: none;
      border-radius: 6px;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn:hover, .action-btn.active {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
    }
    
    .input-wrapper {
      display: flex;
      gap: 8px;
    }
    
    .input-wrapper textarea {
      flex: 1;
      padding: 12px;
      background: #334155;
      border: none;
      border-radius: 12px;
      color: white;
      resize: none;
      font-size: 14px;
      font-family: inherit;
    }
    
    .input-wrapper textarea:focus {
      outline: 2px solid #818cf8;
    }
    
    .send-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.2s;
    }
    
    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }
    
    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* 知識庫頁面 */
    .knowledge-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .kb-header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .kb-header-section h3 {
      margin: 0;
      font-size: 16px;
      color: #e2e8f0;
    }
    
    .kb-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .stat-item {
      text-align: center;
      padding: 12px;
      background: #334155;
      border-radius: 10px;
    }
    
    .stat-value {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #818cf8;
    }
    
    .stat-label {
      font-size: 11px;
      color: #94a3b8;
    }
    
    .kb-documents {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .document-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #334155;
      border-radius: 10px;
    }
    
    .doc-icon {
      font-size: 24px;
    }
    
    .doc-info {
      flex: 1;
    }
    
    .doc-title {
      font-weight: 600;
      color: #e2e8f0;
      font-size: 14px;
    }
    
    .doc-meta {
      font-size: 12px;
      color: #64748b;
    }
    
    .doc-actions {
      display: flex;
      gap: 4px;
    }
    
    .empty-kb {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }
    
    /* 設置頁面 */
    .settings-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .settings-container h3 {
      margin: 0 0 16px;
      font-size: 16px;
      color: #e2e8f0;
    }
    
    .setting-section {
      margin-bottom: 24px;
    }
    
    .setting-section h4 {
      margin: 0 0 12px;
      font-size: 13px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    
    .model-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .model-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #334155;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .model-item:hover {
      background: #3f4f6b;
    }
    
    .model-item.active {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid #818cf8;
    }
    
    .model-name {
      font-weight: 600;
      color: #e2e8f0;
      font-size: 13px;
    }
    
    .model-provider {
      font-size: 11px;
      color: #64748b;
    }
    
    .model-cost {
      font-size: 12px;
      color: #818cf8;
    }
    
    .form-group {
      margin-bottom: 12px;
    }
    
    .form-group label {
      display: block;
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      background: #334155;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
    }
    
    .form-group.checkbox label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .memory-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .usage-stats {
      background: #334155;
      border-radius: 10px;
      padding: 12px;
    }
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 13px;
    }
    
    .stat-row:last-child {
      border-bottom: none;
    }
    
    .stat-row span:first-child {
      color: #94a3b8;
    }
    
    .stat-row span:last-child {
      color: #e2e8f0;
      font-weight: 600;
    }
    
    /* 通用按鈕 */
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      background: #334155;
      color: #e2e8f0;
    }
    
    .btn:hover {
      background: #3f4f6b;
    }
    
    .btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn.danger {
      background: #dc2626;
      color: white;
    }
    
    .btn.small {
      padding: 6px 12px;
      font-size: 12px;
    }
    
    .icon-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .icon-btn:hover {
      background: #3f4f6b;
    }
    
    .icon-btn.small {
      width: 28px;
      height: 28px;
    }
    
    .icon-btn.danger:hover {
      background: rgba(220, 38, 38, 0.2);
    }
    
    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    
    .modal-content {
      width: 90%;
      max-width: 400px;
      background: #1e293b;
      border-radius: 16px;
      padding: 24px;
    }
    
    .modal-content h3 {
      margin: 0 0 20px;
      color: #e2e8f0;
    }
    
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    
    .form-actions .btn {
      flex: 1;
    }
  `]
})
export class AIAssistantPanelComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('inputArea') inputArea!: ElementRef;
  
  private kb = inject(KnowledgeBaseService);
  private models = inject(ModelProviderService);
  private memory = inject(ConversationMemoryService);
  
  // 面板狀態
  isExpanded = signal(false);
  isDarkMode = signal(true);
  activeTab = signal<PanelTab>('chat');
  
  tabs = [
    { id: 'chat' as PanelTab, icon: '💬', label: '對話' },
    { id: 'knowledge' as PanelTab, icon: '📚', label: '知識庫' },
    { id: 'settings' as PanelTab, icon: '⚙️', label: '設置' }
  ];
  
  // 對話狀態
  inputMessage = '';
  currentConversationId = '';
  isTyping = signal(false);
  streamingContent = signal<string | null>(null);
  useKbContext = signal(true);
  kbResults = signal<SearchResult[]>([]);
  
  // 知識庫狀態
  showAddDocument = signal(false);
  newDoc = {
    title: '',
    content: '',
    type: 'text' as KnowledgeDocument['type']
  };
  
  // 設置
  apiKeys = {
    openai: '',
    claude: ''
  };
  
  settings = {
    responseStyle: 'friendly',
    language: '中文',
    streamResponse: true
  };
  
  // Computed
  conversations = computed(() => this.memory.getAllConversations());
  currentMessages = computed(() => {
    const conv = this.memory.currentConversation();
    return conv?.messages || [];
  });
  
  kbStats = computed(() => this.kb.stats());
  kbDocuments = computed(() => this.kb.getAllDocuments());
  
  availableModels = computed(() => this.models.getAvailableModels());
  currentModel = computed(() => this.models.currentModel());
  modelStats = computed(() => this.models.stats());
  
  ngOnInit(): void {
    this.loadSettings();
  }
  
  ngOnDestroy(): void {
    // 清理
  }
  
  // ============ 面板控制 ============
  
  toggle(): void {
    this.isExpanded.set(!this.isExpanded());
  }
  
  setActiveTab(tab: PanelTab): void {
    this.activeTab.set(tab);
  }
  
  // ============ 對話 ============
  
  async sendMessage(text?: string): Promise<void> {
    const message = text || this.inputMessage.trim();
    if (!message) return;
    
    this.inputMessage = '';
    
    // 添加用戶消息
    await this.memory.addMessage({
      role: 'user',
      content: message
    });
    
    // 滾動到底部
    this.scrollToBottom();
    
    // 搜索知識庫
    if (this.useKbContext()) {
      const results = await this.kb.search(message, { maxResults: 3 });
      this.kbResults.set(results);
    }
    
    // 構建消息
    const messages = await this.memory.buildMessages(message);
    
    // 添加知識庫上下文
    if (this.useKbContext() && this.kbResults().length > 0) {
      const context = await this.kb.getContext(message, 1500);
      if (context) {
        messages.splice(1, 0, {
          role: 'system',
          content: context
        });
      }
    }
    
    // 發送請求
    if (this.settings.streamResponse) {
      await this.streamChat(messages);
    } else {
      await this.normalChat(messages);
    }
  }
  
  private async normalChat(messages: any[]): Promise<void> {
    this.isTyping.set(true);
    
    try {
      const response = await this.models.chat({ messages });
      
      await this.memory.addMessage({
        role: 'assistant',
        content: response.content,
        tokens: response.usage.completionTokens,
        metadata: {
          model: response.model
        }
      } as any);
      
    } catch (error: any) {
      await this.memory.addMessage({
        role: 'assistant',
        content: `抱歉，發生錯誤：${error.message}`
      });
    } finally {
      this.isTyping.set(false);
      this.scrollToBottom();
    }
  }
  
  private async streamChat(messages: any[]): Promise<void> {
    this.streamingContent.set('');
    
    try {
      let fullContent = '';
      
      for await (const chunk of this.models.chatStream({ messages })) {
        fullContent += chunk.delta;
        this.streamingContent.set(fullContent);
        this.scrollToBottom();
      }
      
      await this.memory.addMessage({
        role: 'assistant',
        content: fullContent
      });
      
    } catch (error: any) {
      await this.memory.addMessage({
        role: 'assistant',
        content: `抱歉，發生錯誤：${error.message}`
      });
    } finally {
      this.streamingContent.set(null);
      this.scrollToBottom();
    }
  }
  
  onEnterPress(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  newConversation(): void {
    this.memory.createConversation();
    this.currentConversationId = '';
  }
  
  switchConversation(): void {
    if (this.currentConversationId) {
      this.memory.switchConversation(this.currentConversationId);
    } else {
      this.memory.createConversation();
    }
  }
  
  async searchKnowledge(): Promise<void> {
    if (!this.inputMessage.trim()) return;
    
    const results = await this.kb.search(this.inputMessage, { maxResults: 5 });
    this.kbResults.set(results);
  }
  
  toggleKbContext(): void {
    this.useKbContext.set(!this.useKbContext());
  }
  
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
  
  // ============ 知識庫 ============
  
  async addDocument(): Promise<void> {
    if (!this.newDoc.title || !this.newDoc.content) return;
    
    await this.kb.addDocument(
      this.newDoc.title,
      this.newDoc.content,
      this.newDoc.type
    );
    
    this.newDoc = { title: '', content: '', type: 'text' };
    this.showAddDocument.set(false);
  }
  
  editDocument(doc: KnowledgeDocument): void {
    // TODO: 編輯功能
    console.log('Edit:', doc);
  }
  
  async deleteDocument(id: string): Promise<void> {
    if (confirm('確定要刪除此文檔嗎？')) {
      await this.kb.deleteDocument(id);
    }
  }
  
  getDocIcon(type: KnowledgeDocument['type']): string {
    const icons: Record<string, string> = {
      text: '📄',
      markdown: '📝',
      faq: '❓',
      product: '📦',
      policy: '📋'
    };
    return icons[type] || '📄';
  }
  
  getDocTypeLabel(type: KnowledgeDocument['type']): string {
    const labels: Record<string, string> = {
      text: '純文本',
      markdown: 'Markdown',
      faq: 'FAQ',
      product: '產品',
      policy: '政策'
    };
    return labels[type] || type;
  }
  
  // ============ 設置 ============
  
  selectModel(modelId: string): void {
    this.models.selectModel(modelId);
  }
  
  saveApiKey(provider: 'openai' | 'claude'): void {
    const key = this.apiKeys[provider];
    if (key) {
      this.models.setApiKey(provider, key);
    }
  }
  
  saveSettings(): void {
    localStorage.setItem('tgai-assistant-settings', JSON.stringify(this.settings));
    
    // 更新記憶服務的偏好
    this.memory.updatePreferences({
      language: this.settings.language === 'auto' ? undefined : this.settings.language,
      responseStyle: this.settings.responseStyle as any
    });
  }
  
  loadSettings(): void {
    const stored = localStorage.getItem('tgai-assistant-settings');
    if (stored) {
      this.settings = { ...this.settings, ...JSON.parse(stored) };
    }
  }
  
  async clearMemory(type: 'shortTerm' | 'longTerm' | 'all'): Promise<void> {
    const messages: Record<string, string> = {
      shortTerm: '確定清除短期記憶？',
      longTerm: '確定清除長期記憶？',
      all: '確定清除所有記憶？這將刪除所有對話歷史。'
    };
    
    if (confirm(messages[type])) {
      await this.memory.clearMemory(type);
    }
  }
  
  // ============ 工具方法 ============
  
  formatMessage(content: string): string {
    // 簡單的 Markdown 支持
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
  
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return (tokens / 1000000).toFixed(1) + 'M';
    }
    if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'K';
    }
    return tokens.toString();
  }
}
