"""
數據庫操作輔助模組

🆕 優化設計：
1. 提供簡化的 CRUD 操作
2. 自動選擇正確的數據庫連接
3. 內建分頁、排序、過濾
4. 事務支持

使用方式：
    from core.db_operations import TenantDB
    
    # 在 API 處理器中
    db = TenantDB(user_id)
    
    # 查詢
    accounts = db.select('accounts').where(status='Online').all()
    
    # 插入
    db.insert('accounts', {'phone': '+1234567890'})
    
    # 更新
    db.update('accounts', {'status': 'Offline'}).where(id=1).execute()
    
    # 刪除
    db.delete('accounts').where(id=1).execute()
"""

import sqlite3
import logging
from typing import Optional, Dict, Any, List, Union, Tuple
from datetime import datetime
from contextlib import contextmanager

from .tenant_schema import is_system_table, is_tenant_table, TENANT_TABLES
from .tenant_database import get_tenant_db_manager, LOCAL_USER_ID

logger = logging.getLogger(__name__)


class QueryBuilder:
    """SQL 查詢構建器"""
    
    def __init__(self, table: str, connection: sqlite3.Connection, operation: str = 'SELECT'):
        self.table = table
        self.conn = connection
        self.operation = operation
        self._columns = '*'
        self._conditions: List[Tuple[str, Any]] = []
        self._order_by: Optional[str] = None
        self._limit: Optional[int] = None
        self._offset: Optional[int] = None
        self._data: Dict[str, Any] = {}
    
    def select(self, columns: str = '*') -> 'QueryBuilder':
        """指定要選擇的列"""
        self._columns = columns
        return self
    
    def where(self, condition: str = None, **kwargs) -> 'QueryBuilder':
        """
        添加 WHERE 條件
        
        用法：
            .where(id=1)
            .where(status='Online', role='admin')
            .where('created_at > ?', '2024-01-01')
        """
        if condition:
            self._conditions.append((condition, None))
        for key, value in kwargs.items():
            self._conditions.append((f"{key} = ?", value))
        return self
    
    def where_in(self, column: str, values: List[Any]) -> 'QueryBuilder':
        """WHERE IN 條件"""
        if values:
            placeholders = ', '.join(['?' for _ in values])
            self._conditions.append((f"{column} IN ({placeholders})", values))
        return self
    
    def where_like(self, column: str, pattern: str) -> 'QueryBuilder':
        """WHERE LIKE 條件"""
        self._conditions.append((f"{column} LIKE ?", f"%{pattern}%"))
        return self
    
    def order_by(self, column: str, direction: str = 'ASC') -> 'QueryBuilder':
        """排序"""
        self._order_by = f"{column} {direction}"
        return self
    
    def limit(self, count: int, offset: int = 0) -> 'QueryBuilder':
        """限制結果數量"""
        self._limit = count
        self._offset = offset
        return self
    
    def set(self, **kwargs) -> 'QueryBuilder':
        """設置要更新/插入的數據"""
        self._data.update(kwargs)
        return self
    
    def _build_where_clause(self) -> Tuple[str, List[Any]]:
        """構建 WHERE 子句"""
        if not self._conditions:
            return '', []
        
        clauses = []
        params = []
        
        for condition, value in self._conditions:
            clauses.append(condition)
            if value is not None:
                if isinstance(value, list):
                    params.extend(value)
                else:
                    params.append(value)
        
        return ' WHERE ' + ' AND '.join(clauses), params
    
    def _build_select_sql(self) -> Tuple[str, List[Any]]:
        """構建 SELECT SQL"""
        sql = f"SELECT {self._columns} FROM {self.table}"
        
        where_clause, params = self._build_where_clause()
        sql += where_clause
        
        if self._order_by:
            sql += f" ORDER BY {self._order_by}"
        
        if self._limit is not None:
            sql += f" LIMIT {self._limit}"
            if self._offset:
                sql += f" OFFSET {self._offset}"
        
        return sql, params
    
    def _build_insert_sql(self) -> Tuple[str, List[Any]]:
        """構建 INSERT SQL"""
        columns = ', '.join(self._data.keys())
        placeholders = ', '.join(['?' for _ in self._data])
        sql = f"INSERT INTO {self.table} ({columns}) VALUES ({placeholders})"
        return sql, list(self._data.values())
    
    def _build_update_sql(self) -> Tuple[str, List[Any]]:
        """構建 UPDATE SQL"""
        set_clause = ', '.join([f"{k} = ?" for k in self._data.keys()])
        sql = f"UPDATE {self.table} SET {set_clause}"
        
        where_clause, where_params = self._build_where_clause()
        sql += where_clause
        
        return sql, list(self._data.values()) + where_params
    
    def _build_delete_sql(self) -> Tuple[str, List[Any]]:
        """構建 DELETE SQL"""
        sql = f"DELETE FROM {self.table}"
        
        where_clause, params = self._build_where_clause()
        sql += where_clause
        
        return sql, params
    
    def all(self) -> List[Dict[str, Any]]:
        """執行查詢並返回所有結果"""
        sql, params = self._build_select_sql()
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]
    
    def first(self) -> Optional[Dict[str, Any]]:
        """執行查詢並返回第一個結果"""
        self._limit = 1
        results = self.all()
        return results[0] if results else None
    
    def count(self) -> int:
        """返回符合條件的記錄數"""
        self._columns = 'COUNT(*) as count'
        result = self.first()
        return result['count'] if result else 0
    
    def exists(self) -> bool:
        """檢查是否存在符合條件的記錄"""
        return self.count() > 0
    
    def execute(self) -> int:
        """執行 INSERT/UPDATE/DELETE 並返回影響的行數"""
        if self.operation == 'INSERT':
            sql, params = self._build_insert_sql()
        elif self.operation == 'UPDATE':
            sql, params = self._build_update_sql()
        elif self.operation == 'DELETE':
            sql, params = self._build_delete_sql()
        else:
            raise ValueError(f"Cannot execute {self.operation}")
        
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        self.conn.commit()
        return cursor.rowcount
    
    def insert_and_get_id(self) -> int:
        """執行 INSERT 並返回新記錄的 ID"""
        sql, params = self._build_insert_sql()
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        self.conn.commit()
        return cursor.lastrowid


