"""
帳號 ROI 分析系統
Account ROI Analysis

功能:
1. 計算每個帳號的投入產出比
2. 帳號效率評估
3. 成本效益分析
4. 帳號表現排名
"""

import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict


@dataclass
class AccountMetrics:
    """帳號指標"""
    phone: str
    account_name: str = ""
    
    # 投入指標
    messages_sent: int = 0
    messages_failed: int = 0
    active_hours: float = 0.0
    
    # 產出指標
    leads_contacted: int = 0
    leads_replied: int = 0
    leads_converted: int = 0
    revenue_generated: float = 0.0
    
    # 效率指標
    @property
    def send_success_rate(self) -> float:
        total = self.messages_sent + self.messages_failed
        return self.messages_sent / total if total > 0 else 0
    
    @property
    def reply_rate(self) -> float:
        return self.leads_replied / self.leads_contacted if self.leads_contacted > 0 else 0
    
    @property
    def conversion_rate(self) -> float:
        return self.leads_converted / self.leads_contacted if self.leads_contacted > 0 else 0
    
    @property
    def revenue_per_message(self) -> float:
        return self.revenue_generated / self.messages_sent if self.messages_sent > 0 else 0
    
    @property
    def messages_per_conversion(self) -> float:
        return self.messages_sent / self.leads_converted if self.leads_converted > 0 else float('inf')
    
    @property
    def efficiency_score(self) -> float:
        """綜合效率分數 (0-100)"""
        # 加權計算
        send_score = self.send_success_rate * 25
        reply_score = min(self.reply_rate * 100, 25)  # 最高 25 分
        conv_score = min(self.conversion_rate * 200, 30)  # 最高 30 分
        activity_score = min(self.active_hours / 24 * 20, 20)  # 最高 20 分
        
        return send_score + reply_score + conv_score + activity_score


@dataclass
class AccountROI:
    """帳號 ROI"""
    phone: str
    account_name: str
    metrics: AccountMetrics
    
    # 成本（假設或配置）
    estimated_cost: float = 0.0  # 帳號成本
    
    @property
    def roi(self) -> float:
        """投資回報率"""
        if self.estimated_cost <= 0:
            return float('inf') if self.metrics.revenue_generated > 0 else 0
        return (self.metrics.revenue_generated - self.estimated_cost) / self.estimated_cost * 100
    
    @property
    def roi_status(self) -> str:
        """ROI 狀態"""
        if self.roi >= 100:
            return "excellent"  # 優秀
        elif self.roi >= 50:
            return "good"       # 良好
        elif self.roi >= 0:
            return "break_even" # 持平
        else:
            return "loss"       # 虧損


