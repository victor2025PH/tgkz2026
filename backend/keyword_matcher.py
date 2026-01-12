"""
Keyword Matcher - Optimized keyword matching with precompiled regex
"""
import re
from typing import List, Dict, Any, Optional, Pattern
from dataclasses import dataclass


@dataclass
class CompiledKeyword:
    """Compiled keyword with pattern"""
    keyword: str
    pattern: Optional[Pattern]
    is_regex: bool
    keyword_set_id: int


class KeywordMatcher:
    """Optimized keyword matcher with precompiled patterns"""
    
    def __init__(self):
        self.compiled_keywords: List[CompiledKeyword] = []
        self._cache: Dict[str, List[str]] = {}  # text -> matched keywords
    
    def compile_keywords(self, keyword_sets: List[Dict[str, Any]]):
        """
        Compile all keywords into patterns for faster matching
        
        Args:
            keyword_sets: List of keyword sets with keywords
        """
        self.compiled_keywords = []
        
        for keyword_set in keyword_sets:
            keyword_set_id = keyword_set.get('id', 0)
            keywords = keyword_set.get('keywords', [])
            
            for keyword_data in keywords:
                keyword = keyword_data.get('keyword', '')
                is_regex = keyword_data.get('isRegex', False)
                
                if not keyword:
                    continue
                
                pattern = None
                if is_regex:
                    try:
                        pattern = re.compile(keyword, re.IGNORECASE)
                    except re.error:
                        # Invalid regex, skip it
                        continue
                
                self.compiled_keywords.append(CompiledKeyword(
                    keyword=keyword,
                    pattern=pattern,
                    is_regex=is_regex,
                    keyword_set_id=keyword_set_id
                ))
        
        # Clear cache when keywords change
        self._cache.clear()
    
    def match(self, text: str) -> List[str]:
        """
        Match text against compiled keywords
        
        Args:
            text: Text to match against
            
        Returns:
            List of matched keywords
        """
        if not text:
            return []
        
        # Check cache first
        text_lower = text.lower()
        if text_lower in self._cache:
            return self._cache[text_lower]
        
        matched = []
        text_lower = text.lower()
        
        for compiled_keyword in self.compiled_keywords:
            if compiled_keyword.is_regex and compiled_keyword.pattern:
                if compiled_keyword.pattern.search(text):
                    matched.append(compiled_keyword.keyword)
            else:
                # Simple string matching
                if compiled_keyword.keyword.lower() in text_lower:
                    matched.append(compiled_keyword.keyword)
        
        # Cache result (limit cache size to prevent memory issues)
        if len(self._cache) < 1000:
            self._cache[text_lower] = matched
        
        return matched
    
    def clear_cache(self):
        """Clear the match cache"""
        self._cache.clear()

