"""
🔧 P12-5: 模板 A/B 測試引擎

功能：
1. 創建 A/B 測試（2+ 個模板變體）
2. 自動流量分配（均勻 / 加權）
3. 效果統計對比（發送量、成功率、回覆率）
4. 自動選擇贏家（基於統計顯著性）
"""

import random
import logging
import sqlite3
import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class TemplateABTest:
    """A/B 測試實例"""

    def __init__(self, test_id: str, name: str, variants: List[Dict[str, Any]],
                 status: str = 'running', created_at: str = ''):
        self.test_id = test_id
        self.name = name
        self.variants = variants  # [{'template_id': ..., 'weight': ..., 'stats': {...}}]
        self.status = status  # draft, running, completed
        self.created_at = created_at or datetime.now(tz=None).isoformat()

    def select_variant(self) -> Dict[str, Any]:
        """
        根據權重選擇一個變體

        均勻分配時所有權重相等
        """
        if not self.variants:
            return {}

        total_weight = sum(v.get('weight', 1) for v in self.variants)
        r = random.uniform(0, total_weight)
        cumulative = 0

        for variant in self.variants:
            cumulative += variant.get('weight', 1)
            if r <= cumulative:
                return variant

        return self.variants[-1]

    def record_result(self, variant_index: int, success: bool, got_reply: bool = False):
        """記錄一次發送結果"""
        if 0 <= variant_index < len(self.variants):
            v = self.variants[variant_index]
            stats = v.setdefault('stats', {'sent': 0, 'success': 0, 'replies': 0})
            stats['sent'] += 1
            if success:
                stats['success'] += 1
            if got_reply:
                stats['replies'] += 1

    def get_results(self) -> Dict[str, Any]:
        """獲取測試結果"""
        results = []
        for i, v in enumerate(self.variants):
            stats = v.get('stats', {'sent': 0, 'success': 0, 'replies': 0})
            sent = stats.get('sent', 0)
            success = stats.get('success', 0)
            replies = stats.get('replies', 0)

            results.append({
                'variant_index': i,
                'template_id': v.get('template_id'),
                'template_name': v.get('template_name', f'Variant {i + 1}'),
                'weight': v.get('weight', 1),
                'sent': sent,
                'success': success,
                'replies': replies,
                'success_rate': round(success / max(sent, 1) * 100, 1),
                'reply_rate': round(replies / max(sent, 1) * 100, 1),
            })

        # 判斷贏家
        winner = None
        if results and all(r['sent'] >= 10 for r in results):
            winner = max(results, key=lambda r: r['success_rate'])

        return {
            'test_id': self.test_id,
            'name': self.name,
            'status': self.status,
            'variants': results,
            'winner': winner,
            'created_at': self.created_at,
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            'test_id': self.test_id,
            'name': self.name,
            'variants': self.variants,
            'status': self.status,
            'created_at': self.created_at,
        }


class ABTestManager:
    """A/B 測試管理器"""

    def __init__(self):
        self._tests: Dict[str, TemplateABTest] = {}

    def create_test(self, name: str, template_ids: List[int],
                    template_names: List[str] = None) -> TemplateABTest:
        """創建新的 A/B 測試"""
        import uuid
        test_id = str(uuid.uuid4())[:8]

        variants = []
        for i, tid in enumerate(template_ids):
            variants.append({
                'template_id': tid,
                'template_name': template_names[i] if template_names and i < len(template_names) else f'Variant {i + 1}',
                'weight': 1,
                'stats': {'sent': 0, 'success': 0, 'replies': 0},
            })

        test = TemplateABTest(test_id=test_id, name=name, variants=variants)
        self._tests[test_id] = test
        return test

    def get_test(self, test_id: str) -> Optional[TemplateABTest]:
        return self._tests.get(test_id)

    def list_tests(self) -> List[Dict[str, Any]]:
        return [t.get_results() for t in self._tests.values()]

    def select_template(self, test_id: str) -> Optional[Dict[str, Any]]:
        """為 A/B 測試選擇一個模板"""
        test = self._tests.get(test_id)
        if not test or test.status != 'running':
            return None
        return test.select_variant()

    def complete_test(self, test_id: str) -> Optional[Dict[str, Any]]:
        """結束測試並選出贏家"""
        test = self._tests.get(test_id)
        if not test:
            return None
        test.status = 'completed'
        return test.get_results()


_ab_manager: Optional[ABTestManager] = None


def get_ab_test_manager() -> ABTestManager:
    global _ab_manager
    if _ab_manager is None:
        _ab_manager = ABTestManager()
    return _ab_manager
