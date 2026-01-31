"""
AI Response Quality Checker
AI 回復質量檢查器 - 評估回復質量並決定是否需要重新生成
"""
from typing import Dict, Any, Optional
import re


class AIQualityChecker:
    """AI 回復質量檢查器"""
    
    def __init__(self):
        # 敏感詞列表（可配置）
        self.sensitive_words = [
            '違法', '詐騙', '欺騙', '假', '騙', '非法',
            'illegal', 'fraud', 'scam', 'fake'
        ]
        
        # 質量閾值配置
        self.thresholds = {
            'min_length': 10,      # 最短長度
            'max_length': 500,     # 最長長度
            'min_score': 0.7       # 最低質量分數
        }
    
    async def check_quality(
        self, 
        response: str, 
        context: Dict[str, Any],
        original_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        檢查回復質量
        
        Args:
            response: AI 生成的回復
            context: 上下文信息
            original_message: 原始用戶消息（用於相關性檢查）
            
        Returns:
            質量評估結果
        """
        checks = {
            'length_appropriate': self._check_length(response),
            'no_sensitive_words': self._check_sensitive_words(response),
            'relevant': await self._check_relevance(response, original_message),
            'tone_appropriate': self._check_tone(response),
            'not_empty': bool(response and response.strip()),
            'has_content': len(response.strip()) > 5,
        }
        
        # 計算質量分數（0-1）
        score = sum(checks.values()) / len(checks)
        
        # 檢查是否需要重新生成
        should_regenerate = score < self.thresholds['min_score']
        
        # 獲取問題詳情
        issues = []
        if not checks['length_appropriate']:
            issues.append(f"長度不合適（{len(response)} 字）")
        if not checks['no_sensitive_words']:
            issues.append("包含敏感詞")
        if not checks['relevant']:
            issues.append("與原始消息相關性低")
        if not checks['tone_appropriate']:
            issues.append("語氣不合適")
        if not checks['not_empty']:
            issues.append("回復為空")
        if not checks['has_content']:
            issues.append("內容過短")
        
        return {
            'quality_score': round(score, 2),
            'should_regenerate': should_regenerate,
            'checks': checks,
            'issues': issues,
            'threshold_met': score >= self.thresholds['min_score']
        }
    
    def _check_length(self, response: str) -> bool:
        """檢查長度是否合適"""
        length = len(response)
        return self.thresholds['min_length'] <= length <= self.thresholds['max_length']
    
    def _check_sensitive_words(self, response: str) -> bool:
        """檢查是否包含敏感詞"""
        response_lower = response.lower()
        for word in self.sensitive_words:
            if word in response_lower:
                return False
        return True
    
    async def _check_relevance(
        self, 
        response: str, 
        original_message: Optional[str]
    ) -> bool:
        """檢查與原始消息的相關性"""
        if not original_message:
            return True  # 如果沒有原始消息，無法檢查相關性
        
        original_lower = original_message.lower()
        response_lower = response.lower()
        
        # 🔧 FIX: 新增問題回答檢查
        # 如果用戶在問問題，回復不應該也是問句
        question_indicators = ['什么', '什麼', '怎么', '怎麼', '吗', '嗎', '哪', '谁', '誰', '多少', '为什么', '為什麼', '?', '？']
        user_asking = any(q in original_lower for q in question_indicators)
        
        if user_asking:
            # 用戶在問問題，檢查回復是否也是問句（不好的模式）
            response_also_question = response.strip().endswith('?') or response.strip().endswith('？')
            # 如果回復主要是反問，且很短，這是不好的
            if response_also_question and len(response) < 30:
                return False
        
        # 🔧 FIX: 檢查常見的答非所問模式
        evasive_patterns = [
            '我想知道你', '告訴我你', '你最近', '趣事', '你有什么感興趣',
            '有什麼我可以幫助', '需要什麼幫助'
        ]
        for pattern in evasive_patterns:
            if pattern in response_lower and pattern not in original_lower:
                # 回復中有這些模式但用戶沒有問這些，可能是答非所問
                return False
        
        # 🔧 FIX: 如果用戶問"你有什么"類問題，回復應該包含業務信息
        if '你有' in original_lower or '有什么' in original_lower or '有什麼' in original_lower:
            # 應該回復業務相關內容
            business_keywords = ['支付', '付款', '兌換', '收款', '轉帳', '匯款', '服務', '業務', '費率', 'usdt', 'u']
            has_business_info = any(kw in response_lower for kw in business_keywords)
            if not has_business_info:
                return False
        
        # 提取原始消息中的關鍵詞（簡單方法：非停用詞）
        stop_words = {'的', '了', '是', '在', '有', '和', '就', '不', '人', '都', '一', '一個', '上', '也', '很', '到', '說', '要', '去', '你', '會', '著', '沒有', '看', '好', '自己', '這'}
        original_words = set(word for word in re.findall(r'\w+', original_lower) if word not in stop_words and len(word) > 1)
        
        # 檢查回復中是否包含原始消息的關鍵詞
        if original_words:
            matching_words = sum(1 for word in original_words if word in response_lower)
            relevance_ratio = matching_words / len(original_words)
            return relevance_ratio >= 0.2  # 至少20%的關鍵詞被提及
        
        return True
    
    def _check_tone(self, response: str) -> bool:
        """檢查語氣是否合適"""
        # 檢查是否包含不禮貌的詞彙
        impolite_words = ['滾', '閉嘴', '煩', '討厭', 'stupid', 'idiot']
        response_lower = response.lower()
        
        for word in impolite_words:
            if word in response_lower:
                return False
        
        # 檢查是否過於正式（在某些場景下不合適）
        # 這個檢查可以根據場景調整
        return True
    
    def update_thresholds(self, thresholds: Dict[str, Any]):
        """更新質量閾值"""
        self.thresholds.update(thresholds)
    
    def add_sensitive_words(self, words: list):
        """添加敏感詞"""
        self.sensitive_words.extend(words)
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        return {
            'thresholds': self.thresholds,
            'sensitive_words_count': len(self.sensitive_words)
        }
