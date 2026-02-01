/**
 * 🧠 AI 知識大腦 2.0 組件
 * 
 * 革命性的知識管理界面：
 * - 對話式知識構建
 * - 實時學習面板
 * - 語義搜索
 * - 知識健康度監控
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RAGBrainService, LearningEvent } from '../services/rag-brain.service';
import { DialogService } from '../services/dialog.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-ai-brain',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-brain-container">
      <!-- 🆕 P1-2: 任務驅動式頂部區域 -->
      <div class="task-banner" *ngIf="hasPendingTasks()">
        <div class="task-title">
          <span class="task-icon">📌</span>
          <span>今日待辦</span>
        </div>
        <div class="task-list">
          @if (ragService.gapsCount() > 0) {
            <div class="task-item priority-high" (click)="scrollToGaps()">
              <span class="task-badge high">🔴</span>
              <span class="task-text">{{ ragService.gapsCount() }} 個知識缺口待處理</span>
              <span class="task-action">立即處理 →</span>
            </div>
          }
          @if (ragService.healthScore() < 60) {
            <div class="task-item priority-medium">
              <span class="task-badge medium">🟡</span>
              <span class="task-text">知識庫健康度偏低 ({{ ragService.healthScore() }}%)</span>
              <span class="task-action">優化 →</span>
            </div>
          }
          @if (ragService.totalKnowledge() < 10) {
            <div class="task-item priority-low" (click)="focusBuildInput()">
              <span class="task-badge low">🟢</span>
              <span class="task-text">建議添加更多知識</span>
              <span class="task-action">開始 →</span>
            </div>
          }
        </div>
      </div>
      
      <!-- 頂部狀態欄 -->
      <div class="brain-header">
        <div class="brain-title">
          <span class="brain-icon">🧠</span>
          <span>AI 知識大腦</span>
          <span class="version-badge">2.0</span>
        </div>
        
        <div class="brain-stats">
          <div class="stat-item">
            <span class="stat-value">{{ ragService.totalKnowledge() }}</span>
            <span class="stat-label">知識總數</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ ragService.hitRate() }}%</span>
            <span class="stat-label">命中率</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">+{{ ragService.todayLearned() }}</span>
            <span class="stat-label">今日學習</span>
          </div>
          <div class="stat-item health" [class.healthy]="ragService.healthScore() >= 70">
            <span class="stat-value">{{ ragService.healthScore() }}%</span>
            <span class="stat-label">健康度</span>
          </div>
        </div>
      </div>
      
      <!-- 主要內容區 -->
      <div class="brain-content">
        <!-- 左側：對話式構建 -->
        <div class="build-section">
          <h3 class="section-title">
            <span class="icon">💬</span>
            對話式知識構建
          </h3>
          
          <div class="conversation-builder">
            <div class="chat-bubble ai">
              <div class="bubble-content">
                告訴我你的業務，我來幫你構建知識庫...
              </div>
            </div>
            
            <textarea 
              class="business-input"
              [(ngModel)]="businessDescription"
              placeholder="例如：我是做跨境支付的，主要幫客戶兌換 USDT，匯率比市場高 0.5%，10 分鐘到賬..."
              rows="4"
            ></textarea>
            
            <!-- 進度指示器 -->
            @if (ragService.buildProgress(); as progress) {
              <div class="build-progress">
                <div class="progress-bar">
                  <div class="progress-fill" 
                       [style.width.%]="(progress.step / progress.totalSteps) * 100">
                  </div>
                </div>
                <div class="progress-text">
                  {{ progress.currentAction }} ({{ progress.itemsGenerated }} 條)
                </div>
              </div>
            }
            
            <button 
              class="build-btn"
              [disabled]="!businessDescription || ragService.isLoading()"
              (click)="startBuild()">
              @if (ragService.isLoading() && ragService.currentRequest() === 'build') {
                <span class="spinner"></span>
                構建中...
              } @else {
                <span class="icon">✨</span>
                一鍵構建知識庫
              }
            </button>
            
            <!-- 🔧 P1: 取消按鈕 -->
            @if (ragService.isLoading() && ragService.currentRequest() === 'build') {
              <button class="cancel-request-btn" (click)="cancelCurrentRequest()">
                ✕ 取消
              </button>
            }
          </div>
          
          <!-- 快速導入 -->
          <div class="quick-import">
            <h4>或者快速導入</h4>
            <div class="import-buttons">
              <button class="import-btn guided" (click)="startGuidedBuild()">
                <span class="icon">🎯</span>
                引導式構建 (推薦)
              </button>
              <button class="import-btn" (click)="importFromUrl()">
                <span class="icon">🌐</span>
                從網頁導入
              </button>
              <button class="import-btn" (click)="importFromDocument()">
                <span class="icon">📄</span>
                上傳文檔
              </button>
              <button class="import-btn" (click)="openTemplateSelector()">
                <span class="icon">📚</span>
                行業模板
              </button>
            </div>
          </div>
        </div>
        
        <!-- 中間：語義搜索 -->
        <div class="search-section">
          <h3 class="section-title">
            <span class="icon">🔍</span>
            語義搜索
          </h3>
          
          <div class="search-box">
            <input 
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="輸入問題，AI 會找到最相關的知識..."
              (keyup.enter)="search()"
            />
            <button class="search-btn" (click)="search()" [disabled]="!searchQuery">
              搜索
            </button>
          </div>
          
          <div class="search-results">
            @if (ragService.isLoading() && ragService.currentRequest() === 'search') {
              <div class="loading-state">
                <span class="spinner"></span>
                正在搜索...
                <button class="cancel-link" (click)="cancelCurrentRequest()">取消</button>
              </div>
            } @else if (ragService.searchResults().length > 0) {
              @for (result of ragService.searchResults(); track result.item.id) {
                <div class="result-card" [class.high-match]="result.similarity >= 0.8">
                  <div class="result-header">
                    <span class="type-badge" [attr.data-type]="result.item.type">
                      {{ getTypeName(result.item.type) }}
                    </span>
                    <span class="similarity">
                      匹配度: {{ (result.similarity * 100).toFixed(0) }}%
                    </span>
                  </div>
                  <div class="result-question">{{ result.item.question }}</div>
                  <div class="result-answer">{{ result.item.answer }}</div>
                  <div class="result-actions">
                    <button class="action-btn positive" (click)="recordFeedback(result.item.id, true)">
                      👍 有用
                    </button>
                    <button class="action-btn negative" (click)="recordFeedback(result.item.id, false)">
                      👎 無用
                    </button>
                  </div>
                </div>
              }
            } @else if (searchQuery && !ragService.isLoading()) {
              <div class="empty-state">
                <span class="icon">🔍</span>
                <p>未找到相關知識</p>
                <button class="add-btn" (click)="addNewKnowledge()">添加這條知識</button>
              </div>
            } @else {
              <div class="placeholder-state">
                <span class="icon">💡</span>
                <p>輸入問題，AI 會用語義理解找到最相關的知識</p>
              </div>
            }
          </div>
        </div>
        
        <!-- 右側：實時學習 -->
        <div class="learning-section">
          <h3 class="section-title">
            <span class="icon">🔴</span>
            <span class="live-badge">LIVE</span>
            實時學習
          </h3>
          
          <div class="learning-feed">
            @if (ragService.learningEvents().length > 0) {
              @for (event of ragService.learningEvents().slice(0, 10); track event.id) {
                <div class="learning-event" [attr.data-type]="event.type">
                  <div class="event-icon">
                    @switch (event.type) {
                      @case ('new_knowledge') { 📚 }
                      @case ('auto_learn') { 💬 }
                      @case ('feedback') { 👍 }
                      @case ('quality_update') { 📈 }
                    }
                  </div>
                  <div class="event-content">
                    <div class="event-desc">{{ event.description }}</div>
                    <div class="event-time">{{ formatTime(event.timestamp) }}</div>
                  </div>
                </div>
              }
            } @else {
              <div class="empty-learning">
                <p>等待學習事件...</p>
                <p class="hint">AI 會從對話中自動學習</p>
              </div>
            }
          </div>
          
          <!-- 維護操作 -->
          <div class="maintenance-section">
            <h4>知識維護</h4>
            <div class="maintenance-buttons">
              <button class="maint-btn" (click)="cleanupKnowledge()">
                🧹 清理低質量
              </button>
              <button class="maint-btn" (click)="mergeKnowledge()">
                🔄 合併相似
              </button>
              <button class="maint-btn" (click)="refreshStats()">
                📊 刷新統計
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 🆕 P0-3: 知識缺口面板（優化版） -->
      @if (ragService.knowledgeGaps().length > 0) {
        <div class="gaps-section">
          <div class="gaps-header">
            <h3 class="section-title">
              <span class="icon">🔔</span>
              知識缺口
              <span class="gap-count">({{ ragService.gapsCount() }})</span>
            </h3>
            <div class="gaps-actions-bar">
              <button class="batch-btn cleanup" (click)="cleanupDuplicateGaps()" title="一鍵清理所有垃圾數據">
                🧹 深度清理
              </button>
              @if (selectedGapIds().length > 0) {
                <button class="batch-btn delete-selected" (click)="deleteSelectedGaps()">
                  🗑️ 刪除選中 ({{ selectedGapIds().length }})
                </button>
              }
            </div>
          </div>
          <p class="gaps-hint">💡 用戶問了但知識庫沒有好答案的問題，建議優先處理熱門問題</p>
          
          <div class="gaps-list">
            @for (gap of ragService.knowledgeGaps().slice(0, 15); track gap.id; let i = $index) {
              <div class="gap-card" [class.selected]="isGapSelected(gap.id)">
                <!-- 選擇框 -->
                <div class="gap-select">
                  <input type="checkbox" 
                         [checked]="isGapSelected(gap.id)" 
                         (change)="toggleGapSelection(gap.id)">
                </div>
                
                <!-- 主內容 -->
                <div class="gap-main">
                  <!-- 頂部：問題 + 標籤 -->
                  <div class="gap-top">
                    <span class="gap-query" [title]="gap.query">
                      {{ gap.query.length > 60 ? gap.query.slice(0, 60) + '...' : gap.query }}
                    </span>
                    <div class="gap-tags">
                      @if (gap.hitCount >= 5) {
                        <span class="tag hot">🔥 熱門</span>
                      }
                      @if (gap.category) {
                        <span class="tag category" [class]="'cat-' + gap.category">
                          {{ getCategoryLabel(gap.category) }}
                        </span>
                      }
                      <span class="tag hits">{{ gap.hitCount }}次</span>
                    </div>
                  </div>
                  
                  <!-- AI 建議（如果有） -->
                  @if (gap.suggestedAnswer) {
                    <div class="gap-suggestion">
                      <span class="suggestion-label">💡 AI:</span>
                      <span class="suggestion-text">{{ gap.suggestedAnswer.length > 80 ? gap.suggestedAnswer.slice(0, 80) + '...' : gap.suggestedAnswer }}</span>
                    </div>
                  }
                  
                  <!-- 操作按鈕 -->
                  <div class="gap-actions">
                    @if (!gap.suggestedAnswer) {
                      <button class="gap-btn suggest" (click)="suggestAnswer(gap)" title="讓 AI 生成建議答案">
                        🤖 生成
                      </button>
                    }
                    <button class="gap-btn resolve" (click)="resolveGap(gap)" title="採用並添加到知識庫">
                      ✅ 採用
                    </button>
                    <button class="gap-btn delete" (click)="deleteGap(gap)" title="直接刪除">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
          
          @if (ragService.gapsCount() > 15) {
            <div class="gaps-more">
              <span>還有 {{ ragService.gapsCount() - 15 }} 條未顯示</span>
            </div>
          }
        </div>
      } @else {
        <!-- 無缺口時顯示 -->
        <div class="gaps-empty">
          <span class="empty-icon">✨</span>
          <p>知識庫覆蓋良好，暫無知識缺口</p>
        </div>
      }
      
      <!-- 🆕 健康度儀表板 -->
      @if (ragService.healthReport(); as report) {
        @if (report.overallScore !== undefined) {
          <div class="health-dashboard">
            <h3 class="section-title">
              <span class="icon">📊</span>
              知識庫健康度報告
            </h3>
            
            <div class="health-overview">
              <div class="health-score-circle" 
                   [class.healthy]="report.overallScore >= 70"
                   [class.warning]="report.overallScore >= 40 && report.overallScore < 70"
                   [class.danger]="report.overallScore < 40">
                <span class="score-value">{{ report.overallScore }}</span>
                <span class="score-label">總分</span>
              </div>
              
              <div class="health-metrics">
                <div class="metric">
                  <span class="metric-label">完整性</span>
                  <div class="metric-bar">
                    <div class="bar-fill" [style.width.%]="report.completeness?.score || 0"></div>
                  </div>
                  <span class="metric-value">{{ report.completeness?.score || 0 }}%</span>
                </div>
                
                <div class="metric">
                  <span class="metric-label">效果</span>
                  <div class="metric-bar">
                    <div class="bar-fill" [style.width.%]="report.effectiveness?.score || 0"></div>
                  </div>
                  <span class="metric-value">{{ report.effectiveness?.score || 0 }}%</span>
                </div>
                
                <div class="metric">
                  <span class="metric-label">時效性</span>
                  <div class="metric-bar">
                    <div class="bar-fill" [style.width.%]="report.freshness?.score || 0"></div>
                  </div>
                  <span class="metric-value">{{ report.freshness?.score || 0 }}%</span>
                </div>
              </div>
            </div>
            
            @if (report.suggestions && report.suggestions.length > 0) {
              <div class="health-suggestions">
                <h4>💡 優化建議</h4>
                @for (suggestion of report.suggestions; track suggestion.message) {
                  <div class="suggestion-item" [attr.data-priority]="suggestion.priority">
                    <span class="priority-badge">{{ suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢' }}</span>
                    {{ suggestion.message }}
                  </div>
                }
              </div>
            }
          </div>
        }
      }
      
      <!-- 知識類型分布 -->
      @if (ragService.stats(); as stats) {
        <div class="knowledge-distribution">
          <h3>知識分布</h3>
          <div class="distribution-grid">
            @for (type of getStatTypes(stats.byType); track type.name) {
              <div class="type-card">
                <div class="type-name">{{ type.name }}</div>
                <div class="type-stats">
                  <span class="count">{{ type.count }} 條</span>
                  <span class="score">評分: {{ type.avgScore }}</span>
                </div>
                <div class="type-bar">
                  <div class="bar-fill" 
                       [style.width.%]="(type.count / stats.totalKnowledge) * 100"
                       [style.background]="getTypeColor(type.key)">
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 🆕 引導式構建對話框 -->
      @if (ragService.guidedQuestion(); as question) {
        <div class="guided-overlay">
          <div class="guided-dialog">
            <div class="guided-header">
              <span class="step-indicator">步驟 {{ question.step }} / {{ question.totalSteps }}</span>
              <h3>{{ question.title }}</h3>
              <button class="close-btn" (click)="cancelGuidedBuild()">✕</button>
            </div>
            
            <div class="guided-content">
              <p class="question-text">{{ question.question }}</p>
              
              @switch (question.type) {
                @case ('select') {
                  <div class="options-grid">
                    @for (opt of question.options; track opt.id) {
                      <button class="option-btn" 
                              [class.selected]="guidedAnswer === opt.id"
                              (click)="guidedAnswer = opt.id">
                        {{ opt.label }}
                      </button>
                    }
                  </div>
                }
                
                @case ('multiselect') {
                  <div class="options-grid multi">
                    @for (opt of question.options; track opt.id) {
                      <button class="option-btn" 
                              [class.selected]="isOptionSelected(opt.id)"
                              (click)="toggleOption(opt.id)">
                        {{ opt.label }}
                      </button>
                    }
                  </div>
                }
                
                @case ('textarea') {
                  <textarea class="guided-textarea" 
                            [(ngModel)]="guidedAnswer"
                            [placeholder]="question.placeholder || ''"></textarea>
                  @if (question.suggestions && question.suggestions.length) {
                    <div class="suggestions">
                      <span class="label">常見:</span>
                      @for (s of question.suggestions; track s) {
                        <button class="suggestion-chip" (click)="addSuggestion(s)">{{ s }}</button>
                      }
                    </div>
                  }
                }
              }
            </div>
            
            <div class="guided-footer">
              <button class="cancel-btn" (click)="cancelGuidedBuild()">取消</button>
              <button class="next-btn" 
                      [disabled]="!guidedAnswer || ragService.isLoading()"
                      (click)="submitGuidedAnswer()">
                @if (question.step < question.totalSteps) {
                  下一步 →
                } @else {
                  開始構建 ✨
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ai-brain-container {
      padding: 24px;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      min-height: 100vh;
      color: #fff;
    }
    
    /* 🆕 P1-2: 任務待辦區域 */
    .task-banner {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.15));
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    
    .task-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 12px;
    }
    
    .task-icon {
      font-size: 18px;
    }
    
    .task-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .task-item:hover {
      background: rgba(0, 0, 0, 0.5);
      transform: translateX(4px);
    }
    
    .task-badge {
      font-size: 12px;
    }
    
    .task-text {
      flex: 1;
      font-size: 14px;
      color: #ccc;
    }
    
    .task-action {
      font-size: 12px;
      color: #a855f7;
      font-weight: 500;
    }
    
    .task-item.priority-high .task-text { color: #f87171; }
    .task-item.priority-medium .task-text { color: #fbbf24; }
    .task-item.priority-low .task-text { color: #34d399; }
    
    .brain-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    
    .brain-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 24px;
      font-weight: bold;
    }
    
    .brain-icon {
      font-size: 32px;
    }
    
    .version-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .brain-stats {
      display: flex;
      gap: 32px;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
    }
    
    .stat-label {
      font-size: 12px;
      color: #888;
    }
    
    .stat-item.health .stat-value {
      color: #f59e0b;
    }
    
    .stat-item.health.healthy .stat-value {
      color: #10b981;
    }
    
    .brain-content {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
    }
    
    .live-badge {
      background: #ef4444;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    /* 構建區域 */
    .build-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
    }
    
    .conversation-builder {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .chat-bubble.ai {
      background: rgba(102, 126, 234, 0.2);
      padding: 12px 16px;
      border-radius: 16px 16px 16px 4px;
      font-size: 14px;
    }
    
    .business-input {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px;
      color: #fff;
      font-size: 14px;
      resize: none;
    }
    
    .business-input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .build-progress {
      padding: 12px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 8px;
    }
    
    .progress-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s;
    }
    
    .progress-text {
      font-size: 12px;
      color: #888;
    }
    
    .build-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .build-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }
    
    .build-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .quick-import {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .quick-import h4 {
      font-size: 13px;
      color: #888;
      margin-bottom: 12px;
    }
    
    .import-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .import-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .import-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: #667eea;
    }
    
    .import-btn.guided {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
      border-color: #667eea;
    }
    
    /* 搜索區域 */
    .search-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
    }
    
    .search-box {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .search-box input {
      flex: 1;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
    }
    
    .search-box input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .search-btn {
      padding: 12px 20px;
      background: #667eea;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    
    .search-btn:disabled {
      opacity: 0.5;
    }
    
    .search-results {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .result-card {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
    }
    
    .result-card.high-match {
      border-color: #10b981;
    }
    
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .type-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(102, 126, 234, 0.2);
      color: #667eea;
    }
    
    .similarity {
      font-size: 12px;
      color: #10b981;
    }
    
    .result-question {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 14px;
    }
    
    .result-answer {
      font-size: 13px;
      color: #aaa;
      line-height: 1.5;
    }
    
    .result-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    
    .action-btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn.positive {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
    }
    
    .action-btn.negative {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }
    
    .action-btn:hover {
      transform: scale(1.05);
    }
    
    .empty-state, .placeholder-state, .loading-state {
      text-align: center;
      padding: 40px 20px;
      color: #888;
    }
    
    .empty-state .icon, .placeholder-state .icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    
    .add-btn {
      margin-top: 12px;
      padding: 10px 20px;
      background: #667eea;
      border: none;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
    }
    
    /* 學習區域 */
    .learning-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
    }
    
    .learning-feed {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .learning-event {
      display: flex;
      gap: 12px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    .event-icon {
      font-size: 20px;
    }
    
    .event-desc {
      font-size: 13px;
    }
    
    .event-time {
      font-size: 11px;
      color: #666;
    }
    
    .empty-learning {
      text-align: center;
      padding: 30px;
      color: #666;
    }
    
    .empty-learning .hint {
      font-size: 12px;
      color: #555;
    }
    
    .maintenance-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .maintenance-section h4 {
      font-size: 13px;
      color: #888;
      margin-bottom: 12px;
    }
    
    .maintenance-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .maint-btn {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #aaa;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .maint-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    
    /* 知識分布 */
    .knowledge-distribution {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
    }
    
    .knowledge-distribution h3 {
      margin-bottom: 16px;
      font-size: 16px;
    }
    
    .distribution-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    
    .type-card {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
    }
    
    .type-name {
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .type-stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #888;
      margin-bottom: 8px;
    }
    
    .type-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      border-radius: 2px;
    }
    
    /* 加載動畫 */
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* 🔧 P1: 取消按鈕樣式 */
    .cancel-request-btn {
      display: block;
      width: 100%;
      margin-top: 8px;
      padding: 10px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      color: #ef4444;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .cancel-request-btn:hover {
      background: rgba(239, 68, 68, 0.3);
    }
    
    .cancel-link {
      display: block;
      margin-top: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 12px;
      cursor: pointer;
      text-decoration: underline;
    }
    
    .cancel-link:hover {
      color: #ef4444;
    }
    
    /* 響應式 */
    @media (max-width: 1200px) {
      .brain-content {
        grid-template-columns: 1fr 1fr;
      }
      
      .learning-section {
        grid-column: span 2;
      }
    }
    
    @media (max-width: 768px) {
      .brain-content {
        grid-template-columns: 1fr;
      }
      
      .learning-section {
        grid-column: auto;
      }
      
      .brain-header {
        flex-direction: column;
        gap: 16px;
      }
      
      .brain-stats {
        flex-wrap: wrap;
        justify-content: center;
      }
    }
    
    /* 🆕 P0-3: 優化知識缺口樣式 */
    .gaps-section {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(168, 85, 247, 0.08));
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    
    .gaps-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .gap-count {
      color: #ef4444;
      font-weight: bold;
    }
    
    .gaps-actions-bar {
      display: flex;
      gap: 8px;
    }
    
    .gaps-hint {
      font-size: 13px;
      color: #888;
      margin-bottom: 16px;
    }
    
    .gaps-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .gap-card {
      display: flex;
      gap: 12px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 12px;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    
    .gap-card:hover {
      background: rgba(0, 0, 0, 0.4);
      border-color: rgba(168, 85, 247, 0.3);
    }
    
    .gap-card.selected {
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.5);
    }
    
    .gap-select {
      display: flex;
      align-items: flex-start;
      padding-top: 4px;
    }
    
    .gap-select input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #a855f7;
    }
    
    .gap-main {
      flex: 1;
      min-width: 0;
    }
    
    .gap-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .gap-query {
      font-size: 14px;
      color: #e0e0e0;
      flex: 1;
      line-height: 1.4;
    }
    
    .gap-tags {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    
    .tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
    }
    
    .tag.hot {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .tag.hits {
      background: rgba(100, 116, 139, 0.3);
      color: #94a3b8;
    }
    
    .tag.category {
      background: rgba(168, 85, 247, 0.2);
      color: #c4b5fd;
    }
    
    .tag.cat-price { background: rgba(234, 179, 8, 0.2); color: #fbbf24; }
    .tag.cat-process { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .tag.cat-product { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .tag.cat-support { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    
    .gap-suggestion {
      display: flex;
      gap: 6px;
      font-size: 12px;
      color: #888;
      margin-bottom: 8px;
      padding: 6px 10px;
      background: rgba(168, 85, 247, 0.1);
      border-radius: 6px;
    }
    
    .suggestion-label {
      color: #a855f7;
      flex-shrink: 0;
    }
    
    .suggestion-text {
      color: #aaa;
    }
    
    .gap-actions {
      display: flex;
      gap: 6px;
    }
    
    .gap-btn {
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .gap-btn.suggest {
      background: rgba(168, 85, 247, 0.2);
      color: #c4b5fd;
    }
    
    .gap-btn.resolve {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    
    .gap-btn.delete {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .gap-btn:hover {
      filter: brightness(1.2);
    }
    
    .batch-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: none;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .batch-btn.cleanup {
      background: rgba(234, 179, 8, 0.2);
      color: #fbbf24;
    }
    
    .batch-btn.delete-selected {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .gaps-more {
      text-align: center;
      padding: 12px;
      color: #666;
      font-size: 13px;
    }
    
    .gaps-empty {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    
    .gaps-empty .empty-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }
    
    .gaps-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .gap-card {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 14px;
    }
    
    .gap-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    
    .gap-query {
      font-weight: 600;
      color: #fff;
    }
    
    .gap-hits {
      background: #ef4444;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
    }
    
    .gap-suggestion {
      background: rgba(102, 126, 234, 0.1);
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      color: #aaa;
      margin-bottom: 10px;
    }
    
    .gap-actions {
      display: flex;
      gap: 8px;
    }
    
    .gap-btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    
    .gap-btn.suggest {
      background: rgba(102, 126, 234, 0.2);
      color: #667eea;
    }
    
    .gap-btn.resolve {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }
    
    .gap-btn.ignore {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
    }
    
    /* 🆕 刪除按鈕樣式 */
    .gap-btn.delete {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    
    .gap-btn.delete:hover {
      background: rgba(239, 68, 68, 0.4);
    }
    
    .gap-btn:hover {
      transform: scale(1.05);
    }
    
    /* 🆕 批量操作按鈕 */
    .batch-btn {
      margin-left: auto;
      padding: 6px 12px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .batch-btn.cleanup {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }
    
    .batch-btn.cleanup:hover {
      background: rgba(245, 158, 11, 0.4);
    }
    
    /* 🆕 健康度儀表板樣式 */
    .health-dashboard {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    
    .health-overview {
      display: flex;
      gap: 30px;
      align-items: center;
    }
    
    .health-score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      border: 3px solid #667eea;
    }
    
    .health-score-circle.healthy {
      border-color: #10b981;
    }
    
    .health-score-circle.warning {
      border-color: #f59e0b;
    }
    
    .health-score-circle.danger {
      border-color: #ef4444;
    }
    
    .score-value {
      font-size: 28px;
      font-weight: bold;
    }
    
    .score-label {
      font-size: 12px;
      color: #888;
    }
    
    .health-metrics {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .metric {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .metric-label {
      width: 60px;
      font-size: 13px;
      color: #888;
    }
    
    .metric-bar {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .metric-bar .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
    }
    
    .metric-value {
      width: 40px;
      text-align: right;
      font-size: 13px;
      font-weight: 600;
    }
    
    .health-suggestions {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .health-suggestions h4 {
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    /* 🆕 引導式構建對話框樣式 */
    .guided-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .guided-dialog {
      background: #1a1a2e;
      border-radius: 20px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .guided-header {
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }
    
    .step-indicator {
      font-size: 12px;
      color: #667eea;
      margin-bottom: 4px;
      display: block;
    }
    
    .guided-header h3 {
      margin: 0;
      font-size: 20px;
    }
    
    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: #888;
      font-size: 20px;
      cursor: pointer;
    }
    
    .guided-content {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }
    
    .question-text {
      font-size: 16px;
      margin-bottom: 20px;
    }
    
    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .options-grid.multi {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    
    .option-btn {
      padding: 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }
    
    .option-btn:hover {
      border-color: #667eea;
    }
    
    .option-btn.selected {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.2);
    }
    
    .guided-textarea {
      width: 100%;
      min-height: 120px;
      padding: 14px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      resize: vertical;
    }
    
    .suggestions {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    
    .suggestions .label {
      font-size: 12px;
      color: #888;
    }
    
    .suggestion-chip {
      padding: 4px 10px;
      background: rgba(102, 126, 234, 0.2);
      border: none;
      border-radius: 12px;
      color: #667eea;
      font-size: 12px;
      cursor: pointer;
    }
    
    .guided-footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .cancel-btn {
      padding: 10px 20px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #888;
      cursor: pointer;
    }
    
    .next-btn {
      padding: 10px 24px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    
    .next-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class AIBrainComponent implements OnInit {
  protected ragService = inject(RAGBrainService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  
  businessDescription = '';
  searchQuery = '';
  
  // 🆕 引導式構建
  guidedAnswer: any = '';
  selectedOptions: string[] = [];
  
  // 🆕 P1-3: 批量選擇功能
  selectedGapIds = signal<number[]>([]);
  
  ngOnInit() {
    // 初始化 RAG 系統
    this.ragService.initialize();
    this.ragService.refreshStats();
    
    // 🆕 加載知識缺口和健康度
    this.ragService.getKnowledgeGaps();
    this.ragService.getHealthReport();
  }
  
  // 🆕 P1-3: 批量選擇方法
  isGapSelected(gapId: number): boolean {
    return this.selectedGapIds().includes(gapId);
  }
  
  toggleGapSelection(gapId: number): void {
    const current = this.selectedGapIds();
    if (current.includes(gapId)) {
      this.selectedGapIds.set(current.filter(id => id !== gapId));
    } else {
      this.selectedGapIds.set([...current, gapId]);
    }
  }
  
  deleteSelectedGaps(): void {
    const ids = this.selectedGapIds();
    if (ids.length === 0) return;
    
    this.ragService.deleteGapsBatch(ids);
    this.selectedGapIds.set([]);
    this.toastService.success(`已刪除 ${ids.length} 條缺口`);
  }
  
  // 🆕 P1-1: 分類標籤
  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'price': '💰 價格',
      'process': '📋 流程',
      'product': '📦 產品',
      'support': '🛠️ 售後',
      'other': '❓ 其他'
    };
    return labels[category] || category;
  }
  
  // 🆕 P1-2: 任務驅動式方法
  hasPendingTasks(): boolean {
    return this.ragService.gapsCount() > 0 || 
           this.ragService.healthScore() < 60 || 
           this.ragService.totalKnowledge() < 10;
  }
  
  scrollToGaps(): void {
    const gapsSection = document.querySelector('.gaps-section');
    if (gapsSection) {
      gapsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  focusBuildInput(): void {
    const input = document.querySelector('.build-textarea') as HTMLTextAreaElement;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  // ==================== 構建方法 ====================
  
  async startBuild() {
    if (!this.businessDescription.trim()) return;
    
    await this.ragService.buildFromConversation({
      businessDescription: this.businessDescription
    });
  }
  
  importFromUrl() {
    // 🔧 Phase 5: 檢查是否有 API Key 錯誤
    const lastError = this.ragService.lastError();
    if (lastError?.type === 'api_key_missing') {
      // 清除錯誤狀態
      this.ragService.clearLastError?.();
    }
    
    this.dialogService.prompt({
      title: '從網頁導入知識',
      message: '輸入網頁 URL，AI 會自動提取知識：\n\n💡 提示：需要先在「AI 中心」→「模型設定」配置 AI API Key',
      placeholder: 'https://example.com/about',
      confirmText: '導入',
      onConfirm: (url) => {
        if (url) {
          this.ragService.importFromUrl(url);
        }
      }
    });
  }
  
  importFromDocument() {
    // 觸發文件選擇
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.pdf,.doc,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const ext = file.name.split('.').pop() || '';
        // 注意：這裡需要通過 Electron 獲取真實路徑
        // 暫時顯示提示
        this.toastService.info(`選擇了文件: ${file.name}，正在處理...`);
        // TODO: 通過 IPC 傳遞文件
      }
    };
    input.click();
  }
  
  openTemplateSelector() {
    // 顯示行業模板選擇器
    this.dialogService.prompt({
      title: '選擇行業模板',
      message: '輸入行業類型（payment/ecommerce/education/realestate/finance/healthcare/travel/legal）：',
      placeholder: 'payment',
      confirmText: '應用',
      onConfirm: (templateId) => {
        if (templateId) {
          // 這裡可以觸發行業模板應用
          this.toastService.info(`正在應用「${templateId}」模板...`);
        }
      }
    });
  }
  
  // ==================== 搜索方法 ====================
  
  search() {
    if (!this.searchQuery.trim()) return;
    this.ragService.search(this.searchQuery);
  }
  
  recordFeedback(knowledgeId: number, isPositive: boolean) {
    this.ragService.recordFeedback(knowledgeId, isPositive);
    this.toastService.success(isPositive ? '感謝您的反饋！' : '已記錄，我們會改進');
  }
  
  addNewKnowledge() {
    this.dialogService.prompt({
      title: '添加新知識',
      message: '輸入回答內容：',
      placeholder: '專業的回答...',
      confirmText: '添加',
      onConfirm: (answer) => {
        if (answer) {
          this.ragService.addKnowledge('qa', this.searchQuery, answer);
        }
      }
    });
  }
  
  // ==================== 維護方法 ====================
  
  cleanupKnowledge() {
    this.dialogService.confirm({
      title: '清理低質量知識',
      message: '將刪除評分低於 0.2 且未被使用的舊知識，確認繼續？',
      confirmText: '清理',
      type: 'warning',
      onConfirm: () => {
        this.ragService.cleanupLowQuality();
        this.toastService.info('正在清理...');
      }
    });
  }
  
  mergeKnowledge() {
    this.ragService.mergeSimilar();
    this.toastService.info('正在合併相似知識...');
  }
  
  refreshStats() {
    this.ragService.refreshStats();
    this.toastService.success('已刷新統計');
  }
  
  /**
   * 🔧 P1: 取消當前請求
   */
  cancelCurrentRequest() {
    this.ragService.cancelCurrentRequest();
  }
  
  // ==================== 輔助方法 ====================
  
  getTypeName(type: string): string {
    const names: Record<string, string> = {
      'qa': '問答',
      'script': '話術',
      'product': '產品',
      'objection': '異議處理',
      'greeting': '開場白',
      'closing': '成交',
      'faq': 'FAQ',
      'custom': '自定義'
    };
    return names[type] || type;
  }
  
  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'Q&A 問答': '#667eea',
      '成功話術': '#10b981',
      '產品信息': '#f59e0b',
      '異議處理': '#ef4444',
      '開場白': '#8b5cf6',
      '成交話術': '#06b6d4',
      'FAQ': '#ec4899',
      '自定義': '#6b7280'
    };
    return colors[type] || '#667eea';
  }
  
  getStatTypes(byType: Record<string, any>): Array<{key: string; name: string; count: number; avgScore: number}> {
    return Object.entries(byType || {}).map(([name, data]: [string, any]) => ({
      key: name,
      name,
      count: data.count || 0,
      avgScore: data.avg_score || data.avgScore || 0
    }));
  }
  
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    
    return date.toLocaleDateString('zh-TW');
  }
  
  // ==================== 🆕 知識缺口方法 ====================
  
  suggestAnswer(gap: any) {
    this.ragService.suggestGapAnswer(gap.id, gap.query);
    this.toastService.info('正在生成 AI 建議...');
  }
  
  resolveGap(gap: any) {
    const answer = gap.suggestedAnswer || '';
    
    this.dialogService.prompt({
      title: '解決知識缺口',
      message: `問題: "${gap.query}"\n\n請輸入回答:`,
      placeholder: answer || '專業的回答...',
      defaultValue: answer,
      confirmText: '添加到知識庫',
      onConfirm: (finalAnswer) => {
        if (finalAnswer) {
          this.ragService.resolveGap(gap.id, 'faq', gap.query, finalAnswer);
        }
      }
    });
  }
  
  ignoreGap(gap: any) {
    this.ragService.ignoreGap(gap.id);
  }
  
  // 🆕 刪除單條缺口（無需確認）
  deleteGap(gap: any) {
    this.ragService.deleteGap(gap.id);
    this.toastService.success('已刪除');
  }
  
  // 🆕 清理重複缺口
  cleanupDuplicateGaps() {
    this.ragService.cleanupDuplicateGaps();
    this.toastService.info('正在清理重複缺口...');
  }
  
  // ==================== 🆕 引導式構建方法 ====================
  
  startGuidedBuild() {
    this.guidedAnswer = '';
    this.selectedOptions = [];
    this.ragService.startGuidedBuild();
  }
  
  isOptionSelected(optionId: string): boolean {
    return this.selectedOptions.includes(optionId);
  }
  
  toggleOption(optionId: string) {
    if (this.selectedOptions.includes(optionId)) {
      this.selectedOptions = this.selectedOptions.filter(id => id !== optionId);
    } else {
      this.selectedOptions.push(optionId);
    }
    this.guidedAnswer = this.selectedOptions;
  }
  
  addSuggestion(suggestion: string) {
    if (typeof this.guidedAnswer === 'string') {
      this.guidedAnswer = this.guidedAnswer 
        ? `${this.guidedAnswer}\n${suggestion}`
        : suggestion;
    }
  }
  
  submitGuidedAnswer() {
    this.ragService.answerGuidedQuestion(this.guidedAnswer);
    this.guidedAnswer = '';
    this.selectedOptions = [];
  }
  
  cancelGuidedBuild() {
    this.ragService.cancelGuidedBuild();
    this.guidedAnswer = '';
    this.selectedOptions = [];
  }
}
