/**
 * TG-AI智控王 自動化面板組件
 * Automation Panel Component v1.0
 * 
 * 觸發器和工作流的詳細管理界面
 */

import { Component, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TriggerSystem, Trigger, TriggerEvent, ActionType, TriggerAction } from '../automation/trigger-system';
import { WorkflowEngine, Workflow, WorkflowNode, NodeType } from '../automation/workflow-engine';
import { AIReplyEngine, ReplyTemplate, ReplyStyle } from '../automation/ai-reply-engine';

type PanelMode = 'list' | 'edit-trigger' | 'edit-workflow' | 'edit-template';

@Component({
  selector: 'app-automation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="automation-panel" [class.dark]="darkMode">
      <!-- 觸發器編輯器 -->
      <div class="editor-modal" *ngIf="mode() === 'edit-trigger'">
        <div class="modal-header">
          <h2>{{ editingTrigger ? '編輯觸發器' : '新建觸發器' }}</h2>
          <button class="close-btn" (click)="cancelEdit()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>名稱</label>
            <input type="text" [(ngModel)]="triggerForm.name" placeholder="觸發器名稱">
          </div>
          
          <div class="form-group">
            <label>觸發事件</label>
            <select [(ngModel)]="triggerForm.event">
              <option *ngFor="let event of triggerEvents" [value]="event.value">
                {{ event.icon }} {{ event.label }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>優先級</label>
            <input type="number" [(ngModel)]="triggerForm.priority" min="1" max="100">
          </div>
          
          <div class="form-group">
            <label>冷卻時間 (秒)</label>
            <input type="number" [(ngModel)]="triggerForm.cooldown" min="0">
          </div>
          
          <div class="form-section">
            <div class="section-header">
              <h3>動作列表</h3>
              <button class="add-btn" (click)="addAction()">+ 添加動作</button>
            </div>
            
            <div class="action-list">
              <div class="action-item" *ngFor="let action of triggerForm.actions; let i = index">
                <div class="action-header">
                  <select [(ngModel)]="action.type" class="action-type-select">
                    <option *ngFor="let type of actionTypes" [value]="type.value">
                      {{ type.icon }} {{ type.label }}
                    </option>
                  </select>
                  <button class="remove-btn" (click)="removeAction(i)">🗑️</button>
                </div>
                
                <div class="action-params" [ngSwitch]="action.type">
                  <ng-container *ngSwitchCase="'send_message'">
                    <textarea [(ngModel)]="action.params.message" placeholder="消息內容"></textarea>
                  </ng-container>
                  
                  <ng-container *ngSwitchCase="'send_template'">
                    <select [(ngModel)]="action.params.templateId">
                      <option *ngFor="let tpl of templates()" [value]="tpl.id">
                        {{ tpl.name }}
                      </option>
                    </select>
                  </ng-container>
                  
                  <ng-container *ngSwitchCase="'ai_reply'">
                    <select [(ngModel)]="action.params.style">
                      <option value="professional">專業</option>
                      <option value="friendly">友好</option>
                      <option value="casual">輕鬆</option>
                    </select>
                  </ng-container>
                  
                  <ng-container *ngSwitchCase="'add_tag'">
                    <input type="text" [(ngModel)]="action.params.tag" placeholder="標籤名稱">
                  </ng-container>
                  
                  <ng-container *ngSwitchCase="'notify_admin'">
                    <textarea [(ngModel)]="action.params.message" placeholder="通知內容"></textarea>
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="action.params.urgent">
                      緊急通知
                    </label>
                  </ng-container>
                  
                  <ng-container *ngSwitchCase="'webhook'">
                    <input type="text" [(ngModel)]="action.params.url" placeholder="Webhook URL">
                    <select [(ngModel)]="action.params.method">
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </ng-container>
                </div>
                
                <div class="action-options">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="action.retryOnFailure">
                    失敗重試
                  </label>
                  <div class="delay-input" *ngIf="i > 0">
                    <label>延遲</label>
                    <input type="number" [(ngModel)]="action.delay" placeholder="毫秒" min="0">
                    <span>ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="triggerForm.enabled">
              立即啟用
            </label>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn" (click)="cancelEdit()">取消</button>
          <button class="btn primary" (click)="saveTrigger()">保存</button>
        </div>
      </div>
      
      <!-- 工作流編輯器 -->
      <div class="editor-modal workflow-editor" *ngIf="mode() === 'edit-workflow'">
        <div class="modal-header">
          <h2>{{ editingWorkflow ? '編輯工作流' : '新建工作流' }}</h2>
          <button class="close-btn" (click)="cancelEdit()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>名稱</label>
              <input type="text" [(ngModel)]="workflowForm.name" placeholder="工作流名稱">
            </div>
            <div class="form-group">
              <label>描述</label>
              <input type="text" [(ngModel)]="workflowForm.description" placeholder="工作流描述">
            </div>
          </div>
          
          <!-- 工作流畫布 -->
          <div class="workflow-canvas">
            <div class="canvas-toolbar">
              <div class="node-palette">
                <div class="palette-item" 
                     *ngFor="let node of nodeTypes"
                     draggable="true"
                     (dragstart)="onNodeDragStart($event, node)">
                  <span class="node-icon">{{ node.icon }}</span>
                  <span class="node-label">{{ node.label }}</span>
                </div>
              </div>
              <div class="canvas-actions">
                <button class="tool-btn" (click)="validateWorkflow()" title="驗證">✓</button>
                <button class="tool-btn" (click)="autoLayout()" title="自動排版">⊞</button>
                <button class="tool-btn" (click)="clearCanvas()" title="清空">🗑️</button>
              </div>
            </div>
            
            <div class="canvas-area" 
                 (dragover)="onCanvasDragOver($event)"
                 (drop)="onCanvasDrop($event)">
              <!-- 節點渲染 -->
              <div class="workflow-node" 
                   *ngFor="let node of workflowForm.nodes"
                   [class]="'node-' + node.type"
                   [style.left.px]="node.position.x"
                   [style.top.px]="node.position.y"
                   [class.selected]="selectedNode?.id === node.id"
                   (click)="selectNode(node)"
                   (mousedown)="onNodeMouseDown($event, node)">
                <div class="node-header">
                  <span class="node-type-icon">{{ getNodeIcon(node.type) }}</span>
                  <span class="node-name">{{ node.name }}</span>
                </div>
                <div class="node-body">
                  <div class="node-input" *ngIf="node.type !== 'start'"></div>
                  <div class="node-output" *ngIf="node.type !== 'end'"></div>
                </div>
              </div>
              
              <!-- 連接線 -->
              <svg class="connections-layer">
                <ng-container *ngFor="let node of workflowForm.nodes">
                  <line *ngFor="let outputId of node.outputs"
                        [attr.x1]="node.position.x + 100"
                        [attr.y1]="node.position.y + 30"
                        [attr.x2]="getNodePosition(outputId)?.x || 0"
                        [attr.y2]="(getNodePosition(outputId)?.y || 0) + 30"
                        class="connection-line">
                  </line>
                </ng-container>
              </svg>
            </div>
          </div>
          
          <!-- 節點屬性面板 -->
          <div class="node-properties" *ngIf="selectedNode">
            <h4>節點屬性: {{ selectedNode.name }}</h4>
            
            <div class="form-group">
              <label>名稱</label>
              <input type="text" [(ngModel)]="selectedNode.name">
            </div>
            
            <div class="form-group" *ngIf="selectedNode.type === 'delay'">
              <label>延遲時間 (ms)</label>
              <input type="number" [(ngModel)]="selectedNode.config.delay" min="0">
            </div>
            
            <div class="form-group" *ngIf="selectedNode.type === 'action'">
              <label>動作類型</label>
              <select [(ngModel)]="selectedNode.config.actionType">
                <option *ngFor="let type of actionTypes" [value]="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            
            <div class="form-group" *ngIf="selectedNode.type === 'condition'">
              <label>條件表達式</label>
              <input type="text" [(ngModel)]="selectedNode.config.expression" placeholder="e.g., intent === 'complaint'">
            </div>
            
            <div class="form-group" *ngIf="selectedNode.type === 'loop'">
              <label>循環次數</label>
              <input type="number" [(ngModel)]="selectedNode.config.iterations" min="1">
            </div>
            
            <button class="btn danger small" (click)="deleteSelectedNode()">刪除節點</button>
          </div>
          
          <!-- 驗證結果 -->
          <div class="validation-result" *ngIf="validationResult">
            <div class="validation-icon" [class.valid]="validationResult.valid">
              {{ validationResult.valid ? '✓' : '✗' }}
            </div>
            <div class="validation-message">
              <span *ngIf="validationResult.valid">工作流驗證通過</span>
              <ul *ngIf="!validationResult.valid">
                <li *ngFor="let error of validationResult.errors">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn" (click)="cancelEdit()">取消</button>
          <button class="btn primary" (click)="saveWorkflow()">保存</button>
        </div>
      </div>
      
      <!-- 模板編輯器 -->
      <div class="editor-modal" *ngIf="mode() === 'edit-template'">
        <div class="modal-header">
          <h2>{{ editingTemplate ? '編輯模板' : '新建模板' }}</h2>
          <button class="close-btn" (click)="cancelEdit()">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>名稱</label>
              <input type="text" [(ngModel)]="templateForm.name" placeholder="模板名稱">
            </div>
            <div class="form-group">
              <label>分類</label>
              <input type="text" [(ngModel)]="templateForm.category" placeholder="模板分類">
            </div>
          </div>
          
          <div class="form-group">
            <label>描述</label>
            <input type="text" [(ngModel)]="templateForm.description" placeholder="模板描述（可選）">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>語言</label>
              <select [(ngModel)]="templateForm.language">
                <option value="auto">自動</option>
                <option value="zh-TW">繁體中文</option>
                <option value="zh-CN">簡體中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="form-group">
              <label>風格</label>
              <select [(ngModel)]="templateForm.style">
                <option value="professional">專業</option>
                <option value="friendly">友好</option>
                <option value="casual">輕鬆</option>
                <option value="formal">正式</option>
                <option value="humorous">幽默</option>
                <option value="concise">簡潔</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>內容</label>
            <textarea 
              [(ngModel)]="templateForm.content" 
              placeholder="使用 {{變量名}} 插入變量"
              rows="6"></textarea>
            <div class="help-text">
              可用變量: {{ '{{' }}name{{ '}}' }}, {{ '{{' }}product{{ '}}' }}, {{ '{{' }}greeting{{ '}}' }}, {{ '{{' }}answer{{ '}}' }}
            </div>
          </div>
          
          <div class="form-group">
            <label>標籤</label>
            <div class="tags-input">
              <span class="tag" *ngFor="let tag of templateForm.tags; let i = index">
                {{ tag }}
                <button class="tag-remove" (click)="removeTag(i)">×</button>
              </span>
              <input 
                type="text" 
                [(ngModel)]="newTag" 
                placeholder="添加標籤..."
                (keyup.enter)="addTag()">
            </div>
          </div>
          
          <div class="preview-section">
            <h4>預覽</h4>
            <div class="template-preview">
              {{ getTemplatePreview() }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn" (click)="cancelEdit()">取消</button>
          <button class="btn primary" (click)="saveTemplate()">保存</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #6366f1;
      --primary-light: #818cf8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --border-color: #e2e8f0;
      
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 12px;
    }
    
    .automation-panel.dark {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --border-color: #334155;
    }
    
    .editor-modal {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      max-width: 800px;
      margin: 0 auto;
    }
    
    .workflow-editor {
      max-width: 1200px;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 20px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--text-secondary);
      cursor: pointer;
    }
    
    .modal-body {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 14px;
      color: var(--text-primary);
      transition: all 0.2s;
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .form-group textarea {
      resize: vertical;
      min-height: 100px;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    
    .help-text {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .checkbox-label input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary);
    }
    
    .btn {
      padding: 10px 20px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn:hover {
      background: var(--border-color);
    }
    
    .btn.primary {
      background: var(--primary);
      color: white;
    }
    
    .btn.primary:hover {
      background: var(--primary-light);
    }
    
    .btn.danger {
      background: var(--danger);
      color: white;
    }
    
    .btn.small {
      padding: 6px 12px;
      font-size: 12px;
    }
    
    /* === 動作列表 === */
    .form-section {
      margin-bottom: 24px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .add-btn {
      padding: 6px 12px;
      background: var(--primary);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 12px;
      cursor: pointer;
    }
    
    .action-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .action-item {
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    
    .action-header {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .action-type-select {
      flex: 1;
    }
    
    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.6;
    }
    
    .remove-btn:hover {
      opacity: 1;
    }
    
    .action-params {
      margin-bottom: 12px;
    }
    
    .action-params textarea,
    .action-params input,
    .action-params select {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .action-options {
      display: flex;
      gap: 20px;
      font-size: 13px;
    }
    
    .delay-input {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .delay-input input {
      width: 80px;
      padding: 4px 8px;
    }
    
    /* === 工作流畫布 === */
    .workflow-canvas {
      margin-bottom: 20px;
    }
    
    .canvas-toolbar {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-bottom: none;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    
    .node-palette {
      display: flex;
      gap: 8px;
    }
    
    .palette-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      font-size: 12px;
      cursor: grab;
    }
    
    .palette-item:hover {
      background: var(--primary);
      color: white;
    }
    
    .canvas-actions {
      display: flex;
      gap: 8px;
    }
    
    .tool-btn {
      width: 32px;
      height: 32px;
      background: var(--bg-tertiary);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    
    .tool-btn:hover {
      background: var(--border-color);
    }
    
    .canvas-area {
      position: relative;
      height: 400px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      overflow: hidden;
    }
    
    .workflow-node {
      position: absolute;
      width: 140px;
      background: var(--bg-primary);
      border: 2px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: move;
      transition: box-shadow 0.2s;
    }
    
    .workflow-node:hover,
    .workflow-node.selected {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .workflow-node.selected {
      border-color: var(--primary);
    }
    
    .workflow-node.node-start { border-color: var(--success); }
    .workflow-node.node-end { border-color: var(--danger); }
    .workflow-node.node-condition { border-color: var(--warning); }
    .workflow-node.node-ai { border-color: var(--primary); }
    
    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    }
    
    .node-type-icon {
      font-size: 14px;
    }
    
    .node-name {
      font-size: 12px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .node-body {
      padding: 12px;
      display: flex;
      justify-content: space-between;
    }
    
    .node-input,
    .node-output {
      width: 12px;
      height: 12px;
      background: var(--border-color);
      border-radius: 50%;
    }
    
    .node-output {
      background: var(--primary);
    }
    
    .connections-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    
    .connection-line {
      stroke: var(--primary);
      stroke-width: 2;
      fill: none;
    }
    
    /* === 節點屬性 === */
    .node-properties {
      margin-top: 16px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }
    
    .node-properties h4 {
      margin: 0 0 16px;
      font-size: 14px;
    }
    
    /* === 驗證結果 === */
    .validation-result {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      padding: 12px;
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
    }
    
    .validation-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--danger);
      color: white;
      font-weight: bold;
    }
    
    .validation-icon.valid {
      background: var(--success);
    }
    
    .validation-message ul {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: var(--danger);
    }
    
    /* === 標籤輸入 === */
    .tags-input {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    
    .tag {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--primary);
      color: white;
      border-radius: var(--radius-sm);
      font-size: 12px;
    }
    
    .tag-remove {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    
    .tags-input input {
      flex: 1;
      min-width: 100px;
      padding: 4px;
      background: transparent;
      border: none;
      font-size: 13px;
    }
    
    .tags-input input:focus {
      outline: none;
    }
    
    /* === 預覽 === */
    .preview-section {
      margin-top: 20px;
    }
    
    .preview-section h4 {
      margin: 0 0 12px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .template-preview {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      font-size: 14px;
      white-space: pre-wrap;
    }
  `]
})
export class AutomationPanelComponent {
  @Input() darkMode = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  
  private triggerSystem = inject(TriggerSystem);
  private workflowEngine = inject(WorkflowEngine);
  private aiReplyEngine = inject(AIReplyEngine);
  
  mode = signal<PanelMode>('list');
  
  // 觸發器
  editingTrigger: Trigger | null = null;
  triggerForm = this.getDefaultTriggerForm();
  
  // 工作流
  editingWorkflow: Workflow | null = null;
  workflowForm = this.getDefaultWorkflowForm();
  selectedNode: WorkflowNode | null = null;
  validationResult: { valid: boolean; errors: string[] } | null = null;
  
  // 模板
  editingTemplate: ReplyTemplate | null = null;
  templateForm = this.getDefaultTemplateForm();
  newTag = '';
  
  // 選項
  triggerEvents = [
    { value: 'message_received', label: '收到消息', icon: '💬' },
    { value: 'member_joined', label: '成員加入', icon: '👋' },
    { value: 'member_left', label: '成員離開', icon: '👤' },
    { value: 'keyword_detected', label: '關鍵詞檢測', icon: '🔍' },
    { value: 'intent_detected', label: '意圖檢測', icon: '🎯' },
    { value: 'sentiment_detected', label: '情感檢測', icon: '😊' },
    { value: 'time_based', label: '定時觸發', icon: '⏰' },
    { value: 'manual', label: '手動觸發', icon: '👆' }
  ];
  
  actionTypes = [
    { value: 'send_message', label: '發送消息', icon: '💬' },
    { value: 'send_template', label: '發送模板', icon: '📝' },
    { value: 'ai_reply', label: 'AI 回覆', icon: '🤖' },
    { value: 'add_tag', label: '添加標籤', icon: '🏷️' },
    { value: 'remove_tag', label: '移除標籤', icon: '❌' },
    { value: 'notify_admin', label: '通知管理員', icon: '🔔' },
    { value: 'webhook', label: 'Webhook', icon: '🌐' },
    { value: 'execute_workflow', label: '執行工作流', icon: '🔄' }
  ];
  
  nodeTypes = [
    { type: 'action' as NodeType, label: '動作', icon: '⚡' },
    { type: 'condition' as NodeType, label: '條件', icon: '❓' },
    { type: 'delay' as NodeType, label: '延遲', icon: '⏰' },
    { type: 'loop' as NodeType, label: '循環', icon: '🔁' },
    { type: 'ai' as NodeType, label: 'AI', icon: '🤖' },
    { type: 'webhook' as NodeType, label: 'Webhook', icon: '🌐' }
  ];
  
  templates = computed(() => this.aiReplyEngine.templates());
  
  // === 觸發器編輯 ===
  
  getDefaultTriggerForm() {
    return {
      name: '',
      event: 'message_received' as TriggerEvent,
      priority: 10,
      cooldown: 5,
      actions: [] as TriggerAction[],
      enabled: true
    };
  }
  
  openTriggerEditor(trigger?: Trigger): void {
    this.editingTrigger = trigger || null;
    if (trigger) {
      this.triggerForm = {
        name: trigger.name,
        event: trigger.event,
        priority: trigger.priority,
        cooldown: (trigger.cooldown || 5000) / 1000,
        actions: [...trigger.actions],
        enabled: trigger.enabled
      };
    } else {
      this.triggerForm = this.getDefaultTriggerForm();
    }
    this.mode.set('edit-trigger');
  }
  
  addAction(): void {
    this.triggerForm.actions.push({
      id: `action_${Date.now()}`,
      type: 'send_message',
      params: {}
    });
  }
  
  removeAction(index: number): void {
    this.triggerForm.actions.splice(index, 1);
  }
  
  saveTrigger(): void {
    const config = {
      name: this.triggerForm.name,
      event: this.triggerForm.event,
      actions: this.triggerForm.actions,
      enabled: this.triggerForm.enabled,
      priority: this.triggerForm.priority,
      cooldown: this.triggerForm.cooldown * 1000
    };
    
    if (this.editingTrigger) {
      this.triggerSystem.updateTrigger(this.editingTrigger.id, config);
    } else {
      this.triggerSystem.createTrigger(config);
    }
    
    this.saved.emit();
    this.cancelEdit();
  }
  
  // === 工作流編輯 ===
  
  getDefaultWorkflowForm() {
    return {
      name: '',
      description: '',
      nodes: [
        {
          id: 'start_1',
          type: 'start' as NodeType,
          name: '開始',
          position: { x: 50, y: 150 },
          config: {},
          inputs: [],
          outputs: ['end_1']
        },
        {
          id: 'end_1',
          type: 'end' as NodeType,
          name: '結束',
          position: { x: 400, y: 150 },
          config: {},
          inputs: ['start_1'],
          outputs: []
        }
      ] as WorkflowNode[]
    };
  }
  
  openWorkflowEditor(workflow?: Workflow): void {
    this.editingWorkflow = workflow || null;
    if (workflow) {
      this.workflowForm = {
        name: workflow.name,
        description: workflow.description || '',
        nodes: [...workflow.nodes]
      };
    } else {
      this.workflowForm = this.getDefaultWorkflowForm();
    }
    this.selectedNode = null;
    this.validationResult = null;
    this.mode.set('edit-workflow');
  }
  
  getNodeIcon(type: NodeType): string {
    const icons: Record<NodeType, string> = {
      start: '▶️',
      end: '⏹️',
      action: '⚡',
      condition: '❓',
      delay: '⏰',
      loop: '🔁',
      parallel: '⚡',
      subworkflow: '📂',
      transform: '🔄',
      ai: '🤖',
      webhook: '🌐',
      variable: '📊'
    };
    return icons[type] || '📦';
  }
  
  getNodePosition(nodeId: string): { x: number; y: number } | null {
    const node = this.workflowForm.nodes.find(n => n.id === nodeId);
    return node?.position || null;
  }
  
  selectNode(node: WorkflowNode): void {
    this.selectedNode = node;
  }
  
  deleteSelectedNode(): void {
    if (!this.selectedNode) return;
    if (this.selectedNode.type === 'start' || this.selectedNode.type === 'end') return;
    
    const nodeId = this.selectedNode.id;
    this.workflowForm.nodes = this.workflowForm.nodes.filter(n => n.id !== nodeId);
    
    // 清理連接
    for (const node of this.workflowForm.nodes) {
      node.inputs = node.inputs.filter(id => id !== nodeId);
      node.outputs = node.outputs.filter(id => id !== nodeId);
    }
    
    this.selectedNode = null;
  }
  
  onNodeDragStart(event: DragEvent, nodeType: { type: NodeType; label: string }): void {
    event.dataTransfer?.setData('nodeType', nodeType.type);
  }
  
  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
  }
  
  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    const nodeType = event.dataTransfer?.getData('nodeType') as NodeType;
    if (!nodeType) return;
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      name: this.nodeTypes.find(n => n.type === nodeType)?.label || nodeType,
      position: { x, y },
      config: {},
      inputs: [],
      outputs: []
    };
    
    this.workflowForm.nodes.push(newNode);
    this.selectedNode = newNode;
  }
  
  onNodeMouseDown(event: MouseEvent, node: WorkflowNode): void {
    // 簡化的拖拽邏輯
    event.stopPropagation();
  }
  
  validateWorkflow(): void {
    if (!this.editingWorkflow) {
      // 創建臨時工作流進行驗證
      const tempWorkflow = this.workflowEngine.createWorkflow({
        name: this.workflowForm.name || 'temp',
        nodes: this.workflowForm.nodes
      });
      this.validationResult = this.workflowEngine.validateWorkflow(tempWorkflow.id);
      this.workflowEngine.deleteWorkflow(tempWorkflow.id);
    } else {
      this.validationResult = this.workflowEngine.validateWorkflow(this.editingWorkflow.id);
    }
  }
  
  autoLayout(): void {
    // 簡單的自動排版
    let y = 100;
    for (const node of this.workflowForm.nodes) {
      if (node.type === 'start') {
        node.position = { x: 50, y: 150 };
      } else if (node.type === 'end') {
        node.position = { x: 500, y: 150 };
      } else {
        node.position = { x: 250, y };
        y += 80;
      }
    }
  }
  
  clearCanvas(): void {
    this.workflowForm.nodes = this.getDefaultWorkflowForm().nodes;
    this.selectedNode = null;
  }
  
  saveWorkflow(): void {
    if (this.editingWorkflow) {
      this.workflowEngine.updateWorkflow(this.editingWorkflow.id, {
        name: this.workflowForm.name,
        description: this.workflowForm.description,
        nodes: this.workflowForm.nodes
      });
    } else {
      this.workflowEngine.createWorkflow({
        name: this.workflowForm.name,
        description: this.workflowForm.description,
        nodes: this.workflowForm.nodes
      });
    }
    
    this.saved.emit();
    this.cancelEdit();
  }
  
  // === 模板編輯 ===
  
  getDefaultTemplateForm() {
    return {
      name: '',
      description: '',
      content: '',
      category: 'general',
      language: 'auto' as const,
      style: 'friendly' as ReplyStyle,
      tags: [] as string[]
    };
  }
  
  openTemplateEditor(template?: ReplyTemplate): void {
    this.editingTemplate = template || null;
    if (template) {
      this.templateForm = {
        name: template.name,
        description: template.description || '',
        content: template.content,
        category: template.category,
        language: template.language as any,
        style: template.style,
        tags: [...template.tags]
      };
    } else {
      this.templateForm = this.getDefaultTemplateForm();
    }
    this.mode.set('edit-template');
  }
  
  addTag(): void {
    if (this.newTag && !this.templateForm.tags.includes(this.newTag)) {
      this.templateForm.tags.push(this.newTag);
      this.newTag = '';
    }
  }
  
  removeTag(index: number): void {
    this.templateForm.tags.splice(index, 1);
  }
  
  getTemplatePreview(): string {
    let preview = this.templateForm.content;
    preview = preview.replace(/\{\{name\}\}/g, '用戶名');
    preview = preview.replace(/\{\{product\}\}/g, '產品名');
    preview = preview.replace(/\{\{greeting\}\}/g, '您好');
    preview = preview.replace(/\{\{answer\}\}/g, '這是回答內容...');
    return preview || '（預覽將在此顯示）';
  }
  
  saveTemplate(): void {
    const variables = (this.templateForm.content.match(/\{\{(\w+)\}\}/g) || [])
      .map(v => v.replace(/\{\{|\}\}/g, ''));
    
    const config = {
      name: this.templateForm.name,
      description: this.templateForm.description,
      content: this.templateForm.content,
      variables,
      category: this.templateForm.category,
      language: this.templateForm.language as any,
      style: this.templateForm.style,
      tags: this.templateForm.tags
    };
    
    if (this.editingTemplate) {
      this.aiReplyEngine.updateTemplate(this.editingTemplate.id, config);
    } else {
      this.aiReplyEngine.createTemplate(config);
    }
    
    this.saved.emit();
    this.cancelEdit();
  }
  
  // === 通用 ===
  
  cancelEdit(): void {
    this.mode.set('list');
    this.editingTrigger = null;
    this.editingWorkflow = null;
    this.editingTemplate = null;
    this.selectedNode = null;
    this.validationResult = null;
    this.cancelled.emit();
  }
}
