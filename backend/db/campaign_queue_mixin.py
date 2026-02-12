"""
Phase 9-2: Marketing campaigns, queue stats, search channels, message queue, system alerts
Mixin class for Database — merged via multiple inheritance.
"""
from typing import Dict, List, Any, Optional
import json
import sys
from datetime import datetime, timedelta


class CampaignQueueMixin:
    """Marketing campaigns, queue stats, search channels, message queue, system alerts"""

    # ============ 營銷活動操作 ============
    
    async def get_all_campaigns(self) -> List[Dict]:
        """獲取所有營銷活動"""
        try:
            return await self.fetch_all('SELECT * FROM marketing_campaigns ORDER BY created_at DESC')
        except Exception as e:
            print(f"Error getting campaigns: {e}")
            return []
    
    async def remove_campaign(self, campaign_id: int) -> bool:
        """刪除營銷活動"""
        try:
            await self.execute('DELETE FROM marketing_campaigns WHERE id = ?', (campaign_id,))
            return True
        except Exception as e:
            print(f"Error removing campaign: {e}")
            return False
    
    async def get_all_leads(self, limit: int = 500) -> List[Dict]:
        """獲取潛在客戶（從 unified_contacts 讀取，多用户一库按 owner_user_id 隔離）"""
        import sys
        try:
            from core.tenant_filter import add_tenant_filter
            query = (
                "SELECT id, telegram_id as user_id, username, first_name, last_name, phone, "
                "display_name, contact_type, source_type, source_id as source_chat_id, "
                "source_name as source_chat_title, status, tags, ai_score, activity_score, "
                "value_level, is_online, last_seen, is_premium, is_verified, created_at, updated_at "
                "FROM unified_contacts WHERE contact_type = 'user' "
                "ORDER BY created_at DESC LIMIT " + str(int(limit))
            )
            query, params = add_tenant_filter(query, 'unified_contacts', [])
            results = await self.fetch_all(query, tuple(params))
            print(f"[Database] get_all_leads: Returning {len(results)} records from unified_contacts (limit={limit})", file=sys.stderr)
            return results
        except Exception as e:
            print(f"Error getting leads: {e}", file=sys.stderr)
            return []
    
    async def get_leads_with_total(self, limit: int = 500, initial_load: bool = False) -> Dict:
        """
        獲取潛在客戶及總數（多用户一库按 owner_user_id 隔離）
        """
        import sys
        try:
            from core.tenant_filter import add_tenant_filter
            count_query = "SELECT COUNT(*) as total FROM unified_contacts WHERE contact_type = 'user'"
            count_query, count_params = add_tenant_filter(count_query, 'unified_contacts', [])
            count_result = await self.fetch_one(count_query, tuple(count_params))
            total_count = count_result['total'] if count_result else 0

            if initial_load:
                actual_limit = limit
            else:
                actual_limit = max(limit, total_count)

            data_query = (
                "SELECT id, telegram_id as user_id, username, first_name, last_name, phone, "
                "display_name, contact_type, source_type, source_id as source_chat_id, "
                "source_name as source_chat_title, status, tags, ai_score, activity_score, "
                "value_level, is_online, last_seen, is_premium, is_verified, created_at, updated_at "
                "FROM unified_contacts WHERE contact_type = 'user' "
                "ORDER BY created_at DESC LIMIT " + str(int(actual_limit))
            )
            data_query, data_params = add_tenant_filter(data_query, 'unified_contacts', [])
            results = await self.fetch_all(data_query, tuple(data_params))
            print(f"[Database] get_leads_with_total: Total={total_count}, Returning {len(results)} records (initial_load={initial_load})", file=sys.stderr)
            return {
                'leads': results,
                'total': total_count,
                'hasMore': len(results) < total_count
            }
        except Exception as e:
            print(f"Error getting leads with total: {e}", file=sys.stderr)
            return {'leads': [], 'total': 0, 'hasMore': False}
    
    async def get_leads_paginated(self, limit: int = 50, offset: int = 0, status: str = None, search: str = None) -> Dict:
        """
        🆕 分頁獲取潛在客戶（帶篩選和總數）
        🔧 FIX: 改為從 unified_contacts 讀取
        
        Args:
            limit: 每頁數量
            offset: 偏移量
            status: 狀態篩選
            search: 搜索關鍵詞
            
        Returns:
            Dict: { leads: [...], total: N, page: P, pageSize: S }
        """
        import sys
        try:
            from core.tenant_filter import add_tenant_filter
            base_query = "FROM unified_contacts WHERE contact_type = 'user'"
            params = []
            if status and status != 'all':
                base_query += ' AND status = ?'
                params.append(status)
            if search:
                base_query += ' AND (username LIKE ? OR first_name LIKE ? OR display_name LIKE ? OR telegram_id LIKE ?)'
                search_term = f'%{search}%'
                params.extend([search_term, search_term, search_term, search_term])

            count_query = f'SELECT COUNT(*) as total {base_query}'
            count_query, count_params = add_tenant_filter(count_query, 'unified_contacts', list(params))
            count_result = await self.fetch_one(count_query, tuple(count_params))
            total = count_result['total'] if count_result else 0

            data_query = (
                "SELECT id, telegram_id as user_id, username, first_name, last_name, phone, "
                "display_name, contact_type, source_type, source_id as source_chat_id, "
                "source_name as source_chat_title, status, tags, ai_score, activity_score, "
                "value_level, is_online, last_seen, is_premium, is_verified, created_at, updated_at "
                f"{base_query} ORDER BY created_at DESC LIMIT ? OFFSET ?"
            )
            data_query, data_params = add_tenant_filter(data_query, 'unified_contacts', list(params))
            data_params.extend([limit, offset])
            leads = await self.fetch_all(data_query, tuple(data_params))
            
            page = (offset // limit) + 1 if limit > 0 else 1
            
            print(f"[Database] get_leads_paginated: total={total}, page={page}, returning {len(leads)} records", file=sys.stderr)
            
            return {
                'leads': leads,
                'total': total,
                'page': page,
                'pageSize': limit,
                'hasMore': offset + len(leads) < total
            }
        except Exception as e:
            print(f"Error getting leads paginated: {e}", file=sys.stderr)
            return {'leads': [], 'total': 0, 'page': 1, 'pageSize': limit, 'hasMore': False}
    
    async def get_lead(self, lead_id: int) -> Optional[Dict]:
        """獲取單個 Lead"""
        try:
            result = await self.fetch_one('SELECT * FROM extracted_members WHERE id = ?', (lead_id,))
            return result
        except Exception as e:
            print(f"Error getting lead: {e}")
            return None
    
    async def delete_lead(self, lead_id: int) -> bool:
        """刪除單個 Lead"""
        import sys
        try:
            # 先確認記錄存在
            existing = await self.fetch_one('SELECT id, user_id FROM extracted_members WHERE id = ?', (lead_id,))
            print(f"[Database] delete_lead: looking for id={lead_id}, found={existing}", file=sys.stderr)
            
            if not existing:
                print(f"[Database] delete_lead: Lead {lead_id} not found in database", file=sys.stderr)
                return False
            
            # 執行刪除
            affected = await self.execute('DELETE FROM extracted_members WHERE id = ?', (lead_id,))
            print(f"[Database] delete_lead: DELETE affected {affected} rows", file=sys.stderr)
            
            # 確認刪除成功
            check = await self.fetch_one('SELECT id FROM extracted_members WHERE id = ?', (lead_id,))
            if check:
                print(f"[Database] delete_lead: WARNING - Lead {lead_id} still exists after DELETE!", file=sys.stderr)
                return False
            
            print(f"[Database] delete_lead: Successfully deleted Lead {lead_id}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[Database] delete_lead ERROR: {e}", file=sys.stderr)
            return False
    
    async def batch_delete_leads(self, lead_ids: List[int]) -> Dict:
        """批量刪除 Leads"""
        import sys
        try:
            print(f"[Database] batch_delete_leads: Deleting {len(lead_ids)} leads: {lead_ids}", file=sys.stderr)
            deleted = 0
            failed = []
            for lead_id in lead_ids:
                result = await self.delete_lead(lead_id)
                if result:
                    deleted += 1
                else:
                    failed.append(lead_id)
            
            print(f"[Database] batch_delete_leads: Deleted {deleted}/{len(lead_ids)}, failed: {failed}", file=sys.stderr)
            return {'success': True, 'deleted': deleted, 'failed': failed}
        except Exception as e:
            print(f"[Database] batch_delete_leads ERROR: {e}", file=sys.stderr)
            return {'success': False, 'error': str(e)}
    
    async def get_users_with_profiles(
        self,
        stage: Optional[str] = None,
        tags: Optional[List[str]] = None,
        interest_min: Optional[int] = None,
        interest_max: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """獲取用戶列表（含畫像），支持篩選"""
        try:
            query = 'SELECT * FROM extracted_members WHERE 1=1'
            params = []
            
            if stage:
                query += ' AND status = ?'
                params.append(stage)
            
            if interest_min is not None:
                query += ' AND COALESCE(intent_score, 0) >= ?'
                params.append(interest_min)
            
            if interest_max is not None:
                query += ' AND COALESCE(intent_score, 100) <= ?'
                params.append(interest_max)
            
            if search:
                query += ' AND (username LIKE ? OR first_name LIKE ? OR user_id LIKE ?)'
                search_term = f'%{search}%'
                params.extend([search_term, search_term, search_term])
            
            query += f' ORDER BY created_at DESC LIMIT {limit} OFFSET {offset}'
            
            return await self.fetch_all(query, tuple(params))
        except Exception as e:
            print(f"Error getting users with profiles: {e}")
            return []
    
    async def get_detailed_funnel_stats(self) -> Dict:
        """獲取詳細漏斗統計"""
        try:
            from datetime import datetime, timedelta
            
            # 獲取所有 leads
            all_leads = await self.fetch_all('SELECT * FROM extracted_members')
            
            today = datetime.now().date()
            week_ago = today - timedelta(days=7)
            
            # 計算統計
            today_new = sum(1 for l in all_leads if l.get('created_at') and 
                          datetime.fromisoformat(str(l['created_at']).replace('Z', '')).date() == today)
            
            week_converted = sum(1 for l in all_leads if 
                                l.get('status') == 'Closed-Won' and 
                                l.get('created_at') and
                                datetime.fromisoformat(str(l['created_at']).replace('Z', '')).date() >= week_ago)
            
            # 按狀態統計
            stages = {}
            status_mapping = {
                'New': 'new',
                'Contacted': 'contacted', 
                'Replied': 'replied',
                'Follow-up': 'follow_up',
                'Interested': 'interested',
                'Negotiating': 'negotiating',
                'Closed-Won': 'closed_won',
                'Closed-Lost': 'closed_lost'
            }
            
            for lead in all_leads:
                status = lead.get('status', 'New')
                stage_key = status_mapping.get(status, status.lower().replace('-', '_'))
                if stage_key not in stages:
                    stages[stage_key] = {'count': 0, 'value': 0}
                stages[stage_key]['count'] += 1
            
            # 收集標籤
            tags = {}
            for lead in all_leads:
                lead_tags = lead.get('auto_tags') or lead.get('tags') or ''
                if lead_tags:
                    try:
                        import json
                        tag_list = json.loads(lead_tags) if isinstance(lead_tags, str) else lead_tags
                        for tag in tag_list:
                            tags[tag] = tags.get(tag, 0) + 1
                    except:
                        pass
            
            sorted_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)
            
            return {
                'today_new': today_new,
                'week_converted': week_converted,
                'total': len(all_leads),
                'stages': stages,
                'tags': sorted_tags[:10]
            }
            
        except Exception as e:
            print(f"Error getting detailed funnel stats: {e}")
            return {
                'today_new': 0,
                'week_converted': 0,
                'total': 0,
                'stages': {},
                'tags': []
            }
    
    async def check_lead_and_dnc(self, user_id) -> tuple:
        """檢查用戶是否已存在於 Lead 列表及是否在黑名單中
        
        Args:
            user_id: 用戶 ID
            
        Returns:
            tuple: (existing_lead, is_dnc) - 現有 Lead 記錄和是否在黑名單中
        """
        try:
            # 查詢現有 Lead
            existing_lead = await self.fetch_one(
                'SELECT * FROM extracted_members WHERE user_id = ?',
                (str(user_id),)
            )
            
            # 檢查是否在黑名單中（response_status = 'blocked' 或 contacted = -1 表示不要聯繫）
            is_dnc = False
            if existing_lead:
                is_dnc = (
                    existing_lead.get('response_status') == 'blocked' or 
                    existing_lead.get('contacted') == -1
                )
            
            return (existing_lead, is_dnc)
        except Exception as e:
            import sys
            print(f"Error checking lead and DNC: {e}", file=sys.stderr)
            return (None, False)
    
    async def get_lead_by_user_id(self, user_id: str) -> Optional[Dict]:
        """根據 user_id 獲取 Lead
        
        Args:
            user_id: Telegram 用戶 ID
            
        Returns:
            Optional[Dict]: Lead 數據或 None
        """
        try:
            result = await self.fetch_one(
                '''SELECT id, user_id, username, first_name, last_name, 
                          source_chat_title, notes, online_status, 
                          contacted, response_status, created_at, updated_at
                   FROM extracted_members 
                   WHERE user_id = ?''',
                (str(user_id),)
            )
            return dict(result) if result else None
        except Exception as e:
            import sys
            print(f"Error getting lead by user_id: {e}", file=sys.stderr)
            return None
    
    async def add_lead(self, lead_data: Dict) -> int:
        """添加新的潛在客戶
        
        Args:
            lead_data: Lead 數據字典
            
        Returns:
            int: 新創建的 Lead ID
        """
        try:
            user_id = str(lead_data.get('userId', ''))
            username = lead_data.get('username', '')
            first_name = lead_data.get('firstName', '')
            last_name = lead_data.get('lastName', '')
            source_group = lead_data.get('sourceGroup', '')
            triggered_keyword = lead_data.get('triggeredKeyword', '')
            online_status = lead_data.get('onlineStatus', 'Unknown')
            
            # 🔧 Phase8-P1: 獲取 owner_user_id
            try:
                from core.tenant_filter import get_owner_user_id
                _em_owner = get_owner_user_id()
            except ImportError:
                _em_owner = 'local_user'
            await self.execute('''
                INSERT INTO extracted_members 
                (user_id, username, first_name, last_name, source_chat_title, notes, online_status, owner_user_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    username = COALESCE(excluded.username, username),
                    first_name = COALESCE(excluded.first_name, first_name),
                    last_name = COALESCE(excluded.last_name, last_name),
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, username, first_name, last_name, source_group, f'觸發詞: {triggered_keyword}', online_status, _em_owner))
            
            # 獲取插入的 ID
            result = await self.fetch_one(
                'SELECT id FROM extracted_members WHERE user_id = ?',
                (user_id,)
            )
            return result['id'] if result else 0
        except Exception as e:
            import sys
            print(f"Error adding lead: {e}", file=sys.stderr)
            return 0
    
    async def add_interaction(self, lead_id: int, action: str, details: str) -> bool:
        """添加 Lead 互動記錄
        
        Args:
            lead_id: Lead ID
            action: 動作類型
            details: 詳細信息
            
        Returns:
            bool: 是否成功
        """
        try:
            # 更新 Lead 的備註（追加互動記錄）
            current = await self.fetch_one(
                'SELECT notes FROM extracted_members WHERE id = ?',
                (lead_id,)
            )
            current_notes = current.get('notes', '') if current else ''
            import datetime
            new_note = f"\n[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}] {action}: {details}"
            
            await self.execute(
                'UPDATE extracted_members SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (current_notes + new_note, lead_id)
            )
            return True
        except Exception as e:
            import sys
            print(f"Error adding interaction: {e}", file=sys.stderr)
            return False
    
    async def update_lead(self, lead_id: int, updates: Dict) -> bool:
        """更新 Lead 信息
        
        Args:
            lead_id: Lead ID
            updates: 要更新的字段字典
            
        Returns:
            bool: 是否成功
        """
        try:
            # 構建 UPDATE 語句
            fields = []
            values = []
            
            # 映射前端字段名到數據庫字段名
            field_mapping = {
                'status': 'response_status',
                'contacted': 'contacted',
                'notes': 'notes',
                'tags': 'tags',
                'value_level': 'value_level'
            }
            
            for key, value in updates.items():
                db_field = field_mapping.get(key, key)
                fields.append(f"{db_field} = ?")
                values.append(value)
            
            if not fields:
                return True  # 沒有需要更新的字段
            
            # 添加更新時間
            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(lead_id)
            
            query = f"UPDATE extracted_members SET {', '.join(fields)} WHERE id = ?"
            await self.execute(query, tuple(values))
            return True
        except Exception as e:
            import sys
            print(f"Error updating lead: {e}", file=sys.stderr)
            return False

    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """根據 user_id 獲取用戶資料"""
        try:
            result = await self.fetch_one(
                'SELECT * FROM user_profiles WHERE user_id = ?',
                (user_id,)
            )
            return result
        except Exception as e:
            # 表可能不存在，忽略錯誤
            return None

    async def get_monitoring_config(self) -> Dict:
        """獲取監控配置"""
        try:
            is_active = self.get_setting('monitoring_active', '0')
            return {
                'isActive': is_active == '1' or is_active == 'true'
            }
        except Exception as e:
            print(f"Error getting monitoring config: {e}")
            return {'isActive': False}
    
    async def set_monitoring_active(self, is_active: bool) -> bool:
        """設置監控狀態"""
        try:
            self.set_setting('monitoring_active', '1' if is_active else '0')
            return True
        except Exception as e:
            print(f"Error setting monitoring active: {e}")
            return False
    
    # ============ 消息隊列統計 ============
    
    async def get_message_sending_stats(self, days: int = 7, phone: str = None) -> List[Dict]:
        """獲取消息發送統計"""
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            if phone:
                query = '''
                    SELECT 
                        DATE(created_at) as date,
                        phone,
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                    FROM message_queue
                    WHERE created_at >= ? AND phone = ?
                    GROUP BY DATE(created_at), phone
                    ORDER BY date DESC
                '''
                params = (since, phone)
            else:
                query = '''
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                    FROM message_queue
                    WHERE created_at >= ?
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                '''
                params = (since,)
            
            return await self.fetch_all(query, params)
        except Exception as e:
            print(f"Error getting message sending stats: {e}")
            return []

    # ==================== 自定義搜索渠道 ====================
    
    async def get_custom_search_channels(self, enabled_only: bool = False) -> List[Dict]:
        """獲取自定義搜索渠道列表"""
        try:
            if enabled_only:
                query = "SELECT * FROM custom_search_channels WHERE enabled = 1 ORDER BY priority, created_at"
            else:
                query = "SELECT * FROM custom_search_channels ORDER BY priority, created_at"
            return await self.fetch_all(query)
        except Exception as e:
            print(f"Error getting custom search channels: {e}")
            return []
    
    async def add_custom_search_channel(
        self,
        bot_username: str,
        display_name: str = None,
        query_format: str = "{keyword}",
        priority: str = "backup",
        notes: str = None
    ) -> Optional[int]:
        """添加自定義搜索渠道"""
        try:
            # 移除 @ 前綴
            bot_username = bot_username.lstrip('@')
            
            query = """
                INSERT INTO custom_search_channels 
                (bot_username, display_name, query_format, priority, notes)
                VALUES (?, ?, ?, ?, ?)
            """
            return await self.execute(query, (
                bot_username,
                display_name or bot_username,
                query_format,
                priority,
                notes
            ))
        except Exception as e:
            print(f"Error adding custom search channel: {e}")
            return None
    
    async def update_custom_search_channel(
        self,
        channel_id: int,
        **kwargs
    ) -> bool:
        """更新自定義搜索渠道"""
        try:
            allowed_fields = ['display_name', 'query_format', 'priority', 'enabled', 'notes', 'status']
            updates = []
            params = []
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    updates.append(f"{field} = ?")
                    params.append(value)
            
            if not updates:
                return False
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(channel_id)
            
            query = f"UPDATE custom_search_channels SET {', '.join(updates)} WHERE id = ?"
            await self.execute(query, tuple(params))
            return True
        except Exception as e:
            print(f"Error updating custom search channel: {e}")
            return False
    
    async def delete_custom_search_channel(self, channel_id: int) -> bool:
        """刪除自定義搜索渠道"""
        try:
            query = "DELETE FROM custom_search_channels WHERE id = ?"
            await self.execute(query, (channel_id,))
            return True
        except Exception as e:
            print(f"Error deleting custom search channel: {e}")
            return False
    
    async def update_channel_test_result(
        self,
        bot_username: str,
        success: bool,
        response_time: float = 0
    ) -> bool:
        """更新渠道測試結果"""
        try:
            bot_username = bot_username.lstrip('@')
            
            if success:
                query = """
                    UPDATE custom_search_channels SET
                        status = 'online',
                        success_count = success_count + 1,
                        last_test_at = CURRENT_TIMESTAMP,
                        last_success_at = CURRENT_TIMESTAMP,
                        avg_response_time = (avg_response_time * success_count + ?) / (success_count + 1),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE bot_username = ?
                """
                await self.execute(query, (response_time, bot_username))
            else:
                query = """
                    UPDATE custom_search_channels SET
                        status = 'offline',
                        fail_count = fail_count + 1,
                        last_test_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE bot_username = ?
                """
                await self.execute(query, (bot_username,))
            return True
        except Exception as e:
            print(f"Error updating channel test result: {e}")
            return False

    # ============ 消息隊列相關 ============
    
    async def update_queue_message_status(
        self,
        message_id: str,
        status: Optional[str] = None,
        last_error: Optional[str] = None,
        priority: Optional[str] = None
    ) -> bool:
        """更新消息隊列中消息的狀態（P14: 真正持久化到數據庫）
        
        Args:
            message_id: 消息 ID
            status: 新狀態
            last_error: 錯誤信息
            priority: 優先級
            
        Returns:
            bool: 是否成功
        """
        try:
            updates = []
            params = []
            
            if status:
                updates.append("status = ?")
                params.append(status)
                if status == 'completed':
                    updates.append("sent_at = CURRENT_TIMESTAMP")
            
            if last_error is not None:
                updates.append("error_message = ?")
                params.append(last_error[:500] if last_error else None)
            
            if priority:
                updates.append("priority = ?")
                params.append(priority)
            
            if not updates:
                return True
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(str(message_id))
            
            query = f"UPDATE message_queue SET {', '.join(updates)} WHERE id = ? OR CAST(id AS TEXT) = ?"
            params.append(str(message_id))
            
            await self.execute(query, tuple(params))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Queue status update (non-critical): {e}", file=sys.stderr)
            return False
    
    async def increment_queue_message_attempts(self, message_id: str) -> bool:
        """增加消息嘗試次數（P14: 真正持久化）
        
        Args:
            message_id: 消息 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            query = """
                UPDATE message_queue 
                SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? OR CAST(id AS TEXT) = ?
            """
            await self.execute(query, (str(message_id), str(message_id)))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Queue attempts increment (non-critical): {e}", file=sys.stderr)
            return False
    
    async def save_queue_message(
        self,
        message_id: str,
        phone: str,
        user_id: str,
        text: str,
        attachment: Optional[str] = None,
        priority: str = 'NORMAL',
        status: str = 'pending',
        scheduled_at: Optional[str] = None,
        attempts: int = 0,
        max_attempts: int = 3
    ) -> bool:
        """保存消息到隊列（用於持久化）
        
        Args:
            message_id: 消息 ID
            phone: 發送帳號
            user_id: 目標用戶 ID
            text: 消息內容
            attachment: 附件路徑
            priority: 優先級
            status: 狀態
            scheduled_at: 計劃發送時間
            attempts: 嘗試次數
            max_attempts: 最大嘗試次數
            
        Returns:
            bool: 是否成功
        """
        try:
            # P14: 真正持久化到 message_queue 表
            priority_map = {'HIGH': 1, 'NORMAL': 2, 'LOW': 3}
            priority_int = priority_map.get(str(priority).upper(), 2)
            
            query = """
                INSERT OR REPLACE INTO message_queue 
                (phone, user_id, text, priority, status, scheduled_at, retry_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            await self.execute(query, (
                phone, user_id, text[:2000], priority_int,
                status, scheduled_at, attempts
            ))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Queue message save (non-critical): {e}", file=sys.stderr)
            return False
    
    # ============ P15-2: 消息隊列恢復 ============

    async def get_pending_queue_messages(self) -> list:
        """獲取所有待處理的消息（用於重啟恢復）
        
        查詢 status = pending / retrying 的消息，按優先級和創建時間排序。
        排除已完成/已失敗/過期超過 24 小時的消息。
        
        Returns:
            list[dict]: 消息列表
        """
        try:
            query = """
                SELECT id, phone, user_id, text, priority, status,
                       scheduled_at, error_message AS last_error,
                       retry_count AS attempts, created_at
                FROM message_queue
                WHERE status IN ('pending', 'retrying', 'processing')
                  AND created_at > datetime('now', '-24 hours')
                ORDER BY priority ASC, created_at ASC
                LIMIT 500
            """
            rows = await self.fetch_all(query)
            
            results = []
            priority_map = {1: 'HIGH', 2: 'NORMAL', 3: 'LOW'}
            for row in (rows or []):
                r = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0], 'phone': row[1], 'user_id': row[2],
                    'text': row[3], 'priority': row[4], 'status': row[5],
                    'scheduled_at': row[6], 'last_error': row[7],
                    'attempts': row[8], 'created_at': row[9],
                }
                # 整數優先級 → 字符串
                if isinstance(r.get('priority'), int):
                    r['priority'] = priority_map.get(r['priority'], 'NORMAL')
                # 重置 processing 為 pending（上次未完成）
                if r.get('status') == 'processing':
                    r['status'] = 'pending'
                r.setdefault('max_attempts', 3)
                results.append(r)
            
            import sys
            print(f"[Database] Queue recovery: found {len(results)} pending messages", file=sys.stderr)
            return results
        except Exception as e:
            import sys
            print(f"[Database] Queue recovery error (non-critical): {e}", file=sys.stderr)
            return []

    async def cleanup_old_queue_messages(self, days: int = 7) -> int:
        """清理過期的消息隊列記錄
        
        刪除超過指定天數的已完成/已失敗消息，保持表精簡。
        
        Returns:
            int: 刪除的記錄數
        """
        try:
            query = f"""
                DELETE FROM message_queue
                WHERE status IN ('completed', 'failed')
                  AND updated_at < datetime('now', '-{int(days)} days')
            """
            result = await self.execute(query)
            return getattr(result, 'rowcount', 0) if result else 0
        except Exception as e:
            import sys
            print(f"[Database] Queue cleanup error: {e}", file=sys.stderr)
            return 0

    # ============ 系統告警相關 ============
    
    async def add_alert(
        self,
        alert_type: str,
        level: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> int:
        """添加系統告警
        
        Args:
            alert_type: 告警類型
            level: 告警級別 (info, warning, error, critical)
            message: 告警消息
            details: 詳細信息
            
        Returns:
            int: 告警 ID
        """
        try:
            await self.connect()
            import json
            details_str = json.dumps(details) if details else None
            
            cursor = await self._connection.execute(
                """INSERT INTO system_alerts (alert_type, level, message, details)
                   VALUES (?, ?, ?, ?)""",
                (alert_type, level, message, details_str)
            )
            await self._connection.commit()
            return cursor.lastrowid
        except Exception as e:
            import sys
            print(f"Error adding alert: {e}", file=sys.stderr)
            return 0
    
    async def acknowledge_alert(self, alert_id: int) -> bool:
        """確認告警
        
        Args:
            alert_id: 告警 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                """UPDATE system_alerts 
                   SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP 
                   WHERE id = ?""",
                (alert_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error acknowledging alert: {e}", file=sys.stderr)
            return False

    async def acknowledge_all_alerts(self) -> int:
        """將所有未解決的告警標記為已確認（用於「全部已讀」）
        Returns: 被更新的告警數量
        """
        try:
            await self.connect()
            cursor = await self._connection.execute(
                """UPDATE system_alerts 
                   SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP 
                   WHERE resolved = 0 AND (acknowledged IS NULL OR acknowledged = 0)"""
            )
            await self._connection.commit()
            return cursor.rowcount if hasattr(cursor, 'rowcount') else 0
        except Exception as e:
            import sys
            print(f"Error acknowledging all alerts: {e}", file=sys.stderr)
            return 0
    
    async def resolve_alert(self, alert_id: int) -> bool:
        """解決告警
        
        Args:
            alert_id: 告警 ID
            
        Returns:
            bool: 是否成功
        """
        try:
            await self.connect()
            await self._connection.execute(
                """UPDATE system_alerts 
                   SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
                   WHERE id = ?""",
                (alert_id,)
            )
            await self._connection.commit()
            return True
        except Exception as e:
            import sys
            print(f"Error resolving alert: {e}", file=sys.stderr)
            return False

    async def resolve_alerts_by_type(self, alert_type: str) -> int:
        """按類型批量標記告警為已解決（用於指標恢復後自動消除告警）
        
        Returns:
            int: 被標記為已解決的告警數量
        """
        try:
            await self.connect()
            cursor = await self._connection.execute(
                """UPDATE system_alerts 
                   SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
                   WHERE alert_type = ? AND resolved = 0""",
                (alert_type,)
            )
            await self._connection.commit()
            return cursor.rowcount if hasattr(cursor, 'rowcount') else 0
        except Exception as e:
            import sys
            print(f"Error resolving alerts by type: {e}", file=sys.stderr)
            return 0

    async def get_recent_alerts(self, limit: int = 50, level: Optional[str] = None) -> List[Dict[str, Any]]:
        """獲取最近告警（包括已解決）"""
        return await self.get_alerts(limit=limit, level=level, include_resolved=True)
    
    async def get_unresolved_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """獲取未解決告警"""
        return await self.get_alerts(limit=limit, include_resolved=False)
    
    async def get_alerts(
        self,
        limit: int = 50,
        level: Optional[str] = None,
        include_resolved: bool = False
    ) -> List[Dict[str, Any]]:
        """獲取告警列表
        
        Args:
            limit: 最大返回數量
            level: 篩選告警級別
            include_resolved: 是否包含已解決的告警
            
        Returns:
            List[Dict]: 告警列表
        """
        try:
            await self.connect()
            query = "SELECT * FROM system_alerts WHERE 1=1"
            params = []
            
            if not include_resolved:
                query += " AND resolved = 0"
            
            if level:
                query += " AND level = ?"
                params.append(level)
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor = await self._connection.execute(query, tuple(params))
            rows = await cursor.fetchall()
            
            import json
            alerts = []
            for row in rows:
                alert = dict(row)
                if alert.get('details'):
                    try:
                        alert['details'] = json.loads(alert['details'])
                    except:
                        pass
                alerts.append(alert)
            
            return alerts
        except Exception as e:
            import sys
            print(f"Error getting alerts: {e}", file=sys.stderr)
            return []
    
    # ============ 聊天模板相關 ============