class AccountROIAnalyzer:
    """帳號 ROI 分析器"""
    
    def __init__(self, database=None):
        self.database = database
        self.account_metrics: Dict[str, AccountMetrics] = {}
        self.default_account_cost = 10.0  # 默認帳號成本
        self.default_conversion_value = 100.0  # 默認轉化價值
    
    def set_database(self, database):
        """設置數據庫"""
        self.database = database
    
    def record_message_sent(self, phone: str, success: bool = True):
        """記錄消息發送"""
        if phone not in self.account_metrics:
            self.account_metrics[phone] = AccountMetrics(phone=phone)
        
        metrics = self.account_metrics[phone]
        if success:
            metrics.messages_sent += 1
        else:
            metrics.messages_failed += 1
    
    def record_lead_contacted(self, phone: str):
        """記錄聯繫 Lead"""
        if phone not in self.account_metrics:
            self.account_metrics[phone] = AccountMetrics(phone=phone)
        
        self.account_metrics[phone].leads_contacted += 1
    
    def record_lead_replied(self, phone: str):
        """記錄 Lead 回覆"""
        if phone not in self.account_metrics:
            self.account_metrics[phone] = AccountMetrics(phone=phone)
        
        self.account_metrics[phone].leads_replied += 1
    
    def record_conversion(self, phone: str, value: float = None):
        """記錄轉化"""
        if phone not in self.account_metrics:
            self.account_metrics[phone] = AccountMetrics(phone=phone)
        
        metrics = self.account_metrics[phone]
        metrics.leads_converted += 1
        metrics.revenue_generated += value if value else self.default_conversion_value
    
    def record_active_time(self, phone: str, hours: float):
        """記錄活躍時間"""
        if phone not in self.account_metrics:
            self.account_metrics[phone] = AccountMetrics(phone=phone)
        
        self.account_metrics[phone].active_hours += hours
    
    async def load_from_database(self):
        """從數據庫加載數據"""
        if not self.database:
            return
        
        try:
            accounts = await self.database.get_all_accounts()
            
            for acc in accounts:
                phone = acc.get('phone', '')
                if not phone:
                    continue
                
                if phone not in self.account_metrics:
                    self.account_metrics[phone] = AccountMetrics(phone=phone)
                
                metrics = self.account_metrics[phone]
                metrics.account_name = acc.get('username') or acc.get('first_name') or phone
                metrics.messages_sent = acc.get('daily_send_count', 0) or acc.get('sent_today', 0)
        
        except Exception as e:
            print(f"[AccountROI] 加載數據錯誤: {e}", file=sys.stderr)
    
    def get_account_roi(self, phone: str) -> Optional[AccountROI]:
        """獲取單個帳號的 ROI"""
        metrics = self.account_metrics.get(phone)
        if not metrics:
            return None
        
        return AccountROI(
            phone=phone,
            account_name=metrics.account_name,
            metrics=metrics,
            estimated_cost=self.default_account_cost
        )
    
    def get_all_account_roi(self) -> List[AccountROI]:
        """獲取所有帳號的 ROI"""
        rois = []
        for phone, metrics in self.account_metrics.items():
            rois.append(AccountROI(
                phone=phone,
                account_name=metrics.account_name,
                metrics=metrics,
                estimated_cost=self.default_account_cost
            ))
        return rois
    
    def get_ranking(self, by: str = "efficiency") -> List[Dict[str, Any]]:
        """獲取帳號排名"""
        rois = self.get_all_account_roi()
        
        if by == "efficiency":
            rois.sort(key=lambda r: r.metrics.efficiency_score, reverse=True)
        elif by == "roi":
            rois.sort(key=lambda r: r.roi if r.roi != float('inf') else 9999, reverse=True)
        elif by == "conversions":
            rois.sort(key=lambda r: r.metrics.leads_converted, reverse=True)
        elif by == "revenue":
            rois.sort(key=lambda r: r.metrics.revenue_generated, reverse=True)
        elif by == "reply_rate":
            rois.sort(key=lambda r: r.metrics.reply_rate, reverse=True)
        
        return [
            {
                "rank": i + 1,
                "phone": r.phone,
                "accountName": r.metrics.account_name,
                "messagesSent": r.metrics.messages_sent,
                "leadsContacted": r.metrics.leads_contacted,
                "leadsReplied": r.metrics.leads_replied,
                "leadsConverted": r.metrics.leads_converted,
                "revenueGenerated": round(r.metrics.revenue_generated, 2),
                "replyRate": round(r.metrics.reply_rate * 100, 1),
                "conversionRate": round(r.metrics.conversion_rate * 100, 1),
                "efficiencyScore": round(r.metrics.efficiency_score, 1),
                "roi": round(r.roi, 1) if r.roi != float('inf') else "∞",
                "roiStatus": r.roi_status
            }
            for i, r in enumerate(rois)
        ]
    
    def get_summary(self) -> Dict[str, Any]:
        """獲取總結統計"""
        rois = self.get_all_account_roi()
        
        if not rois:
            return {
                "totalAccounts": 0,
                "totalMessagesSent": 0,
                "totalLeadsContacted": 0,
                "totalConversions": 0,
                "totalRevenue": 0,
                "avgEfficiency": 0,
                "avgROI": 0,
                "topPerformer": None,
                "needsImprovement": []
            }
        
        total_messages = sum(r.metrics.messages_sent for r in rois)
        total_contacted = sum(r.metrics.leads_contacted for r in rois)
        total_conversions = sum(r.metrics.leads_converted for r in rois)
        total_revenue = sum(r.metrics.revenue_generated for r in rois)
        avg_efficiency = sum(r.metrics.efficiency_score for r in rois) / len(rois)
        
        valid_rois = [r.roi for r in rois if r.roi != float('inf')]
        avg_roi = sum(valid_rois) / len(valid_rois) if valid_rois else 0
        
        # 排序找最佳和需改進
        sorted_by_eff = sorted(rois, key=lambda r: r.metrics.efficiency_score, reverse=True)
        top_performer = sorted_by_eff[0] if sorted_by_eff else None
        needs_improvement = [r for r in sorted_by_eff if r.metrics.efficiency_score < 30]
        
        return {
            "totalAccounts": len(rois),
            "totalMessagesSent": total_messages,
            "totalLeadsContacted": total_contacted,
            "totalConversions": total_conversions,
            "totalRevenue": round(total_revenue, 2),
            "avgEfficiency": round(avg_efficiency, 1),
            "avgROI": round(avg_roi, 1),
            "topPerformer": {
                "phone": top_performer.phone,
                "name": top_performer.metrics.account_name,
                "efficiency": round(top_performer.metrics.efficiency_score, 1)
            } if top_performer else None,
            "needsImprovement": [
                {"phone": r.phone, "name": r.metrics.account_name, "efficiency": round(r.metrics.efficiency_score, 1)}
                for r in needs_improvement[:3]
            ]
        }


# 全局實例
_roi_analyzer = None

def get_roi_analyzer() -> AccountROIAnalyzer:
    """獲取全局 ROI 分析器"""
    global _roi_analyzer
    if _roi_analyzer is None:
        _roi_analyzer = AccountROIAnalyzer()
    return _roi_analyzer


async def analyze_account_roi(rank_by: str = "efficiency") -> Dict[str, Any]:
    """分析帳號 ROI（異步接口）"""
    analyzer = get_roi_analyzer()
    await analyzer.load_from_database()
    
    return {
        "summary": analyzer.get_summary(),
        "ranking": analyzer.get_ranking(rank_by)
    }
