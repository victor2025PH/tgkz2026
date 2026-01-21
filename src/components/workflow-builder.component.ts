/**
 * 可視化工作流編輯器組件
 * Visual Workflow Builder Component
 * 
 * 功能：
 * 1. 拖拽式節點編輯
 * 2. 觸發器 → 條件 → 動作 流程
 * 3. 連線和流程控制
 * 4. 模板庫
 * 5. 實時預覽
 */

import { Component, signal, computed, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast.service';

// 節點類型
export type NodeType = 'trigger' | 'condition' | 'action' | 'delay';

// 觸發器類型
export type TriggerType = 
  | 'keyword_match'      // 關鍵詞匹配
  | 'new_member'         // 新成員加入
  | 'message_received'   // 收到消息
  | 'schedule'           // 定時觸發
  | 'manual';            // 手動觸發

// 條件類型
export type ConditionType = 
  | 'contains_keyword'   // 包含關鍵詞
  | 'user_score'         // 用戶評分
  | 'time_range'         // 時間範圍
  | 'probability'        // 概率
  | 'group_type';        // 群組類型

// 動作類型
export type ActionType = 
  | 'send_message'       // 發送消息
  | 'add_to_list'        // 添加到列表
  | 'update_score'       // 更新評分
  | 'notify'             // 發送通知
  | 'ai_reply'           // AI 自動回覆
  | 'create_group';      // 創建群組

// 工作流節點
export interface WorkflowNode {
  id: string;
  type: NodeType;
  subType: TriggerType | ConditionType | ActionType | 'fixed' | 'random';
  name: string;
  icon: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  connections: string[];  // 連接到的節點 ID
}

// 工作流定義
export interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: WorkflowNode[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  stats?: {
    runs: number;
    successRate: number;
    lastRun?: string;
  };
}

// 節點模板
interface NodeTemplate {
  type: NodeType;
  subType: string;
  name: string;
  icon: string;
  description: string;
  defaultConfig: Record<string, any>;
}

// 預設節點模板
const NODE_TEMPLATES: NodeTemplate[] = [
  // 觸發器
  { type: 'trigger', subType: 'keyword_match', name: '關鍵詞觸發', icon: '🔑', description: '當消息包含指定關鍵詞時觸發', defaultConfig: { keywords: [], matchType: 'any' } },
  { type: 'trigger', subType: 'new_member', name: '新成員加入', icon: '👋', description: '當有新成員加入群組時觸發', defaultConfig: { groups: [] } },
  { type: 'trigger', subType: 'message_received', name: '收到消息', icon: '💬', description: '當收到任何消息時觸發', defaultConfig: { fromGroups: [], fromUsers: [] } },
  { type: 'trigger', subType: 'schedule', name: '定時觸發', icon: '⏰', description: '按計劃定時觸發', defaultConfig: { cron: '0 9 * * *', timezone: 'Asia/Shanghai' } },
  { type: 'trigger', subType: 'manual', name: '手動觸發', icon: '👆', description: '手動點擊觸發', defaultConfig: {} },
  
  // 條件
  { type: 'condition', subType: 'contains_keyword', name: '包含關鍵詞', icon: '🔍', description: '檢查消息是否包含關鍵詞', defaultConfig: { keywords: [], matchAll: false } },
  { type: 'condition', subType: 'user_score', name: '用戶評分', icon: '⭐', description: '根據用戶評分判斷', defaultConfig: { operator: '>=', value: 50 } },
  { type: 'condition', subType: 'time_range', name: '時間範圍', icon: '🕐', description: '只在指定時間範圍內執行', defaultConfig: { startHour: 9, endHour: 21 } },
  { type: 'condition', subType: 'probability', name: '概率判斷', icon: '🎲', description: '按一定概率執行', defaultConfig: { percentage: 50 } },
  { type: 'condition', subType: 'group_type', name: '群組類型', icon: '📂', description: '根據群組類型判斷', defaultConfig: { types: ['supergroup'] } },
  
  // 動作
  { type: 'action', subType: 'send_message', name: '發送消息', icon: '📤', description: '向用戶發送消息', defaultConfig: { template: '', delay: 0 } },
  { type: 'action', subType: 'add_to_list', name: '添加到列表', icon: '📋', description: '將用戶添加到指定列表', defaultConfig: { listName: 'leads' } },
  { type: 'action', subType: 'update_score', name: '更新評分', icon: '📊', description: '更新用戶評分', defaultConfig: { action: 'add', points: 10 } },
  { type: 'action', subType: 'notify', name: '發送通知', icon: '🔔', description: '發送系統通知', defaultConfig: { message: '' } },
  { type: 'action', subType: 'ai_reply', name: 'AI 自動回覆', icon: '🤖', description: '使用 AI 生成並發送回覆', defaultConfig: { prompt: '', model: 'gpt-4' } },
  { type: 'action', subType: 'create_group', name: '創建協作群組', icon: '👥', description: '為用戶創建多角色協作群組', defaultConfig: { roles: [] } },
  
  // 延遲
  { type: 'delay', subType: 'fixed', name: '固定延遲', icon: '⏳', description: '等待固定時間', defaultConfig: { duration: 60, unit: 'seconds' } },
  { type: 'delay', subType: 'random', name: '隨機延遲', icon: '🎯', description: '等待隨機時間', defaultConfig: { minDuration: 30, maxDuration: 120, unit: 'seconds' } },
];

// 工作流模板
const WORKFLOW_TEMPLATES: Partial<Workflow>[] = [
  {
    name: '關鍵詞捕獲 → 自動回覆',
    description: '監控關鍵詞，自動發送營銷消息',
    icon: '🎯',
    nodes: [
      { id: 'n1', type: 'trigger', subType: 'keyword_match', name: '關鍵詞觸發', icon: '🔑', config: { keywords: ['諮詢', '價格', '了解'], matchType: 'any' }, position: { x: 100, y: 150 }, connections: ['n2'] },
      { id: 'n2', type: 'delay', subType: 'random', name: '隨機延遲', icon: '🎯', config: { minDuration: 30, maxDuration: 120, unit: 'seconds' }, position: { x: 300, y: 150 }, connections: ['n3'] },
      { id: 'n3', type: 'action', subType: 'send_message', name: '發送消息', icon: '📤', config: { template: '您好！感謝您的關注...' }, position: { x: 500, y: 150 }, connections: ['n4'] },
      { id: 'n4', type: 'action', subType: 'add_to_list', name: '添加到列表', icon: '📋', config: { listName: 'leads' }, position: { x: 700, y: 150 }, connections: [] },
    ]
  },
  {
    name: '高評分客戶 → AI 建群',
    description: '識別高評分客戶，自動創建協作群組',
    icon: '🔥',
    nodes: [
      { id: 'n1', type: 'trigger', subType: 'message_received', name: '收到消息', icon: '💬', config: {}, position: { x: 100, y: 150 }, connections: ['n2'] },
      { id: 'n2', type: 'condition', subType: 'user_score', name: '評分 ≥ 80', icon: '⭐', config: { operator: '>=', value: 80 }, position: { x: 300, y: 150 }, connections: ['n3'] },
      { id: 'n3', type: 'action', subType: 'notify', name: '發送通知', icon: '🔔', config: { message: '發現高意向客戶！' }, position: { x: 500, y: 150 }, connections: ['n4'] },
      { id: 'n4', type: 'action', subType: 'create_group', name: '創建協作群組', icon: '👥', config: { roles: ['sales', 'support'] }, position: { x: 700, y: 150 }, connections: [] },
    ]
  },
  {
    name: '定時群發',
    description: '按計劃定時發送消息',
    icon: '⏰',
    nodes: [
      { id: 'n1', type: 'trigger', subType: 'schedule', name: '每日 9:00', icon: '⏰', config: { cron: '0 9 * * *' }, position: { x: 100, y: 150 }, connections: ['n2'] },
      { id: 'n2', type: 'condition', subType: 'time_range', name: '工作時間', icon: '🕐', config: { startHour: 9, endHour: 21 }, position: { x: 300, y: 150 }, connections: ['n3'] },
      { id: 'n3', type: 'action', subType: 'send_message', name: '群發消息', icon: '📤', config: { template: '早安！今日優惠...' }, position: { x: 500, y: 150 }, connections: [] },
    ]
  }
];

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="workflow-builder h-full flex flex-col bg-slate-900 text-white overflow-hidden">
      
      <!-- 工具欄 -->
      <div class="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div class="flex items-center gap-4">
          <button (click)="close.emit()" class="text-slate-400 hover:text-white transition-colors">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <input [(ngModel)]="workflowName" 
                 class="bg-transparent text-xl font-bold focus:outline-none border-b border-transparent hover:border-slate-600 focus:border-cyan-500 transition-colors"
                 placeholder="工作流名稱">
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="showTemplates.set(!showTemplates())"
                  class="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            📚 模板庫
          </button>
          <button (click)="clearCanvas()"
                  class="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            🗑️ 清空
          </button>
          <button (click)="testWorkflow()"
                  class="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            ▶️ 測試
          </button>
          <button (click)="saveWorkflow()"
                  class="px-4 py-1.5 text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center gap-2">
            💾 保存
          </button>
        </div>
      </div>
      
      <div class="flex-1 flex overflow-hidden">
        
        <!-- 左側：節點面板 -->
        <div class="w-64 bg-slate-800/30 border-r border-slate-700/50 overflow-y-auto">
          <div class="p-4">
            <h3 class="text-sm font-semibold text-slate-400 mb-3">📥 觸發器</h3>
            <div class="space-y-2 mb-4">
              @for (template of getTemplatesByType('trigger'); track template.subType) {
                <div class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-move hover:border-cyan-500/50 hover:bg-slate-700/50 transition-all group"
                     draggable="true"
                     (dragstart)="onDragStart($event, template)">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{{ template.icon }}</span>
                    <span class="text-sm font-medium text-white">{{ template.name }}</span>
                  </div>
                  <p class="text-xs text-slate-500 group-hover:text-slate-400">{{ template.description }}</p>
                </div>
              }
            </div>
            
            <h3 class="text-sm font-semibold text-slate-400 mb-3">❓ 條件</h3>
            <div class="space-y-2 mb-4">
              @for (template of getTemplatesByType('condition'); track template.subType) {
                <div class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-move hover:border-amber-500/50 hover:bg-slate-700/50 transition-all group"
                     draggable="true"
                     (dragstart)="onDragStart($event, template)">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{{ template.icon }}</span>
                    <span class="text-sm font-medium text-white">{{ template.name }}</span>
                  </div>
                  <p class="text-xs text-slate-500 group-hover:text-slate-400">{{ template.description }}</p>
                </div>
              }
            </div>
            
            <h3 class="text-sm font-semibold text-slate-400 mb-3">⚡ 動作</h3>
            <div class="space-y-2 mb-4">
              @for (template of getTemplatesByType('action'); track template.subType) {
                <div class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-move hover:border-green-500/50 hover:bg-slate-700/50 transition-all group"
                     draggable="true"
                     (dragstart)="onDragStart($event, template)">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{{ template.icon }}</span>
                    <span class="text-sm font-medium text-white">{{ template.name }}</span>
                  </div>
                  <p class="text-xs text-slate-500 group-hover:text-slate-400">{{ template.description }}</p>
                </div>
              }
            </div>
            
            <h3 class="text-sm font-semibold text-slate-400 mb-3">⏳ 延遲</h3>
            <div class="space-y-2">
              @for (template of getTemplatesByType('delay'); track template.subType) {
                <div class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-move hover:border-purple-500/50 hover:bg-slate-700/50 transition-all group"
                     draggable="true"
                     (dragstart)="onDragStart($event, template)">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg">{{ template.icon }}</span>
                    <span class="text-sm font-medium text-white">{{ template.name }}</span>
                  </div>
                  <p class="text-xs text-slate-500 group-hover:text-slate-400">{{ template.description }}</p>
                </div>
              }
            </div>
          </div>
        </div>
        
        <!-- 中間：畫布 -->
        <div class="flex-1 relative overflow-hidden"
             (dragover)="onDragOver($event)"
             (drop)="onDrop($event)"
             #canvas>
          
          <!-- 網格背景 -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100,116,139,0.2)" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
          
          <!-- 連線 -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none">
            @for (node of nodes(); track node.id) {
              @for (targetId of node.connections; track targetId) {
                @let target = getNodeById(targetId);
                @if (target) {
                  <path [attr.d]="getConnectionPath(node, target)"
                        fill="none"
                        stroke="url(#connection-gradient)"
                        stroke-width="2"
                        stroke-dasharray="5,5"
                        class="animate-dash"/>
                }
              }
            }
            <defs>
              <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#06b6d4"/>
                <stop offset="100%" style="stop-color:#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          
          <!-- 節點 -->
          @for (node of nodes(); track node.id) {
            <div class="absolute cursor-move select-none transition-shadow"
                 [style.left.px]="node.position.x"
                 [style.top.px]="node.position.y"
                 [class.ring-2]="selectedNode()?.id === node.id"
                 [class.ring-cyan-500]="selectedNode()?.id === node.id"
                 (mousedown)="onNodeMouseDown($event, node)"
                 (click)="selectNode(node)">
              <div class="w-40 p-3 rounded-xl border shadow-lg"
                   [class.bg-cyan-500/20]="node.type === 'trigger'"
                   [class.border-cyan-500/50]="node.type === 'trigger'"
                   [class.bg-amber-500/20]="node.type === 'condition'"
                   [class.border-amber-500/50]="node.type === 'condition'"
                   [class.bg-green-500/20]="node.type === 'action'"
                   [class.border-green-500/50]="node.type === 'action'"
                   [class.bg-purple-500/20]="node.type === 'delay'"
                   [class.border-purple-500/50]="node.type === 'delay'">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-lg">{{ node.icon }}</span>
                  <span class="text-sm font-medium text-white truncate">{{ node.name }}</span>
                </div>
                <div class="text-xs text-slate-400 truncate">
                  {{ getNodeSummary(node) }}
                </div>
                
                <!-- 連接點 -->
                <div class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-700 border-2 border-slate-500 rounded-full cursor-crosshair hover:border-cyan-500 hover:bg-cyan-500/20 transition-colors"
                     (mousedown)="startConnection($event, node)">
                </div>
              </div>
            </div>
          }
          
          <!-- 空狀態 -->
          @if (nodes().length === 0) {
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="text-6xl mb-4">🔧</div>
                <h3 class="text-xl font-bold text-white mb-2">開始構建您的工作流</h3>
                <p class="text-slate-400 mb-4">從左側拖拽節點到此處，或選擇模板開始</p>
                <button (click)="showTemplates.set(true)"
                        class="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  📚 瀏覽模板
                </button>
              </div>
            </div>
          }
        </div>
        
        <!-- 右側：屬性面板 -->
        @if (selectedNode()) {
          <div class="w-72 bg-slate-800/30 border-l border-slate-700/50 overflow-y-auto">
            <div class="p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-slate-400">節點屬性</h3>
                <button (click)="deleteSelectedNode()" class="text-red-400 hover:text-red-300 text-sm">
                  🗑️ 刪除
                </button>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-xs text-slate-500 mb-1">名稱</label>
                  <input [(ngModel)]="selectedNode()!.name"
                         class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                </div>
                
                <!-- 動態配置項 -->
                @for (key of Object.keys(selectedNode()!.config); track key) {
                  <div>
                    <label class="block text-xs text-slate-500 mb-1">{{ getConfigLabel(key) }}</label>
                    @if (isArrayConfig(selectedNode()!.config[key])) {
                      <textarea [(ngModel)]="selectedNode()!.config[key]"
                                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                rows="3"
                                placeholder="每行一個..."></textarea>
                    } @else if (isNumberConfig(key)) {
                      <input type="number"
                             [(ngModel)]="selectedNode()!.config[key]"
                             class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                    } @else {
                      <input [(ngModel)]="selectedNode()!.config[key]"
                             class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
      
      <!-- 模板庫對話框 -->
      @if (showTemplates()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" (click)="showTemplates.set(false)">
          <div class="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-700" (click)="$event.stopPropagation()">
            <div class="p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 class="text-xl font-bold text-white">📚 工作流模板</h2>
              <button (click)="showTemplates.set(false)" class="text-slate-400 hover:text-white">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              @for (template of workflowTemplates; track template.name) {
                <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 cursor-pointer transition-all"
                     (click)="loadTemplate(template)">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">{{ template.icon }}</span>
                    <div>
                      <h3 class="font-semibold text-white">{{ template.name }}</h3>
                      <p class="text-sm text-slate-400">{{ template.description }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span>{{ template.nodes?.length }} 個節點</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    
    .animate-dash {
      animation: dash 20s linear infinite;
    }
    
    @keyframes dash {
      to {
        stroke-dashoffset: -1000;
      }
    }
  `]
})
export class WorkflowBuilderComponent implements OnInit {
  private toast = inject(ToastService);
  
  // 輸入輸出
  workflow = input<Workflow | null>(null);
  close = output<void>();
  save = output<Workflow>();
  
  // 狀態
  workflowName = '';
  nodes = signal<WorkflowNode[]>([]);
  selectedNode = signal<WorkflowNode | null>(null);
  showTemplates = signal(false);
  
  // 模板
  nodeTemplates = NODE_TEMPLATES;
  workflowTemplates = WORKFLOW_TEMPLATES;
  
  // Object.keys for template
  protected Object = Object;
  
  // 拖拽狀態
  private draggedTemplate: NodeTemplate | null = null;
  private isDraggingNode = false;
  private dragOffset = { x: 0, y: 0 };
  
  ngOnInit() {
    const wf = this.workflow();
    if (wf) {
      this.workflowName = wf.name;
      this.nodes.set([...wf.nodes]);
    }
  }
  
  /**
   * 獲取指定類型的模板
   */
  getTemplatesByType(type: NodeType): NodeTemplate[] {
    return this.nodeTemplates.filter(t => t.type === type);
  }
  
  /**
   * 拖拽開始
   */
  onDragStart(event: DragEvent, template: NodeTemplate) {
    this.draggedTemplate = template;
    event.dataTransfer?.setData('text/plain', JSON.stringify(template));
  }
  
  /**
   * 拖拽懸停
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }
  
  /**
   * 放置節點
   */
  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!this.draggedTemplate) return;
    
    const canvas = event.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    
    const node: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: this.draggedTemplate.type,
      subType: this.draggedTemplate.subType as any,
      name: this.draggedTemplate.name,
      icon: this.draggedTemplate.icon,
      config: { ...this.draggedTemplate.defaultConfig },
      position: {
        x: event.clientX - rect.left - 80,
        y: event.clientY - rect.top - 30
      },
      connections: []
    };
    
    this.nodes.update(nodes => [...nodes, node]);
    this.draggedTemplate = null;
  }
  
  /**
   * 節點滑鼠按下
   */
  onNodeMouseDown(event: MouseEvent, node: WorkflowNode) {
    this.isDraggingNode = true;
    this.dragOffset = {
      x: event.clientX - node.position.x,
      y: event.clientY - node.position.y
    };
    
    const onMouseMove = (e: MouseEvent) => {
      if (this.isDraggingNode) {
        node.position = {
          x: e.clientX - this.dragOffset.x,
          y: e.clientY - this.dragOffset.y
        };
        this.nodes.update(nodes => [...nodes]);
      }
    };
    
    const onMouseUp = () => {
      this.isDraggingNode = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  /**
   * 選擇節點
   */
  selectNode(node: WorkflowNode) {
    this.selectedNode.set(node);
  }
  
  /**
   * 刪除選中節點
   */
  deleteSelectedNode() {
    const selected = this.selectedNode();
    if (!selected) return;
    
    // 移除指向此節點的連接
    this.nodes.update(nodes => 
      nodes
        .filter(n => n.id !== selected.id)
        .map(n => ({
          ...n,
          connections: n.connections.filter(c => c !== selected.id)
        }))
    );
    
    this.selectedNode.set(null);
  }
  
  /**
   * 開始連線
   */
  startConnection(event: MouseEvent, sourceNode: WorkflowNode) {
    event.stopPropagation();
    
    // 簡單實現：點擊另一個節點完成連接
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[class*="cursor-move"]');
      if (target) {
        const targetId = this.nodes().find(n => 
          n.position.x === parseInt(target.getAttribute('style')?.match(/left:\s*(\d+)/)?.[1] || '0')
        )?.id;
        
        if (targetId && targetId !== sourceNode.id) {
          sourceNode.connections = [...sourceNode.connections, targetId];
          this.nodes.update(nodes => [...nodes]);
        }
      }
      document.removeEventListener('click', onClick);
    };
    
    setTimeout(() => document.addEventListener('click', onClick), 0);
  }
  
  /**
   * 獲取連線路徑
   */
  getConnectionPath(source: WorkflowNode, target: WorkflowNode): string {
    const sx = source.position.x + 160;
    const sy = source.position.y + 30;
    const tx = target.position.x;
    const ty = target.position.y + 30;
    
    const dx = (tx - sx) / 2;
    
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  }
  
  /**
   * 根據 ID 獲取節點
   */
  getNodeById(id: string): WorkflowNode | undefined {
    return this.nodes().find(n => n.id === id);
  }
  
  /**
   * 獲取節點摘要
   */
  getNodeSummary(node: WorkflowNode): string {
    switch (node.subType) {
      case 'keyword_match':
        return node.config['keywords']?.length ? `${node.config['keywords'].length} 個關鍵詞` : '未配置';
      case 'user_score':
        return `評分 ${node.config['operator']} ${node.config['value']}`;
      case 'send_message':
        return node.config['template'] ? '已配置消息' : '未配置';
      case 'fixed':
        return `等待 ${node.config['duration']} ${node.config['unit']}`;
      case 'random':
        return `${node.config['minDuration']}-${node.config['maxDuration']} ${node.config['unit']}`;
      default:
        return '點擊配置';
    }
  }
  
  /**
   * 獲取配置標籤
   */
  getConfigLabel(key: string): string {
    const labels: Record<string, string> = {
      keywords: '關鍵詞',
      matchType: '匹配方式',
      template: '消息模板',
      delay: '延遲(秒)',
      operator: '運算符',
      value: '閾值',
      duration: '時長',
      unit: '單位',
      minDuration: '最小時長',
      maxDuration: '最大時長',
      listName: '列表名稱',
      message: '通知內容',
      startHour: '開始時間',
      endHour: '結束時間',
      percentage: '概率(%)',
      cron: 'Cron 表達式'
    };
    return labels[key] || key;
  }
  
  /**
   * 是否數組配置
   */
  isArrayConfig(value: any): boolean {
    return Array.isArray(value);
  }
  
  /**
   * 是否數字配置
   */
  isNumberConfig(key: string): boolean {
    return ['value', 'duration', 'minDuration', 'maxDuration', 'delay', 'startHour', 'endHour', 'percentage'].includes(key);
  }
  
  /**
   * 載入模板
   */
  loadTemplate(template: Partial<Workflow>) {
    this.workflowName = template.name || '新工作流';
    this.nodes.set(template.nodes ? [...template.nodes] : []);
    this.showTemplates.set(false);
    this.toast.success(`已載入模板：${template.name}`);
  }
  
  /**
   * 清空畫布
   */
  clearCanvas() {
    if (this.nodes().length > 0 && !confirm('確定要清空所有節點嗎？')) return;
    this.nodes.set([]);
    this.selectedNode.set(null);
  }
  
  /**
   * 測試工作流
   */
  testWorkflow() {
    if (this.nodes().length === 0) {
      this.toast.warning('請先添加節點');
      return;
    }
    
    // 檢查是否有觸發器
    const hasTrigger = this.nodes().some(n => n.type === 'trigger');
    if (!hasTrigger) {
      this.toast.warning('工作流需要至少一個觸發器');
      return;
    }
    
    this.toast.success('工作流驗證通過！可以保存');
  }
  
  /**
   * 保存工作流
   */
  saveWorkflow() {
    if (!this.workflowName.trim()) {
      this.toast.warning('請輸入工作流名稱');
      return;
    }
    
    if (this.nodes().length === 0) {
      this.toast.warning('工作流不能為空');
      return;
    }
    
    const workflow: Workflow = {
      id: this.workflow()?.id || `wf_${Date.now()}`,
      name: this.workflowName,
      description: '',
      icon: '🔧',
      nodes: this.nodes(),
      enabled: false,
      createdAt: this.workflow()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.save.emit(workflow);
    this.toast.success('工作流已保存');
  }
}
