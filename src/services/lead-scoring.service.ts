/**
 * 客戶評分服務
 * Lead Scoring Service
 * 
 * 功能：
 * 1. 行為評分（互動行為加分）
 * 2. AI 評分（對話意圖分析）
 * 3. 評分規則管理
 * 4. 評分歷史記錄
 * 5. 熱度等級計算
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 評分行為類型
export type ScoringAction = 
  | 'message_sent'        // 發送消息
  | 'message_opened'      // 打開消息
  | 'message_replied'     // 回覆消息
  | 'link_clicked'        // 點擊連結
  | 'positive_reply'      // 正面回覆
  | 'negative_reply'      // 負面回覆
  | 'question_asked'      // 提問
  | 'price_inquiry'       // 詢價
  | 'meeting_scheduled'   // 預約會議
  | 'demo_requested'      // 請求演示
  | 'referral_made'       // 轉介紹
  | 'unsubscribed'        // 取消訂閱
  | 'complained'          // 投訴
  | 'inactive_7d'         // 7天未活躍
  | 'inactive_30d';       // 30天未活躍

// 評分規則
export interface ScoringRule {
  id: string;
  action: ScoringAction;
  name: string;
  description: string;
  points: number;           // 分數（可為負數）
  enabled: boolean;
  maxPerDay?: number;       // 每日最大觸發次數
  cooldownMinutes?: number; // 冷卻時間（分鐘）
}

// 熱度等級
export type HeatLevel = 'cold' | 'warm' | 'hot' | 'burning';

// 評分歷史
export interface ScoreHistory {
  id: string;
  contactId: string;
  action: ScoringAction;
  points: number;
  reason: string;
  timestamp: string;
  metadata?: any;
}

// 客戶評分詳情
export interface LeadScore {
  contactId: string;
  totalScore: number;
  heatLevel: HeatLevel;
  
  // 分類評分
  behaviorScore: number;    // 行為評分
  engagementScore: number;  // 互動評分
  intentScore: number;      // 意圖評分
  recencyScore: number;     // 時效評分
  
  // 統計
  lastActivity?: string;
  activityCount: number;
  
  // AI 分析
  aiAnalysis?: {
    sentiment: number;      // 情感分數 -1 到 1
    purchaseIntent: number; // 購買意圖 0 到 100
    urgency: number;        // 緊迫度 0 到 100
    keywords: string[];     // 關鍵詞
  };
  
  // 歷史
  history: ScoreHistory[];
  
  updatedAt: string;
}

// 熱度等級配置
interface HeatLevelConfig {
  level: HeatLevel;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  label: string;
}

// 默認評分規則
const DEFAULT_RULES: ScoringRule[] = [
  // 正面行為
  { id: 'r1', action: 'message_replied', name: '回覆消息', description: '客戶回覆了您的消息', points: 10, enabled: true, maxPerDay: 5 },
  { id: 'r2', action: 'positive_reply', name: '正面回覆', description: '客戶表達了興趣或積極態度', points: 15, enabled: true },
  { id: 'r3', action: 'question_asked', name: '主動提問', description: '客戶主動詢問產品/服務', points: 20, enabled: true },
  { id: 'r4', action: 'price_inquiry', name: '詢問價格', description: '客戶詢問價格，高購買意向', points: 25, enabled: true },
  { id: 'r5', action: 'demo_requested', name: '請求演示', description: '客戶請求產品演示', points: 30, enabled: true },
  { id: 'r6', action: 'meeting_scheduled', name: '預約會議', description: '客戶同意預約會議', points: 40, enabled: true },
  { id: 'r7', action: 'referral_made', name: '推薦他人', description: '客戶推薦了其他潛在客戶', points: 50, enabled: true },
  
  // 中性行為
  { id: 'r8', action: 'message_sent', name: '發送消息', description: '向客戶發送消息', points: 2, enabled: true, maxPerDay: 3 },
  { id: 'r9', action: 'message_opened', name: '打開消息', description: '客戶打開了消息', points: 5, enabled: true, maxPerDay: 5 },
  { id: 'r10', action: 'link_clicked', name: '點擊連結', description: '客戶點擊了消息中的連結', points: 8, enabled: true },
  
  // 負面行為
  { id: 'r11', action: 'negative_reply', name: '負面回覆', description: '客戶表達不感興趣', points: -10, enabled: true },
  { id: 'r12', action: 'unsubscribed', name: '取消訂閱', description: '客戶取消訂閱或拉黑', points: -30, enabled: true },
  { id: 'r13', action: 'complained', name: '投訴', description: '客戶投訴或舉報', points: -50, enabled: true },
  { id: 'r14', action: 'inactive_7d', name: '7天未活躍', description: '客戶7天內無任何互動', points: -5, enabled: true },
  { id: 'r15', action: 'inactive_30d', name: '30天未活躍', description: '客戶30天內無任何互動', points: -15, enabled: true },
];

// 熱度等級配置
const HEAT_LEVELS: HeatLevelConfig[] = [
  { level: 'cold', minScore: -100, maxScore: 20, color: '#64748b', icon: '❄️', label: '冷淡' },
  { level: 'warm', minScore: 21, maxScore: 50, color: '#eab308', icon: '🌤️', label: '溫和' },
  { level: 'hot', minScore: 51, maxScore: 100, color: '#f97316', icon: '🔥', label: '熱門' },
  { level: 'burning', minScore: 101, maxScore: 999, color: '#ef4444', icon: '💥', label: '爆熱' },
];

@Injectable({
  providedIn: 'root'
})
export class LeadScoringService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 評分規則
  private _rules = signal<ScoringRule[]>(DEFAULT_RULES);
  rules = this._rules.asReadonly();
  
  // 所有客戶評分
  private _scores = signal<Map<string, LeadScore>>(new Map());
  
  // 評分歷史（全局）
  private _globalHistory = signal<ScoreHistory[]>([]);
  globalHistory = this._globalHistory.asReadonly();
  
  // 統計
  stats = computed(() => {
    const scores = Array.from(this._scores().values());
    const byLevel = {
      cold: scores.filter(s => s.heatLevel === 'cold').length,
      warm: scores.filter(s => s.heatLevel === 'warm').length,
      hot: scores.filter(s => s.heatLevel === 'hot').length,
      burning: scores.filter(s => s.heatLevel === 'burning').length,
    };
    
    return {
      total: scores.length,
      avgScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length : 0,
      byLevel,
      hotLeads: scores.filter(s => s.heatLevel === 'hot' || s.heatLevel === 'burning'),
    };
  });
  
  constructor() {
    this.loadData();
    this.setupIpcListeners();
  }
  
  /**
   * 設置 IPC 監聽器
   */
  private setupIpcListeners() {
    // 監聽消息發送事件
    this.ipc.on('scoring:message-sent', (data: { contactId: string }) => {
      this.recordAction(data.contactId, 'message_sent');
    });
    
    // 監聽回覆事件
    this.ipc.on('scoring:reply-received', (data: { contactId: string; sentiment?: number }) => {
      if (data.sentiment && data.sentiment > 0.3) {
        this.recordAction(data.contactId, 'positive_reply');
      } else if (data.sentiment && data.sentiment < -0.3) {
        this.recordAction(data.contactId, 'negative_reply');
      } else {
        this.recordAction(data.contactId, 'message_replied');
      }
    });
    
    // 監聽詢價事件
    this.ipc.on('scoring:price-inquiry', (data: { contactId: string }) => {
      this.recordAction(data.contactId, 'price_inquiry');
    });
  }
  
  /**
   * 載入數據
   */
  private loadData() {
    try {
      // 載入規則
      const rulesStr = localStorage.getItem('tg-matrix-scoring-rules');
      if (rulesStr) {
        this._rules.set(JSON.parse(rulesStr));
      }
      
      // 載入評分
      const scoresStr = localStorage.getItem('tg-matrix-lead-scores');
      if (scoresStr) {
        const scoresArr: LeadScore[] = JSON.parse(scoresStr);
        const scoresMap = new Map<string, LeadScore>();
        scoresArr.forEach(s => scoresMap.set(s.contactId, s));
        this._scores.set(scoresMap);
      }
      
      // 載入歷史
      const historyStr = localStorage.getItem('tg-matrix-scoring-history');
      if (historyStr) {
        this._globalHistory.set(JSON.parse(historyStr));
      }
    } catch (e) {
      console.error('Failed to load scoring data:', e);
    }
  }
  
  /**
   * 保存數據
   */
  private saveData() {
    try {
      localStorage.setItem('tg-matrix-scoring-rules', JSON.stringify(this._rules()));
      localStorage.setItem('tg-matrix-lead-scores', JSON.stringify(Array.from(this._scores().values())));
      localStorage.setItem('tg-matrix-scoring-history', JSON.stringify(this._globalHistory().slice(0, 1000)));
    } catch (e) {
      console.error('Failed to save scoring data:', e);
    }
  }
  
  /**
   * 記錄評分行為
   */
  recordAction(
    contactId: string,
    action: ScoringAction,
    metadata?: any
  ): number {
    const rule = this._rules().find(r => r.action === action && r.enabled);
    if (!rule) return 0;
    
    // 檢查每日限制
    if (rule.maxPerDay) {
      const todayCount = this.getTodayActionCount(contactId, action);
      if (todayCount >= rule.maxPerDay) {
        return 0;
      }
    }
    
    // 檢查冷卻時間
    if (rule.cooldownMinutes) {
      const lastAction = this.getLastActionTime(contactId, action);
      if (lastAction) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - new Date(lastAction).getTime() < cooldownMs) {
          return 0;
        }
      }
    }
    
    // 創建歷史記錄
    const history: ScoreHistory = {
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      action,
      points: rule.points,
      reason: rule.name,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    // 更新全局歷史
    this._globalHistory.update(h => [history, ...h.slice(0, 999)]);
    
    // 更新客戶評分
    this.updateScore(contactId, history);
    
    // 保存
    this.saveData();
    
    return rule.points;
  }
  
  /**
   * 更新客戶評分
   */
  private updateScore(contactId: string, history: ScoreHistory) {
    const scores = this._scores();
    let score = scores.get(contactId);
    
    if (!score) {
      score = this.createNewScore(contactId);
    }
    
    // 添加歷史
    score.history = [history, ...score.history.slice(0, 99)];
    
    // 重新計算總分
    score.totalScore = Math.max(-100, Math.min(999, score.totalScore + history.points));
    
    // 更新分類評分
    this.updateCategoryScores(score);
    
    // 計算熱度等級
    score.heatLevel = this.calculateHeatLevel(score.totalScore);
    
    // 更新活動信息
    score.lastActivity = history.timestamp;
    score.activityCount++;
    score.updatedAt = new Date().toISOString();
    
    // 更新 Map
    const newScores = new Map(scores);
    newScores.set(contactId, score);
    this._scores.set(newScores);
  }
  
  /**
   * 創建新評分記錄
   */
  private createNewScore(contactId: string): LeadScore {
    return {
      contactId,
      totalScore: 0,
      heatLevel: 'cold',
      behaviorScore: 0,
      engagementScore: 0,
      intentScore: 0,
      recencyScore: 0,
      activityCount: 0,
      history: [],
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * 更新分類評分
   */
  private updateCategoryScores(score: LeadScore) {
    const recent = score.history.slice(0, 20);
    
    // 行為評分
    const behaviorActions: ScoringAction[] = ['message_replied', 'link_clicked', 'message_opened'];
    score.behaviorScore = recent
      .filter(h => behaviorActions.includes(h.action))
      .reduce((sum, h) => sum + h.points, 0);
    
    // 互動評分
    const engagementActions: ScoringAction[] = ['positive_reply', 'question_asked'];
    score.engagementScore = recent
      .filter(h => engagementActions.includes(h.action))
      .reduce((sum, h) => sum + h.points, 0);
    
    // 意圖評分
    const intentActions: ScoringAction[] = ['price_inquiry', 'demo_requested', 'meeting_scheduled'];
    score.intentScore = recent
      .filter(h => intentActions.includes(h.action))
      .reduce((sum, h) => sum + h.points, 0);
    
    // 時效評分（基於最近活動時間）
    if (score.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(score.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 1) {
        score.recencyScore = 20;
      } else if (daysSinceActivity < 3) {
        score.recencyScore = 15;
      } else if (daysSinceActivity < 7) {
        score.recencyScore = 10;
      } else if (daysSinceActivity < 14) {
        score.recencyScore = 5;
      } else {
        score.recencyScore = 0;
      }
    }
  }
  
  /**
   * 計算熱度等級
   */
  private calculateHeatLevel(score: number): HeatLevel {
    for (const config of HEAT_LEVELS) {
      if (score >= config.minScore && score <= config.maxScore) {
        return config.level;
      }
    }
    return 'cold';
  }
  
  /**
   * 獲取今日行為計數
   */
  private getTodayActionCount(contactId: string, action: ScoringAction): number {
    const today = new Date().toDateString();
    const score = this._scores().get(contactId);
    if (!score) return 0;
    
    return score.history.filter(h => 
      h.action === action && 
      new Date(h.timestamp).toDateString() === today
    ).length;
  }
  
  /**
   * 獲取最後行為時間
   */
  private getLastActionTime(contactId: string, action: ScoringAction): string | null {
    const score = this._scores().get(contactId);
    if (!score) return null;
    
    const lastAction = score.history.find(h => h.action === action);
    return lastAction?.timestamp || null;
  }
  
  /**
   * 獲取客戶評分
   */
  getScore(contactId: string): LeadScore | null {
    return this._scores().get(contactId) || null;
  }
  
  /**
   * 獲取所有評分
   */
  getAllScores(): LeadScore[] {
    return Array.from(this._scores().values());
  }
  
  /**
   * 獲取熱門客戶
   */
  getHotLeads(limit = 10): LeadScore[] {
    return this.getAllScores()
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }
  
  /**
   * 按熱度等級獲取客戶
   */
  getLeadsByHeatLevel(level: HeatLevel): LeadScore[] {
    return this.getAllScores().filter(s => s.heatLevel === level);
  }
  
  /**
   * 手動調整分數
   */
  adjustScore(contactId: string, points: number, reason: string): void {
    const history: ScoreHistory = {
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      action: 'message_sent', // 使用通用行為
      points,
      reason: `手動調整: ${reason}`,
      timestamp: new Date().toISOString()
    };
    
    this._globalHistory.update(h => [history, ...h.slice(0, 999)]);
    this.updateScore(contactId, history);
    this.saveData();
    
    this.toast.success(`評分已調整 ${points > 0 ? '+' : ''}${points} 分`);
  }
  
  /**
   * 更新 AI 分析
   */
  updateAIAnalysis(contactId: string, analysis: LeadScore['aiAnalysis']): void {
    const scores = this._scores();
    const score = scores.get(contactId);
    if (!score) return;
    
    score.aiAnalysis = analysis;
    
    // 根據 AI 分析調整意圖評分
    if (analysis) {
      const aiBonus = Math.round(analysis.purchaseIntent * 0.3 + analysis.urgency * 0.2);
      score.intentScore = Math.max(0, score.intentScore + aiBonus);
    }
    
    score.updatedAt = new Date().toISOString();
    
    const newScores = new Map(scores);
    newScores.set(contactId, score);
    this._scores.set(newScores);
    this.saveData();
  }
  
  /**
   * 更新評分規則
   */
  updateRule(ruleId: string, updates: Partial<ScoringRule>): void {
    this._rules.update(rules =>
      rules.map(r => r.id === ruleId ? { ...r, ...updates } : r)
    );
    this.saveData();
  }
  
  /**
   * 重置規則為默認值
   */
  resetRules(): void {
    this._rules.set(DEFAULT_RULES);
    this.saveData();
    this.toast.success('評分規則已重置');
  }
  
  /**
   * 清除客戶評分
   */
  clearScore(contactId: string): void {
    const scores = new Map(this._scores());
    scores.delete(contactId);
    this._scores.set(scores);
    this.saveData();
  }
  
  /**
   * 獲取熱度等級配置
   */
  getHeatLevelConfig(level: HeatLevel): HeatLevelConfig {
    return HEAT_LEVELS.find(h => h.level === level) || HEAT_LEVELS[0];
  }
  
  /**
   * 獲取所有熱度等級配置
   */
  getAllHeatLevelConfigs(): HeatLevelConfig[] {
    return HEAT_LEVELS;
  }
  
  /**
   * 批量檢查不活躍客戶
   */
  checkInactiveLeads(): void {
    const now = Date.now();
    const scores = this.getAllScores();
    
    for (const score of scores) {
      if (!score.lastActivity) continue;
      
      const lastActivityTime = new Date(score.lastActivity).getTime();
      const daysSinceActivity = (now - lastActivityTime) / (1000 * 60 * 60 * 24);
      
      // 檢查是否已經記錄過不活躍
      const has7d = score.history.some(h => 
        h.action === 'inactive_7d' && 
        (now - new Date(h.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
      );
      const has30d = score.history.some(h => 
        h.action === 'inactive_30d' && 
        (now - new Date(h.timestamp).getTime()) < 30 * 24 * 60 * 60 * 1000
      );
      
      if (daysSinceActivity >= 30 && !has30d) {
        this.recordAction(score.contactId, 'inactive_30d');
      } else if (daysSinceActivity >= 7 && !has7d) {
        this.recordAction(score.contactId, 'inactive_7d');
      }
    }
  }
}
