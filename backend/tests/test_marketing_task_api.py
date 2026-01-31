"""
營銷任務 API 單元測試
Marketing Task API Unit Tests

🆕 測試優化: 後端單元測試
"""

import pytest
import os
import sys
import json
import tempfile
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from marketing_task_api import (
    MarketingTaskAPI, MarketingTask, TaskStatus, GoalType, 
    ExecutionMode, TaskStats, TaskTarget, RoleConfig, TargetCriteria
)


class MockDatabase:
    """模擬數據庫"""
    
    def __init__(self):
        self._data = {}
        self._conn = MagicMock()
        self._cursor = MagicMock()
        self._conn.cursor.return_value = self._cursor
    
    def get_connection(self):
        return self
    
    def __enter__(self):
        return self._conn
    
    def __exit__(self, *args):
        pass


class TestMarketingTaskAPI:
    """營銷任務 API 測試"""
    
    @pytest.fixture
    def db(self):
        """創建測試數據庫"""
        return MockDatabase()
    
    @pytest.fixture
    def api(self, db):
        """創建 API 實例"""
        with patch.object(MarketingTaskAPI, '_ensure_tables'):
            api = MarketingTaskAPI(db)
        return api
    
    # ============ 任務創建測試 ============
    
    def test_create_task_basic(self, api):
        """測試基本任務創建"""
        with patch.object(api, '_save_task'):
            task = api.create_task({
                "name": "測試任務",
                "goal_type": "conversion"
            })
        
        assert task is not None
        assert task.name == "測試任務"
        assert task.goal_type == GoalType.CONVERSION
        assert task.status == TaskStatus.DRAFT
        assert task.id.startswith("task-")
    
    def test_create_task_with_full_config(self, api):
        """測試完整配置任務創建"""
        with patch.object(api, '_save_task'):
            task = api.create_task({
                "name": "完整任務",
                "description": "這是一個完整配置的任務",
                "goal_type": "retention",
                "execution_mode": "hybrid",
                "role_config": [
                    {"role_type": "expert", "priority": 1},
                    {"role_type": "support", "priority": 2}
                ],
                "target_criteria": {
                    "intent_score_min": 60,
                    "sources": ["recent", "tags"]
                }
            })
        
        assert task.name == "完整任務"
        assert task.description == "這是一個完整配置的任務"
        assert task.goal_type == GoalType.RETENTION
        assert task.execution_mode == ExecutionMode.HYBRID
        assert len(task.role_config) == 2
        assert task.target_criteria.intent_score_min == 60
    
    def test_create_task_default_values(self, api):
        """測試默認值"""
        with patch.object(api, '_save_task'):
            task = api.create_task({})
        
        assert task.name == "新任務"
        assert task.goal_type == GoalType.CONVERSION
        assert task.execution_mode == ExecutionMode.HYBRID
        assert task.status == TaskStatus.DRAFT
    
    # ============ 任務狀態測試 ============
    
    def test_start_task(self, api):
        """測試啟動任務"""
        mock_task = MarketingTask(
            id="task-123",
            name="測試",
            description=None,
            goal_type=GoalType.CONVERSION,
            execution_mode=ExecutionMode.HYBRID,
            status=TaskStatus.DRAFT
        )
        
        with patch.object(api, 'get_task', return_value=mock_task):
            with patch.object(api, '_save_task'):
                result = api.start_task("task-123")
        
        assert result.status == TaskStatus.RUNNING
        assert result.started_at is not None
    
    def test_pause_task(self, api):
        """測試暫停任務"""
        mock_task = MarketingTask(
            id="task-123",
            name="測試",
            description=None,
            goal_type=GoalType.CONVERSION,
            execution_mode=ExecutionMode.HYBRID,
            status=TaskStatus.RUNNING
        )
        
        with patch.object(api, 'get_task', return_value=mock_task):
            with patch.object(api, '_save_task'):
                result = api.pause_task("task-123")
        
        assert result.status == TaskStatus.PAUSED
    
    def test_complete_task(self, api):
        """測試完成任務"""
        mock_task = MarketingTask(
            id="task-123",
            name="測試",
            description=None,
            goal_type=GoalType.CONVERSION,
            execution_mode=ExecutionMode.HYBRID,
            status=TaskStatus.RUNNING
        )
        
        with patch.object(api, 'get_task', return_value=mock_task):
            with patch.object(api, '_save_task'):
                result = api.complete_task("task-123")
        
        assert result.status == TaskStatus.COMPLETED
        assert result.completed_at is not None
    
    # ============ 統計測試 ============
    
    def test_update_stats(self, api):
        """測試更新統計"""
        mock_task = MarketingTask(
            id="task-123",
            name="測試",
            description=None,
            goal_type=GoalType.CONVERSION,
            execution_mode=ExecutionMode.HYBRID,
            status=TaskStatus.RUNNING,
            stats=TaskStats(contacted=10, converted=2)
        )
        
        with patch.object(api, 'get_task', return_value=mock_task):
            with patch.object(api, '_save_task'):
                result = api.update_stats("task-123", {
                    "contacted": 5,
                    "converted": 1,
                    "ai_cost": 0.5
                })
        
        assert result.stats.contacted == 15
        assert result.stats.converted == 3
        assert result.stats.ai_cost == 0.5
    
    # ============ 目標用戶測試 ============
    
    def test_add_targets(self, api):
        """測試添加目標用戶"""
        targets_data = [
            {"user_id": "user1", "username": "alice", "intent_score": 80},
            {"user_id": "user2", "username": "bob", "intent_score": 70}
        ]
        
        with patch.object(api.db, 'get_connection') as mock_conn:
            mock_cursor = MagicMock()
            mock_conn.return_value.__enter__.return_value.cursor.return_value = mock_cursor
            
            result = api.add_targets("task-123", targets_data)
        
        assert len(result) == 2
        assert result[0].user_id == "user1"
        assert result[0].intent_score == 80
        assert result[1].username == "bob"


