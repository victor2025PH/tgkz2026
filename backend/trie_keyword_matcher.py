"""
Trie-based Keyword Matcher - 使用 Trie 樹優化關鍵詞匹配
時間複雜度從 O(n*m) 降至 O(n)，其中 n 是文本長度，m 是關鍵詞數量
"""
import re
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass


@dataclass
class TrieNode:
    """Trie 樹節點"""
    children: Dict[str, 'TrieNode']
    is_end: bool  # 是否為關鍵詞結尾
    keyword: Optional[str]  # 如果是結尾，存儲完整關鍵詞
    keyword_set_id: Optional[int]  # 關鍵詞集ID


class TrieKeywordMatcher:
    """基於 Trie 樹的關鍵詞匹配器"""
    
    def __init__(self):
        self.trie_root = TrieNode(children={}, is_end=False, keyword=None, keyword_set_id=None)
        self.regex_patterns: List[Dict[str, Any]] = []  # 正則表達式關鍵詞
        self._cache: Dict[str, List[str]] = {}  # 緩存匹配結果
        self._max_cache_size = 1000
    
    def add_keyword(self, keyword: str, is_regex: bool = False, keyword_set_id: int = 0):
        """
        添加關鍵詞到 Trie 樹
        
        Args:
            keyword: 關鍵詞
            is_regex: 是否為正則表達式
            keyword_set_id: 關鍵詞集ID
        """
        if not keyword:
            return
        
        if is_regex:
            # 正則表達式單獨存儲
            try:
                pattern = re.compile(keyword, re.IGNORECASE)
                self.regex_patterns.append({
                    'pattern': pattern,
                    'keyword': keyword,
                    'keyword_set_id': keyword_set_id
                })
            except re.error:
                # 無效的正則表達式，跳過
                pass
        else:
            # 添加到 Trie 樹
            node = self.trie_root
            keyword_lower = keyword.lower()
            
            for char in keyword_lower:
                if char not in node.children:
                    node.children[char] = TrieNode(
                        children={},
                        is_end=False,
                        keyword=None,
                        keyword_set_id=None
                    )
                node = node.children[char]
            
            # 標記為關鍵詞結尾
            node.is_end = True
            node.keyword = keyword
            node.keyword_set_id = keyword_set_id
    
    def compile_keywords(self, keyword_sets: List[Dict[str, Any]]):
        """
        編譯所有關鍵詞到 Trie 樹
        
        Args:
            keyword_sets: 關鍵詞集列表
        """
        # 重置
        self.trie_root = TrieNode(children={}, is_end=False, keyword=None, keyword_set_id=None)
        self.regex_patterns = []
        self._cache.clear()
        
        for keyword_set in keyword_sets:
            keyword_set_id = keyword_set.get('id', 0)
            keywords = keyword_set.get('keywords', [])
            
            for keyword_data in keywords:
                keyword = keyword_data.get('keyword', '')
                is_regex = keyword_data.get('isRegex', False)
                
                self.add_keyword(keyword, is_regex, keyword_set_id)
    
    def match(self, text: str) -> List[str]:
        """
        匹配文本中的關鍵詞（使用 Trie 樹）
        
        Args:
            text: 要匹配的文本
            
        Returns:
            匹配到的關鍵詞列表
        """
        if not text:
            return []
        
        # 檢查緩存
        text_lower = text.lower()
        if text_lower in self._cache:
            return self._cache[text_lower]
        
        matched_keywords: Set[str] = set()
        
        # 1. Trie 樹匹配（O(n) 時間複雜度）
        text_lower = text.lower()
        for i in range(len(text_lower)):
            node = self.trie_root
            for j in range(i, len(text_lower)):
                char = text_lower[j]
                if char not in node.children:
                    break
                
                node = node.children[char]
                
                # 如果到達關鍵詞結尾，記錄匹配
                if node.is_end and node.keyword:
                    matched_keywords.add(node.keyword)
        
        # 2. 正則表達式匹配
        for regex_data in self.regex_patterns:
            if regex_data['pattern'].search(text):
                matched_keywords.add(regex_data['keyword'])
        
        result = list(matched_keywords)
        
        # 緩存結果（限制緩存大小）
        if len(self._cache) < self._max_cache_size:
            self._cache[text_lower] = result
        elif len(self._cache) >= self._max_cache_size:
            # 緩存已滿，清除最舊的（簡單策略：清除一半）
            keys_to_remove = list(self._cache.keys())[:self._max_cache_size // 2]
            for key in keys_to_remove:
                del self._cache[key]
            self._cache[text_lower] = result
        
        return result
    
    def clear_cache(self):
        """清除匹配緩存"""
        self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        def count_nodes(node: TrieNode) -> int:
            count = 1
            for child in node.children.values():
                count += count_nodes(child)
            return count
        
        return {
            'trie_nodes': count_nodes(self.trie_root),
            'regex_patterns': len(self.regex_patterns),
            'cache_size': len(self._cache),
            'cache_hit_rate': 0  # 可以添加命中率統計
        }
