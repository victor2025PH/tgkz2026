#!/usr/bin/env python3
"""
數據庫完整性測試腳本
Database Integrity Test Script

檢查所有數據庫表的結構和數據一致性
"""

import os
import sys
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Tuple

# 添加父目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class DatabaseIntegrityTest:
    """數據庫完整性測試類"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'tg_bot.db')
        self.db_path = db_path
        self.results: Dict[str, Any] = {
            'test_time': datetime.now().isoformat(),
            'database_path': db_path,
            'tables': {},
            'issues': [],
            'summary': {}
        }
        
    def connect(self) -> sqlite3.Connection:
        """連接數據庫"""
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(f"數據庫文件不存在: {self.db_path}")
        return sqlite3.connect(self.db_path)
    
    def get_all_tables(self, conn: sqlite3.Connection) -> List[str]:
        """獲取所有表名"""
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        return [row[0] for row in cursor.fetchall()]
    
    def get_table_schema(self, conn: sqlite3.Connection, table: str) -> List[Dict]:
        """獲取表結構"""
        cursor = conn.execute(f"PRAGMA table_info({table})")
        columns = []
        for row in cursor.fetchall():
            columns.append({
                'cid': row[0],
                'name': row[1],
                'type': row[2],
                'notnull': row[3],
                'default': row[4],
                'pk': row[5]
            })
        return columns
    
    def get_table_count(self, conn: sqlite3.Connection, table: str) -> int:
        """獲取表記錄數"""
        try:
            cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
            return cursor.fetchone()[0]
        except:
            return -1
    
    def get_table_indexes(self, conn: sqlite3.Connection, table: str) -> List[str]:
        """獲取表索引"""
        cursor = conn.execute(f"PRAGMA index_list({table})")
        return [row[1] for row in cursor.fetchall()]
    
    def check_required_tables(self, conn: sqlite3.Connection) -> Dict[str, bool]:
        """檢查必需的表是否存在"""
        required_tables = [
            # 核心表
            'accounts',
            'extracted_members',
            'groups',
            'settings',
            'logs',
            # 自動化表
            'keyword_sets',
            'keywords',
            'monitored_groups',
            'message_templates',
            'automation_rules',
            # 營銷表
            'campaigns',
            'campaign_logs',
            'ad_templates',
            'ad_schedules',
            'ad_send_logs',
            # 追蹤表
            'tracked_users',
            'user_tracking_logs',
            # 標籤表
            'tags',
            'lead_tags',
            # 隊列表
            'message_queue',
            'trigger_action_logs',
            # 批量操作
            'batch_operations',
            # 用戶分組
            'user_groups',
        ]
        
        existing_tables = self.get_all_tables(conn)
        result = {}
        for table in required_tables:
            result[table] = table in existing_tables
            if not result[table]:
                self.results['issues'].append(f"缺少必需表: {table}")
        return result
    
    def check_accounts_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 accounts 表"""
        result = {'name': 'accounts', 'status': 'ok', 'details': {}}
        
        try:
            # 檢查記錄數
            count = self.get_table_count(conn, 'accounts')
            result['details']['record_count'] = count
            
            # 檢查必需字段
            schema = self.get_table_schema(conn, 'accounts')
            required_fields = ['id', 'phone', 'status', 'role']
            existing_fields = [col['name'] for col in schema]
            
            for field in required_fields:
                if field not in existing_fields:
                    result['status'] = 'warning'
                    self.results['issues'].append(f"accounts 表缺少字段: {field}")
            
            result['details']['fields'] = existing_fields
            
            # 檢查數據一致性
            cursor = conn.execute("SELECT phone, status, role FROM accounts")
            accounts = cursor.fetchall()
            
            status_counts = {}
            role_counts = {}
            for phone, status, role in accounts:
                status_counts[status] = status_counts.get(status, 0) + 1
                role_counts[role] = role_counts.get(role, 0) + 1
            
            result['details']['status_distribution'] = status_counts
            result['details']['role_distribution'] = role_counts
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
            self.results['issues'].append(f"accounts 表檢查失敗: {e}")
        
        return result
    
    def check_extracted_members_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 extracted_members 表（潛在客戶）"""
        result = {'name': 'extracted_members', 'status': 'ok', 'details': {}}
        
        try:
            count = self.get_table_count(conn, 'extracted_members')
            result['details']['record_count'] = count
            
            # 檢查階段分佈
            cursor = conn.execute("""
                SELECT status, COUNT(*) as cnt 
                FROM extracted_members 
                GROUP BY status
            """)
            status_distribution = {row[0]: row[1] for row in cursor.fetchall()}
            result['details']['funnel_distribution'] = status_distribution
            
            # 檢查來源分佈
            try:
                cursor = conn.execute("""
                    SELECT source_type, COUNT(*) as cnt 
                    FROM extracted_members 
                    WHERE source_type IS NOT NULL
                    GROUP BY source_type
                """)
                source_distribution = {row[0]: row[1] for row in cursor.fetchall()}
                result['details']['source_distribution'] = source_distribution
            except:
                result['details']['source_distribution'] = 'N/A (字段不存在)'
            
            # 檢查數據質量
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN user_id IS NULL OR user_id = '' THEN 1 ELSE 0 END) as missing_user_id,
                    SUM(CASE WHEN username IS NULL OR username = '' THEN 1 ELSE 0 END) as missing_username
                FROM extracted_members
            """)
            row = cursor.fetchone()
            result['details']['data_quality'] = {
                'total': row[0],
                'missing_user_id': row[1],
                'missing_username': row[2]
            }
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
            self.results['issues'].append(f"extracted_members 表檢查失敗: {e}")
        
        return result
    
    def check_keyword_sets_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 keyword_sets 和 keywords 表"""
        result = {'name': 'keyword_sets', 'status': 'ok', 'details': {}}
        
        try:
            # 檢查 keyword_sets
            sets_count = self.get_table_count(conn, 'keyword_sets')
            result['details']['sets_count'] = sets_count
            
            # 檢查 keywords
            keywords_count = self.get_table_count(conn, 'keywords')
            result['details']['keywords_count'] = keywords_count
            
            # 檢查關聯完整性
            cursor = conn.execute("""
                SELECT ks.id, ks.name, COUNT(k.id) as keyword_count
                FROM keyword_sets ks
                LEFT JOIN keywords k ON ks.id = k.set_id
                GROUP BY ks.id
            """)
            sets_detail = []
            for row in cursor.fetchall():
                sets_detail.append({
                    'id': row[0],
                    'name': row[1],
                    'keyword_count': row[2]
                })
            result['details']['sets_detail'] = sets_detail
            
            # 檢查孤立的 keywords
            cursor = conn.execute("""
                SELECT COUNT(*) FROM keywords k
                LEFT JOIN keyword_sets ks ON k.set_id = ks.id
                WHERE ks.id IS NULL
            """)
            orphan_count = cursor.fetchone()[0]
            if orphan_count > 0:
                result['status'] = 'warning'
                result['details']['orphan_keywords'] = orphan_count
                self.results['issues'].append(f"發現 {orphan_count} 個孤立的關鍵詞記錄")
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
        
        return result
    
    def check_monitored_groups_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 monitored_groups 表"""
        result = {'name': 'monitored_groups', 'status': 'ok', 'details': {}}
        
        try:
            count = self.get_table_count(conn, 'monitored_groups')
            result['details']['record_count'] = count
            
            # 檢查群組詳情
            cursor = conn.execute("""
                SELECT id, group_id, group_name, member_count, is_active
                FROM monitored_groups
            """)
            groups = []
            for row in cursor.fetchall():
                groups.append({
                    'id': row[0],
                    'group_id': row[1],
                    'group_name': row[2],
                    'member_count': row[3],
                    'is_active': row[4]
                })
            result['details']['groups'] = groups
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
        
        return result
    
    def check_campaigns_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 campaigns 表"""
        result = {'name': 'campaigns', 'status': 'ok', 'details': {}}
        
        try:
            count = self.get_table_count(conn, 'campaigns')
            result['details']['record_count'] = count
            
            # 檢查狀態分佈
            cursor = conn.execute("""
                SELECT status, COUNT(*) as cnt 
                FROM campaigns 
                GROUP BY status
            """)
            status_distribution = {row[0] or 'null': row[1] for row in cursor.fetchall()}
            result['details']['status_distribution'] = status_distribution
            
            # 檢查 campaign_logs
            logs_count = self.get_table_count(conn, 'campaign_logs')
            result['details']['logs_count'] = logs_count
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
        
        return result
    
    def check_message_queue_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 message_queue 表"""
        result = {'name': 'message_queue', 'status': 'ok', 'details': {}}
        
        try:
            count = self.get_table_count(conn, 'message_queue')
            result['details']['record_count'] = count
            
            # 檢查狀態分佈
            cursor = conn.execute("""
                SELECT status, COUNT(*) as cnt 
                FROM message_queue 
                GROUP BY status
            """)
            status_distribution = {row[0] or 'null': row[1] for row in cursor.fetchall()}
            result['details']['status_distribution'] = status_distribution
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
        
        return result
    
    def check_settings_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 settings 表"""
        result = {'name': 'settings', 'status': 'ok', 'details': {}}
        
        try:
            count = self.get_table_count(conn, 'settings')
            result['details']['record_count'] = count
            
            # 獲取所有設置
            cursor = conn.execute("SELECT setting_key, setting_type, category FROM settings")
            settings = {}
            for row in cursor.fetchall():
                category = row[2] or 'general'
                if category not in settings:
                    settings[category] = []
                settings[category].append(row[0])
            result['details']['settings_by_category'] = settings
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
        
        return result
    
    def check_logs_table(self, conn: sqlite3.Connection) -> Dict:
        """檢查 logs 表"""
        result = {'name': 'logs', 'status': 'ok', 'details': {}}
        
        try:
            count = self.get_table_count(conn, 'logs')
            result['details']['record_count'] = count
            
            # 檢查日誌類型分佈
            cursor = conn.execute("""
                SELECT log_type, COUNT(*) as cnt 
                FROM logs 
                GROUP BY log_type
                ORDER BY cnt DESC
                LIMIT 10
            """)
            type_distribution = {row[0] or 'null': row[1] for row in cursor.fetchall()}
            result['details']['type_distribution'] = type_distribution
            
            # 檢查最近日誌時間
            cursor = conn.execute("SELECT MAX(created_at) FROM logs")
            latest = cursor.fetchone()[0]
            result['details']['latest_log'] = latest
            
        except Exception as e:
            result['status'] = 'error'
            result['details']['error'] = str(e)
        
        return result
    
    def run_all_tests(self) -> Dict:
        """執行所有測試"""
        print("=" * 60)
        print("🔍 TG-AI智控王 數據庫完整性測試")
        print("=" * 60)
        print(f"📂 數據庫路徑: {self.db_path}")
        print(f"⏰ 測試時間: {self.results['test_time']}")
        print("-" * 60)
        
        try:
            conn = self.connect()
            
            # 1. 檢查所有表
            print("\n📋 檢查數據庫表...")
            all_tables = self.get_all_tables(conn)
            self.results['summary']['total_tables'] = len(all_tables)
            print(f"   發現 {len(all_tables)} 個表")
            
            # 2. 檢查必需表
            print("\n✅ 檢查必需表...")
            required_check = self.check_required_tables(conn)
            missing = [t for t, exists in required_check.items() if not exists]
            present = [t for t, exists in required_check.items() if exists]
            print(f"   存在: {len(present)} | 缺失: {len(missing)}")
            if missing:
                print(f"   ⚠️  缺失的表: {', '.join(missing)}")
            
            # 3. 詳細檢查各表
            print("\n🔬 詳細檢查各表...")
            
            # accounts
            print("   - accounts (帳號表)...")
            self.results['tables']['accounts'] = self.check_accounts_table(conn)
            acc = self.results['tables']['accounts']['details']
            print(f"     記錄數: {acc.get('record_count', 0)}")
            
            # extracted_members
            print("   - extracted_members (潛在客戶)...")
            self.results['tables']['extracted_members'] = self.check_extracted_members_table(conn)
            em = self.results['tables']['extracted_members']['details']
            print(f"     記錄數: {em.get('record_count', 0)}")
            print(f"     漏斗分佈: {em.get('funnel_distribution', {})}")
            
            # keyword_sets
            print("   - keyword_sets (關鍵詞組)...")
            self.results['tables']['keyword_sets'] = self.check_keyword_sets_table(conn)
            ks = self.results['tables']['keyword_sets']['details']
            print(f"     詞組數: {ks.get('sets_count', 0)} | 關鍵詞數: {ks.get('keywords_count', 0)}")
            
            # monitored_groups
            print("   - monitored_groups (監控群組)...")
            self.results['tables']['monitored_groups'] = self.check_monitored_groups_table(conn)
            mg = self.results['tables']['monitored_groups']['details']
            print(f"     群組數: {mg.get('record_count', 0)}")
            
            # campaigns
            print("   - campaigns (營銷活動)...")
            self.results['tables']['campaigns'] = self.check_campaigns_table(conn)
            cp = self.results['tables']['campaigns']['details']
            print(f"     活動數: {cp.get('record_count', 0)} | 日誌數: {cp.get('logs_count', 0)}")
            
            # message_queue
            print("   - message_queue (消息隊列)...")
            self.results['tables']['message_queue'] = self.check_message_queue_table(conn)
            mq = self.results['tables']['message_queue']['details']
            print(f"     隊列記錄: {mq.get('record_count', 0)}")
            
            # settings
            print("   - settings (設置)...")
            self.results['tables']['settings'] = self.check_settings_table(conn)
            st = self.results['tables']['settings']['details']
            print(f"     設置項: {st.get('record_count', 0)}")
            
            # logs
            print("   - logs (日誌)...")
            self.results['tables']['logs'] = self.check_logs_table(conn)
            lg = self.results['tables']['logs']['details']
            print(f"     日誌數: {lg.get('record_count', 0)}")
            
            conn.close()
            
            # 生成摘要
            self.results['summary']['tables_checked'] = len(self.results['tables'])
            self.results['summary']['issues_count'] = len(self.results['issues'])
            self.results['summary']['status'] = 'PASS' if len(self.results['issues']) == 0 else 'WARNING'
            
            print("\n" + "=" * 60)
            print("📊 測試摘要")
            print("=" * 60)
            print(f"   表總數: {self.results['summary']['total_tables']}")
            print(f"   檢查表數: {self.results['summary']['tables_checked']}")
            print(f"   問題數: {self.results['summary']['issues_count']}")
            print(f"   狀態: {self.results['summary']['status']}")
            
            if self.results['issues']:
                print("\n⚠️  發現的問題:")
                for issue in self.results['issues']:
                    print(f"   - {issue}")
            
            print("\n" + "=" * 60)
            
        except Exception as e:
            self.results['summary']['status'] = 'ERROR'
            self.results['summary']['error'] = str(e)
            print(f"\n❌ 測試失敗: {e}")
        
        return self.results
    
    def save_report(self, output_path: str = None):
        """保存測試報告"""
        if output_path is None:
            output_path = os.path.join(
                os.path.dirname(__file__), 
                f"db_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 報告已保存: {output_path}")
        return output_path


if __name__ == '__main__':
    tester = DatabaseIntegrityTest()
    results = tester.run_all_tests()
    tester.save_report()
