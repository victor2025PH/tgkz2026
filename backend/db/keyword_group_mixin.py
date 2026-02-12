"""
Phase 9-2: Keyword sets, monitored groups, trigger rules, message templates
Mixin class for Database — merged via multiple inheritance.
"""
from typing import Dict, List, Any, Optional
import json
import sys
import re
import traceback


class KeywordGroupMixin:
    """Keyword sets, monitored groups, trigger rules, message templates"""

    # ============ 關鍵詞集操作 ============
    
    # 🔧 性能優化：使用標誌位確保表只創建一次
    _keyword_tables_initialized = False
    
    async def _ensure_keyword_tables(self):
        """確保關鍵詞相關表存在（只執行一次）"""
        # 🔧 性能優化：如果已初始化，直接返回
        if KeywordGroupMixin._keyword_tables_initialized:
            return
        
        try:
            # 關鍵詞集表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS keyword_sets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    keywords TEXT DEFAULT '[]',
                    match_mode TEXT DEFAULT 'fuzzy',
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 🔧 遷移：添加 match_mode 字段（如果不存在）
            # 使用更可靠的方法：直接嘗試 SELECT 該列
            try:
                # 如果列不存在，這個查詢會失敗
                await self.fetch_one("SELECT match_mode FROM keyword_sets LIMIT 1")
            except Exception as check_error:
                # 列不存在，嘗試添加
                error_str = str(check_error).lower()
                if 'no such column' in error_str or 'no column' in error_str:
                    try:
                        await self.execute('ALTER TABLE keyword_sets ADD COLUMN match_mode TEXT DEFAULT "fuzzy"')
                        import sys
                        print("[Database] Added match_mode column to keyword_sets", file=sys.stderr)
                    except Exception:
                        pass  # 可能同時有其他進程添加了，忽略
            
            # 聊天模板表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS chat_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT DEFAULT 'custom',
                    content TEXT NOT NULL,
                    variables TEXT DEFAULT '[]',
                    usage_count INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0,
                    last_used TIMESTAMP,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # AI 營銷策略表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_strategies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    strategy_json TEXT NOT NULL,
                    is_active INTEGER DEFAULT 0,
                    total_leads INTEGER DEFAULT 0,
                    contacted INTEGER DEFAULT 0,
                    converted INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # AI 模型配置表 - 持久化存儲 API Key 和模型配置
            # 🔧 P0: 加 user_id 實現每用戶獨立 AI 設置
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT DEFAULT '',
                    provider TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    display_name TEXT,
                    api_key TEXT,
                    api_endpoint TEXT,
                    is_local INTEGER DEFAULT 0,
                    is_default INTEGER DEFAULT 0,
                    priority INTEGER DEFAULT 0,
                    is_connected INTEGER DEFAULT 0,
                    last_tested_at TIMESTAMP,
                    config_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # AI 設置表 - 存儲模型用途分配等 AI 相關設置
            # 🔧 P0: 改為 (user_id, key) 複合主鍵，每用戶獨立設置
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_settings (
                    key TEXT NOT NULL,
                    value TEXT,
                    user_id TEXT DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, key)
                )
            ''')
            
            # 🔧 P0: 遷移 — 給已有表補 user_id 列（SQLite ALTER TABLE 安全，列已存在時忽略）
            for tbl in ('ai_models', 'ai_settings'):
                try:
                    await self.execute(f"ALTER TABLE {tbl} ADD COLUMN user_id TEXT DEFAULT ''")
                except Exception:
                    pass  # 列已存在
            
            # 關鍵詞表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS keywords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword_set_id INTEGER NOT NULL,
                    keyword TEXT NOT NULL,
                    match_type TEXT DEFAULT 'contains',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (keyword_set_id) REFERENCES keyword_sets(id) ON DELETE CASCADE
                )
            ''')
            
            # 監控群組表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS monitored_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    link TEXT,
                    telegram_id TEXT,
                    resource_id INTEGER,
                    keyword_set_id INTEGER,
                    keyword_set_ids TEXT DEFAULT '[]',
                    account_phone TEXT,
                    phone TEXT,
                    keywords TEXT DEFAULT '',
                    is_active INTEGER DEFAULT 1,
                    member_count INTEGER DEFAULT 0,
                    resource_type TEXT DEFAULT 'group',
                    can_extract_members INTEGER DEFAULT 1,
                    sync_status TEXT DEFAULT 'synced',
                    last_active TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (keyword_set_id) REFERENCES keyword_sets(id) ON DELETE SET NULL,
                    FOREIGN KEY (resource_id) REFERENCES discovered_resources(id) ON DELETE SET NULL
                )
            ''')
            
            # 🔧 Phase8-P1-2: 添加緩存統計列
            for col_name, col_def in [
                ('cached_msg_count', 'INTEGER DEFAULT 0'),
                ('cached_user_count', 'INTEGER DEFAULT 0'),
            ]:
                try:
                    await self.fetch_one(f"SELECT {col_name} FROM monitored_groups LIMIT 1")
                except Exception:
                    try:
                        await self.execute(f'ALTER TABLE monitored_groups ADD COLUMN {col_name} {col_def}')
                    except Exception:
                        pass
            
            # 消息模板表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS message_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    is_active INTEGER DEFAULT 1,
                    use_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 觸發規則表 - 定義關鍵詞匹配後的響應動作
            await self.execute('''
                CREATE TABLE IF NOT EXISTS trigger_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    priority INTEGER DEFAULT 2,
                    is_active INTEGER DEFAULT 1,
                    
                    source_type TEXT DEFAULT 'all',
                    source_group_ids TEXT DEFAULT '[]',
                    keyword_set_ids TEXT NOT NULL DEFAULT '[]',
                    conditions TEXT DEFAULT '{}',
                    
                    response_type TEXT NOT NULL DEFAULT 'ai_chat',
                    response_config TEXT DEFAULT '{}',
                    
                    sender_type TEXT DEFAULT 'auto',
                    sender_account_ids TEXT DEFAULT '[]',
                    delay_min INTEGER DEFAULT 30,
                    delay_max INTEGER DEFAULT 120,
                    daily_limit INTEGER DEFAULT 50,
                    
                    auto_add_lead INTEGER DEFAULT 1,
                    notify_me INTEGER DEFAULT 0,
                    
                    trigger_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    last_triggered TIMESTAMP,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # ==================== 收集用戶與廣告識別相關表 ====================
            
            # 收集的用戶表 - 存儲從群組收集的活躍用戶
            await self.execute('''
                CREATE TABLE IF NOT EXISTS collected_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    bio TEXT,
                    phone TEXT,
                    
                    -- 廣告風險評估
                    ad_risk_score REAL DEFAULT 0,
                    risk_factors TEXT DEFAULT '{}',
                    is_ad_account INTEGER DEFAULT NULL,
                    is_blacklisted INTEGER DEFAULT 0,
                    
                    -- 帳號特徵
                    has_photo INTEGER DEFAULT 0,
                    is_premium INTEGER DEFAULT 0,
                    is_verified INTEGER DEFAULT 0,
                    is_bot INTEGER DEFAULT 0,
                    account_age_days INTEGER,
                    
                    -- 來源信息
                    source_groups TEXT DEFAULT '[]',
                    collected_by TEXT,
                    
                    -- 活躍度統計
                    message_count INTEGER DEFAULT 0,
                    groups_count INTEGER DEFAULT 0,
                    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_message_at TIMESTAMP,
                    
                    -- 評分
                    value_level TEXT DEFAULT 'C',
                    activity_score REAL DEFAULT 0.5,
                    
                    -- 營銷狀態
                    contacted INTEGER DEFAULT 0,
                    contacted_at TIMESTAMP,
                    response_status TEXT DEFAULT 'none',
                    
                    -- 標籤和備註
                    tags TEXT DEFAULT '[]',
                    notes TEXT,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 用戶消息樣本表 - 存儲用戶的消息樣本用於分析
            await self.execute('''
                CREATE TABLE IF NOT EXISTS user_messages_sample (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_telegram_id TEXT NOT NULL,
                    group_id TEXT,
                    group_name TEXT,
                    message_text TEXT,
                    message_time TIMESTAMP,
                    
                    -- 內容分析結果
                    contains_link INTEGER DEFAULT 0,
                    contains_contact INTEGER DEFAULT 0,
                    ad_keywords_matched TEXT DEFAULT '[]',
                    content_risk_score REAL DEFAULT 0,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_telegram_id) REFERENCES collected_users(telegram_id) ON DELETE CASCADE
                )
            ''')
            
            # 廣告識別規則表 - 存儲可配置的識別規則
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ad_detection_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_name TEXT NOT NULL,
                    rule_type TEXT NOT NULL,
                    rule_config TEXT NOT NULL,
                    weight REAL DEFAULT 0.1,
                    is_active INTEGER DEFAULT 1,
                    match_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 廣告關鍵詞表 - 存儲廣告識別關鍵詞
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ad_keywords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword TEXT NOT NULL UNIQUE,
                    category TEXT DEFAULT 'general',
                    risk_weight REAL DEFAULT 0.1,
                    match_count INTEGER DEFAULT 0,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            try:
                await self.execute('CREATE INDEX IF NOT EXISTS idx_collected_users_telegram_id ON collected_users(telegram_id)')
                await self.execute('CREATE INDEX IF NOT EXISTS idx_collected_users_ad_risk ON collected_users(ad_risk_score)')
                await self.execute('CREATE INDEX IF NOT EXISTS idx_collected_users_value_level ON collected_users(value_level)')
                await self.execute('CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages_sample(user_telegram_id)')
            except Exception:
                pass  # 索引可能已存在
            
            # 🔧 性能優化：標記為已初始化
            KeywordGroupMixin._keyword_tables_initialized = True
            
        except Exception as e:
            print(f"Error creating keyword tables: {e}")
            # 即使出錯也標記為已嘗試，避免重複嘗試
            KeywordGroupMixin._keyword_tables_initialized = True
    
    # 🆕 知識庫表初始化標誌
    _knowledge_tables_initialized = False
    
    async def _ensure_knowledge_tables(self):
        """🆕 確保知識庫相關表存在（只執行一次）"""
        if KeywordGroupMixin._knowledge_tables_initialized:
            return
        
        try:
            import sys
            print("[Database] Ensuring knowledge tables exist...", file=sys.stderr)
            
            # AI 知識庫表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS ai_knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL DEFAULT 'general',
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    keywords TEXT,
                    priority INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1,
                    use_count INTEGER DEFAULT 0,
                    last_used_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            await self.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_category ON ai_knowledge_base(category)')
            await self.execute('CREATE INDEX IF NOT EXISTS idx_knowledge_active ON ai_knowledge_base(is_active)')
            
            # 對話效果追蹤表
            await self.execute('''
                CREATE TABLE IF NOT EXISTS conversation_effectiveness (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    ai_message TEXT NOT NULL,
                    user_response TEXT,
                    response_time_seconds INTEGER,
                    is_positive_response INTEGER DEFAULT 0,
                    is_continued_conversation INTEGER DEFAULT 0,
                    triggered_keyword TEXT,
                    source_group TEXT,
                    effectiveness_score REAL DEFAULT 0,
                    learned INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            await self.execute('CREATE INDEX IF NOT EXISTS idx_conv_eff_user ON conversation_effectiveness(user_id)')
            await self.execute('CREATE INDEX IF NOT EXISTS idx_conv_eff_learned ON conversation_effectiveness(learned)')
            
            KeywordGroupMixin._knowledge_tables_initialized = True
            print("[Database] ✓ Knowledge tables created/verified", file=sys.stderr)
            
        except Exception as e:
            print(f"[Database] Error creating knowledge tables: {e}", file=sys.stderr)
            KeywordGroupMixin._knowledge_tables_initialized = True
    
    async def add_keyword_set(self, name: str, description: str = '') -> int:
        """添加關鍵詞集
        
        🆕 P1: 自動添加 owner_user_id 進行租戶隔離
        """
        await self._ensure_keyword_tables()
        try:
            # 🆕 P1: 添加 owner_user_id
            try:
                from core.tenant_filter import get_owner_user_id
                owner_id = get_owner_user_id()
                return await self.execute_insert(
                    'INSERT INTO keyword_sets (name, description, owner_user_id) VALUES (?, ?, ?)',
                    (name, description, owner_id)
                )
            except ImportError:
                return await self.execute_insert(
                    "INSERT INTO keyword_sets (name, description, owner_user_id) VALUES (?, ?, 'local_user')",
                    (name, description)
                )
        except Exception as e:
            print(f"Error adding keyword set: {e}")
            raise e
    
    async def get_all_keyword_sets(self) -> List[Dict]:
        """獲取所有關鍵詞集
        
        🔧 修復：同時從兩個來源讀取關鍵詞並合併：
        1. keyword_sets.keywords JSON 字段（新格式）
        2. keywords 關聯表（舊格式）
        
        🔧 格式統一：同時包含 'keyword' 和 'text' 字段，確保匹配器和前端都能使用
        
        🆕 P1: 添加租戶過濾，只返回當前用戶的關鍵詞集
        """
        await self._ensure_keyword_tables()
        import sys
        
        try:
            # 🔧 Phase7 修復: 將歷史數據歸屬當前用戶
            try:
                from core.tenant_filter import get_owner_user_id, should_apply_tenant_filter
                if should_apply_tenant_filter('keyword_sets'):
                    _ks_owner = get_owner_user_id()
                    if _ks_owner and _ks_owner != 'local_user':
                        await self.execute(
                            "UPDATE keyword_sets SET owner_user_id = ? WHERE owner_user_id IS NULL OR owner_user_id = '' OR owner_user_id = 'local_user'",
                            (_ks_owner,)
                        )
            except ImportError:
                pass
            
            # 🆕 P1: 應用租戶過濾
            query = 'SELECT * FROM keyword_sets ORDER BY created_at DESC'
            try:
                from core.tenant_filter import add_tenant_filter
                query, params = add_tenant_filter(query, 'keyword_sets', [])
                rows = await self.fetch_all(query, tuple(params) if params else None)
            except ImportError:
                rows = await self.fetch_all(query)
            result = []
            
            for row in rows:
                row_dict = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0], 'name': row[1], 'description': row[2],
                    'keywords': row[3], 'match_mode': row[4] if len(row) > 4 else 'fuzzy',
                    'is_active': row[5] if len(row) > 5 else 1,
                    'created_at': row[6] if len(row) > 6 else None,
                    'updated_at': row[7] if len(row) > 7 else None
                }
                
                set_id = row_dict['id']
                all_keywords = []
                seen_texts = set()  # 用於去重
                
                # ========== 來源 1: 從 JSON 字段解析 ==========
                keywords_raw = row_dict.get('keywords', '[]')
                try:
                    if isinstance(keywords_raw, str):
                        json_keywords = json.loads(keywords_raw) if keywords_raw else []
                    else:
                        json_keywords = keywords_raw or []
                except (json.JSONDecodeError, TypeError):
                    json_keywords = []
                
                for i, kw in enumerate(json_keywords):
                    if isinstance(kw, dict):
                        text = kw.get('text', kw.get('keyword', ''))
                    elif isinstance(kw, str):
                        text = kw
                    else:
                        continue
                    
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        all_keywords.append({
                            'id': kw.get('id', f"kw-{set_id}-{i}") if isinstance(kw, dict) else f"kw-{set_id}-{i}",
                            'keyword': text,  # 🔧 匹配器使用
                            'text': text,     # 🔧 前端顯示使用
                            'isRegex': kw.get('isRegex', False) if isinstance(kw, dict) else False,
                            'matchCount': kw.get('matchCount', 0) if isinstance(kw, dict) else 0
                        })
                
                # ========== 來源 2: 從 keywords 關聯表讀取（舊數據） ==========
                try:
                    table_keywords = await self.fetch_all(
                        'SELECT * FROM keywords WHERE keyword_set_id = ?',
                        (set_id,)
                    )
                    for j, tk in enumerate(table_keywords):
                        tk_dict = dict(tk) if hasattr(tk, 'keys') else {
                            'id': tk[0], 'keyword_set_id': tk[1], 'keyword': tk[2],
                            'match_type': tk[3] if len(tk) > 3 else 'contains'
                        }
                        text = tk_dict.get('keyword', '')
                        if text and text not in seen_texts:
                            seen_texts.add(text)
                            all_keywords.append({
                                'id': f"kw-table-{tk_dict.get('id', j)}",
                                'keyword': text,  # 🔧 匹配器使用
                                'text': text,     # 🔧 前端顯示使用
                                'isRegex': tk_dict.get('match_type') == 'regex',
                                'matchCount': 0
                            })
                except Exception as table_err:
                    # keywords 表可能不存在，忽略錯誤
                    pass
                
                row_dict['keywords'] = all_keywords
                result.append(row_dict)
            
            print(f"[Database] get_all_keyword_sets: returning {len(result)} sets", file=sys.stderr)
            for s in result:
                kw_texts = [k.get('text', k.get('keyword', '')) for k in s.get('keywords', [])]
                print(f"[Database]   - {s.get('name')}: {len(s.get('keywords', []))} keywords: {kw_texts[:5]}{'...' if len(kw_texts) > 5 else ''}", file=sys.stderr)
            
            return result
        except Exception as e:
            print(f"[Database] Error getting keyword sets: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return []
    
    async def get_keyword_set(self, set_id: int) -> Optional[Dict]:
        """獲取單個關鍵詞集
        
        🔧 修復：同時從 JSON 字段和 keywords 表讀取並合併
        """
        await self._ensure_keyword_tables()
        import sys
        
        try:
            row = await self.fetch_one('SELECT * FROM keyword_sets WHERE id = ?', (set_id,))
            if row:
                row_dict = dict(row) if hasattr(row, 'keys') else {
                    'id': row[0], 'name': row[1], 'description': row[2],
                    'keywords': row[3], 'match_mode': row[4] if len(row) > 4 else 'fuzzy',
                    'is_active': row[5] if len(row) > 5 else 1
                }
                
                all_keywords = []
                seen_texts = set()
                
                # 來源 1: JSON 字段
                keywords_raw = row_dict.get('keywords', '[]')
                try:
                    if isinstance(keywords_raw, str):
                        json_keywords = json.loads(keywords_raw) if keywords_raw else []
                    else:
                        json_keywords = keywords_raw or []
                except (json.JSONDecodeError, TypeError):
                    json_keywords = []
                
                for i, kw in enumerate(json_keywords):
                    if isinstance(kw, dict):
                        text = kw.get('text', kw.get('keyword', ''))
                    elif isinstance(kw, str):
                        text = kw
                    else:
                        continue
                    
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        all_keywords.append({
                            'id': kw.get('id', f"kw-{set_id}-{i}") if isinstance(kw, dict) else f"kw-{set_id}-{i}",
                            'keyword': text,
                            'text': text,
                            'isRegex': kw.get('isRegex', False) if isinstance(kw, dict) else False,
                            'matchCount': kw.get('matchCount', 0) if isinstance(kw, dict) else 0
                        })
                
                # 來源 2: keywords 關聯表
                try:
                    table_keywords = await self.fetch_all(
                        'SELECT * FROM keywords WHERE keyword_set_id = ?',
                        (set_id,)
                    )
                    for j, tk in enumerate(table_keywords):
                        tk_dict = dict(tk) if hasattr(tk, 'keys') else {
                            'id': tk[0], 'keyword_set_id': tk[1], 'keyword': tk[2],
                            'match_type': tk[3] if len(tk) > 3 else 'contains'
                        }
                        text = tk_dict.get('keyword', '')
                        if text and text not in seen_texts:
                            seen_texts.add(text)
                            all_keywords.append({
                                'id': f"kw-table-{tk_dict.get('id', j)}",
                                'keyword': text,
                                'text': text,
                                'isRegex': tk_dict.get('match_type') == 'regex',
                                'matchCount': 0
                            })
                except Exception:
                    pass
                
                row_dict['keywords'] = all_keywords
                return row_dict
            return None
        except Exception as e:
            print(f"[Database] Error getting keyword set {set_id}: {e}", file=sys.stderr)
            return None
    
    async def remove_keyword_set(self, set_id: int) -> bool:
        """刪除關鍵詞集"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM keyword_sets WHERE id = ?', (set_id,))
            return True
        except Exception as e:
            print(f"Error removing keyword set: {e}")
            return False
    
    async def add_keyword(self, set_id_or_data, keyword: str = None, is_regex: bool = False) -> int:
        """添加關鍵詞到關鍵詞集
        
        支持兩種調用方式:
        1. add_keyword(set_id, keyword, is_regex) - 直接傳入參數
        2. add_keyword(keyword_data_dict) - 傳入字典
        """
        await self._ensure_keyword_tables()
        try:
            # 處理不同的調用方式
            if isinstance(set_id_or_data, dict):
                # 舊方式：傳入字典
                set_id = set_id_or_data.get('keywordSetId') or set_id_or_data.get('keyword_set_id')
                keyword = set_id_or_data.get('keyword') or set_id_or_data.get('text')
                is_regex = set_id_or_data.get('isRegex', False)
            else:
                # 新方式：直接傳入參數
                set_id = set_id_or_data
            
            match_type = 'regex' if is_regex else 'contains'
            
            return await self.execute_insert(
                'INSERT INTO keywords (keyword_set_id, keyword, match_type) VALUES (?, ?, ?)',
                (set_id, keyword, match_type)
            )
        except Exception as e:
            import sys
            print(f"Error adding keyword: {e}", file=sys.stderr)
            raise e
    
    async def get_keywords_by_set(self, set_id: int) -> List[Dict]:
        """獲取關鍵詞集中的所有關鍵詞"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all(
                'SELECT * FROM keywords WHERE keyword_set_id = ? ORDER BY id',
                (set_id,)
            )
            return [dict(row) if hasattr(row, 'keys') else row for row in rows]
        except Exception as e:
            print(f"Error getting keywords: {e}")
            return []
    
    async def remove_keyword(self, keyword_id: int) -> bool:
        """刪除關鍵詞"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM keywords WHERE id = ?', (keyword_id,))
            return True
        except Exception as e:
            print(f"Error removing keyword: {e}")
            return False
    
    # ============ 監控群組操作 ============
    
    async def add_group(self, url_or_data, name: str = None, keyword_set_ids: list = None) -> int:
        """添加或更新監控群組
        
        支持兩種調用方式:
        1. add_group(url, name, keyword_set_ids) - 直接傳入參數
        2. add_group(group_data_dict) - 傳入字典
        """
        await self._ensure_keyword_tables()
        import json
        
        # 處理不同的調用方式
        if isinstance(url_or_data, dict):
            # 舊方式：傳入字典
            url = url_or_data.get('link', url_or_data.get('url', ''))
            name = url_or_data.get('name', url)
            keyword_set_ids = url_or_data.get('keywordSetIds', [])
            telegram_id = url_or_data.get('telegramId', '')
            account_phone = url_or_data.get('accountPhone', '')
        else:
            # 新方式：直接傳入參數
            url = url_or_data
            name = name or url
            keyword_set_ids = keyword_set_ids or []
            telegram_id = ''
            account_phone = ''
        
        # 🔧 Phase7 修復: 獲取 owner_user_id 用於多租戶隔離
        try:
            from core.tenant_filter import get_owner_user_id
            owner_id = get_owner_user_id()
        except ImportError:
            owner_id = 'local_user'
        
        try:
            # 檢查群組是否已存在
            existing = await self.get_group_by_url(url)
            
            if existing:
                # 更新現有群組的關鍵詞集綁定 + 修復 owner_user_id
                keyword_set_ids_json = json.dumps(keyword_set_ids) if keyword_set_ids else '[]'
                await self.execute('''
                    UPDATE monitored_groups 
                    SET name = ?, keyword_set_ids = ?, owner_user_id = COALESCE(owner_user_id, ?), updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (name, keyword_set_ids_json, owner_id, existing['id']))
                return existing['id']
            else:
                # 新增群組（包含 owner_user_id）
                keyword_set_ids_json = json.dumps(keyword_set_ids) if keyword_set_ids else '[]'
                first_keyword_set_id = keyword_set_ids[0] if keyword_set_ids else None
                return await self.execute_insert('''
                    INSERT INTO monitored_groups (name, link, telegram_id, keyword_set_id, keyword_set_ids, account_phone, owner_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    name,
                    url,
                    telegram_id,
                    first_keyword_set_id,
                    keyword_set_ids_json,
                    account_phone,
                    owner_id
                ))
        except Exception as e:
            import sys
            print(f"Error adding/updating group: {e}", file=sys.stderr)
            raise e
    
    async def get_all_groups(self) -> List[Dict]:
        """獲取所有監控群組
        
        🆕 P1: 添加租戶過濾，只返回當前用戶的群組
        🔧 Phase7: 自動修復 NULL owner_user_id 的歷史數據
        """
        import sys
        await self._ensure_keyword_tables()
        try:
            # 🔧 Phase7 修復: 將歷史數據（NULL 或 'local_user'）歸屬當前用戶
            try:
                from core.tenant_filter import get_owner_user_id, should_apply_tenant_filter
                if should_apply_tenant_filter('monitored_groups'):
                    owner_id = get_owner_user_id()
                    if owner_id and owner_id != 'local_user':
                        await self.execute(
                            "UPDATE monitored_groups SET owner_user_id = ? WHERE owner_user_id IS NULL OR owner_user_id = '' OR owner_user_id = 'local_user'",
                            (owner_id,)
                        )
            except ImportError:
                pass
            
            # 🆕 P1: 應用租戶過濾
            query = 'SELECT * FROM monitored_groups ORDER BY created_at DESC'
            try:
                from core.tenant_filter import add_tenant_filter
                query, params = add_tenant_filter(query, 'monitored_groups', [])
                rows = await self.fetch_all(query, tuple(params) if params else None)
            except ImportError:
                rows = await self.fetch_all(query)
            groups = []
            for row in rows:
                group = dict(row) if hasattr(row, 'keys') else dict(row) if isinstance(row, dict) else {}
                
                # 確保 url 欄位存在（可能是 link 欄位）
                if 'url' not in group and 'link' in group:
                    group['url'] = group['link']
                
                # 將 keyword_set_id 轉換為 keywordSetIds 陣列格式（前端期望的格式）
                keyword_set_id = group.get('keyword_set_id')
                keyword_set_ids_str = group.get('keyword_set_ids', '[]')
                
                print(f"[Database] Group {group.get('id')} raw keyword_set_ids: {keyword_set_ids_str}", file=sys.stderr)
                
                # 嘗試解析 keyword_set_ids JSON 字符串
                keywordSetIds = []
                if keyword_set_ids_str and keyword_set_ids_str != '[]':
                    try:
                        import json
                        parsed = json.loads(keyword_set_ids_str)
                        if isinstance(parsed, list):
                            keywordSetIds = parsed
                    except Exception as parse_err:
                        print(f"[Database] Failed to parse keyword_set_ids: {parse_err}", file=sys.stderr)
                
                # 如果有單個 keyword_set_id 且不在列表中，添加進去
                if keyword_set_id and keyword_set_id not in keywordSetIds:
                    keywordSetIds.append(keyword_set_id)
                
                group['keywordSetIds'] = keywordSetIds
                print(f"[Database] Group {group.get('id')} final keywordSetIds: {keywordSetIds}", file=sys.stderr)
                # 確保 memberCount 欄位存在（前端期望的格式）
                group['memberCount'] = group.get('member_count', 0) or 0
                # 🆕 添加群組類型和提取權限（前端期望的格式）
                group['resourceType'] = group.get('resource_type', 'group') or 'group'
                group['canExtractMembers'] = bool(group.get('can_extract_members', 1))
                # 前端請求「群組內容」統計時需要 telegramId 查詢 chat_history / discussion_messages
                if 'telegramId' not in group and group.get('telegram_id') is not None:
                    group['telegramId'] = group.get('telegram_id')
                groups.append(group)
            
            return groups
        except Exception as e:
            import sys
            print(f"[Database] Error getting groups: {e}", file=sys.stderr)
            return []
    
    async def remove_group(self, group_id: Any) -> bool:
        """刪除監控群組 - 支持多種標識符"""
        await self._ensure_keyword_tables()
        try:
            import sys
            deleted = False
            
            # 方式1: 按 ID 刪除（如果是數字）
            if isinstance(group_id, int) or (isinstance(group_id, str) and group_id.lstrip('-').isdigit()):
                numeric_id = int(group_id) if isinstance(group_id, str) else group_id
                result = await self.execute('DELETE FROM monitored_groups WHERE id = ?', (numeric_id,))
                if result > 0:
                    deleted = True
                    print(f"[Database] Removed group by id: {numeric_id}", file=sys.stderr)
            
            # 方式2: 按 telegram_id 刪除
            if not deleted:
                result = await self.execute('DELETE FROM monitored_groups WHERE telegram_id = ?', (str(group_id),))
                if result > 0:
                    deleted = True
                    print(f"[Database] Removed group by telegram_id: {group_id}", file=sys.stderr)
            
            # 方式3: 按 link 刪除
            if not deleted:
                result = await self.execute('DELETE FROM monitored_groups WHERE link LIKE ?', (f'%{group_id}%',))
                if result > 0:
                    deleted = True
                    print(f"[Database] Removed group by link: {group_id}", file=sys.stderr)
            
            return deleted
        except Exception as e:
            import sys
            print(f"[Database] Error removing group: {e}", file=sys.stderr)
            return False
    
    async def get_all_monitored_groups(self) -> List[Dict]:
        """獲取所有監控群組（get_all_groups 的別名）"""
        return await self.get_all_groups()
    
    async def update_group_member_count(self, url: str, member_count: int) -> bool:
        """更新群組成員數"""
        try:
            await self.execute('''
                UPDATE monitored_groups 
                SET member_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE link = ? OR link LIKE ?
            ''', (member_count, url, f'%{url.split("/")[-1]}%'))
            return True
        except Exception as e:
            import sys
            print(f"[Database] Error updating group member count: {e}", file=sys.stderr)
            return False
    
    async def get_group_by_url(self, url: str) -> Optional[Dict]:
        """根據 URL 獲取群組"""
        try:
            # 提取群組標識符
            import re
            match = re.search(r'(?:t\.me|telegram\.me)/(?:joinchat/)?([^/\s]+)', url)
            identifier = match.group(1) if match else url
            
            row = await self.fetch_one('''
                SELECT * FROM monitored_groups 
                WHERE link = ? OR link LIKE ? OR link LIKE ?
            ''', (url, f'%/{identifier}', f'%/{identifier}%'))
            
            if row:
                return dict(row) if hasattr(row, 'keys') else row
            return None
        except Exception as e:
            import sys
            print(f"[Database] Error getting group by URL: {e}", file=sys.stderr)
            return None
    
    # ============ 觸發規則操作 ============
    
    async def get_all_trigger_rules(self) -> List[Dict]:
        """獲取所有觸發規則"""
        await self._ensure_keyword_tables()
        try:
            # 🔧 FIX: 執行 WAL checkpoint 確保讀取最新數據
            await self.connect()
            try:
                await self._connection.execute("PRAGMA wal_checkpoint(PASSIVE)")
            except Exception:
                pass  # 忽略 checkpoint 錯誤，繼續查詢
            
            rows = await self.fetch_all('SELECT * FROM trigger_rules ORDER BY priority DESC, created_at DESC')
            result = []
            for row in rows:
                rule = dict(row) if hasattr(row, 'keys') else row
                # 解析 JSON 字段
                for field in ['source_group_ids', 'keyword_set_ids', 'conditions', 'response_config', 'sender_account_ids']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except:
                            rule[field] = [] if field.endswith('_ids') else {}
                # 轉換字段名稱以匹配前端
                rule['isActive'] = bool(rule.get('is_active', 1))
                rule['sourceType'] = rule.get('source_type', 'all')
                rule['sourceGroupIds'] = rule.get('source_group_ids', [])
                rule['keywordSetIds'] = rule.get('keyword_set_ids', [])
                rule['responseType'] = rule.get('response_type', 'ai_chat')
                rule['responseConfig'] = rule.get('response_config', {})
                rule['senderType'] = rule.get('sender_type', 'auto')
                rule['senderAccountIds'] = rule.get('sender_account_ids', [])
                rule['delayMin'] = rule.get('delay_min', 30)
                rule['delayMax'] = rule.get('delay_max', 120)
                rule['dailyLimit'] = rule.get('daily_limit', 50)
                rule['autoAddLead'] = bool(rule.get('auto_add_lead', 1))
                rule['notifyMe'] = bool(rule.get('notify_me', 0))
                rule['triggerCount'] = rule.get('trigger_count', 0)
                rule['successCount'] = rule.get('success_count', 0)
                rule['lastTriggered'] = rule.get('last_triggered')
                rule['createdAt'] = rule.get('created_at')
                rule['updatedAt'] = rule.get('updated_at')
                result.append(rule)
            return result
        except Exception as e:
            print(f"Error getting trigger rules: {e}")
            return []
    
    async def get_trigger_rule(self, rule_id: int) -> Optional[Dict]:
        """獲取單個觸發規則"""
        await self._ensure_keyword_tables()
        try:
            row = await self.fetch_one('SELECT * FROM trigger_rules WHERE id = ?', (rule_id,))
            if row:
                rule = dict(row) if hasattr(row, 'keys') else row
                for field in ['source_group_ids', 'keyword_set_ids', 'conditions', 'response_config', 'sender_account_ids']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except:
                            rule[field] = [] if field.endswith('_ids') else {}
                return rule
            return None
        except Exception as e:
            print(f"Error getting trigger rule: {e}")
            return None
    
    async def add_trigger_rule(self, rule_data: Dict) -> int:
        """添加觸發規則"""
        import sys
        print(f"[Database] add_trigger_rule called with data: {rule_data}", file=sys.stderr)
        await self._ensure_keyword_tables()
        # 🔧 Phase7: 獲取 owner_user_id
        try:
            from core.tenant_filter import get_owner_user_id
            owner_id = get_owner_user_id()
        except ImportError:
            owner_id = 'local_user'
        try:
            print(f"[Database] Executing INSERT for trigger rule: {rule_data.get('name')}", file=sys.stderr)
            return await self.execute_insert('''
                INSERT INTO trigger_rules (
                    name, description, priority, is_active,
                    source_type, source_group_ids, keyword_set_ids, conditions,
                    response_type, response_config,
                    sender_type, sender_account_ids, delay_min, delay_max, daily_limit,
                    auto_add_lead, notify_me, owner_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rule_data.get('name', ''),
                rule_data.get('description', ''),
                rule_data.get('priority', 2),
                1 if rule_data.get('isActive', True) else 0,
                rule_data.get('sourceType', 'all'),
                json.dumps(rule_data.get('sourceGroupIds', [])),
                json.dumps(rule_data.get('keywordSetIds', [])),
                json.dumps(rule_data.get('conditions', {})),
                rule_data.get('responseType', 'ai_chat'),
                json.dumps(rule_data.get('responseConfig', {})),
                rule_data.get('senderType', 'auto'),
                json.dumps(rule_data.get('senderAccountIds', [])),
                rule_data.get('delayMin', 30),
                rule_data.get('delayMax', 120),
                rule_data.get('dailyLimit', 50),
                1 if rule_data.get('autoAddLead', True) else 0,
                1 if rule_data.get('notifyMe', False) else 0,
                owner_id
            ))
        except Exception as e:
            print(f"Error adding trigger rule: {e}")
            raise e
    
    async def update_trigger_rule(self, rule_id: int, rule_data: Dict) -> bool:
        """更新觸發規則"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('''
                UPDATE trigger_rules SET
                    name = ?, description = ?, priority = ?, is_active = ?,
                    source_type = ?, source_group_ids = ?, keyword_set_ids = ?, conditions = ?,
                    response_type = ?, response_config = ?,
                    sender_type = ?, sender_account_ids = ?, delay_min = ?, delay_max = ?, daily_limit = ?,
                    auto_add_lead = ?, notify_me = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                rule_data.get('name', ''),
                rule_data.get('description', ''),
                rule_data.get('priority', 2),
                1 if rule_data.get('isActive', True) else 0,
                rule_data.get('sourceType', 'all'),
                json.dumps(rule_data.get('sourceGroupIds', [])),
                json.dumps(rule_data.get('keywordSetIds', [])),
                json.dumps(rule_data.get('conditions', {})),
                rule_data.get('responseType', 'ai_chat'),
                json.dumps(rule_data.get('responseConfig', {})),
                rule_data.get('senderType', 'auto'),
                json.dumps(rule_data.get('senderAccountIds', [])),
                rule_data.get('delayMin', 30),
                rule_data.get('delayMax', 120),
                rule_data.get('dailyLimit', 50),
                1 if rule_data.get('autoAddLead', True) else 0,
                1 if rule_data.get('notifyMe', False) else 0,
                rule_id
            ))
            return True
        except Exception as e:
            print(f"Error updating trigger rule: {e}")
            return False
    
    async def delete_trigger_rule(self, rule_id: int) -> bool:
        """刪除觸發規則"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM trigger_rules WHERE id = ?', (rule_id,))
            return True
        except Exception as e:
            print(f"Error deleting trigger rule: {e}")
            return False
    
    async def toggle_trigger_rule(self, rule_id: int, is_active: bool) -> bool:
        """啟用/停用觸發規則"""
        await self._ensure_keyword_tables()
        try:
            await self.execute(
                'UPDATE trigger_rules SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (1 if is_active else 0, rule_id)
            )
            return True
        except Exception as e:
            print(f"Error toggling trigger rule: {e}")
            return False
    
    async def increment_trigger_rule_stats(self, rule_id: int, success: bool = True) -> bool:
        """更新觸發規則統計"""
        await self._ensure_keyword_tables()
        try:
            if success:
                await self.execute('''
                    UPDATE trigger_rules SET 
                        trigger_count = trigger_count + 1,
                        success_count = success_count + 1,
                        last_triggered = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (rule_id,))
            else:
                await self.execute('''
                    UPDATE trigger_rules SET 
                        trigger_count = trigger_count + 1,
                        last_triggered = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (rule_id,))
            return True
        except Exception as e:
            print(f"Error updating trigger rule stats: {e}")
            return False
    
    async def get_active_trigger_rules(self) -> List[Dict]:
        """獲取所有活躍的觸發規則"""
        await self._ensure_keyword_tables()
        try:
            rows = await self.fetch_all(
                'SELECT * FROM trigger_rules WHERE is_active = 1 ORDER BY priority DESC, created_at DESC'
            )
            result = []
            for row in rows:
                rule = dict(row) if hasattr(row, 'keys') else row
                for field in ['source_group_ids', 'keyword_set_ids', 'conditions', 'response_config', 'sender_account_ids']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except:
                            rule[field] = [] if field.endswith('_ids') else {}
                result.append(rule)
            return result
        except Exception as e:
            print(f"Error getting active trigger rules: {e}")
            return []
    
    # ============ 消息模板操作 ============
    
    async def add_template(self, template_data: Dict) -> int:
        """添加消息模板"""
        await self._ensure_keyword_tables()
        # 🔧 Phase7: 獲取 owner_user_id
        try:
            from core.tenant_filter import get_owner_user_id
            owner_id = get_owner_user_id()
        except ImportError:
            owner_id = 'local_user'
        try:
            return await self.execute_insert('''
                INSERT INTO message_templates (name, content, category, owner_user_id)
                VALUES (?, ?, ?, ?)
            ''', (
                template_data.get('name', ''),
                template_data.get('content', ''),
                template_data.get('category', 'general'),
                owner_id
            ))
        except Exception as e:
            print(f"Error adding template: {e}")
            raise e
    
    async def get_all_templates(self) -> List[Dict]:
        """獲取所有消息模板（統一讀取 chat_templates 表）"""
        await self._ensure_keyword_tables()
        try:
            # 改為讀取 chat_templates 表，這是實際存儲用戶創建模板的表
            rows = await self.fetch_all('SELECT * FROM chat_templates ORDER BY usage_count DESC, created_at DESC')
            import json
            templates = []
            for row in rows:
                template = dict(row) if hasattr(row, 'keys') else row
                # 轉換字段名以匹配前端期望
                template['isActive'] = bool(template.get('is_active', 1))
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
            print(f"Error getting templates: {e}")
            return []
    
    async def remove_template(self, template_id: int) -> bool:
        """刪除消息模板"""
        await self._ensure_keyword_tables()
        try:
            await self.execute('DELETE FROM message_templates WHERE id = ?', (template_id,))
            return True
        except Exception as e:
            print(f"Error removing template: {e}")
            return False
    
    async def toggle_template_status(self, template_id: int, is_active: bool) -> bool:
        """切換模板狀態"""
        await self._ensure_keyword_tables()
        try:
            await self.execute(
                'UPDATE message_templates SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (1 if is_active else 0, template_id)
            )
            return True
        except Exception as e:
            print(f"Error toggling template status: {e}")
            return False
    
    # ============ 營銷活動操作 ============
