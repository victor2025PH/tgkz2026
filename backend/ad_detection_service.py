"""
廣告號識別服務 - Ad Detection Service
識別群組中的廣告號/營銷號，過濾低質量用戶

功能：
- 基於多維度規則識別廣告號
- 計算用戶風險評分
- 自動分類用戶價值等級
- 支持自定義識別規則
"""
import sys
import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class RiskLevel(Enum):
    """風險等級"""
    SAFE = "safe"           # 安全 (0-20%)
    LOW = "low"             # 低風險 (20-40%)
    MEDIUM = "medium"       # 中風險 (40-60%)
    HIGH = "high"           # 高風險 (60-80%)
    CONFIRMED = "confirmed" # 確認廣告號 (80-100%)


class ValueLevel(Enum):
    """價值等級"""
    S = "S"  # 最高價值
    A = "A"  # 高價值
    B = "B"  # 中等價值
    C = "C"  # 低價值
    D = "D"  # 極低價值


@dataclass
class RiskFactor:
    """風險因素"""
    name: str
    category: str  # profile, behavior, content
    score: float
    weight: float
    description: str


@dataclass
class AdDetectionResult:
    """廣告檢測結果"""
    telegram_id: str
    risk_score: float
    risk_level: str
    value_level: str
    risk_factors: List[Dict]
    is_likely_ad: bool
    suggestion: str


