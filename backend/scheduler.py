"""
Task Scheduler - 自動化任務調度器
定時執行跟進、分析、清理等任務

功能:
1. 定時跟進任務
2. 自動標籤更新
3. 記憶清理
4. 對話摘要生成
5. 漏斗階段自動轉換
"""
import asyncio
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable, List
from database import db


class TaskScheduler:
    """自動化任務調度器"""
    
    def __init__(self):
        self.is_running = False
        self._tasks: Dict[str, asyncio.Task] = {}
        self._intervals: Dict[str, int] = {
            'follow_up': 1800,       # 30分鐘檢查一次跟進
            'auto_tags': 3600,       # 1小時更新標籤
            'memory_cleanup': 86400, # 每天清理記憶
            'summarize': 21600,      # 6小時生成摘要
            'stage_check': 3600,     # 1小時檢查階段轉換
        }
        self._callbacks: Dict[str, Callable] = {}
        self.log_callback: Optional[Callable] = None
    
    def set_log_callback(self, callback: Callable):
        """設置日誌回調"""
        self.log_callback = callback
    
    def set_task_callback(self, task_name: str, callback: Callable):
        """設置任務回調"""
        self._callbacks[task_name] = callback
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[Scheduler] {message}"
        if self.log_callback:
            self.log_callback(formatted, level)
        else:
            print(formatted, file=sys.stderr)
    
    async def start(self):
        """啟動調度器"""
        if self.is_running:
            return
        
        self.is_running = True
        
        # 啟動所有定時任務
        self._tasks['follow_up'] = asyncio.create_task(self._follow_up_loop())
        self._tasks['auto_tags'] = asyncio.create_task(self._auto_tags_loop())
        self._tasks['memory_cleanup'] = asyncio.create_task(self._memory_cleanup_loop())
        self._tasks['summarize'] = asyncio.create_task(self._summarize_loop())
        self._tasks['stage_check'] = asyncio.create_task(self._stage_check_loop())
        
        self.log("任務調度器已啟動", "success")
    
    async def stop(self):
        """停止調度器"""
        self.is_running = False
        
        for task_name, task in self._tasks.items():
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self._tasks.clear()
        self.log("任務調度器已停止")
    
    def set_interval(self, task_name: str, seconds: int):
        """設置任務間隔"""
        self._intervals[task_name] = seconds
    
    async def _follow_up_loop(self):
        """跟進任務循環"""
        while self.is_running:
            try:
                await self._process_follow_ups()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"跟進任務錯誤: {e}", "error")
            
            await asyncio.sleep(self._intervals['follow_up'])
    
    async def _auto_tags_loop(self):
        """自動標籤更新循環"""
        while self.is_running:
            try:
                await self._update_auto_tags()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"標籤更新錯誤: {e}", "error")
            
            await asyncio.sleep(self._intervals['auto_tags'])
    
    async def _memory_cleanup_loop(self):
        """記憶清理循環"""
        while self.is_running:
            try:
                await self._cleanup_memories()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"記憶清理錯誤: {e}", "error")
            
            await asyncio.sleep(self._intervals['memory_cleanup'])
    
    async def _summarize_loop(self):
        """對話摘要循環"""
        while self.is_running:
            try:
                await self._generate_summaries()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"摘要生成錯誤: {e}", "error")
            
            await asyncio.sleep(self._intervals['summarize'])
    
    async def _stage_check_loop(self):
        """階段檢查循環"""
        while self.is_running:
            try:
                await self._check_stage_transitions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"階段檢查錯誤: {e}", "error")
            
            await asyncio.sleep(self._intervals['stage_check'])
    
    async def _process_follow_ups(self):
        """處理跟進任務"""
        self.log("開始處理跟進任務...")
        
        # 獲取待執行的跟進任務
        cursor = await db._connection.execute("""
            SELECT * FROM follow_up_tasks
            WHERE status = 'pending'
            AND scheduled_at <= datetime('now')
            ORDER BY scheduled_at ASC
            LIMIT 50
        """)
        
        tasks = await cursor.fetchall()
        
        for task in tasks:
            try:
                # 執行跟進
                result = await self._execute_follow_up(dict(task))
                
                # 更新任務狀態
                await db._connection.execute("""
                    UPDATE follow_up_tasks
                    SET status = ?, executed_at = CURRENT_TIMESTAMP, result = ?
                    WHERE id = ?
                """, (
                    'completed' if result.get('success') else 'failed',
                    str(result),
                    task['id']
                ))
                
            except Exception as e:
                await db._connection.execute("""
                    UPDATE follow_up_tasks
                    SET status = 'failed', result = ?
                    WHERE id = ?
                """, (str(e), task['id']))
        
        await db._connection.commit()
        self.log(f"完成處理 {len(tasks)} 個跟進任務")
    
    async def _execute_follow_up(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """執行單個跟進任務"""
        if 'follow_up' in self._callbacks:
            return await self._callbacks['follow_up'](task)
        
        return {'success': True, 'message': 'No callback registered'}
    
    async def _update_auto_tags(self):
        """更新自動標籤"""
        self.log("開始更新自動標籤...")
        
        # 獲取標籤定義
        cursor = await db._connection.execute("""
            SELECT * FROM tag_definitions WHERE tag_type = 'auto'
        """)
        definitions = await cursor.fetchall()
        
        # 獲取所有用戶
        cursor = await db._connection.execute("""
            SELECT user_id, funnel_stage, interest_level, last_interaction
            FROM user_profiles
        """)
        users = await cursor.fetchall()
        
        tags_updated = 0
        
        for user in users:
            user_id = user['user_id']
            
            # 計算距上次互動的天數
            last_interaction = user['last_interaction']
            if last_interaction:
                try:
                    last_dt = datetime.fromisoformat(last_interaction.replace('Z', '+00:00'))
                    days_since = (datetime.now(last_dt.tzinfo) - last_dt).days
                except:
                    days_since = 999
            else:
                days_since = 999
            
            # 應用標籤規則
            user_data = {
                'funnel_stage': user['funnel_stage'],
                'interest_level': user['interest_level'],
                'last_interaction_days': days_since,
            }
            
            for defn in definitions:
                tag = defn['tag']
                rules = defn['auto_rules']
                
                if rules:
                    try:
                        import json
                        rules_dict = json.loads(rules)
                        should_add = self._evaluate_tag_rules(rules_dict, user_data)
                        
                        if should_add:
                            await self._add_auto_tag(user_id, tag)
                            tags_updated += 1
                        else:
                            await self._remove_auto_tag(user_id, tag)
                            
                    except Exception as e:
                        continue
        
        self.log(f"更新了 {tags_updated} 個自動標籤")
    
    def _evaluate_tag_rules(self, rules: Dict[str, Any], data: Dict[str, Any]) -> bool:
        """評估標籤規則"""
        for key, condition in rules.items():
            value = data.get(key)
            
            if isinstance(condition, dict):
                # 複雜條件
                for op, threshold in condition.items():
                    if op == '>=' and not (value >= threshold):
                        return False
                    elif op == '<=' and not (value <= threshold):
                        return False
                    elif op == '>' and not (value > threshold):
                        return False
                    elif op == '<' and not (value < threshold):
                        return False
                    elif op == '==' and not (value == threshold):
                        return False
            else:
                # 簡單相等條件
                if value != condition:
                    return False
        
        return True
    
    async def _add_auto_tag(self, user_id: str, tag: str):
        """添加自動標籤"""
        await db._connection.execute("""
            INSERT OR IGNORE INTO user_tags (user_id, tag, tag_type, auto_assigned)
            VALUES (?, ?, 'auto', 1)
        """, (user_id, tag))
    
    async def _remove_auto_tag(self, user_id: str, tag: str):
        """移除自動標籤"""
        await db._connection.execute("""
            DELETE FROM user_tags 
            WHERE user_id = ? AND tag = ? AND auto_assigned = 1
        """, (user_id, tag))
    
    async def _cleanup_memories(self):
        """清理舊記憶"""
        self.log("開始清理舊記憶...")
        
        # 清理90天前的非重要記憶
        cursor = await db._connection.execute("""
            DELETE FROM vector_memories
            WHERE created_at < datetime('now', '-90 days')
            AND importance < 0.7
        """)
        
        deleted_memories = cursor.rowcount
        
        # 清理舊的互動記錄（保留30天）
        cursor = await db._connection.execute("""
            DELETE FROM user_interactions
            WHERE created_at < datetime('now', '-30 days')
        """)
        
        deleted_interactions = cursor.rowcount
        
        await db._connection.commit()
        
        self.log(f"清理完成: {deleted_memories} 條記憶, {deleted_interactions} 條互動記錄")
    
    async def _generate_summaries(self):
        """為活躍用戶生成對話摘要"""
        self.log("開始生成對話摘要...")
        
        # 獲取最近有互動但沒有最新摘要的用戶
        cursor = await db._connection.execute("""
            SELECT DISTINCT ch.user_id
            FROM chat_history ch
            LEFT JOIN (
                SELECT user_id, MAX(created_at) as latest_summary
                FROM conversation_summaries
                GROUP BY user_id
            ) cs ON ch.user_id = cs.user_id
            WHERE ch.timestamp > datetime('now', '-1 days')
            AND (cs.latest_summary IS NULL OR cs.latest_summary < datetime('now', '-6 hours'))
            LIMIT 20
        """)
        
        users = await cursor.fetchall()
        
        summaries_created = 0
        
        for user in users:
            user_id = user['user_id']
            
            try:
                # 獲取最近對話
                cursor = await db._connection.execute("""
                    SELECT role, content, timestamp
                    FROM chat_history
                    WHERE user_id = ?
                    ORDER BY timestamp DESC
                    LIMIT 50
                """, (user_id,))
                
                messages = await cursor.fetchall()
                
                if len(messages) < 5:
                    continue
                
                # 簡單摘要生成
                user_msgs = [m for m in messages if m['role'] == 'user']
                ai_msgs = [m for m in messages if m['role'] == 'assistant']
                
                summary = f"最近 {len(messages)} 條對話: 用戶發送 {len(user_msgs)} 條, AI回覆 {len(ai_msgs)} 條。"
                
                # 提取關鍵詞
                all_text = " ".join([m['content'] for m in messages])
                words = all_text.split()
                word_freq = {}
                for word in words:
                    if len(word) > 2:
                        word_freq[word] = word_freq.get(word, 0) + 1
                
                key_points = [w for w, _ in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]]
                
                # 保存摘要
                import json
                await db._connection.execute("""
                    INSERT INTO conversation_summaries 
                    (user_id, summary, key_points, message_count)
                    VALUES (?, ?, ?, ?)
                """, (user_id, summary, json.dumps(key_points), len(messages)))
                
                summaries_created += 1
                
            except Exception as e:
                self.log(f"摘要生成失敗 {user_id}: {e}", "warning")
        
        await db._connection.commit()
        self.log(f"生成了 {summaries_created} 個對話摘要")
    
    async def _check_stage_transitions(self):
        """檢查並執行自動階段轉換"""
        self.log("開始檢查階段轉換...")
        
        transitions = 0
        
        # 1. 聯繫後24小時無回復 -> 需跟進
        cursor = await db._connection.execute("""
            UPDATE user_profiles
            SET funnel_stage = 'follow_up', updated_at = CURRENT_TIMESTAMP
            WHERE funnel_stage = 'contacted'
            AND last_interaction < datetime('now', '-24 hours')
        """)
        transitions += cursor.rowcount
        
        # 2. 需跟進超過7天無回復 -> 流失
        cursor = await db._connection.execute("""
            UPDATE user_profiles
            SET funnel_stage = 'churned', 
                churned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE funnel_stage = 'follow_up'
            AND last_interaction < datetime('now', '-7 days')
        """)
        transitions += cursor.rowcount
        
        # 3. 同步更新 leads 表
        await db._connection.execute("""
            UPDATE leads
            SET status = 'Follow-up'
            WHERE user_id IN (
                SELECT user_id FROM user_profiles WHERE funnel_stage = 'follow_up'
            )
            AND status NOT IN ('Closed-Won', 'Closed-Lost', 'Follow-up')
        """)
        
        await db._connection.execute("""
            UPDATE leads
            SET status = 'Closed-Lost'
            WHERE user_id IN (
                SELECT user_id FROM user_profiles WHERE funnel_stage = 'churned'
            )
            AND status NOT IN ('Closed-Won', 'Closed-Lost')
        """)
        
        await db._connection.commit()
        
        if transitions > 0:
            self.log(f"執行了 {transitions} 個階段轉換")
    
    async def schedule_follow_up(self, user_id: str, 
                                  scheduled_at: datetime,
                                  message_template: str = None,
                                  task_type: str = 'reminder') -> int:
        """
        排程跟進任務
        
        Args:
            user_id: 用戶ID
            scheduled_at: 計劃執行時間
            message_template: 消息模板
            task_type: 任務類型
        
        Returns:
            任務ID
        """
        cursor = await db._connection.execute("""
            INSERT INTO follow_up_tasks 
            (user_id, task_type, scheduled_at, message_template)
            VALUES (?, ?, ?, ?)
        """, (user_id, task_type, scheduled_at.isoformat(), message_template))
        
        await db._connection.commit()
        
        self.log(f"已排程跟進任務: {user_id} at {scheduled_at}")
        
        return cursor.lastrowid
    
    async def get_pending_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """獲取待執行的任務"""
        cursor = await db._connection.execute("""
            SELECT * FROM follow_up_tasks
            WHERE status = 'pending'
            ORDER BY scheduled_at ASC
            LIMIT ?
        """, (limit,))
        
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def cancel_task(self, task_id: int) -> bool:
        """取消任務"""
        await db._connection.execute("""
            UPDATE follow_up_tasks
            SET status = 'cancelled'
            WHERE id = ? AND status = 'pending'
        """, (task_id,))
        
        await db._connection.commit()
        return True
    
    async def get_scheduler_stats(self) -> Dict[str, Any]:
        """獲取調度器統計"""
        stats = {
            'is_running': self.is_running,
            'active_tasks': list(self._tasks.keys()),
            'intervals': self._intervals,
        }
        
        # 獲取任務統計
        cursor = await db._connection.execute("""
            SELECT status, COUNT(*) as count
            FROM follow_up_tasks
            GROUP BY status
        """)
        rows = await cursor.fetchall()
        stats['task_counts'] = {row['status']: row['count'] for row in rows}
        
        return stats


# 全局實例
scheduler = TaskScheduler()