class TestTaskStats:
    """任務統計測試"""
    
    def test_default_values(self):
        """測試默認值"""
        stats = TaskStats()
        
        assert stats.contacted == 0
        assert stats.replied == 0
        assert stats.converted == 0
        assert stats.failed == 0
        assert stats.messages_sent == 0
        assert stats.ai_cost == 0.0
    
    def test_custom_values(self):
        """測試自定義值"""
        stats = TaskStats(
            contacted=100,
            replied=50,
            converted=10,
            ai_cost=5.5
        )
        
        assert stats.contacted == 100
        assert stats.replied == 50
        assert stats.converted == 10
        assert stats.ai_cost == 5.5


class TestRoleConfig:
    """角色配置測試"""
    
    def test_basic_config(self):
        """測試基本配置"""
        config = RoleConfig(role_type="expert")
        
        assert config.role_type == "expert"
        assert config.account_id is None
        assert config.priority == 1
    
    def test_full_config(self):
        """測試完整配置"""
        config = RoleConfig(
            role_type="support",
            account_id="acc-123",
            script_template_id="tpl-456",
            priority=2
        )
        
        assert config.role_type == "support"
        assert config.account_id == "acc-123"
        assert config.script_template_id == "tpl-456"
        assert config.priority == 2


class TestTargetCriteria:
    """目標條件測試"""
    
    def test_default_values(self):
        """測試默認值"""
        criteria = TargetCriteria()
        
        assert criteria.intent_score_min == 50
        assert criteria.intent_score_max == 100
        assert criteria.sources == []
        assert criteria.exclude_contacted_days == 7
    
    def test_custom_values(self):
        """測試自定義值"""
        criteria = TargetCriteria(
            intent_score_min=70,
            sources=["tags", "group"],
            tags=["vip", "active"]
        )
        
        assert criteria.intent_score_min == 70
        assert "tags" in criteria.sources
        assert "vip" in criteria.tags


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
