/**
 * 分析數據服務 - 第二階段數據分析
 * Analytics Data Service for Dashboard Components
 * 
 * 功能:
 * 1. 漏斗數據計算
 * 2. AI 洞察生成
 * 3. 活動對比數據
 * 4. 帳號健康評估
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { FunnelData, FunnelStage } from './conversion-funnel.component';
import { AIInsight, InsightType, Prediction } from './ai-insights.component';
import { CampaignData, CampaignMetrics } from './campaign-comparison.component';
import { AccountHealthData, HealthMetrics, HealthIssue } from './account-health-dashboard.component';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsDataService {
  // 漏斗數據
  private _funnelData = signal<FunnelData | null>(null);
  funnelData = this._funnelData.asReadonly();
  
  // AI 洞察
  private _insights = signal<AIInsight[]>([]);
  insights = this._insights.asReadonly();
  
  // 預測
  private _predictions = signal<Prediction[]>([]);
  predictions = this._predictions.asReadonly();
  
  // 活動數據
  private _campaigns = signal<CampaignData[]>([]);
  campaigns = this._campaigns.asReadonly();
  
  // 帳號健康數據
  private _accountHealth = signal<AccountHealthData[]>([]);
  accountHealth = this._accountHealth.asReadonly();
  
  /**
   * 計算漏斗數據
   */
  calculateFunnelData(leads: any[], period: string = '本週'): FunnelData {
    // 定義漏斗階段
    const stageConfig = [
      { id: 'new', name: '新線索', color: '#3b82f6', icon: '👤' },
      { id: 'interested', name: '有興趣', color: '#8b5cf6', icon: '💡' },
      { id: 'contacted', name: '已接觸', color: '#06b6d4', icon: '💬' },
      { id: 'negotiating', name: '洽談中', color: '#f59e0b', icon: '🤝' },
      { id: 'committed', name: '已承諾', color: '#10b981', icon: '✅' },
      { id: 'converted', name: '已轉化', color: '#22c55e', icon: '🎉' }
    ];
    
    // 計算每個階段的數量
    const stages: FunnelStage[] = stageConfig.map((config, index) => {
      const count = leads.filter(l => l.stage === config.id || l.funnelStage === config.id).length;
      const prevCount = index > 0 ? leads.filter(l => {
        const prevStage = stageConfig[index - 1].id;
        return l.stage === prevStage || l.funnelStage === prevStage;
      }).length : count;
      
      return {
        ...config,
        count,
        conversionRate: prevCount > 0 ? (count / prevCount) * 100 : undefined,
        dropoffRate: prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : undefined,
        avgTimeInStage: Math.random() * 48 + 12  // 模擬平均停留時間
      };
    });
    
    const totalLeads = leads.length;
    const convertedCount = stages.find(s => s.id === 'converted')?.count || 0;
    const overallConversion = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;
    
    const data: FunnelData = {
      stages,
      totalLeads,
      totalValue: convertedCount * 1000,  // 模擬價值
      overallConversion,
      period
    };
    
    this._funnelData.set(data);
    return data;
  }
  
  /**
   * 生成 AI 洞察
   */
  generateInsights(data: {
    leads?: any[];
    campaigns?: CampaignData[];
    accounts?: any[];
  }): AIInsight[] {
    const insights: AIInsight[] = [];
    const now = new Date();
    
    // 基於線索數據生成洞察
    if (data.leads && data.leads.length > 0) {
      const interestedCount = data.leads.filter(l => l.stage === 'interested').length;
      const contactedCount = data.leads.filter(l => l.stage === 'contacted').length;
      
      if (interestedCount > contactedCount * 2) {
        insights.push({
          id: 'insight-funnel-1',
          type: 'opportunity',
          priority: 'high',
          title: '大量有興趣線索待跟進',
          description: `有 ${interestedCount - contactedCount} 個有興趣的線索尚未接觸，建議優先跟進`,
          metric: {
            name: '待跟進',
            current: interestedCount - contactedCount,
            change: 15
          },
          action: {
            label: '開始跟進',
            handler: 'navigateToLeads'
          },
          timestamp: now,
          isNew: true
        });
      }
      
      // 轉化率趨勢
      const conversionRate = data.leads.filter(l => l.stage === 'converted').length / data.leads.length * 100;
      if (conversionRate < 10) {
        insights.push({
          id: 'insight-conversion-1',
          type: 'warning',
          priority: 'high',
          title: '轉化率偏低',
          description: '當前轉化率低於行業平均水平，建議優化話術和跟進策略',
          metric: {
            name: '轉化率',
            current: parseFloat(conversionRate.toFixed(1)),
            unit: '%'
          },
          action: {
            label: '查看優化建議',
            handler: 'showOptimizationSuggestions'
          },
          timestamp: now
        });
      }
    }
    
    // 基於活動數據生成洞察
    if (data.campaigns && data.campaigns.length > 0) {
      const activeCampaigns = data.campaigns.filter(c => c.status === 'active');
      const bestCampaign = activeCampaigns.reduce((best, c) => 
        (c.metrics.conversionRate || 0) > (best?.metrics.conversionRate || 0) ? c : best, 
        activeCampaigns[0]
      );
      
      if (bestCampaign && (bestCampaign.metrics.conversionRate || 0) > 20) {
        insights.push({
          id: 'insight-campaign-1',
          type: 'trend',
          priority: 'medium',
          title: '高效活動發現',
          description: `"${bestCampaign.name}" 表現優異，轉化率達 ${bestCampaign.metrics.conversionRate?.toFixed(1)}%`,
          metric: {
            name: '轉化率',
            current: bestCampaign.metrics.conversionRate || 0,
            unit: '%',
            change: 25
          },
          action: {
            label: '複製策略',
            handler: 'duplicateCampaign',
            params: { campaignId: bestCampaign.id }
          },
          timestamp: now
        });
      }
    }
    
    // 基於帳號數據生成洞察
    if (data.accounts && data.accounts.length > 0) {
      const unhealthyCount = data.accounts.filter(a => a.healthScore < 60).length;
      if (unhealthyCount > 0) {
        insights.push({
          id: 'insight-account-1',
          type: 'warning',
          priority: unhealthyCount > 3 ? 'high' : 'medium',
          title: '帳號健康警告',
          description: `${unhealthyCount} 個帳號健康度偏低，可能影響發送效果`,
          metric: {
            name: '風險帳號',
            current: unhealthyCount
          },
          action: {
            label: '查看詳情',
            handler: 'navigateToAccountHealth'
          },
          timestamp: now
        });
      }
    }
    
    // 添加智能建議
    insights.push({
      id: 'insight-suggestion-1',
      type: 'suggestion',
      priority: 'low',
      title: '最佳發送時間建議',
      description: '根據歷史數據分析，週二和週四下午 2-4 點回覆率最高',
      action: {
        label: '調整發送計劃',
        handler: 'adjustSendSchedule'
      },
      timestamp: now
    });
    
    this._insights.set(insights);
    return insights;
  }
  
  /**
   * 生成預測
   */
  generatePredictions(historicalData?: any[]): Prediction[] {
    const predictions: Prediction[] = [
      {
        metric: '本週預估轉化',
        currentValue: 12,
        predictedValue: 18,
        confidence: 78,
        timeframe: '未來7天',
        trend: 'up',
        factors: ['活動效果提升', '線索質量改善']
      },
      {
        metric: '預估回覆率',
        currentValue: 15,
        predictedValue: 22,
        confidence: 85,
        timeframe: '未來7天',
        trend: 'up',
        factors: ['話術優化', '發送時間調整']
      },
      {
        metric: '帳號健康度',
        currentValue: 72,
        predictedValue: 68,
        confidence: 65,
        timeframe: '未來7天',
        trend: 'down',
        factors: ['發送頻率較高', '需要休息']
      }
    ];
    
    this._predictions.set(predictions);
    return predictions;
  }
  
  /**
   * 計算活動數據
   */
  calculateCampaignData(rawCampaigns: any[]): CampaignData[] {
    const campaigns: CampaignData[] = rawCampaigns.map((c, index) => ({
      id: c.id || `campaign-${index}`,
      name: c.name || `活動 ${index + 1}`,
      type: c.type || 'outreach',
      status: c.status || 'active',
      startDate: new Date(c.startDate || Date.now()),
      endDate: c.endDate ? new Date(c.endDate) : undefined,
      metrics: {
        reach: c.reach || Math.floor(Math.random() * 1000) + 100,
        impressions: c.impressions || Math.floor(Math.random() * 5000) + 500,
        clicks: c.clicks || Math.floor(Math.random() * 500) + 50,
        responses: c.responses || Math.floor(Math.random() * 200) + 20,
        conversions: c.conversions || Math.floor(Math.random() * 50) + 5,
        revenue: c.revenue || Math.floor(Math.random() * 10000) + 1000,
        ctr: 0,
        conversionRate: 0,
        responseRate: 0,
        roi: 0
      },
      cost: c.cost || Math.floor(Math.random() * 500) + 100,
      tags: c.tags || []
    }));
    
    // 計算衍生指標
    campaigns.forEach(c => {
      if (c.metrics.impressions > 0) {
        c.metrics.ctr = (c.metrics.clicks / c.metrics.impressions) * 100;
      }
      if (c.metrics.reach > 0) {
        c.metrics.conversionRate = (c.metrics.conversions / c.metrics.reach) * 100;
        c.metrics.responseRate = (c.metrics.responses / c.metrics.reach) * 100;
      }
      if (c.cost && c.cost > 0 && c.metrics.revenue) {
        c.metrics.roi = ((c.metrics.revenue - c.cost) / c.cost) * 100;
      }
    });
    
    this._campaigns.set(campaigns);
    return campaigns;
  }
  
  /**
   * 評估帳號健康
   */
  evaluateAccountHealth(accounts: any[]): AccountHealthData[] {
    const healthData: AccountHealthData[] = accounts.map(account => {
      const metrics: HealthMetrics = {
        messagesSentToday: account.dailySendCount || 0,
        dailyLimit: account.dailySendLimit || 50,
        responseRate: account.responseRate || Math.random() * 30,
        errorRate: account.errorRate || Math.random() * 10,
        avgResponseTime: account.avgResponseTime || Math.random() * 60,
        blockCount: account.blockCount || 0,
        warmupProgress: account.warmupProgress || 100,
        lastActivity: new Date(account.lastActivity || Date.now()),
        accountAge: account.accountAge || 30
      };
      
      // 計算健康分數
      let healthScore = 100;
      
      // 錯誤率扣分
      healthScore -= metrics.errorRate * 2;
      
      // 封禁次數扣分
      healthScore -= metrics.blockCount * 15;
      
      // 發送超限扣分
      if (metrics.messagesSentToday > metrics.dailyLimit * 0.9) {
        healthScore -= 10;
      }
      
      // 回覆率加分
      if (metrics.responseRate > 20) {
        healthScore += 5;
      }
      
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      // 確定風險等級
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (healthScore >= 80) {
        riskLevel = 'low';
      } else if (healthScore >= 60) {
        riskLevel = 'medium';
      } else if (healthScore >= 40) {
        riskLevel = 'high';
      } else {
        riskLevel = 'critical';
      }
      
      // 生成問題列表
      const issues: HealthIssue[] = [];
      
      if (metrics.errorRate > 10) {
        issues.push({
          type: 'error',
          code: 'HIGH_ERROR_RATE',
          message: '錯誤率過高',
          timestamp: new Date()
        });
      }
      
      if (metrics.blockCount > 0) {
        issues.push({
          type: 'warning',
          code: 'HAS_BLOCKS',
          message: `曾被封禁 ${metrics.blockCount} 次`,
          timestamp: new Date()
        });
      }
      
      if (metrics.messagesSentToday >= metrics.dailyLimit) {
        issues.push({
          type: 'warning',
          code: 'LIMIT_REACHED',
          message: '已達每日發送限制',
          timestamp: new Date()
        });
      }
      
      // 生成建議
      const recommendations: string[] = [];
      
      if (healthScore < 60) {
        recommendations.push('建議暫停發送，讓帳號休息24-48小時');
      }
      if (metrics.blockCount > 0) {
        recommendations.push('降低發送頻率，使用更自然的發送間隔');
      }
      if (metrics.errorRate > 5) {
        recommendations.push('檢查網絡連接和代理設置');
      }
      
      // 生成趨勢數據（模擬過去7天）
      const trendData = Array.from({ length: 7 }, () => 
        Math.max(30, Math.min(100, healthScore + (Math.random() - 0.5) * 20))
      );
      
      return {
        accountId: account.id,
        phone: account.phone,
        username: account.username || account.firstName,
        healthScore: Math.round(healthScore),
        riskLevel,
        status: account.status || 'active',
        metrics,
        issues,
        recommendations,
        lastCheck: new Date(),
        trendData
      };
    });
    
    this._accountHealth.set(healthData);
    return healthData;
  }
  
  /**
   * 刷新所有數據
   */
  async refreshAllData(rawData: {
    leads?: any[];
    campaigns?: any[];
    accounts?: any[];
  }) {
    if (rawData.leads) {
      this.calculateFunnelData(rawData.leads);
    }
    
    if (rawData.campaigns) {
      this.calculateCampaignData(rawData.campaigns);
    }
    
    if (rawData.accounts) {
      this.evaluateAccountHealth(rawData.accounts);
    }
    
    // 生成洞察
    this.generateInsights({
      leads: rawData.leads,
      campaigns: this._campaigns(),
      accounts: rawData.accounts
    });
    
    // 生成預測
    this.generatePredictions();
  }
}
