"""
Phase 9-2: Chat templates, chat messages, topic tracking, funnel stages, collected users
Mixin class for Database — merged via multiple inheritance.
"""
from typing import Dict, List, Any, Optional
import json
import sys


class ChatFunnelMixin:
    """Chat templates, chat messages, topic tracking, funnel stages, collected users"""

    # ============ 聊天模板相關 ============
    
    async def get_chat_templates(self) -> List[Dict[str, Any]]:
        """獲取所有聊天模板（多用户一库按 owner_user_id 隔離）"""
        try:
            await self.connect()
            try:
                await self._connection.execute("PRAGMA wal_checkpoint(PASSIVE)")
            except Exception:
                pass
            from core.tenant_filter import add_tenant_filter
            query = "SELECT * FROM chat_templates ORDER BY usage_count DESC, created_at DESC"
            query, params = add_tenant_filter(query, 'chat_templates', [])
            rows = await self.fetch_all(query, tuple(params))

            templates = []
            import json
            for row in rows:
                template = dict(row)
                # 轉換字段名以匹配前端期望
                template['isEnabled'] = bool(template.get('is_active', 1))
                template['usageCount'] = template.get('usage_count', 0)
                template['successRate'] = template.get('success_rate', 0)
                template['lastUsed'] = template.get('last_used')
                template['createdAt'] = template.get('created_at')
                template['updatedAt'] = template.get('updated_at')
                
                if template.get('variables'):
                    try:
                        template['variables'] = json.loads(template['variables'])
                    except:
                        template['variables'] = []
                templates.append(template)
            
            return templates
        except Exception as e:
            import sys
            print(f"Error getting chat templates: {e}", file=sys.stderr)
            return []
    
    async def save_chat_template(
        self,
        template_id: Optional[int],
        name: str,
        category: str,
        content: str,
        variables: List[str],
        is_active: bool = True
    ) -> Dict[str, Any]:
        """保存聊天模板
        
        Args:
            template_id: 模板 ID（如果是更新）
            name: 模板名稱
            category: 分類
            content: 內容
            variables: 變量列表
            is_active: 是否啟用
            
        Returns:
            Dict: 保存結果
        """
        try:
            await self.connect()
            import json
            variables_str = json.dumps(variables)
            
            # 🔧 Phase7: 獲取 owner_user_id
            try:
                from core.tenant_filter import get_owner_user_id
                owner_id = get_owner_user_id()
            except ImportError:
                owner_id = 'local_user'
            
            if template_id:
                # 更新 + 修復 NULL owner_user_id
                await self._connection.execute(
                    """UPDATE chat_templates 
                       SET name=?, category=?, content=?, variables=?, is_active=?, 
                           owner_user_id=COALESCE(owner_user_id, ?), updated_at=CURRENT_TIMESTAMP
                       WHERE id=?""",
                    (name, category, content, variables_str, 1 if is_active else 0, owner_id, template_id)
                )
            else:
                # 新增（含 owner_user_id）
                cursor = await self._connection.execute(
                    """INSERT INTO chat_templates (name, category, content, variables, is_active, owner_user_id)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (name, category, content, variables_str, 1 if is_active else 0, owner_id)
                )
                template_id = cursor.lastrowid
            
            await self._connection.commit()
            return {'success': True, 'id': template_id}
        except Exception as e:
            import sys
            print(f"Error saving chat template: {e}", file=sys.stderr)
            return {'success': False, 'error': str(e)}
    
    async def delete_chat_template(self, template_id: int) -> bool:
        """刪除聊天模板（僅可刪除當前用戶的模板）"""
        try:
            await self.connect()
            from core.tenant_filter import get_owner_user_id
            owner_id = get_owner_user_id()
            cursor = await self._connection.execute(
                "DELETE FROM chat_templates WHERE id=? AND owner_user_id=?",
                (template_id, owner_id)
            )
            await self._connection.commit()
            return cursor.rowcount > 0
        except Exception as e:
            import sys
            print(f"Error deleting chat template: {e}", file=sys.stderr)
            return False
    
    async def increment_template_usage(self, template_id: int) -> bool:
        """增加模板使用次數
        
        Args:
            template_id: 模板 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                """UPDATE chat_templates 
                   SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
                   WHERE id=?""",
                (template_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error incrementing template usage: {e}", file=sys.stderr)
            return False
    
    # ========== 聊天記錄管理 ==========
    
    async def add_chat_message(
        self,
        user_id: int,
        role: str,  # 'user' or 'assistant'
        content: str,
        account_phone: str = None,
        source_group: str = None,
        message_id: str = None
    ) -> Optional[int]:
        """添加聊天記錄
        
        Args:
            user_id: 用戶 ID
            role: 消息角色 ('user' 或 'assistant')
            content: 消息內容
            account_phone: 帳號手機號
            source_group: 來源群組
            message_id: Telegram 消息 ID
            
        Returns:
            int: 記錄 ID，失敗返回 None
        """
        try:
            await self.connect()
            
            # 確保表存在
            await self._connection.execute('''
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT,
                    account_phone TEXT,
                    source_group TEXT,
                    message_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            await self._connection.execute('''
                CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id 
                ON chat_messages(user_id)
            ''')
            
            cursor = await self._connection.execute(
                '''INSERT INTO chat_messages (user_id, role, content, account_phone, source_group, message_id)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (user_id, role, content, account_phone, source_group, message_id)
            )
            await self._connection.commit()
            
            return cursor.lastrowid
        except Exception as e:
            import sys
            print(f"[Database] Error adding chat message: {e}", file=sys.stderr)
            return None
    
    async def get_chat_messages(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """獲取聊天記錄
        
        Args:
            user_id: 用戶 ID
            limit: 返回數量限制
            offset: 偏移量
            
        Returns:
            List[Dict]: 聊天記錄列表
        """
        try:
            await self.connect()
            
            cursor = await self._connection.execute(
                '''SELECT * FROM chat_messages 
                   WHERE user_id = ?
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?''',
                (user_id, limit, offset)
            )
            rows = await cursor.fetchall()
            
            messages = []
            for row in rows:
                messages.append(dict(row))
            
            return messages
        except Exception as e:
            import sys
            print(f"[Database] Error getting chat messages: {e}", file=sys.stderr)
            return []
    
    # ========== 🔧 P2 優化: 話題追蹤管理 ==========
    
    async def get_covered_topics(self, user_id: str, limit: int = 10) -> List[Dict]:
        """獲取用戶已涵蓋的話題"""
        try:
            await self.connect()
            
            cursor = await self._connection.execute("""
                SELECT topic_name, depth_level, key_points, last_user_question, 
                       last_ai_response, covered_at
                FROM conversation_topics
                WHERE user_id = ?
                ORDER BY covered_at DESC
                LIMIT ?
            """, (str(user_id), limit))
            
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            import sys
            print(f"[Database] Error getting covered topics: {e}", file=sys.stderr)
            return []
    
    async def update_topic(
        self,
        user_id: str,
        topic_name: str,
        depth_level: int = 1,
        key_points: List[str] = None,
        last_question: str = None,
        last_response: str = None
    ) -> bool:
        """更新或創建話題記錄"""
        try:
            await self.connect()
            
            # 確保表存在
            await self._connection.execute("""
                CREATE TABLE IF NOT EXISTS conversation_topics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    topic_name TEXT NOT NULL,
                    covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    depth_level INTEGER DEFAULT 1,
                    key_points TEXT,
                    last_user_question TEXT,
                    last_ai_response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            import json
            key_points_json = json.dumps(key_points or [])
            
            # UPSERT: 如果存在則更新，否則插入
            await self._connection.execute("""
                INSERT INTO conversation_topics 
                (user_id, topic_name, depth_level, key_points, last_user_question, last_ai_response, covered_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, topic_name) DO UPDATE SET
                    depth_level = MAX(depth_level, excluded.depth_level),
                    key_points = excluded.key_points,
                    last_user_question = excluded.last_user_question,
                    last_ai_response = excluded.last_ai_response,
                    covered_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            """, (str(user_id), topic_name, depth_level, key_points_json, last_question, last_response))
            
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating topic: {e}", file=sys.stderr)
            return False
    
    async def get_topic_depth(self, user_id: str, topic_name: str) -> int:
        """獲取特定話題的深入程度"""
        try:
            await self.connect()
            
            cursor = await self._connection.execute("""
                SELECT depth_level FROM conversation_topics
                WHERE user_id = ? AND topic_name = ?
            """, (str(user_id), topic_name))
            
            row = await cursor.fetchone()
            return row['depth_level'] if row else 0
        except Exception as e:
            return 0
    
    # ========== 銷售漏斗管理 ==========
    
    async def update_funnel_stage(
        self,
        user_id: int,
        stage: str,
        reason: str = None
    ) -> bool:
        """更新用戶的銷售漏斗階段
        
        Args:
            user_id: 用戶 ID
            stage: 漏斗階段 ('new', 'interested', 'engaged', 'qualified', 'converted', 'replied' 等)
            reason: 更新原因
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            
            # 🔧 確保表存在並有正確的約束
            # 先嘗試創建表（如果不存在）
            await self._connection.execute('''
                CREATE TABLE IF NOT EXISTS funnel_stages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    stage TEXT NOT NULL DEFAULT 'new',
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 🔧 確保 user_id 有唯一索引（用於 UPSERT）
            try:
                await self._connection.execute('''
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_stages_user_id 
                    ON funnel_stages(user_id)
                ''')
            except Exception:
                pass  # 索引可能已存在
            
            # 🔧 遷移：添加 reason 列（如果不存在）
            try:
                await self._connection.execute("SELECT reason FROM funnel_stages LIMIT 1")
            except Exception:
                try:
                    await self._connection.execute("ALTER TABLE funnel_stages ADD COLUMN reason TEXT")
                    print("[Database] Added 'reason' column to funnel_stages", file=sys.stderr)
                except Exception:
                    pass
            
            # 🔧 檢測舊表是否有 phone 列（處理向後兼容）
            has_phone_column = False
            try:
                cursor = await self._connection.execute("PRAGMA table_info(funnel_stages)")
                columns = await cursor.fetchall()
                for col in columns:
                    if col[1] == 'phone':  # col[1] 是列名
                        has_phone_column = True
                        break
            except Exception:
                pass
            
            # 🔧 使用更兼容的 UPSERT 方式
            # 先嘗試更新，如果沒有更新任何行則插入
            cursor = await self._connection.execute(
                '''UPDATE funnel_stages SET stage = ?, reason = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE user_id = ?''',
                (stage, reason, user_id)
            )
            
            if cursor.rowcount == 0:
                # 沒有更新，說明記錄不存在，執行插入
                if has_phone_column:
                    # 舊表有 phone 列，插入時提供默認值
                    await self._connection.execute(
                        '''INSERT INTO funnel_stages (user_id, stage, reason, phone) VALUES (?, ?, ?, ?)''',
                        (user_id, stage, reason, 'unknown')
                    )
                else:
                    await self._connection.execute(
                        '''INSERT INTO funnel_stages (user_id, stage, reason) VALUES (?, ?, ?)''',
                        (user_id, stage, reason)
                    )
            await self._connection.commit()
            
            import sys
            print(f"[Database] Updated funnel stage: user_id={user_id}, stage={stage}", file=sys.stderr)
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating funnel stage: {e}", file=sys.stderr)
            return False
    
    async def get_funnel_stage(
        self,
        user_id: int
    ) -> Optional[Dict]:
        """獲取用戶的銷售漏斗階段
        
        Args:
            user_id: 用戶 ID
            
        Returns:
            Dict: 漏斗階段信息，不存在返回 None
        """
        try:
            await self.connect()
            
            cursor = await self._connection.execute(
                '''SELECT * FROM funnel_stages WHERE user_id = ?''',
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                return dict(row)
            return None
        except Exception as e:
            import sys
            print(f"[Database] Error getting funnel stage: {e}", file=sys.stderr)
            return None
    
    async def get_funnel_statistics(self) -> Dict:
        """獲取銷售漏斗統計
            
        Returns:
            Dict: 各階段的用戶數量
        """
        try:
            await self.connect()
            
            cursor = await self._connection.execute(
                '''SELECT stage, COUNT(*) as count FROM funnel_stages GROUP BY stage'''
            )
            
            rows = await cursor.fetchall()
            
            stats = {
                'new': 0,
                'interested': 0,
                'engaged': 0,
                'qualified': 0,
                'converted': 0,
                'replied': 0,
                'total': 0
            }
            
            for row in rows:
                stage = row['stage']
                count = row['count']
                if stage in stats:
                    stats[stage] = count
                stats['total'] += count
            
            return stats
        except Exception as e:
            import sys
            print(f"[Database] Error getting funnel statistics: {e}", file=sys.stderr)
            return {'new': 0, 'interested': 0, 'engaged': 0, 'qualified': 0, 'converted': 0, 'replied': 0, 'total': 0}
    
    # ==================== 收集用戶管理 ====================
    
    async def upsert_collected_user(self, user_data: Dict[str, Any]) -> int:
        """插入或更新收集的用戶
        
        Args:
            user_data: 用戶數據字典
            
        Returns:
            用戶 ID
        """
        await self._ensure_keyword_tables()
        try:
            telegram_id = str(user_data.get('telegram_id', ''))
            if not telegram_id:
                raise ValueError("telegram_id is required")
            
            # 檢查是否已存在
            existing = await self.fetch_one(
                "SELECT id, message_count, source_groups FROM collected_users WHERE telegram_id = ?",
                (telegram_id,)
            )
            
            import json
            
            if existing:
                # 更新現有記錄
                existing_dict = dict(existing) if hasattr(existing, 'keys') else {
                    'id': existing[0], 'message_count': existing[1], 'source_groups': existing[2]
                }
                
                # 合併來源群組
                old_groups = json.loads(existing_dict.get('source_groups', '[]') or '[]')
                new_groups = user_data.get('source_groups', [])
                if isinstance(new_groups, str):
                    new_groups = json.loads(new_groups)
                merged_groups = list(set(old_groups + new_groups))
                
                # 更新消息計數
                new_count = existing_dict.get('message_count', 0) + user_data.get('message_increment', 1)
                
                await self.execute('''
                    UPDATE collected_users SET
                        username = COALESCE(?, username),
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        bio = COALESCE(?, bio),
                        has_photo = COALESCE(?, has_photo),
                        is_premium = COALESCE(?, is_premium),
                        is_verified = COALESCE(?, is_verified),
                        is_bot = COALESCE(?, is_bot),
                        source_groups = ?,
                        message_count = ?,
                        groups_count = ?,
                        last_seen_at = CURRENT_TIMESTAMP,
                        last_message_at = COALESCE(?, last_message_at),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                ''', (
                    user_data.get('username'),
                    user_data.get('first_name'),
                    user_data.get('last_name'),
                    user_data.get('bio'),
                    user_data.get('has_photo'),
                    user_data.get('is_premium'),
                    user_data.get('is_verified'),
                    user_data.get('is_bot'),
                    json.dumps(merged_groups),
                    new_count,
                    len(merged_groups),
                    user_data.get('last_message_at'),
                    telegram_id
                ))
                return existing_dict['id']
            else:
                # 插入新記錄
                source_groups = user_data.get('source_groups', [])
                if isinstance(source_groups, list):
                    source_groups = json.dumps(source_groups)
                
                # 🔧 Phase7: 獲取 owner_user_id
                try:
                    from core.tenant_filter import get_owner_user_id
                    _cu_owner_id = get_owner_user_id()
                except ImportError:
                    _cu_owner_id = 'local_user'
                return await self.execute_insert('''
                    INSERT INTO collected_users (
                        telegram_id, username, first_name, last_name, bio,
                        has_photo, is_premium, is_verified, is_bot,
                        source_groups, collected_by, message_count, groups_count,
                        last_message_at, owner_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    telegram_id,
                    user_data.get('username', ''),
                    user_data.get('first_name', ''),
                    user_data.get('last_name', ''),
                    user_data.get('bio', ''),
                    1 if user_data.get('has_photo') else 0,
                    1 if user_data.get('is_premium') else 0,
                    1 if user_data.get('is_verified') else 0,
                    1 if user_data.get('is_bot') else 0,
                    source_groups,
                    user_data.get('collected_by', ''),
                    1,
                    1,
                    user_data.get('last_message_at'),
                    _cu_owner_id
                ))
        except Exception as e:
            import sys
            print(f"[Database] Error upserting collected user: {e}", file=sys.stderr)
            raise e
    
    async def update_user_risk_score(self, telegram_id: str, risk_score: float, risk_factors: Dict, value_level: str) -> bool:
        """更新用戶的風險評分"""
        try:
            import json
            await self.execute('''
                UPDATE collected_users SET
                    ad_risk_score = ?,
                    risk_factors = ?,
                    value_level = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            ''', (risk_score, json.dumps(risk_factors), value_level, str(telegram_id)))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating risk score: {e}", file=sys.stderr)
            return False
    
    async def add_user_message_sample(self, telegram_id: str, group_id: str, group_name: str, 
                                       message_text: str, analysis: Dict) -> int:
        """添加用戶消息樣本"""
        await self._ensure_keyword_tables()
        try:
            import json
            return await self.execute_insert('''
                INSERT INTO user_messages_sample (
                    user_telegram_id, group_id, group_name, message_text,
                    contains_link, contains_contact, ad_keywords_matched, content_risk_score,
                    message_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                str(telegram_id),
                group_id,
                group_name,
                message_text[:1000] if message_text else '',  # 限制長度
                1 if analysis.get('contains_link') else 0,
                1 if analysis.get('contains_contact') else 0,
                json.dumps(analysis.get('ad_keywords_matched', [])),
                analysis.get('content_risk_score', 0)
            ))
        except Exception as e:
            import sys
            print(f"[Database] Error adding message sample: {e}", file=sys.stderr)
            return 0
    
    async def get_collected_users(self, filters: Dict = None, limit: int = 100, offset: int = 0) -> List[Dict]:
        """獲取收集的用戶列表"""
        await self._ensure_keyword_tables()
        try:
            filters = filters or {}
            
            where_clauses = ["1=1"]
            params = []
            
            # 風險等級篩選
            if 'min_risk' in filters:
                where_clauses.append("ad_risk_score >= ?")
                params.append(filters['min_risk'])
            if 'max_risk' in filters:
                where_clauses.append("ad_risk_score <= ?")
                params.append(filters['max_risk'])
            
            # 價值等級篩選
            if 'value_levels' in filters and filters['value_levels']:
                placeholders = ','.join(['?' for _ in filters['value_levels']])
                where_clauses.append(f"value_level IN ({placeholders})")
                params.extend(filters['value_levels'])
            
            # 排除廣告號
            if filters.get('exclude_ads'):
                where_clauses.append("(is_ad_account IS NULL OR is_ad_account = 0)")
            
            # 排除黑名單
            if filters.get('exclude_blacklist'):
                where_clauses.append("is_blacklisted = 0")
            
            # 只看有用戶名的
            if filters.get('has_username'):
                where_clauses.append("username IS NOT NULL AND username != ''")
            
            # 來源群組篩選
            if 'source_group' in filters:
                where_clauses.append("source_groups LIKE ?")
                params.append(f'%{filters["source_group"]}%')
            
            where_sql = " AND ".join(where_clauses)
            
            # 排序
            order_by = filters.get('order_by', 'last_seen_at DESC')
            
            query = f'''
                SELECT * FROM collected_users 
                WHERE {where_sql}
                ORDER BY {order_by}
                LIMIT ? OFFSET ?
            '''
            params.extend([limit, offset])
            
            rows = await self.fetch_all(query, tuple(params))
            
            import json
            result = []
            for row in rows:
                user = dict(row) if hasattr(row, 'keys') else row
                # 解析 JSON 字段
                for field in ['source_groups', 'risk_factors', 'tags']:
                    if user.get(field):
                        try:
                            user[field] = json.loads(user[field])
                        except:
                            user[field] = []
                result.append(user)
            
            return result
        except Exception as e:
            import sys
            print(f"[Database] Error getting collected users: {e}", file=sys.stderr)
            return []
    
    async def get_collected_users_count(self, filters: Dict = None) -> int:
        """獲取收集用戶總數"""
        await self._ensure_keyword_tables()
        try:
            filters = filters or {}
            
            where_clauses = ["1=1"]
            params = []
            
            if filters.get('exclude_ads'):
                where_clauses.append("(is_ad_account IS NULL OR is_ad_account = 0)")
            if filters.get('exclude_blacklist'):
                where_clauses.append("is_blacklisted = 0")
            
            where_sql = " AND ".join(where_clauses)
            
            row = await self.fetch_one(
                f"SELECT COUNT(*) as cnt FROM collected_users WHERE {where_sql}",
                tuple(params)
            )
            return row['cnt'] if row else 0
        except Exception as e:
            import sys
            print(f"[Database] Error getting collected users count: {e}", file=sys.stderr)
            return 0
    
    async def mark_user_as_ad(self, telegram_id: str, is_ad: bool) -> bool:
        """標記用戶為廣告號"""
        try:
            await self.execute(
                "UPDATE collected_users SET is_ad_account = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
                (1 if is_ad else 0, str(telegram_id))
            )
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error marking user as ad: {e}", file=sys.stderr)
            return False
    
    async def blacklist_user(self, telegram_id: str, blacklist: bool) -> bool:
        """將用戶加入/移出黑名單"""
        try:
            await self.execute(
                "UPDATE collected_users SET is_blacklisted = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?",
                (1 if blacklist else 0, str(telegram_id))
            )
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error blacklisting user: {e}", file=sys.stderr)
            return False
    
    async def get_user_message_samples(self, telegram_id: str, limit: int = 10) -> List[Dict]:
        """獲取用戶的消息樣本"""
        try:
            rows = await self.fetch_all(
                "SELECT * FROM user_messages_sample WHERE user_telegram_id = ? ORDER BY message_time DESC LIMIT ?",
                (str(telegram_id), limit)
            )
            import json
            result = []
            for row in rows:
                sample = dict(row) if hasattr(row, 'keys') else row
                if sample.get('ad_keywords_matched'):
                    try:
                        sample['ad_keywords_matched'] = json.loads(sample['ad_keywords_matched'])
                    except:
                        sample['ad_keywords_matched'] = []
                result.append(sample)
            return result
        except Exception as e:
            import sys
            print(f"[Database] Error getting message samples: {e}", file=sys.stderr)
            return []
    
    async def get_collected_users_stats(self) -> Dict:
        """獲取收集用戶統計"""
        await self._ensure_keyword_tables()
        try:
            stats = {
                'total': 0,
                'by_value_level': {'S': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0},
                'by_risk': {'low': 0, 'medium': 0, 'high': 0},
                'ad_accounts': 0,
                'blacklisted': 0,
                'with_username': 0,
                'premium': 0
            }
            
            # 總數
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users")
            stats['total'] = row['cnt'] if row else 0
            
            # 按價值等級
            rows = await self.fetch_all(
                "SELECT value_level, COUNT(*) as cnt FROM collected_users GROUP BY value_level"
            )
            for row in rows:
                level = row['value_level'] if hasattr(row, 'keys') else row[0]
                count = row['cnt'] if hasattr(row, 'keys') else row[1]
                if level in stats['by_value_level']:
                    stats['by_value_level'][level] = count
            
            # 按風險等級
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE ad_risk_score < 0.4")
            stats['by_risk']['low'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE ad_risk_score >= 0.4 AND ad_risk_score < 0.7")
            stats['by_risk']['medium'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE ad_risk_score >= 0.7")
            stats['by_risk']['high'] = row['cnt'] if row else 0
            
            # 其他統計
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE is_ad_account = 1")
            stats['ad_accounts'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE is_blacklisted = 1")
            stats['blacklisted'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE username IS NOT NULL AND username != ''")
            stats['with_username'] = row['cnt'] if row else 0
            
            row = await self.fetch_one("SELECT COUNT(*) as cnt FROM collected_users WHERE is_premium = 1")
            stats['premium'] = row['cnt'] if row else 0
            
            return stats
        except Exception as e:
            import sys
            print(f"[Database] Error getting collected users stats: {e}", file=sys.stderr)
            return {'total': 0, 'by_value_level': {}, 'by_risk': {}, 'ad_accounts': 0, 'blacklisted': 0}