class AdDetectionService:
    """廣告號識別服務"""
    
    def __init__(self):
        self._db = None
        
        # ==================== 廣告關鍵詞庫 ====================
        self.ad_keywords = {
            # 高風險詞彙 (權重 0.2)
            'high_risk': [
                '日入過萬', '躺賺', '零成本', '高回報', '穩賺', '保本', '包賺',
                '免費領取', '限時優惠', '錯過後悔', '最後機會', '名額有限',
                '招代理', '招商加盟', '誠招', '合作共贏', '招募',
                '掛機賺錢', '零擼', '羊毛', '套利', '空投',
                '日賺', '月入', '年入', '輕鬆賺', '躺著賺',
                '100%', '絕對', '保證', '穩定收益',
            ],
            # 中風險詞彙 (權重 0.1)
            'medium_risk': [
                '加微信', '加V', '加我', '私我', '詳聊', '私聊了解',
                '接單', '推廣', '引流', '獲客', '拉新',
                '合作', '項目', '機會', '資源',
                '代理', '返傭', '分成', '提成',
                '賺錢', '收益', '利潤', '回報',
            ],
            # 低風險詞彙 (權重 0.05)
            'low_risk': [
                'dd', 'DD', '滴滴', '私', '聊',
                '有興趣', '想了解', '怎麼做',
            ]
        }
        
        # 聯繫方式正則
        self.contact_patterns = [
            r'微信[：:\s]*[\w\d_-]{5,20}',
            r'wx[：:\s]*[\w\d_-]{5,20}',
            r'weixin[：:\s]*[\w\d_-]{5,20}',
            r'[Vv]信[：:\s]*[\w\d_-]{5,20}',
            r'[Qq][Qq]?[：:\s]*\d{5,12}',
            r'\d{11}',  # 手機號
            r'@\w{3,30}',  # Telegram username
            r't\.me/\w+',  # Telegram 鏈接
        ]
        
        # URL 正則
        self.url_pattern = re.compile(
            r'https?://[^\s<>"{}|\\^`\[\]]+|'
            r'www\.[^\s<>"{}|\\^`\[\]]+'
        )
        
        # 規則權重配置
        self.weights = {
            'profile': 0.3,   # 基礎特徵權重
            'behavior': 0.4,  # 行為特徵權重
            'content': 0.3,   # 內容特徵權重
        }
    
    def set_database(self, db):
        """設置數據庫實例"""
        self._db = db
    
    # ==================== 基礎特徵識別 ====================
    
    def analyze_profile(self, user: Dict) -> Tuple[float, List[RiskFactor]]:
        """
        分析用戶個人資料特徵
        
        Returns:
            (風險分數, 風險因素列表)
        """
        factors = []
        
        # 無頭像
        if not user.get('has_photo'):
            factors.append(RiskFactor(
                name='no_photo',
                category='profile',
                score=0.10,
                weight=self.weights['profile'],
                description='無頭像'
            ))
        
        # 無用戶名
        if not user.get('username'):
            factors.append(RiskFactor(
                name='no_username',
                category='profile',
                score=0.05,
                weight=self.weights['profile'],
                description='無用戶名'
            ))
        
        # 無個人簡介
        if not user.get('bio'):
            factors.append(RiskFactor(
                name='no_bio',
                category='profile',
                score=0.05,
                weight=self.weights['profile'],
                description='無個人簡介'
            ))
        
        # 名字包含過多表情符號
        name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        emoji_count = len(re.findall(r'[\U0001F300-\U0001F9FF]', name))
        if emoji_count >= 3:
            factors.append(RiskFactor(
                name='emoji_name',
                category='profile',
                score=0.05,
                weight=self.weights['profile'],
                description='名字表情符號過多'
            ))
        
        # 名字是純數字或數字+字母組合（如 user123456）
        if re.match(r'^[a-zA-Z]*\d{4,}[a-zA-Z]*$', name.replace(' ', '')):
            factors.append(RiskFactor(
                name='generic_name',
                category='profile',
                score=0.05,
                weight=self.weights['profile'],
                description='名字為通用格式'
            ))
        
        # 是 Bot
        if user.get('is_bot'):
            factors.append(RiskFactor(
                name='is_bot',
                category='profile',
                score=0.30,
                weight=self.weights['profile'],
                description='是機器人帳號'
            ))
        
        # 計算分數
        total_score = sum(f.score * f.weight for f in factors)
        return total_score, factors
    
    # ==================== 行為特徵識別 ====================
    
    def analyze_behavior(self, user: Dict, messages: List[Dict] = None) -> Tuple[float, List[RiskFactor]]:
        """
        分析用戶行為特徵
        
        Args:
            user: 用戶信息
            messages: 用戶的消息列表
            
        Returns:
            (風險分數, 風險因素列表)
        """
        factors = []
        messages = messages or []
        
        # 消息數量過少（可能是新來的廣告號）
        message_count = user.get('message_count', len(messages))
        if message_count == 1:
            factors.append(RiskFactor(
                name='single_message',
                category='behavior',
                score=0.05,
                weight=self.weights['behavior'],
                description='只發送過一條消息'
            ))
        
        # 多群發送相同內容
        if messages and len(messages) >= 3:
            # 檢查內容相似度
            unique_contents = set()
            for msg in messages:
                text = msg.get('message_text', '')[:100]  # 取前100字符比較
                unique_contents.add(text)
            
            similarity_ratio = 1 - (len(unique_contents) / len(messages))
            if similarity_ratio > 0.7:
                factors.append(RiskFactor(
                    name='repeated_content',
                    category='behavior',
                    score=0.15,
                    weight=self.weights['behavior'],
                    description='重複發送相同內容'
                ))
        
        # 首次發言就帶聯繫方式（需要消息內容）
        if messages:
            first_message = messages[-1] if messages else {}  # 最早的消息
            if first_message.get('contains_contact'):
                factors.append(RiskFactor(
                    name='first_message_contact',
                    category='behavior',
                    score=0.10,
                    weight=self.weights['behavior'],
                    description='首次發言包含聯繫方式'
                ))
        
        # 從不回覆他人（只發不互動）- 這個需要更多上下文，暫時跳過
        
        # 計算分數
        total_score = sum(f.score * f.weight for f in factors)
        return total_score, factors
    
    # ==================== 內容特徵識別 ====================
    
    def analyze_content(self, message_text: str) -> Tuple[float, List[RiskFactor], Dict]:
        """
        分析消息內容特徵
        
        Returns:
            (風險分數, 風險因素列表, 分析詳情)
        """
        factors = []
        details = {
            'contains_link': False,
            'contains_contact': False,
            'ad_keywords_matched': [],
            'content_risk_score': 0
        }
        
        if not message_text:
            return 0, factors, details
        
        text = message_text.lower()
        
        # 檢查是否包含鏈接
        if self.url_pattern.search(message_text):
            details['contains_link'] = True
            factors.append(RiskFactor(
                name='contains_link',
                category='content',
                score=0.05,
                weight=self.weights['content'],
                description='包含外部鏈接'
            ))
        
        # 檢查是否包含聯繫方式
        for pattern in self.contact_patterns:
            if re.search(pattern, message_text, re.IGNORECASE):
                details['contains_contact'] = True
                factors.append(RiskFactor(
                    name='contains_contact',
                    category='content',
                    score=0.10,
                    weight=self.weights['content'],
                    description='包含聯繫方式'
                ))
                break
        
        # 檢查廣告關鍵詞
        matched_keywords = []
        
        # 高風險詞
        for kw in self.ad_keywords['high_risk']:
            if kw.lower() in text:
                matched_keywords.append({'keyword': kw, 'level': 'high'})
                factors.append(RiskFactor(
                    name=f'keyword_high_{kw}',
                    category='content',
                    score=0.20,
                    weight=self.weights['content'],
                    description=f'包含高風險詞彙: {kw}'
                ))
        
        # 中風險詞
        for kw in self.ad_keywords['medium_risk']:
            if kw.lower() in text:
                matched_keywords.append({'keyword': kw, 'level': 'medium'})
                if len([f for f in factors if 'keyword_medium' in f.name]) < 3:  # 限制累加
                    factors.append(RiskFactor(
                        name=f'keyword_medium_{kw}',
                        category='content',
                        score=0.10,
                        weight=self.weights['content'],
                        description=f'包含中風險詞彙: {kw}'
                    ))
        
        # 低風險詞
        for kw in self.ad_keywords['low_risk']:
            if kw.lower() in text:
                matched_keywords.append({'keyword': kw, 'level': 'low'})
        
        details['ad_keywords_matched'] = matched_keywords
        
        # 消息過長（可能是推廣文案）
        if len(message_text) > 500:
            factors.append(RiskFactor(
                name='long_message',
                category='content',
                score=0.05,
                weight=self.weights['content'],
                description='消息過長（可能是推廣文案）'
            ))
        
        # 計算分數
        total_score = sum(f.score * f.weight for f in factors)
        details['content_risk_score'] = min(1.0, total_score)
        
        return total_score, factors, details
    
    # ==================== 綜合評分 ====================
    
    def calculate_risk_score(
        self,
        user: Dict,
        messages: List[Dict] = None,
        current_message: str = None
    ) -> AdDetectionResult:
        """
        計算用戶綜合風險評分
        
        Args:
            user: 用戶信息
            messages: 歷史消息列表
            current_message: 當前消息內容
            
        Returns:
            AdDetectionResult 檢測結果
        """
        all_factors = []
        total_score = 0
        
        # 1. 分析個人資料
        profile_score, profile_factors = self.analyze_profile(user)
        total_score += profile_score
        all_factors.extend(profile_factors)
        
        # 2. 分析行為特徵
        behavior_score, behavior_factors = self.analyze_behavior(user, messages)
        total_score += behavior_score
        all_factors.extend(behavior_factors)
        
        # 3. 分析當前消息內容
        if current_message:
            content_score, content_factors, _ = self.analyze_content(current_message)
            total_score += content_score
            all_factors.extend(content_factors)
        
        # 4. 分析歷史消息內容
        if messages:
            for msg in messages[:5]:  # 只分析最近5條
                msg_text = msg.get('message_text', '')
                if msg_text:
                    content_score, content_factors, _ = self.analyze_content(msg_text)
                    total_score += content_score * 0.5  # 歷史消息權重減半
                    all_factors.extend(content_factors)
        
        # 限制最高分為 1.0
        total_score = min(1.0, total_score)
        
        # 確定風險等級
        if total_score < 0.2:
            risk_level = RiskLevel.SAFE.value
        elif total_score < 0.4:
            risk_level = RiskLevel.LOW.value
        elif total_score < 0.6:
            risk_level = RiskLevel.MEDIUM.value
        elif total_score < 0.8:
            risk_level = RiskLevel.HIGH.value
        else:
            risk_level = RiskLevel.CONFIRMED.value
        
        # 確定價值等級
        value_level = self._calculate_value_level(user, total_score)
        
        # 生成建議
        suggestion = self._generate_suggestion(risk_level, all_factors)
        
        # 轉換因素為字典
        factors_dict = [
            {
                'name': f.name,
                'category': f.category,
                'score': f.score,
                'description': f.description
            }
            for f in all_factors
        ]
        
        return AdDetectionResult(
            telegram_id=str(user.get('telegram_id', '')),
            risk_score=round(total_score, 3),
            risk_level=risk_level,
            value_level=value_level,
            risk_factors=factors_dict,
            is_likely_ad=total_score >= 0.6,
            suggestion=suggestion
        )
    
    def _calculate_value_level(self, user: Dict, risk_score: float) -> str:
        """計算價值等級"""
        # 高風險用戶直接降級
        if risk_score >= 0.6:
            return ValueLevel.D.value
        
        # 活躍度評分
        activity = user.get('activity_score', 0.5)
        message_count = user.get('message_count', 0)
        
        # 調整活躍度
        if message_count >= 10:
            activity += 0.1
        if user.get('is_premium'):
            activity += 0.1
        if user.get('username'):
            activity += 0.05
        
        # 綜合評估
        combined_score = activity * (1 - risk_score)
        
        if combined_score >= 0.8 and risk_score < 0.1:
            return ValueLevel.S.value
        elif combined_score >= 0.6 and risk_score < 0.2:
            return ValueLevel.A.value
        elif combined_score >= 0.4 and risk_score < 0.4:
            return ValueLevel.B.value
        elif risk_score < 0.6:
            return ValueLevel.C.value
        else:
            return ValueLevel.D.value
    
    def _generate_suggestion(self, risk_level: str, factors: List[RiskFactor]) -> str:
        """生成處理建議"""
        if risk_level == RiskLevel.SAFE.value:
            return "正常用戶，可直接接觸"
        elif risk_level == RiskLevel.LOW.value:
            return "輕微可疑特徵，建議觀察後再接觸"
        elif risk_level == RiskLevel.MEDIUM.value:
            return "多個可疑特徵，建議謹慎接觸"
        elif risk_level == RiskLevel.HIGH.value:
            return "疑似廣告號，建議不要主動接觸"
        else:
            return "已確認為廣告號，建議加入黑名單"
    
    # ==================== 消息處理入口 ====================
    
    async def process_message(
        self,
        user_data: Dict,
        message_text: str,
        group_id: str,
        group_name: str
    ) -> Dict:
        """
        處理新消息，收集用戶並分析
        
        Args:
            user_data: 用戶數據
            message_text: 消息內容
            group_id: 群組 ID
            group_name: 群組名稱
            
        Returns:
            處理結果
        """
        if not self._db:
            from database import db
            self._db = db
        
        telegram_id = str(user_data.get('id', user_data.get('telegram_id', '')))
        if not telegram_id:
            return {'success': False, 'error': 'No telegram_id'}
        
        try:
            # 1. 分析消息內容
            content_score, content_factors, content_details = self.analyze_content(message_text)
            
            # 2. 保存/更新用戶
            user_record = {
                'telegram_id': telegram_id,
                'username': user_data.get('username', ''),
                'first_name': user_data.get('first_name', ''),
                'last_name': user_data.get('last_name', ''),
                'bio': user_data.get('bio', ''),
                'has_photo': bool(user_data.get('photo')),
                'is_premium': user_data.get('is_premium', False),
                'is_verified': user_data.get('is_verified', False),
                'is_bot': user_data.get('is_bot', False),
                'source_groups': [group_id],
                'collected_by': user_data.get('collected_by', ''),
                'last_message_at': datetime.now().isoformat()
            }
            
            await self._db.upsert_collected_user(user_record)
            
            # 3. 保存消息樣本
            await self._db.add_user_message_sample(
                telegram_id=telegram_id,
                group_id=group_id,
                group_name=group_name,
                message_text=message_text,
                analysis=content_details
            )
            
            # 4. 獲取用戶歷史消息
            messages = await self._db.get_user_message_samples(telegram_id, limit=10)
            
            # 5. 計算綜合風險評分
            result = self.calculate_risk_score(
                user=user_record,
                messages=messages,
                current_message=message_text
            )
            
            # 6. 更新用戶風險評分
            await self._db.update_user_risk_score(
                telegram_id=telegram_id,
                risk_score=result.risk_score,
                risk_factors={'factors': result.risk_factors},
                value_level=result.value_level
            )
            
            return {
                'success': True,
                'telegram_id': telegram_id,
                'risk_score': result.risk_score,
                'risk_level': result.risk_level,
                'value_level': result.value_level,
                'is_likely_ad': result.is_likely_ad
            }
            
        except Exception as e:
            print(f"[AdDetection] Error processing message: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return {'success': False, 'error': str(e)}


# 創建全局實例
ad_detection_service = AdDetectionService()
