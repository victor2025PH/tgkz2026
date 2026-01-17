/**
 * TG-AI智控王 自動化工作流引擎
 * Workflow Engine v1.0
 * 
 * 功能：
 * - 可視化工作流設計
 * - 節點連接與執行
 * - 分支與循環邏輯
 * - 數據傳遞與轉換
 * - 執行監控與調試
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { TriggerSystem, TriggerContext } from './trigger-system';

// ============ 類型定義 ============

export type NodeType = 
  | 'start'           // 開始節點
  | 'end'             // 結束節點
  | 'action'          // 動作節點
  | 'condition'       // 條件節點
  | 'delay'           // 延遲節點
  | 'loop'            // 循環節點
  | 'parallel'        // 並行節點
  | 'subworkflow'     // 子工作流
  | 'transform'       // 數據轉換
  | 'ai'              // AI 處理
  | 'webhook'         // Webhook
  | 'variable'        // 變量操作
  | 'batch_message'   // 批量發送消息
  | 'batch_invite'    // 批量邀請成員
  | 'batch_tag'       // 批量標籤操作
  | 'member_extract'; // 成員提取

export type WorkflowStatus = 
  | 'draft'           // 草稿
  | 'active'          // 啟用
  | 'paused'          // 暫停
  | 'archived';       // 歸檔

export type ExecutionStatus = 
  | 'pending'         // 等待
  | 'running'         // 運行中
  | 'completed'       // 完成
  | 'failed'          // 失敗
  | 'cancelled'       // 取消
  | 'waiting';        // 等待條件

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  
  // 位置（用於可視化）
  position: { x: number; y: number };
  
  // 配置
  config: Record<string, any>;
  
  // 連接
  inputs: string[];   // 輸入節點 ID
  outputs: string[];  // 輸出節點 ID
  
  // 條件輸出（用於分支）
  conditionalOutputs?: {
    condition: string;
    targetNodeId: string;
  }[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  
  // 節點
  nodes: WorkflowNode[];
  
  // 變量定義
  variables: WorkflowVariable[];
  
  // 狀態
  status: WorkflowStatus;
  
  // 觸發器
  triggerId?: string;
  
  // 統計
  stats: {
    executionCount: number;
    successCount: number;
    failureCount: number;
    avgDuration: number;
  };
  
  // 元數據
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags?: string[];
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  
  // 狀態
  status: ExecutionStatus;
  
  // 執行數據
  context: Record<string, any>;
  variables: Record<string, any>;
  
  // 節點執行歷史
  nodeExecutions: NodeExecution[];
  
  // 當前節點
  currentNodeId?: string;
  
  // 時間
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // 結果
  result?: any;
  error?: string;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  input?: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

// ============ 預設工作流模板 ============

const WORKFLOW_TEMPLATES: Partial<Workflow>[] = [
  {
    name: '新客戶歡迎流程',
    description: '當新成員加入時執行的自動化歡迎流程',
    nodes: [
      {
        id: 'start_1',
        type: 'start',
        name: '開始',
        position: { x: 100, y: 200 },
        config: {},
        inputs: [],
        outputs: ['delay_1']
      },
      {
        id: 'delay_1',
        type: 'delay',
        name: '等待 3 秒',
        position: { x: 250, y: 200 },
        config: { delay: 3000 },
        inputs: ['start_1'],
        outputs: ['action_1']
      },
      {
        id: 'action_1',
        type: 'action',
        name: '發送歡迎消息',
        position: { x: 400, y: 200 },
        config: {
          actionType: 'send_template',
          templateName: '歡迎新成員'
        },
        inputs: ['delay_1'],
        outputs: ['action_2']
      },
      {
        id: 'action_2',
        type: 'action',
        name: '添加標籤',
        position: { x: 550, y: 200 },
        config: {
          actionType: 'add_tag',
          tag: 'new_member'
        },
        inputs: ['action_1'],
        outputs: ['end_1']
      },
      {
        id: 'end_1',
        type: 'end',
        name: '結束',
        position: { x: 700, y: 200 },
        config: {},
        inputs: ['action_2'],
        outputs: []
      }
    ],
    variables: [],
    status: 'draft'
  },
  {
    name: '智能客服流程',
    description: '根據用戶意圖自動回覆或轉接人工',
    nodes: [
      {
        id: 'start_1',
        type: 'start',
        name: '收到消息',
        position: { x: 100, y: 200 },
        config: {},
        inputs: [],
        outputs: ['ai_1']
      },
      {
        id: 'ai_1',
        type: 'ai',
        name: '分析意圖',
        position: { x: 250, y: 200 },
        config: { analyzeIntent: true },
        inputs: ['start_1'],
        outputs: ['condition_1']
      },
      {
        id: 'condition_1',
        type: 'condition',
        name: '檢查意圖',
        position: { x: 400, y: 200 },
        config: {},
        inputs: ['ai_1'],
        outputs: [],
        conditionalOutputs: [
          { condition: 'intent === "complaint"', targetNodeId: 'action_human' },
          { condition: 'intent === "inquiry"', targetNodeId: 'ai_reply' },
          { condition: 'default', targetNodeId: 'ai_reply' }
        ]
      },
      {
        id: 'action_human',
        type: 'action',
        name: '轉接人工',
        position: { x: 550, y: 100 },
        config: {
          actionType: 'notify_admin',
          message: '客戶投訴，需要人工處理'
        },
        inputs: ['condition_1'],
        outputs: ['end_1']
      },
      {
        id: 'ai_reply',
        type: 'ai',
        name: 'AI 自動回覆',
        position: { x: 550, y: 300 },
        config: { generateReply: true },
        inputs: ['condition_1'],
        outputs: ['end_1']
      },
      {
        id: 'end_1',
        type: 'end',
        name: '結束',
        position: { x: 700, y: 200 },
        config: {},
        inputs: ['action_human', 'ai_reply'],
        outputs: []
      }
    ],
    variables: [
      { name: 'intent', type: 'string', description: '用戶意圖' }
    ],
    status: 'draft'
  }
];

// ============ 配置 ============

const WORKFLOW_CONFIG = {
  maxNodesPerWorkflow: 100,
  maxVariables: 50,
  executionTimeout: 300000,  // 5 分鐘
  maxConcurrentExecutions: 10,
  maxExecutionHistory: 100
};

@Injectable({
  providedIn: 'root'
})
export class WorkflowEngine {
  private triggerSystem = inject(TriggerSystem);
  
  // 工作流列表
  private _workflows = signal<Workflow[]>([]);
  workflows = computed(() => this._workflows());
  
  // 執行歷史
  private _executions = signal<WorkflowExecution[]>([]);
  executions = computed(() => this._executions());
  
  // 當前運行的執行
  private _runningExecutions = signal<Set<string>>(new Set());
  runningExecutions = computed(() => this._runningExecutions());
  
  // 節點處理器
  private nodeHandlers: Map<NodeType, (node: WorkflowNode, context: Record<string, any>) => Promise<any>> = new Map();
  
  // 計算屬性
  activeWorkflows = computed(() => this._workflows().filter(w => w.status === 'active'));
  
  constructor() {
    this.loadWorkflows();
    this.loadExecutions();
    this.registerNodeHandlers();
  }
  
  // ============ 工作流管理 ============
  
  /**
   * 創建工作流
   */
  createWorkflow(config: {
    name: string;
    description?: string;
    nodes?: WorkflowNode[];
    variables?: WorkflowVariable[];
    tags?: string[];
  }): Workflow {
    const workflow: Workflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      version: 1,
      nodes: config.nodes || this.createDefaultNodes(),
      variables: config.variables || [],
      status: 'draft',
      stats: {
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        avgDuration: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: config.tags
    };
    
    this._workflows.update(workflows => [...workflows, workflow]);
    this.saveWorkflows();
    
    console.log(`[WorkflowEngine] Created workflow: ${workflow.name}`);
    
    return workflow;
  }
  
  /**
   * 從模板創建工作流
   */
  createFromTemplate(templateIndex: number): Workflow | null {
    const template = WORKFLOW_TEMPLATES[templateIndex];
    if (!template) return null;
    
    return this.createWorkflow({
      name: template.name!,
      description: template.description,
      nodes: template.nodes?.map(n => ({ ...n })),
      variables: template.variables?.map(v => ({ ...v }))
    });
  }
  
  /**
   * 更新工作流
   */
  updateWorkflow(id: string, updates: Partial<Workflow>): boolean {
    const workflow = this._workflows().find(w => w.id === id);
    if (!workflow) return false;
    
    this._workflows.update(workflows =>
      workflows.map(w => w.id === id ? {
        ...w,
        ...updates,
        version: w.version + 1,
        updatedAt: new Date()
      } : w)
    );
    this.saveWorkflows();
    
    return true;
  }
  
  /**
   * 刪除工作流
   */
  deleteWorkflow(id: string): boolean {
    const exists = this._workflows().some(w => w.id === id);
    if (!exists) return false;
    
    this._workflows.update(workflows => workflows.filter(w => w.id !== id));
    this.saveWorkflows();
    
    return true;
  }
  
  /**
   * 激活工作流
   */
  activateWorkflow(id: string): boolean {
    return this.updateWorkflow(id, { status: 'active' });
  }
  
  /**
   * 暫停工作流
   */
  pauseWorkflow(id: string): boolean {
    return this.updateWorkflow(id, { status: 'paused' });
  }
  
  /**
   * 複製工作流
   */
  duplicateWorkflow(id: string): Workflow | null {
    const workflow = this._workflows().find(w => w.id === id);
    if (!workflow) return null;
    
    return this.createWorkflow({
      name: `${workflow.name} (副本)`,
      description: workflow.description,
      nodes: workflow.nodes.map(n => ({
        ...n,
        id: `${n.id}_copy_${Date.now()}`
      })),
      variables: [...workflow.variables],
      tags: workflow.tags
    });
  }
  
  // ============ 節點管理 ============
  
  /**
   * 添加節點
   */
  addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): WorkflowNode | null {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) return null;
    
    if (workflow.nodes.length >= WORKFLOW_CONFIG.maxNodesPerWorkflow) {
      throw new Error('已達到最大節點數量限制');
    }
    
    const newNode: WorkflowNode = {
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.updateWorkflow(workflowId, {
      nodes: [...workflow.nodes, newNode]
    });
    
    return newNode;
  }
  
  /**
   * 更新節點
   */
  updateNode(workflowId: string, nodeId: string, updates: Partial<WorkflowNode>): boolean {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) return false;
    
    const nodes = workflow.nodes.map(n =>
      n.id === nodeId ? { ...n, ...updates } : n
    );
    
    return this.updateWorkflow(workflowId, { nodes });
  }
  
  /**
   * 刪除節點
   */
  deleteNode(workflowId: string, nodeId: string): boolean {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) return false;
    
    // 移除節點
    const nodes = workflow.nodes.filter(n => n.id !== nodeId);
    
    // 清理連接
    for (const node of nodes) {
      node.inputs = node.inputs.filter(id => id !== nodeId);
      node.outputs = node.outputs.filter(id => id !== nodeId);
      if (node.conditionalOutputs) {
        node.conditionalOutputs = node.conditionalOutputs.filter(
          co => co.targetNodeId !== nodeId
        );
      }
    }
    
    return this.updateWorkflow(workflowId, { nodes });
  }
  
  /**
   * 連接節點
   */
  connectNodes(workflowId: string, sourceId: string, targetId: string): boolean {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) return false;
    
    const sourceNode = workflow.nodes.find(n => n.id === sourceId);
    const targetNode = workflow.nodes.find(n => n.id === targetId);
    
    if (!sourceNode || !targetNode) return false;
    
    // 添加連接
    if (!sourceNode.outputs.includes(targetId)) {
      sourceNode.outputs.push(targetId);
    }
    if (!targetNode.inputs.includes(sourceId)) {
      targetNode.inputs.push(sourceId);
    }
    
    return this.updateWorkflow(workflowId, { nodes: [...workflow.nodes] });
  }
  
  /**
   * 斷開節點連接
   */
  disconnectNodes(workflowId: string, sourceId: string, targetId: string): boolean {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) return false;
    
    const sourceNode = workflow.nodes.find(n => n.id === sourceId);
    const targetNode = workflow.nodes.find(n => n.id === targetId);
    
    if (sourceNode) {
      sourceNode.outputs = sourceNode.outputs.filter(id => id !== targetId);
    }
    if (targetNode) {
      targetNode.inputs = targetNode.inputs.filter(id => id !== sourceId);
    }
    
    return this.updateWorkflow(workflowId, { nodes: [...workflow.nodes] });
  }
  
  /**
   * 創建默認節點
   */
  private createDefaultNodes(): WorkflowNode[] {
    return [
      {
        id: 'start_default',
        type: 'start',
        name: '開始',
        position: { x: 100, y: 200 },
        config: {},
        inputs: [],
        outputs: ['end_default']
      },
      {
        id: 'end_default',
        type: 'end',
        name: '結束',
        position: { x: 400, y: 200 },
        config: {},
        inputs: ['start_default'],
        outputs: []
      }
    ];
  }
  
  // ============ 工作流執行 ============
  
  /**
   * 執行工作流
   */
  async executeWorkflow(
    workflowId: string,
    initialContext: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      throw new Error(`Workflow is not active: ${workflow.status}`);
    }
    
    // 檢查併發限制
    if (this._runningExecutions().size >= WORKFLOW_CONFIG.maxConcurrentExecutions) {
      throw new Error('已達到最大併發執行數量');
    }
    
    // 創建執行記錄
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      workflowName: workflow.name,
      status: 'running',
      context: initialContext,
      variables: this.initializeVariables(workflow.variables),
      nodeExecutions: [],
      startedAt: new Date()
    };
    
    // 添加到運行列表
    this._runningExecutions.update(set => new Set(set).add(execution.id));
    this._executions.update(execs => [execution, ...execs.slice(0, WORKFLOW_CONFIG.maxExecutionHistory - 1)]);
    
    console.log(`[WorkflowEngine] Starting execution: ${execution.id}`);
    
    try {
      // 找到開始節點
      const startNode = workflow.nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('工作流缺少開始節點');
      }
      
      // 執行工作流
      await this.executeNode(workflow, startNode, execution);
      
      // 完成執行
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      
      // 更新工作流統計
      this.updateWorkflowStats(workflowId, true, execution.duration);
      
      console.log(`[WorkflowEngine] Execution completed: ${execution.id}`);
      
    } catch (error: any) {
      console.error(`[WorkflowEngine] Execution failed: ${execution.id}`, error);
      
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      
      // 更新工作流統計
      this.updateWorkflowStats(workflowId, false, execution.duration);
      
    } finally {
      // 從運行列表移除
      this._runningExecutions.update(set => {
        const newSet = new Set(set);
        newSet.delete(execution.id);
        return newSet;
      });
      
      // 更新執行記錄
      this._executions.update(execs =>
        execs.map(e => e.id === execution.id ? execution : e)
      );
      this.saveExecutions();
    }
    
    return execution;
  }
  
  /**
   * 執行節點
   */
  private async executeNode(
    workflow: Workflow,
    node: WorkflowNode,
    execution: WorkflowExecution
  ): Promise<any> {
    execution.currentNodeId = node.id;
    
    const nodeExec: NodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      input: { ...execution.context },
      startedAt: new Date()
    };
    execution.nodeExecutions.push(nodeExec);
    
    try {
      // 獲取處理器
      const handler = this.nodeHandlers.get(node.type);
      if (!handler) {
        throw new Error(`Unknown node type: ${node.type}`);
      }
      
      // 執行節點
      const result = await handler(node, {
        ...execution.context,
        variables: execution.variables
      });
      
      // 更新上下文
      if (result !== undefined) {
        execution.context = { ...execution.context, ...result };
      }
      
      nodeExec.status = 'completed';
      nodeExec.output = result;
      nodeExec.completedAt = new Date();
      nodeExec.duration = nodeExec.completedAt.getTime() - nodeExec.startedAt.getTime();
      
      // 處理下一個節點
      let nextNodeIds: string[] = [];
      
      if (node.conditionalOutputs && node.conditionalOutputs.length > 0) {
        // 條件分支
        for (const co of node.conditionalOutputs) {
          if (this.evaluateCondition(co.condition, execution)) {
            nextNodeIds.push(co.targetNodeId);
            break;
          }
        }
      } else {
        nextNodeIds = node.outputs;
      }
      
      // 執行下一個節點
      for (const nextNodeId of nextNodeIds) {
        const nextNode = workflow.nodes.find(n => n.id === nextNodeId);
        if (nextNode && nextNode.type !== 'end') {
          await this.executeNode(workflow, nextNode, execution);
        }
      }
      
      return result;
      
    } catch (error: any) {
      nodeExec.status = 'failed';
      nodeExec.error = error.message;
      nodeExec.completedAt = new Date();
      nodeExec.duration = nodeExec.completedAt.getTime() - nodeExec.startedAt.getTime();
      throw error;
    }
  }
  
  /**
   * 取消執行
   */
  cancelExecution(executionId: string): boolean {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution || execution.status !== 'running') return false;
    
    execution.status = 'cancelled';
    execution.completedAt = new Date();
    
    this._runningExecutions.update(set => {
      const newSet = new Set(set);
      newSet.delete(executionId);
      return newSet;
    });
    
    this._executions.update(execs =>
      execs.map(e => e.id === executionId ? execution : e)
    );
    
    return true;
  }
  
  // ============ 節點處理器 ============
  
  /**
   * 註冊節點處理器
   */
  private registerNodeHandlers(): void {
    // 開始節點
    this.nodeHandlers.set('start', async (node, context) => {
      return context;
    });
    
    // 結束節點
    this.nodeHandlers.set('end', async (node, context) => {
      return { completed: true };
    });
    
    // 動作節點
    this.nodeHandlers.set('action', async (node, context) => {
      const { actionType, ...params } = node.config;
      console.log(`[WorkflowEngine] Executing action: ${actionType}`);
      return { actionExecuted: actionType };
    });
    
    // 條件節點
    this.nodeHandlers.set('condition', async (node, context) => {
      // 條件評估在 executeNode 中處理
      return context;
    });
    
    // 延遲節點
    this.nodeHandlers.set('delay', async (node, context) => {
      const delay = node.config.delay || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return { delayed: delay };
    });
    
    // 循環節點
    this.nodeHandlers.set('loop', async (node, context) => {
      const { iterations = 1, variable } = node.config;
      const results: any[] = [];
      
      for (let i = 0; i < iterations; i++) {
        context.variables[variable || 'loopIndex'] = i;
        results.push({ iteration: i });
      }
      
      return { loopResults: results };
    });
    
    // 並行節點
    this.nodeHandlers.set('parallel', async (node, context) => {
      // 並行執行需要特殊處理
      return { parallel: true };
    });
    
    // 數據轉換節點
    this.nodeHandlers.set('transform', async (node, context) => {
      const { transformation } = node.config;
      // 應用數據轉換
      return { transformed: true };
    });
    
    // AI 處理節點
    this.nodeHandlers.set('ai', async (node, context) => {
      console.log(`[WorkflowEngine] AI processing`);
      return { aiProcessed: true };
    });
    
    // Webhook 節點
    this.nodeHandlers.set('webhook', async (node, context) => {
      const { url, method = 'POST' } = node.config;
      console.log(`[WorkflowEngine] Calling webhook: ${url}`);
      return { webhookCalled: url };
    });
    
    // 變量操作節點
    this.nodeHandlers.set('variable', async (node, context) => {
      const { operation, name, value } = node.config;
      
      switch (operation) {
        case 'set':
          context.variables[name] = value;
          break;
        case 'increment':
          context.variables[name] = (context.variables[name] || 0) + (value || 1);
          break;
        case 'decrement':
          context.variables[name] = (context.variables[name] || 0) - (value || 1);
          break;
      }
      
      return { variable: name, value: context.variables[name] };
    });
    
    // 子工作流節點
    this.nodeHandlers.set('subworkflow', async (node, context) => {
      const { workflowId } = node.config;
      // 執行子工作流
      return { subworkflowId: workflowId };
    });
    
    // 批量發送消息節點
    this.nodeHandlers.set('batch_message', async (node, context) => {
      const { 
        memberSource,
        memberIds,
        groupId,
        messageTemplate,
        messageVariables,
        priority = 'normal',
        delayMin = 30,
        delayMax = 60,
        useAccountRotation = true,
        maxAccountsToUse = 3
      } = node.config;
      
      console.log(`[WorkflowEngine] Batch message node: ${node.name}`);
      
      // 獲取目標成員
      let targetMembers: string[] = [];
      if (memberSource === 'context' && context.members) {
        targetMembers = context.members;
      } else if (memberSource === 'list' && memberIds) {
        targetMembers = memberIds;
      } else if (memberSource === 'group' && groupId) {
        // 從群組提取成員（需要調用 MemberExtractor）
        targetMembers = context[`group_${groupId}_members`] || [];
      }
      
      return { 
        batchType: 'message',
        queued: true,
        memberCount: targetMembers.length,
        priority,
        config: {
          messageTemplate,
          messageVariables,
          delayMin,
          delayMax,
          useAccountRotation,
          maxAccountsToUse
        }
      };
    });
    
    // 批量邀請成員節點
    this.nodeHandlers.set('batch_invite', async (node, context) => {
      const {
        memberSource,
        memberIds,
        sourceGroupId,
        targetGroupId,
        priority = 'normal',
        delayMin = 30,
        delayMax = 60,
        useAccountRotation = true,
        maxAccountsToUse = 3
      } = node.config;
      
      console.log(`[WorkflowEngine] Batch invite node: ${node.name}`);
      
      // 獲取目標成員
      let targetMembers: string[] = [];
      if (memberSource === 'context' && context.members) {
        targetMembers = context.members;
      } else if (memberSource === 'list' && memberIds) {
        targetMembers = memberIds;
      } else if (memberSource === 'group' && sourceGroupId) {
        targetMembers = context[`group_${sourceGroupId}_members`] || [];
      }
      
      return {
        batchType: 'invite',
        queued: true,
        memberCount: targetMembers.length,
        targetGroupId,
        priority,
        config: {
          delayMin,
          delayMax,
          useAccountRotation,
          maxAccountsToUse
        }
      };
    });
    
    // 批量標籤操作節點
    this.nodeHandlers.set('batch_tag', async (node, context) => {
      const {
        memberSource,
        memberIds,
        operation = 'add',  // 'add' | 'remove'
        tags = []
      } = node.config;
      
      console.log(`[WorkflowEngine] Batch tag node: ${node.name}`);
      
      // 獲取目標成員
      let targetMembers: string[] = [];
      if (memberSource === 'context' && context.members) {
        targetMembers = context.members;
      } else if (memberSource === 'list' && memberIds) {
        targetMembers = memberIds;
      }
      
      return {
        batchType: 'tag',
        operation,
        tags,
        memberCount: targetMembers.length,
        processed: true
      };
    });
    
    // 成員提取節點
    this.nodeHandlers.set('member_extract', async (node, context) => {
      const {
        groupId,
        filters = {},
        limit = 100,
        saveToVariable = 'extractedMembers'
      } = node.config;
      
      console.log(`[WorkflowEngine] Member extract node: ${node.name} from group ${groupId}`);
      
      // 這裡會調用 MemberExtractor 服務
      // 暫時返回模擬結果
      const extractedMembers: string[] = [];
      
      // 將結果保存到上下文
      context.variables[saveToVariable] = extractedMembers;
      context[`group_${groupId}_members`] = extractedMembers;
      
      return {
        groupId,
        extractedCount: extractedMembers.length,
        savedTo: saveToVariable
      };
    });
  }
  
  // ============ 輔助方法 ============
  
  private initializeVariables(variables: WorkflowVariable[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const v of variables) {
      result[v.name] = v.defaultValue;
    }
    return result;
  }
  
  private evaluateCondition(condition: string, execution: WorkflowExecution): boolean {
    if (condition === 'default') return true;
    
    try {
      // 安全的條件評估
      const context = {
        ...execution.context,
        ...execution.variables
      };
      
      // 簡單的條件解析
      const match = condition.match(/(\w+)\s*(===|!==|>|<|>=|<=)\s*"?([^"]*)"?/);
      if (!match) return condition === 'default';
      
      const [, field, operator, value] = match;
      const actual = context[field];
      
      switch (operator) {
        case '===': return actual === value;
        case '!==': return actual !== value;
        case '>': return Number(actual) > Number(value);
        case '<': return Number(actual) < Number(value);
        case '>=': return Number(actual) >= Number(value);
        case '<=': return Number(actual) <= Number(value);
        default: return false;
      }
    } catch {
      return false;
    }
  }
  
  private updateWorkflowStats(workflowId: string, success: boolean, duration: number): void {
    this._workflows.update(workflows =>
      workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const newAvg = (w.stats.avgDuration * w.stats.executionCount + duration) / (w.stats.executionCount + 1);
        
        return {
          ...w,
          stats: {
            executionCount: w.stats.executionCount + 1,
            successCount: w.stats.successCount + (success ? 1 : 0),
            failureCount: w.stats.failureCount + (success ? 0 : 1),
            avgDuration: newAvg
          }
        };
      })
    );
    this.saveWorkflows();
  }
  
  // ============ 驗證 ============
  
  /**
   * 驗證工作流
   */
  validateWorkflow(workflowId: string): { valid: boolean; errors: string[] } {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) {
      return { valid: false, errors: ['工作流不存在'] };
    }
    
    const errors: string[] = [];
    
    // 檢查開始節點
    const startNodes = workflow.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('缺少開始節點');
    } else if (startNodes.length > 1) {
      errors.push('只能有一個開始節點');
    }
    
    // 檢查結束節點
    const endNodes = workflow.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('缺少結束節點');
    }
    
    // 檢查孤立節點
    for (const node of workflow.nodes) {
      if (node.type !== 'start' && node.inputs.length === 0) {
        errors.push(`節點 "${node.name}" 沒有輸入連接`);
      }
      if (node.type !== 'end' && node.outputs.length === 0 && !node.conditionalOutputs?.length) {
        errors.push(`節點 "${node.name}" 沒有輸出連接`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  // ============ 持久化 ============
  
  private saveWorkflows(): void {
    localStorage.setItem('tgai-workflows', JSON.stringify(this._workflows()));
  }
  
  private loadWorkflows(): void {
    try {
      const data = localStorage.getItem('tgai-workflows');
      if (data) {
        const workflows = JSON.parse(data).map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt)
        }));
        this._workflows.set(workflows);
      }
    } catch (e) {}
  }
  
  private saveExecutions(): void {
    localStorage.setItem('tgai-workflow-executions', JSON.stringify(
      this._executions().slice(0, 50)
    ));
  }
  
  private loadExecutions(): void {
    try {
      const data = localStorage.getItem('tgai-workflow-executions');
      if (data) {
        const executions = JSON.parse(data).map((e: any) => ({
          ...e,
          startedAt: new Date(e.startedAt),
          completedAt: e.completedAt ? new Date(e.completedAt) : undefined
        }));
        this._executions.set(executions);
      }
    } catch (e) {}
  }
  
  /**
   * 獲取可用的工作流模板
   */
  getTemplates(): Partial<Workflow>[] {
    return WORKFLOW_TEMPLATES;
  }
}