class TenantDB:
    """
    租戶數據庫操作類
    
    提供簡化的數據庫操作接口，自動處理租戶隔離
    """
    
    def __init__(self, user_id: str = None):
        """
        初始化租戶數據庫
        
        Args:
            user_id: 租戶 ID（不指定則使用 local_user）
        """
        self._user_id = user_id or LOCAL_USER_ID
        self._manager = get_tenant_db_manager()
        self._tenant_conn: Optional[sqlite3.Connection] = None
        self._system_conn: Optional[sqlite3.Connection] = None
    
    @property
    def tenant_conn(self) -> sqlite3.Connection:
        """獲取租戶數據庫連接"""
        if self._tenant_conn is None:
            self._tenant_conn = self._manager.get_tenant_connection(self._user_id)
        return self._tenant_conn
    
    @property
    def system_conn(self) -> sqlite3.Connection:
        """獲取系統數據庫連接"""
        if self._system_conn is None:
            self._system_conn = self._manager.get_system_connection()
        return self._system_conn
    
    def _get_conn_for_table(self, table: str) -> sqlite3.Connection:
        """根據表名獲取正確的連接"""
        if is_system_table(table):
            return self.system_conn
        return self.tenant_conn
    
    # ============ 查詢操作 ============
    
    def select(self, table: str, columns: str = '*') -> QueryBuilder:
        """
        創建 SELECT 查詢
        
        用法：
            db.select('accounts').where(status='Online').all()
        """
        conn = self._get_conn_for_table(table)
        return QueryBuilder(table, conn, 'SELECT').select(columns)
    
    def insert(self, table: str, data: Dict[str, Any] = None, **kwargs) -> QueryBuilder:
        """
        創建 INSERT 查詢
        
        用法：
            db.insert('accounts', {'phone': '+1234567890'}).execute()
            db.insert('accounts', phone='+1234567890').execute()
        """
        conn = self._get_conn_for_table(table)
        builder = QueryBuilder(table, conn, 'INSERT')
        if data:
            builder._data = data
        builder._data.update(kwargs)
        return builder
    
    def update(self, table: str, data: Dict[str, Any] = None, **kwargs) -> QueryBuilder:
        """
        創建 UPDATE 查詢
        
        用法：
            db.update('accounts', {'status': 'Offline'}).where(id=1).execute()
        """
        conn = self._get_conn_for_table(table)
        builder = QueryBuilder(table, conn, 'UPDATE')
        if data:
            builder._data = data
        builder._data.update(kwargs)
        return builder
    
    def delete(self, table: str) -> QueryBuilder:
        """
        創建 DELETE 查詢
        
        用法：
            db.delete('accounts').where(id=1).execute()
        """
        conn = self._get_conn_for_table(table)
        return QueryBuilder(table, conn, 'DELETE')
    
    # ============ 快捷方法 ============
    
    def get_by_id(self, table: str, id: int) -> Optional[Dict[str, Any]]:
        """根據 ID 獲取記錄"""
        return self.select(table).where(id=id).first()
    
    def get_all(self, table: str, order_by: str = None) -> List[Dict[str, Any]]:
        """獲取表中所有記錄"""
        query = self.select(table)
        if order_by:
            query.order_by(order_by)
        return query.all()
    
    def create(self, table: str, data: Dict[str, Any]) -> int:
        """創建記錄並返回 ID"""
        # 添加時間戳
        if 'created_at' not in data:
            data['created_at'] = datetime.now().isoformat()
        if 'updated_at' not in data:
            data['updated_at'] = datetime.now().isoformat()
        
        return self.insert(table, data).insert_and_get_id()
    
    def update_by_id(self, table: str, id: int, data: Dict[str, Any]) -> bool:
        """根據 ID 更新記錄"""
        # 更新時間戳
        data['updated_at'] = datetime.now().isoformat()
        
        rows = self.update(table, data).where(id=id).execute()
        return rows > 0
    
    def delete_by_id(self, table: str, id: int) -> bool:
        """根據 ID 刪除記錄"""
        rows = self.delete(table).where(id=id).execute()
        return rows > 0
    
    def count(self, table: str, **conditions) -> int:
        """計算符合條件的記錄數"""
        query = self.select(table)
        for key, value in conditions.items():
            query.where(**{key: value})
        return query.count()
    
    # ============ 批量操作 ============
    
    def bulk_insert(self, table: str, records: List[Dict[str, Any]]) -> int:
        """批量插入記錄"""
        if not records:
            return 0
        
        conn = self._get_conn_for_table(table)
        
        # 添加時間戳
        now = datetime.now().isoformat()
        for record in records:
            if 'created_at' not in record:
                record['created_at'] = now
            if 'updated_at' not in record:
                record['updated_at'] = now
        
        # 構建 SQL
        columns = list(records[0].keys())
        placeholders = ', '.join(['?' for _ in columns])
        sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
        
        cursor = conn.cursor()
        cursor.executemany(sql, [tuple(r[c] for c in columns) for r in records])
        conn.commit()
        
        return cursor.rowcount
    
    # ============ 事務 ============
    
    @contextmanager
    def transaction(self, table: str):
        """
        事務上下文管理器
        
        用法：
            with db.transaction('accounts') as conn:
                conn.execute("INSERT INTO accounts ...")
                conn.execute("UPDATE accounts ...")
        """
        conn = self._get_conn_for_table(table)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    
    # ============ 原始查詢 ============
    
    def raw(self, table: str, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        """
        執行原始 SQL 查詢
        
        用法：
            results = db.raw('accounts', "SELECT * FROM accounts WHERE status = ?", ('Online',))
        """
        conn = self._get_conn_for_table(table)
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return [dict(row) for row in cursor.fetchall()]
    
    def execute_raw(self, table: str, sql: str, params: tuple = None) -> int:
        """
        執行原始 SQL（INSERT/UPDATE/DELETE）
        
        用法：
            db.execute_raw('accounts', "UPDATE accounts SET status = ?", ('Offline',))
        """
        conn = self._get_conn_for_table(table)
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        conn.commit()
        return cursor.rowcount


# ============ 便捷函數 ============

def get_tenant_db(user_id: str = None) -> TenantDB:
    """獲取租戶數據庫操作實例"""
    return TenantDB(user_id)
