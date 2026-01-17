/**
 * TG-AI智控王 管理中心組件
 * Admin Center Component v1.0
 * 
 * 統一入口：統計儀表板、API 管理、安全設置
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsageDashboardComponent } from '../business/usage-dashboard.component';
import { ReportService, ReportConfig, ReportData } from '../business/report.service';
import { APIGatewayService, APIKey, Webhook } from '../business/api-gateway.service';
import { PermissionService } from '../security/permission.service';
import { AuditService, AuditLogEntry } from '../security/audit.service';
import { EncryptionService } from '../security/encryption.service';

type AdminTab = 'usage' | 'reports' | 'api' | 'security' | 'audit';

@Component({
  selector: 'app-admin-center',
  standalone: true,
  imports: [CommonModule, FormsModule, UsageDashboardComponent],
  template: `
    <div class="admin-center" [class.dark]="isDarkMode()">
      <!-- 側邊導航 -->
      <aside class="admin-sidebar">
        <div class="sidebar-header">
          <h2>⚙️ 管理中心</h2>
        </div>
        
        <nav class="sidebar-nav">
          @for (tab of tabs; track tab.id) {
            <button 
              class="nav-item"
              [class.active]="activeTab() === tab.id"
              (click)="setActiveTab(tab.id)">
              <span class="nav-icon">{{ tab.icon }}</span>
              <span class="nav-label">{{ tab.label }}</span>
              @if (tab.badge) {
                <span class="nav-badge">{{ tab.badge }}</span>
              }
            </button>
          }
        </nav>
        
        <div class="sidebar-footer">
          <button class="theme-toggle" (click)="toggleDarkMode()">
            {{ isDarkMode() ? '☀️ 淺色' : '🌙 深色' }}
          </button>
        </div>
      </aside>
      
      <!-- 主內容區 -->
      <main class="admin-main">
        <!-- 使用統計 -->
        @if (activeTab() === 'usage') {
          <app-usage-dashboard></app-usage-dashboard>
        }
        
        <!-- 報表管理 -->
        @if (activeTab() === 'reports') {
          <div class="page-content">
            <div class="page-header">
              <h1>📊 報表管理</h1>
              <button class="btn primary" (click)="showCreateReport.set(true)">
                ➕ 創建報表
              </button>
            </div>
            
            <!-- 報表列表 -->
            <div class="report-grid">
              @for (report of reports(); track report.id) {
                <div class="report-card">
                  <div class="report-icon">{{ getReportIcon(report.type) }}</div>
                  <div class="report-info">
                    <h3>{{ report.name }}</h3>
                    <p>{{ report.description || '暫無描述' }}</p>
                    <div class="report-meta">
                      {{ report.metrics.length }} 指標 · {{ report.charts.length }} 圖表
                    </div>
                  </div>
                  <div class="report-actions">
                    <button class="btn small" (click)="generateReport(report.id)">
                      生成
                    </button>
                    <button class="btn small" (click)="editReport(report)">
                      編輯
                    </button>
                  </div>
                </div>
              }
            </div>
            
            <!-- 最近生成的報表 -->
            @if (recentReportData()) {
              <div class="recent-report">
                <h2>最近報表</h2>
                <div class="report-summary">
                  @for (item of Object.entries(recentReportData()!.summary); track item[0]) {
                    <div class="summary-item">
                      <span class="summary-label">{{ item[0] }}</span>
                      <span class="summary-value">{{ formatValue(item[1]) }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
        
        <!-- API 管理 -->
        @if (activeTab() === 'api') {
          <div class="page-content">
            <div class="page-header">
              <h1>🔑 API 管理</h1>
              <button class="btn primary" (click)="showCreateApiKey.set(true)">
                ➕ 創建 API Key
              </button>
            </div>
            
            <!-- API 統計 -->
            <div class="api-stats">
              <div class="stat-card">
                <span class="stat-value">{{ apiStats().totalRequests }}</span>
                <span class="stat-label">總請求</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">{{ apiStats().successRate.toFixed(1) }}%</span>
                <span class="stat-label">成功率</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">{{ apiStats().avgLatency.toFixed(0) }}ms</span>
                <span class="stat-label">平均延遲</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">{{ apiStats().activeKeys }}</span>
                <span class="stat-label">活躍 Key</span>
              </div>
            </div>
            
            <!-- API Keys 列表 -->
            <div class="section">
              <h2>API Keys</h2>
              <div class="api-key-list">
                @for (key of apiKeys(); track key.id) {
                  <div class="api-key-item" [class.inactive]="!key.isActive">
                    <div class="key-info">
                      <div class="key-name">{{ key.name }}</div>
                      <div class="key-value">{{ key.key }}</div>
                      <div class="key-meta">
                        創建於 {{ formatDate(key.createdAt) }}
                        @if (key.lastUsedAt) {
                          · 最後使用 {{ formatDate(key.lastUsedAt) }}
                        }
                      </div>
                    </div>
                    <div class="key-permissions">
                      @for (perm of key.permissions.slice(0, 3); track perm) {
                        <span class="perm-tag">{{ perm }}</span>
                      }
                      @if (key.permissions.length > 3) {
                        <span class="perm-more">+{{ key.permissions.length - 3 }}</span>
                      }
                    </div>
                    <div class="key-actions">
                      <button class="btn small" (click)="copyApiKey(key.key)">
                        複製
                      </button>
                      <button class="btn small danger" 
                              [disabled]="!key.isActive"
                              (click)="revokeApiKey(key.id)">
                        撤銷
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <p>還沒有創建 API Key</p>
                  </div>
                }
              </div>
            </div>
            
            <!-- Webhooks -->
            <div class="section">
              <h2>Webhooks</h2>
              <div class="webhook-list">
                @for (webhook of webhooks(); track webhook.id) {
                  <div class="webhook-item" [class.inactive]="!webhook.isActive">
                    <div class="webhook-info">
                      <div class="webhook-url">{{ webhook.url }}</div>
                      <div class="webhook-events">
                        @for (event of webhook.events; track event) {
                          <span class="event-tag">{{ event }}</span>
                        }
                      </div>
                    </div>
                    <div class="webhook-status">
                      @if (webhook.failureCount > 0) {
                        <span class="status-error">{{ webhook.failureCount }} 失敗</span>
                      } @else {
                        <span class="status-ok">正常</span>
                      }
                    </div>
                    <div class="webhook-actions">
                      <button class="btn small danger" (click)="deleteWebhook(webhook.id)">
                        刪除
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <p>還沒有配置 Webhook</p>
                  </div>
                }
              </div>
              
              <button class="btn" (click)="showCreateWebhook.set(true)">
                ➕ 添加 Webhook
              </button>
            </div>
            
            <!-- API 文檔 -->
            <div class="section">
              <h2>API 文檔</h2>
              <div class="api-docs-link">
                <p>查看完整的 API 文檔和 OpenAPI 規範</p>
                <button class="btn" (click)="downloadOpenAPI()">
                  📄 下載 OpenAPI
                </button>
              </div>
            </div>
          </div>
        }
        
        <!-- 安全設置 -->
        @if (activeTab() === 'security') {
          <div class="page-content">
            <div class="page-header">
              <h1>🔒 安全設置</h1>
            </div>
            
            <!-- 加密狀態 -->
            <div class="section">
              <h2>數據加密</h2>
              <div class="security-card">
                <div class="security-icon">🔐</div>
                <div class="security-info">
                  <h3>AES-256 加密</h3>
                  <p>所有敏感數據均使用 AES-256-GCM 加密存儲</p>
                </div>
                <div class="security-status active">
                  已啟用
                </div>
              </div>
            </div>
            
            <!-- 權限管理 -->
            <div class="section">
              <h2>權限管理</h2>
              <div class="permissions-grid">
                @for (role of roles(); track role.id) {
                  <div class="role-card">
                    <div class="role-header">
                      <h3>{{ role.name }}</h3>
                      <span class="role-level">Level {{ role.level }}</span>
                    </div>
                    <div class="role-permissions">
                      @for (perm of role.permissions.slice(0, 5); track perm) {
                        <span class="perm-item">✓ {{ perm }}</span>
                      }
                      @if (role.permissions.length > 5) {
                        <span class="perm-more">+{{ role.permissions.length - 5 }} 更多</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- 安全設置 -->
            <div class="section">
              <h2>安全選項</h2>
              <div class="security-options">
                <label class="option-item">
                  <input type="checkbox" [(ngModel)]="securitySettings.requireAuth" (change)="saveSecuritySettings()">
                  <span>要求登錄驗證</span>
                </label>
                <label class="option-item">
                  <input type="checkbox" [(ngModel)]="securitySettings.enableAudit" (change)="saveSecuritySettings()">
                  <span>啟用操作審計</span>
                </label>
                <label class="option-item">
                  <input type="checkbox" [(ngModel)]="securitySettings.encryptLocal" (change)="saveSecuritySettings()">
                  <span>加密本地存儲</span>
                </label>
                <label class="option-item">
                  <input type="checkbox" [(ngModel)]="securitySettings.rateLimiting" (change)="saveSecuritySettings()">
                  <span>啟用速率限制</span>
                </label>
              </div>
            </div>
          </div>
        }
        
        <!-- 審計日誌 -->
        @if (activeTab() === 'audit') {
          <div class="page-content">
            <div class="page-header">
              <h1>📋 審計日誌</h1>
              <div class="header-actions">
                <button class="btn" (click)="exportAuditLogs()">
                  📥 導出日誌
                </button>
                <button class="btn" (click)="verifyAuditIntegrity()">
                  🔍 驗證完整性
                </button>
              </div>
            </div>
            
            <!-- 過濾器 -->
            <div class="audit-filters">
              <select [(ngModel)]="auditFilter.level" (change)="filterAuditLogs()">
                <option value="">所有級別</option>
                <option value="info">信息</option>
                <option value="warning">警告</option>
                <option value="error">錯誤</option>
                <option value="critical">嚴重</option>
              </select>
              <select [(ngModel)]="auditFilter.category" (change)="filterAuditLogs()">
                <option value="">所有類別</option>
                <option value="auth">認證</option>
                <option value="data">數據</option>
                <option value="api">API</option>
                <option value="system">系統</option>
              </select>
              <input type="text" 
                     [(ngModel)]="auditFilter.search"
                     (input)="filterAuditLogs()"
                     placeholder="搜索...">
            </div>
            
            <!-- 日誌列表 -->
            <div class="audit-log-list">
              @for (log of filteredAuditLogs(); track log.id) {
                <div class="audit-log-item" [class]="log.level">
                  <div class="log-time">
                    {{ formatDateTime(log.timestamp) }}
                  </div>
                  <div class="log-level">
                    <span class="level-badge" [class]="log.level">
                      {{ getLevelIcon(log.level) }} {{ log.level.toUpperCase() }}
                    </span>
                  </div>
                  <div class="log-content">
                    <div class="log-action">{{ log.action }}</div>
                    <div class="log-details" *ngIf="log.details">
                      {{ JSON.stringify(log.details).slice(0, 100) }}...
                    </div>
                  </div>
                  <div class="log-verified" [class.valid]="log['verified']">
                    {{ log['verified'] ? '✓' : '?' }}
                  </div>
                </div>
              } @empty {
                <div class="empty-state">
                  <p>暫無審計日誌</p>
                </div>
              }
            </div>
            
            <!-- 分頁 -->
            <div class="pagination">
              <button class="btn small" [disabled]="auditPage() <= 1" (click)="prevAuditPage()">
                上一頁
              </button>
              <span>第 {{ auditPage() }} 頁</span>
              <button class="btn small" (click)="nextAuditPage()">
                下一頁
              </button>
            </div>
          </div>
        }
      </main>
      
      <!-- 創建 API Key 對話框 -->
      @if (showCreateApiKey()) {
        <div class="modal-overlay" (click)="showCreateApiKey.set(false)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <h3>創建 API Key</h3>
            
            <div class="form-group">
              <label>名稱</label>
              <input type="text" [(ngModel)]="newApiKey.name" placeholder="我的應用">
            </div>
            
            <div class="form-group">
              <label>等級</label>
              <select [(ngModel)]="newApiKey.tier">
                <option value="free">免費版</option>
                <option value="basic">基礎版</option>
                <option value="pro">專業版</option>
                <option value="enterprise">企業版</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>權限</label>
              <div class="permission-checkboxes">
                @for (perm of availablePermissions; track perm) {
                  <label class="checkbox-item">
                    <input type="checkbox" 
                           [checked]="newApiKey.permissions.includes(perm)"
                           (change)="togglePermission(perm)">
                    {{ perm }}
                  </label>
                }
              </div>
            </div>
            
            <div class="form-actions">
              <button class="btn" (click)="showCreateApiKey.set(false)">取消</button>
              <button class="btn primary" 
                      [disabled]="!newApiKey.name"
                      (click)="createApiKey()">
                創建
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 創建 Webhook 對話框 -->
      @if (showCreateWebhook()) {
        <div class="modal-overlay" (click)="showCreateWebhook.set(false)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <h3>添加 Webhook</h3>
            
            <div class="form-group">
              <label>URL</label>
              <input type="url" [(ngModel)]="newWebhook.url" placeholder="https://your-app.com/webhook">
            </div>
            
            <div class="form-group">
              <label>事件</label>
              <div class="event-checkboxes">
                @for (event of availableEvents; track event) {
                  <label class="checkbox-item">
                    <input type="checkbox" 
                           [checked]="newWebhook.events.includes(event)"
                           (change)="toggleEvent(event)">
                    {{ event }}
                  </label>
                }
              </div>
            </div>
            
            <div class="form-actions">
              <button class="btn" (click)="showCreateWebhook.set(false)">取消</button>
              <button class="btn primary" 
                      [disabled]="!newWebhook.url || newWebhook.events.length === 0"
                      (click)="createWebhook()">
                添加
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-center {
      display: flex;
      height: 100vh;
      background: #f8fafc;
      color: #1e293b;
    }
    
    .admin-center.dark {
      background: #0f172a;
      color: #e2e8f0;
    }
    
    /* 側邊欄 */
    .admin-sidebar {
      width: 260px;
      background: white;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }
    
    .dark .admin-sidebar {
      background: #1e293b;
      border-right-color: #334155;
    }
    
    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .dark .sidebar-header {
      border-bottom-color: #334155;
    }
    
    .sidebar-header h2 {
      margin: 0;
      font-size: 18px;
    }
    
    .sidebar-nav {
      flex: 1;
      padding: 12px;
    }
    
    .nav-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: none;
      background: none;
      border-radius: 10px;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
      margin-bottom: 4px;
      text-align: left;
    }
    
    .nav-item:hover {
      background: #f1f5f9;
    }
    
    .dark .nav-item:hover {
      background: #334155;
    }
    
    .nav-item.active {
      background: #eef2ff;
      color: #6366f1;
    }
    
    .dark .nav-item.active {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
    }
    
    .nav-icon {
      font-size: 20px;
    }
    
    .nav-label {
      flex: 1;
      font-size: 14px;
    }
    
    .nav-badge {
      padding: 2px 8px;
      background: #ef4444;
      color: white;
      border-radius: 10px;
      font-size: 11px;
    }
    
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
    }
    
    .dark .sidebar-footer {
      border-top-color: #334155;
    }
    
    .theme-toggle {
      width: 100%;
      padding: 10px;
      background: #f1f5f9;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
    }
    
    .dark .theme-toggle {
      background: #334155;
      color: #94a3b8;
    }
    
    /* 主內容區 */
    .admin-main {
      flex: 1;
      overflow-y: auto;
    }
    
    .page-content {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .page-header h1 {
      margin: 0;
      font-size: 24px;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
    
    /* 統計卡片 */
    .api-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .dark .stat-card {
      background: #1e293b;
    }
    
    .stat-value {
      display: block;
      font-size: 28px;
      font-weight: 700;
      color: #6366f1;
    }
    
    .stat-label {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    
    /* Section */
    .section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .dark .section {
      background: #1e293b;
    }
    
    .section h2 {
      margin: 0 0 16px;
      font-size: 16px;
      color: #64748b;
    }
    
    /* API Key 列表 */
    .api-key-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .api-key-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
    }
    
    .dark .api-key-item {
      background: #334155;
    }
    
    .api-key-item.inactive {
      opacity: 0.5;
    }
    
    .key-info {
      flex: 1;
    }
    
    .key-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .key-value {
      font-family: monospace;
      font-size: 13px;
      color: #64748b;
    }
    
    .key-meta {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }
    
    .key-permissions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .perm-tag {
      padding: 4px 8px;
      background: #eef2ff;
      color: #6366f1;
      border-radius: 6px;
      font-size: 11px;
    }
    
    .dark .perm-tag {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
    }
    
    .perm-more {
      padding: 4px 8px;
      color: #64748b;
      font-size: 11px;
    }
    
    .key-actions {
      display: flex;
      gap: 8px;
    }
    
    /* Webhook 列表 */
    .webhook-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .webhook-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
    }
    
    .dark .webhook-item {
      background: #334155;
    }
    
    .webhook-info {
      flex: 1;
    }
    
    .webhook-url {
      font-family: monospace;
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .webhook-events {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .event-tag {
      padding: 2px 6px;
      background: #dcfce7;
      color: #16a34a;
      border-radius: 4px;
      font-size: 10px;
    }
    
    .dark .event-tag {
      background: rgba(22, 163, 74, 0.2);
    }
    
    .status-ok {
      color: #16a34a;
    }
    
    .status-error {
      color: #ef4444;
    }
    
    /* 報表 */
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    
    .report-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .dark .report-card {
      background: #1e293b;
    }
    
    .report-icon {
      font-size: 32px;
    }
    
    .report-info {
      flex: 1;
    }
    
    .report-info h3 {
      margin: 0 0 4px;
      font-size: 16px;
    }
    
    .report-info p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    
    .report-meta {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 8px;
    }
    
    .report-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    /* 安全設置 */
    .security-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 10px;
    }
    
    .dark .security-card {
      background: #334155;
    }
    
    .security-icon {
      font-size: 32px;
    }
    
    .security-info {
      flex: 1;
    }
    
    .security-info h3 {
      margin: 0 0 4px;
      font-size: 15px;
    }
    
    .security-info p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    
    .security-status {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
    }
    
    .security-status.active {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .dark .security-status.active {
      background: rgba(22, 163, 74, 0.2);
    }
    
    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }
    
    .role-card {
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
    }
    
    .dark .role-card {
      background: #334155;
    }
    
    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .role-header h3 {
      margin: 0;
      font-size: 15px;
    }
    
    .role-level {
      padding: 2px 8px;
      background: #eef2ff;
      color: #6366f1;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .dark .role-level {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
    }
    
    .role-permissions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .perm-item {
      font-size: 13px;
      color: #64748b;
    }
    
    .security-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .option-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    
    /* 審計日誌 */
    .audit-filters {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .audit-filters select,
    .audit-filters input {
      padding: 10px 12px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
    }
    
    .dark .audit-filters select,
    .dark .audit-filters input {
      background: #1e293b;
      border-color: #334155;
      color: white;
    }
    
    .audit-filters input {
      flex: 1;
    }
    
    .audit-log-list {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .dark .audit-log-list {
      background: #1e293b;
    }
    
    .audit-log-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .dark .audit-log-item {
      border-bottom-color: #334155;
    }
    
    .log-time {
      width: 140px;
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }
    
    .log-level {
      width: 80px;
    }
    
    .level-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    
    .level-badge.info {
      background: #dbeafe;
      color: #2563eb;
    }
    
    .level-badge.warning {
      background: #fef3c7;
      color: #d97706;
    }
    
    .level-badge.error {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .level-badge.critical {
      background: #dc2626;
      color: white;
    }
    
    .log-content {
      flex: 1;
    }
    
    .log-action {
      font-size: 14px;
    }
    
    .log-details {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }
    
    .log-verified {
      width: 24px;
      text-align: center;
      color: #94a3b8;
    }
    
    .log-verified.valid {
      color: #16a34a;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
    }
    
    /* 通用 */
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #94a3b8;
    }
    
    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      background: #f1f5f9;
      color: #1e293b;
    }
    
    .dark .btn {
      background: #334155;
      color: #e2e8f0;
    }
    
    .btn:hover {
      background: #e2e8f0;
    }
    
    .dark .btn:hover {
      background: #3f4f6b;
    }
    
    .btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn.danger {
      background: #ef4444;
      color: white;
    }
    
    .btn.small {
      padding: 6px 12px;
      font-size: 13px;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    
    .modal-content {
      width: 90%;
      max-width: 500px;
      background: white;
      border-radius: 16px;
      padding: 24px;
    }
    
    .dark .modal-content {
      background: #1e293b;
    }
    
    .modal-content h3 {
      margin: 0 0 20px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .dark .form-group input,
    .dark .form-group select {
      background: #334155;
      border-color: #475569;
      color: white;
    }
    
    .permission-checkboxes,
    .event-checkboxes {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      cursor: pointer;
    }
    
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    
    .form-actions .btn {
      flex: 1;
    }
    
    @media (max-width: 768px) {
      .admin-center {
        flex-direction: column;
      }
      
      .admin-sidebar {
        width: 100%;
        height: auto;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .sidebar-nav {
        display: flex;
        overflow-x: auto;
        padding: 8px;
      }
      
      .nav-item {
        flex-shrink: 0;
      }
      
      .api-stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class AdminCenterComponent implements OnInit {
  private reportService = inject(ReportService);
  private apiGateway = inject(APIGatewayService);
  private permissionService = inject(PermissionService);
  private auditService = inject(AuditService);
  private encryptionService = inject(EncryptionService);
  
  // 狀態
  isDarkMode = signal(true);
  activeTab = signal<AdminTab>('usage');
  
  tabs = [
    { id: 'usage' as AdminTab, icon: '📊', label: '使用統計' },
    { id: 'reports' as AdminTab, icon: '📈', label: '報表' },
    { id: 'api' as AdminTab, icon: '🔑', label: 'API' },
    { id: 'security' as AdminTab, icon: '🔒', label: '安全' },
    { id: 'audit' as AdminTab, icon: '📋', label: '審計', badge: '' }
  ];
  
  // 報表
  reports = computed(() => this.reportService.getAllReportConfigs());
  recentReportData = signal<ReportData | null>(null);
  showCreateReport = signal(false);
  
  // API
  apiKeys = signal<APIKey[]>([]);
  webhooks = signal<Webhook[]>([]);
  apiStats = computed(() => this.apiGateway.stats());
  showCreateApiKey = signal(false);
  showCreateWebhook = signal(false);
  
  newApiKey = {
    name: '',
    tier: 'basic' as const,
    permissions: [] as string[]
  };
  
  newWebhook = {
    url: '',
    events: [] as string[]
  };
  
  availablePermissions = [
    'search:read', 'search:write',
    'member:read', 'member:export',
    'message:send',
    'analytics:read',
    'webhook:manage'
  ];
  
  availableEvents = [
    'search.completed',
    'member.extracted',
    'message.sent',
    'message.replied',
    'automation.triggered'
  ];
  
  // 安全
  roles = signal<any[]>([]);
  securitySettings = {
    requireAuth: true,
    enableAudit: true,
    encryptLocal: true,
    rateLimiting: true
  };
  
  // 審計
  auditLogs = signal<AuditLogEntry[]>([]);
  filteredAuditLogs = signal<AuditLogEntry[]>([]);
  auditFilter = {
    level: '',
    category: '',
    search: ''
  };
  auditPage = signal(1);
  
  JSON = JSON;
  
  ngOnInit(): void {
    this.loadData();
  }
  
  private loadData(): void {
    // 加載 API Keys
    this.apiKeys.set(this.apiGateway.getAllAPIKeys());
    this.webhooks.set(this.apiGateway.getAllWebhooks());
    
    // 加載角色
    this.roles.set([
      { id: 'admin', name: '管理員', level: 100, permissions: ['admin:*'] },
      { id: 'user', name: '普通用戶', level: 10, permissions: ['search:read', 'member:read'] },
      { id: 'viewer', name: '訪客', level: 1, permissions: ['analytics:read'] }
    ]);
    
    // 加載審計日誌
    this.loadAuditLogs();
  }
  
  setActiveTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }
  
  toggleDarkMode(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }
  
  // ============ 報表 ============
  
  async generateReport(id: string): Promise<void> {
    try {
      const data = await this.reportService.generateReport(id);
      this.recentReportData.set(data);
    } catch (error) {
      console.error('Generate report failed:', error);
    }
  }
  
  editReport(report: ReportConfig): void {
    console.log('Edit report:', report);
  }
  
  getReportIcon(type: string): string {
    const icons: Record<string, string> = {
      overview: '📊',
      search: '🔍',
      member: '👥',
      message: '💬',
      automation: '⚡',
      account: '👤',
      custom: '📝'
    };
    return icons[type] || '📊';
  }
  
  // ============ API ============
  
  async createApiKey(): Promise<void> {
    if (!this.newApiKey.name) return;
    
    await this.apiGateway.createAPIKey({
      name: this.newApiKey.name,
      permissions: this.newApiKey.permissions as any[],
      tier: this.newApiKey.tier
    });
    
    this.apiKeys.set(this.apiGateway.getAllAPIKeys());
    this.showCreateApiKey.set(false);
    this.newApiKey = { name: '', tier: 'basic', permissions: [] };
  }
  
  togglePermission(perm: string): void {
    const index = this.newApiKey.permissions.indexOf(perm);
    if (index === -1) {
      this.newApiKey.permissions.push(perm);
    } else {
      this.newApiKey.permissions.splice(index, 1);
    }
  }
  
  copyApiKey(key: string): void {
    navigator.clipboard.writeText(key);
    // TODO: 顯示成功提示
  }
  
  async revokeApiKey(id: string): Promise<void> {
    if (confirm('確定要撤銷此 API Key 嗎？')) {
      await this.apiGateway.revokeAPIKey(id);
      this.apiKeys.set(this.apiGateway.getAllAPIKeys());
    }
  }
  
  createWebhook(): void {
    if (!this.newWebhook.url || this.newWebhook.events.length === 0) return;
    
    this.apiGateway.createWebhook(
      this.newWebhook.url,
      this.newWebhook.events as any[]
    );
    
    this.webhooks.set(this.apiGateway.getAllWebhooks());
    this.showCreateWebhook.set(false);
    this.newWebhook = { url: '', events: [] };
  }
  
  toggleEvent(event: string): void {
    const index = this.newWebhook.events.indexOf(event);
    if (index === -1) {
      this.newWebhook.events.push(event);
    } else {
      this.newWebhook.events.splice(index, 1);
    }
  }
  
  deleteWebhook(id: string): void {
    if (confirm('確定要刪除此 Webhook 嗎？')) {
      this.apiGateway.deleteWebhook(id);
      this.webhooks.set(this.apiGateway.getAllWebhooks());
    }
  }
  
  downloadOpenAPI(): void {
    const spec = this.apiGateway.generateOpenAPISpec();
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // ============ 安全 ============
  
  saveSecuritySettings(): void {
    localStorage.setItem('tgai-security-settings', JSON.stringify(this.securitySettings));
  }
  
  // ============ 審計 ============
  
  private loadAuditLogs(): void {
    const logs = this.auditService.getLogs(100);
    this.auditLogs.set(logs);
    this.filterAuditLogs();
  }
  
  filterAuditLogs(): void {
    let logs = this.auditLogs();
    
    if (this.auditFilter.level) {
      logs = logs.filter(l => l.level === this.auditFilter.level);
    }
    
    if (this.auditFilter.search) {
      const search = this.auditFilter.search.toLowerCase();
      logs = logs.filter(l => 
        l.action.toLowerCase().includes(search) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(search)
      );
    }
    
    this.filteredAuditLogs.set(logs);
  }
  
  exportAuditLogs(): void {
    const logs = this.auditService.getLogs(1000);
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async verifyAuditIntegrity(): Promise<void> {
    const valid = await this.auditService.verifyIntegrity();
    alert(valid ? '審計日誌完整性驗證通過 ✓' : '審計日誌可能被篡改 ✗');
  }
  
  prevAuditPage(): void {
    if (this.auditPage() > 1) {
      this.auditPage.set(this.auditPage() - 1);
    }
  }
  
  nextAuditPage(): void {
    this.auditPage.set(this.auditPage() + 1);
  }
  
  getLevelIcon(level: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return icons[level] || 'ℹ️';
  }
  
  // ============ 工具方法 ============
  
  formatValue(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toLocaleString();
  }
  
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('zh-TW');
  }
  
  formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-TW');
  }
}
