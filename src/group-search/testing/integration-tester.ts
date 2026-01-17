/**
 * TG-AI智控王 集成測試器
 * Integration Tester v1.0
 * 
 * 用於測試所有模塊的集成
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { MockDataGenerator, mockGenerator } from './mock-data-generator';

// 導入所有服務
import { GroupScorer } from '../analytics/group-scorer';
import { RecommendationEngine } from '../analytics/recommendation-engine';
import { MemberAnalyzer } from '../analytics/member-analyzer';
import { AIReplyEngine } from '../automation/ai-reply-engine';
import { IntentAnalyzer } from '../automation/intent-analyzer';
import { TriggerSystem } from '../automation/trigger-system';
import { WorkflowEngine } from '../automation/workflow-engine';

// ============ 類型定義 ============

export interface TestResult {
  name: string;
  module: string;
  passed: boolean;
  duration: number;
  message?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  totalDuration: number;
}

export interface IntegrationTestReport {
  timestamp: Date;
  suites: TestSuite[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
    totalDuration: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationTester {
  // 注入所有服務
  private groupScorer = inject(GroupScorer);
  private recommendationEngine = inject(RecommendationEngine);
  private memberAnalyzer = inject(MemberAnalyzer);
  private aiReplyEngine = inject(AIReplyEngine);
  private intentAnalyzer = inject(IntentAnalyzer);
  private triggerSystem = inject(TriggerSystem);
  private workflowEngine = inject(WorkflowEngine);
  
  // 測試結果
  private _report = signal<IntegrationTestReport | null>(null);
  report = computed(() => this._report());
  
  // 測試進度
  private _progress = signal<{ current: number; total: number; currentTest: string }>({
    current: 0,
    total: 0,
    currentTest: ''
  });
  progress = computed(() => this._progress());
  
  // 正在運行
  private _isRunning = signal(false);
  isRunning = computed(() => this._isRunning());
  
  /**
   * 運行所有測試
   */
  async runAllTests(): Promise<IntegrationTestReport> {
    if (this._isRunning()) {
      throw new Error('Tests already running');
    }
    
    this._isRunning.set(true);
    const startTime = Date.now();
    
    const suites: TestSuite[] = [];
    
    try {
      // 計算總測試數
      const testMethods = [
        this.testGroupScorer.bind(this),
        this.testRecommendationEngine.bind(this),
        this.testMemberAnalyzer.bind(this),
        this.testAIReplyEngine.bind(this),
        this.testIntentAnalyzer.bind(this),
        this.testTriggerSystem.bind(this),
        this.testWorkflowEngine.bind(this),
        this.testIntegration.bind(this)
      ];
      
      this._progress.set({ current: 0, total: testMethods.length, currentTest: '' });
      
      // 運行每個測試套件
      for (let i = 0; i < testMethods.length; i++) {
        const suite = await testMethods[i]();
        suites.push(suite);
        this._progress.update(p => ({ ...p, current: i + 1 }));
      }
      
      // 生成報告
      const report: IntegrationTestReport = {
        timestamp: new Date(),
        suites,
        summary: this.calculateSummary(suites, Date.now() - startTime)
      };
      
      this._report.set(report);
      
      console.log('[IntegrationTester] All tests completed');
      console.log(`[IntegrationTester] Pass rate: ${report.summary.passRate.toFixed(1)}%`);
      
      return report;
      
    } finally {
      this._isRunning.set(false);
    }
  }
  
  // ============ 測試套件 ============
  
  /**
   * 測試群組評分器
   */
  private async testGroupScorer(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'GroupScorer' }));
    
    const tests: TestResult[] = [];
    const groups = mockGenerator.generateGroups(10, true);
    
    // 測試1: 基礎評分
    tests.push(await this.runTest('基礎評分功能', 'GroupScorer', async () => {
      const score = this.groupScorer.scoreGroup(groups[0]);
      if (score.total < 0 || score.total > 100) {
        throw new Error(`Invalid score: ${score.total}`);
      }
      if (!['S', 'A', 'B', 'C', 'D', 'F'].includes(score.grade)) {
        throw new Error(`Invalid grade: ${score.grade}`);
      }
      return { score: score.total, grade: score.grade };
    }));
    
    // 測試2: 批量評分
    tests.push(await this.runTest('批量評分功能', 'GroupScorer', async () => {
      const scores = this.groupScorer.scoreGroups(groups);
      if (scores.size !== groups.length) {
        throw new Error(`Expected ${groups.length} scores, got ${scores.size}`);
      }
      return { count: scores.size };
    }));
    
    // 測試3: 快速評分
    tests.push(await this.runTest('快速評分功能', 'GroupScorer', async () => {
      const score = this.groupScorer.quickScore(groups[0]);
      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw new Error(`Invalid quick score: ${score}`);
      }
      return { quickScore: score };
    }));
    
    // 測試4: 標籤生成
    tests.push(await this.runTest('標籤生成功能', 'GroupScorer', async () => {
      const score = this.groupScorer.scoreGroup(groups[0]);
      if (!Array.isArray(score.tags)) {
        throw new Error('Tags should be an array');
      }
      return { tagsCount: score.tags.length };
    }));
    
    return this.createSuite('GroupScorer 群組評分', tests);
  }
  
  /**
   * 測試推薦引擎
   */
  private async testRecommendationEngine(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'RecommendationEngine' }));
    
    const tests: TestResult[] = [];
    const groups = mockGenerator.generateGroups(20) as any[];
    const favorites = mockGenerator.generateFavorites(5);
    const history = mockGenerator.generateSearchHistories(10);
    
    // 測試1: 生成推薦
    tests.push(await this.runTest('生成推薦列表', 'RecommendationEngine', async () => {
      const recommendations = await this.recommendationEngine.generateRecommendations(
        favorites, history, groups
      );
      if (!Array.isArray(recommendations)) {
        throw new Error('Recommendations should be an array');
      }
      return { count: recommendations.length };
    }));
    
    // 測試2: 快速推薦
    tests.push(await this.runTest('快速推薦功能', 'RecommendationEngine', async () => {
      const recs = this.recommendationEngine.getQuickRecommendations(groups[0], groups, 5);
      if (recs.length > 5) {
        throw new Error(`Expected max 5 recommendations, got ${recs.length}`);
      }
      return { count: recs.length };
    }));
    
    // 測試3: 用戶畫像
    tests.push(await this.runTest('用戶畫像更新', 'RecommendationEngine', async () => {
      this.recommendationEngine.updateUserProfile(favorites, history);
      const profile = this.recommendationEngine.userProfile();
      if (!profile.interests || !profile.preferredTypes) {
        throw new Error('Profile should have interests and preferredTypes');
      }
      return { interestsCount: profile.interests.size };
    }));
    
    return this.createSuite('RecommendationEngine 推薦引擎', tests);
  }
  
  /**
   * 測試成員分析器
   */
  private async testMemberAnalyzer(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'MemberAnalyzer' }));
    
    const tests: TestResult[] = [];
    const members = mockGenerator.generateMembers(50);
    
    // 測試1: 單個成員分析
    tests.push(await this.runTest('單個成員分析', 'MemberAnalyzer', async () => {
      const analysis = this.memberAnalyzer.analyzeMember(members[0]);
      if (analysis.valueScore < 0 || analysis.valueScore > 100) {
        throw new Error(`Invalid value score: ${analysis.valueScore}`);
      }
      return { valueScore: analysis.valueScore, grade: analysis.grade };
    }));
    
    // 測試2: 批量分析
    tests.push(await this.runTest('批量成員分析', 'MemberAnalyzer', async () => {
      const analyses = this.memberAnalyzer.analyzeMembers(members);
      if (analyses.length !== members.length) {
        throw new Error(`Expected ${members.length} analyses, got ${analyses.length}`);
      }
      return { count: analyses.length };
    }));
    
    // 測試3: 群組統計
    tests.push(await this.runTest('群組成員統計', 'MemberAnalyzer', async () => {
      const stats = this.memberAnalyzer.analyzeGroupMembers(members);
      if (stats.total !== members.length) {
        throw new Error(`Expected ${members.length} total, got ${stats.total}`);
      }
      return { 
        total: stats.total,
        premiumRate: stats.premiumRate,
        segmentsCount: stats.segments.length
      };
    }));
    
    // 測試4: 高價值篩選
    tests.push(await this.runTest('高價值成員篩選', 'MemberAnalyzer', async () => {
      const highValue = this.memberAnalyzer.filterHighValueMembers(members, 70);
      if (highValue.some(m => this.memberAnalyzer.analyzeMember(m).valueScore < 70)) {
        throw new Error('Found member below threshold');
      }
      return { count: highValue.length };
    }));
    
    return this.createSuite('MemberAnalyzer 成員分析', tests);
  }
  
  /**
   * 測試 AI 回覆引擎
   */
  private async testAIReplyEngine(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'AIReplyEngine' }));
    
    const tests: TestResult[] = [];
    
    // 測試1: 生成回覆
    tests.push(await this.runTest('AI 回覆生成', 'AIReplyEngine', async () => {
      const response = await this.aiReplyEngine.generateReply({
        message: '你好，請問有什麼可以幫助的？',
        style: 'friendly'
      });
      if (!response.reply || response.reply.length === 0) {
        throw new Error('Reply should not be empty');
      }
      return { 
        replyLength: response.reply.length,
        confidence: response.confidence,
        source: response.source
      };
    }));
    
    // 測試2: 模板應用
    tests.push(await this.runTest('模板應用功能', 'AIReplyEngine', async () => {
      const templates = this.aiReplyEngine.templates();
      if (templates.length === 0) {
        // 創建一個測試模板
        this.aiReplyEngine.createTemplate({
          name: '測試模板',
          content: '您好 {{name}}！歡迎您的到來。',
          variables: ['name'],
          category: 'test',
          language: 'zh-TW',
          style: 'friendly',
          tags: ['test']
        });
      }
      
      const template = this.aiReplyEngine.templates()[0];
      const applied = this.aiReplyEngine.applyTemplate(template.id, { name: '測試用戶' });
      if (!applied) {
        throw new Error('Template application failed');
      }
      return { result: applied };
    }));
    
    // 測試3: 語言檢測
    tests.push(await this.runTest('語言檢測功能', 'AIReplyEngine', async () => {
      const zhLang = this.aiReplyEngine.detectLanguage('這是一段中文');
      const enLang = this.aiReplyEngine.detectLanguage('This is English');
      
      if (zhLang !== 'zh-CN' && zhLang !== 'zh-TW') {
        throw new Error(`Expected Chinese, got ${zhLang}`);
      }
      if (enLang !== 'en') {
        throw new Error(`Expected English, got ${enLang}`);
      }
      return { chinese: zhLang, english: enLang };
    }));
    
    return this.createSuite('AIReplyEngine AI回覆引擎', tests);
  }
  
  /**
   * 測試意圖分析器
   */
  private async testIntentAnalyzer(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'IntentAnalyzer' }));
    
    const tests: TestResult[] = [];
    const testMessages = mockGenerator.generateTestMessages();
    
    // 測試1: 意圖識別
    tests.push(await this.runTest('意圖識別功能', 'IntentAnalyzer', async () => {
      const analysis = this.intentAnalyzer.analyze('請問這個產品多少錢？');
      if (!analysis.intent || !analysis.intent.intent) {
        throw new Error('Intent should be identified');
      }
      return { 
        intent: analysis.intent.intent,
        confidence: analysis.intent.confidence
      };
    }));
    
    // 測試2: 情感分析
    tests.push(await this.runTest('情感分析功能', 'IntentAnalyzer', async () => {
      const positive = this.intentAnalyzer.analyze('這個產品太棒了！非常滿意！');
      const negative = this.intentAnalyzer.analyze('這個服務太差了！非常不滿！');
      
      if (positive.sentiment.sentiment !== 'positive') {
        throw new Error(`Expected positive, got ${positive.sentiment.sentiment}`);
      }
      if (negative.sentiment.sentiment !== 'negative') {
        throw new Error(`Expected negative, got ${negative.sentiment.sentiment}`);
      }
      return {
        positive: positive.sentiment,
        negative: negative.sentiment
      };
    }));
    
    // 測試3: 實體提取
    tests.push(await this.runTest('實體提取功能', 'IntentAnalyzer', async () => {
      const analysis = this.intentAnalyzer.analyze('請聯繫 test@example.com 或 +86 13812345678');
      const emailEntity = analysis.entities.find(e => e.type === 'email');
      const phoneEntity = analysis.entities.find(e => e.type === 'phone');
      
      if (!emailEntity) {
        throw new Error('Email entity should be extracted');
      }
      return { entitiesCount: analysis.entities.length };
    }));
    
    // 測試4: 緊急程度
    tests.push(await this.runTest('緊急程度判斷', 'IntentAnalyzer', async () => {
      const urgent = this.intentAnalyzer.analyze('緊急！馬上需要處理！');
      const normal = this.intentAnalyzer.analyze('有空的時候幫我看看');
      
      if (urgent.urgency === 'low') {
        throw new Error('Urgent message should not be low urgency');
      }
      return { urgent: urgent.urgency, normal: normal.urgency };
    }));
    
    // 測試5: 批量分析準確率
    tests.push(await this.runTest('批量分析準確率', 'IntentAnalyzer', async () => {
      let correct = 0;
      for (const test of testMessages) {
        const analysis = this.intentAnalyzer.analyze(test.text);
        if (analysis.intent.intent === test.expectedIntent) {
          correct++;
        }
      }
      const accuracy = correct / testMessages.length;
      return { 
        total: testMessages.length,
        correct,
        accuracy: `${(accuracy * 100).toFixed(1)}%`
      };
    }));
    
    return this.createSuite('IntentAnalyzer 意圖分析', tests);
  }
  
  /**
   * 測試觸發器系統
   */
  private async testTriggerSystem(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'TriggerSystem' }));
    
    const tests: TestResult[] = [];
    
    // 測試1: 創建觸發器
    tests.push(await this.runTest('創建觸發器', 'TriggerSystem', async () => {
      const trigger = this.triggerSystem.createTrigger({
        name: '測試觸發器',
        event: 'message_received',
        actions: [
          { id: 'action1', type: 'log_event', params: { message: 'Test' } }
        ],
        enabled: false,
        priority: 10
      });
      
      if (!trigger.id) {
        throw new Error('Trigger should have an ID');
      }
      return { triggerId: trigger.id };
    }));
    
    // 測試2: 事件處理
    tests.push(await this.runTest('事件處理功能', 'TriggerSystem', async () => {
      // 創建一個啟用的觸發器
      const trigger = this.triggerSystem.createTrigger({
        name: '測試事件觸發器',
        event: 'manual',
        actions: [
          { id: 'action1', type: 'log_event', params: { message: 'Event handled' } }
        ],
        enabled: true,
        priority: 10
      });
      
      const logs = await this.triggerSystem.handleEvent('manual', { test: true });
      return { logsCount: logs.length };
    }));
    
    // 測試3: 手動觸發
    tests.push(await this.runTest('手動觸發功能', 'TriggerSystem', async () => {
      const triggers = this.triggerSystem.triggers();
      if (triggers.length === 0) {
        throw new Error('No triggers available');
      }
      
      const log = await this.triggerSystem.manualTrigger(triggers[0].id, { test: true });
      if (!log) {
        throw new Error('Manual trigger should return a log');
      }
      return { success: log.success };
    }));
    
    return this.createSuite('TriggerSystem 觸發器系統', tests);
  }
  
  /**
   * 測試工作流引擎
   */
  private async testWorkflowEngine(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'WorkflowEngine' }));
    
    const tests: TestResult[] = [];
    
    // 測試1: 創建工作流
    tests.push(await this.runTest('創建工作流', 'WorkflowEngine', async () => {
      const workflow = this.workflowEngine.createWorkflow({
        name: '測試工作流',
        description: '用於測試的工作流'
      });
      
      if (!workflow.id) {
        throw new Error('Workflow should have an ID');
      }
      if (workflow.nodes.length < 2) {
        throw new Error('Workflow should have at least start and end nodes');
      }
      return { 
        workflowId: workflow.id,
        nodesCount: workflow.nodes.length
      };
    }));
    
    // 測試2: 驗證工作流
    tests.push(await this.runTest('驗證工作流', 'WorkflowEngine', async () => {
      const workflows = this.workflowEngine.workflows();
      if (workflows.length === 0) {
        throw new Error('No workflows available');
      }
      
      const validation = this.workflowEngine.validateWorkflow(workflows[0].id);
      return { valid: validation.valid, errors: validation.errors };
    }));
    
    // 測試3: 從模板創建
    tests.push(await this.runTest('從模板創建', 'WorkflowEngine', async () => {
      const templates = this.workflowEngine.getTemplates();
      if (templates.length === 0) {
        throw new Error('No templates available');
      }
      
      const workflow = this.workflowEngine.createFromTemplate(0);
      if (!workflow) {
        throw new Error('Failed to create from template');
      }
      return { 
        name: workflow.name,
        nodesCount: workflow.nodes.length
      };
    }));
    
    // 測試4: 執行工作流
    tests.push(await this.runTest('執行工作流', 'WorkflowEngine', async () => {
      const workflows = this.workflowEngine.workflows();
      const workflow = workflows.find(w => w.status === 'draft');
      
      if (!workflow) {
        throw new Error('No draft workflow available');
      }
      
      // 激活工作流
      this.workflowEngine.activateWorkflow(workflow.id);
      
      // 執行
      const execution = await this.workflowEngine.executeWorkflow(workflow.id, { test: true });
      
      return { 
        status: execution.status,
        nodesExecuted: execution.nodeExecutions.length
      };
    }));
    
    return this.createSuite('WorkflowEngine 工作流引擎', tests);
  }
  
  /**
   * 測試模塊集成
   */
  private async testIntegration(): Promise<TestSuite> {
    this._progress.update(p => ({ ...p, currentTest: 'Integration' }));
    
    const tests: TestResult[] = [];
    
    // 測試1: 完整流程 - 消息分析到自動回覆
    tests.push(await this.runTest('消息分析到自動回覆流程', 'Integration', async () => {
      const message = '請問這個產品多少錢？';
      
      // 1. 意圖分析
      const analysis = this.intentAnalyzer.analyze(message);
      
      // 2. 根據意圖生成回覆
      const reply = await this.aiReplyEngine.generateReply({
        message,
        style: analysis.sentiment.sentiment === 'negative' ? 'professional' : 'friendly'
      });
      
      return {
        intent: analysis.intent.intent,
        sentiment: analysis.sentiment.sentiment,
        replyGenerated: reply.reply.length > 0
      };
    }));
    
    // 測試2: 群組評分到推薦流程
    tests.push(await this.runTest('群組評分到推薦流程', 'Integration', async () => {
      const groups = mockGenerator.generateGroups(10, true) as any[];
      const favorites = mockGenerator.generateFavorites(3);
      const history = mockGenerator.generateSearchHistories(5);
      
      // 1. 評分所有群組
      const scores = this.groupScorer.scoreGroups(groups);
      
      // 2. 生成推薦
      const recommendations = await this.recommendationEngine.generateRecommendations(
        favorites, history, groups
      );
      
      // 3. 分析推薦群組的成員（假設）
      const topGroup = groups[0];
      const members = mockGenerator.generateMembers(20);
      const memberStats = this.memberAnalyzer.analyzeGroupMembers(members);
      
      return {
        groupsScored: scores.size,
        recommendationsCount: recommendations.length,
        memberSegments: memberStats.segments.length
      };
    }));
    
    // 測試3: 觸發器到工作流流程
    tests.push(await this.runTest('觸發器到工作流流程', 'Integration', async () => {
      // 創建一個執行工作流的觸發器
      const workflow = this.workflowEngine.workflows()[0];
      
      if (!workflow) {
        throw new Error('No workflow available');
      }
      
      const trigger = this.triggerSystem.createTrigger({
        name: '工作流觸發器',
        event: 'manual',
        actions: [
          {
            id: 'exec_workflow',
            type: 'execute_workflow',
            params: { workflowId: workflow.id }
          }
        ],
        enabled: true,
        priority: 10
      });
      
      // 觸發
      const log = await this.triggerSystem.manualTrigger(trigger.id, {});
      
      return {
        triggered: !!log,
        actionsExecuted: log?.actionsExecuted.length || 0
      };
    }));
    
    return this.createSuite('Integration 集成測試', tests);
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 運行單個測試
   */
  private async runTest(
    name: string,
    module: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const details = await testFn();
      return {
        name,
        module,
        passed: true,
        duration: Date.now() - startTime,
        details
      };
    } catch (error: any) {
      return {
        name,
        module,
        passed: false,
        duration: Date.now() - startTime,
        message: error.message
      };
    }
  }
  
  /**
   * 創建測試套件
   */
  private createSuite(name: string, tests: TestResult[]): TestSuite {
    return {
      name,
      tests,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length,
      totalDuration: tests.reduce((sum, t) => sum + t.duration, 0)
    };
  }
  
  /**
   * 計算總結
   */
  private calculateSummary(
    suites: TestSuite[],
    totalDuration: number
  ): IntegrationTestReport['summary'] {
    const allTests = suites.flatMap(s => s.tests);
    const passed = allTests.filter(t => t.passed).length;
    
    return {
      totalTests: allTests.length,
      passed,
      failed: allTests.length - passed,
      passRate: (passed / allTests.length) * 100,
      totalDuration
    };
  }
  
  /**
   * 導出報告
   */
  exportReport(): string {
    const report = this._report();
    if (!report) return '';
    
    let output = '# TG-AI智控王 集成測試報告\n\n';
    output += `**測試時間**: ${report.timestamp.toLocaleString()}\n\n`;
    output += `## 測試總結\n\n`;
    output += `- 總測試數: ${report.summary.totalTests}\n`;
    output += `- 通過: ${report.summary.passed}\n`;
    output += `- 失敗: ${report.summary.failed}\n`;
    output += `- 通過率: ${report.summary.passRate.toFixed(1)}%\n`;
    output += `- 總耗時: ${report.summary.totalDuration}ms\n\n`;
    
    for (const suite of report.suites) {
      output += `## ${suite.name}\n\n`;
      output += `通過: ${suite.passed} / 失敗: ${suite.failed} / 耗時: ${suite.totalDuration}ms\n\n`;
      
      for (const test of suite.tests) {
        const icon = test.passed ? '✅' : '❌';
        output += `- ${icon} ${test.name} (${test.duration}ms)\n`;
        if (!test.passed && test.message) {
          output += `  - 錯誤: ${test.message}\n`;
        }
      }
      output += '\n';
    }
    
    return output;
  }
}
