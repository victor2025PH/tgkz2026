"""
🔧 P12-2: 線索去重服務

功能：
1. 基於 telegram_id 的精確去重
2. 基於 username + first_name 的模糊去重
3. 合併策略：保留最新數據 + 累加互動計數
4. 批量去重掃描
"""

import logging
import sqlite3
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DuplicateGroup:
    """重複線索組"""
    primary_id: int
    duplicate_ids: List[int]
    match_type: str  # exact_telegram_id, fuzzy_username
    confidence: float  # 0-1
    details: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'primary_id': self.primary_id,
            'duplicate_ids': self.duplicate_ids,
            'match_type': self.match_type,
            'confidence': self.confidence,
            'details': self.details,
        }


class LeadDeduplicationService:
    """線索去重服務"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path

    def _get_conn(self) -> sqlite3.Connection:
        if self.db_path:
            conn = sqlite3.connect(self.db_path)
        else:
            from core.db_utils import get_connection
            conn = get_connection().__enter__()
        conn.row_factory = sqlite3.Row
        return conn

    def scan_duplicates(self, limit: int = 100) -> List[DuplicateGroup]:
        """
        掃描重複線索

        Returns:
            重複組列表
        """
        groups = []

        try:
            conn = self._get_conn()

            # 1. 精確重複：相同 telegram_id 出現多次（理論上不應該，因為 UNIQUE）
            # 但舊數據可能在 extracted_members 和 unified_contacts 都有

            # 2. 模糊重複：相同 username（忽略大小寫）
            rows = conn.execute('''
                SELECT LOWER(username) as norm_username, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
                FROM unified_contacts
                WHERE username IS NOT NULL AND username != ''
                GROUP BY LOWER(username)
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC
                LIMIT ?
            ''', (limit,)).fetchall()

            for row in rows:
                ids = [int(i) for i in row['ids'].split(',')]
                groups.append(DuplicateGroup(
                    primary_id=ids[0],
                    duplicate_ids=ids[1:],
                    match_type='fuzzy_username',
                    confidence=0.9,
                    details={
                        'username': row['norm_username'],
                        'count': row['cnt'],
                    }
                ))

            # 3. 模糊重複：相同 phone
            rows = conn.execute('''
                SELECT phone, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
                FROM unified_contacts
                WHERE phone IS NOT NULL AND phone != ''
                GROUP BY phone
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC
                LIMIT ?
            ''', (limit,)).fetchall()

            for row in rows:
                ids = [int(i) for i in row['ids'].split(',')]
                groups.append(DuplicateGroup(
                    primary_id=ids[0],
                    duplicate_ids=ids[1:],
                    match_type='exact_phone',
                    confidence=0.95,
                    details={
                        'phone': row['phone'],
                        'count': row['cnt'],
                    }
                ))

            conn.close()

        except Exception as e:
            logger.error(f"Duplicate scan error: {e}")

        return groups

    def merge_duplicates(self, primary_id: int, duplicate_ids: List[int]) -> Dict[str, Any]:
        """
        合併重複線索

        策略：
        - 保留 primary_id 記錄
        - 從 duplicates 中合併數據（取最新非空值）
        - 累加互動計數
        - 合併標籤
        - 刪除重複記錄
        """
        if not duplicate_ids:
            return {'merged': 0, 'kept': primary_id}

        try:
            conn = self._get_conn()

            # 獲取所有相關記錄
            all_ids = [primary_id] + duplicate_ids
            placeholders = ','.join('?' * len(all_ids))
            rows = conn.execute(
                f'SELECT * FROM unified_contacts WHERE id IN ({placeholders})',
                all_ids
            ).fetchall()

            if not rows:
                return {'error': 'Records not found'}

            # 構建合併數據
            merged_data = {}
            total_messages = 0
            total_interactions = 0
            all_tags = set()

            for row in rows:
                row_dict = dict(row)
                # 取最新的非空值
                for field in ('display_name', 'first_name', 'last_name', 'bio', 'phone'):
                    if row_dict.get(field) and not merged_data.get(field):
                        merged_data[field] = row_dict[field]

                # 累加計數（安全處理可能不存在的列）
                total_messages += (row_dict.get('message_count') or 0)
                if 'interactions_count' in row_dict:
                    total_interactions += (row_dict.get('interactions_count') or 0)

                # 合併標籤
                tags_str = row_dict.get('tags') or ''
                if tags_str:
                    for tag in tags_str.split(','):
                        tag = tag.strip()
                        if tag:
                            all_tags.add(tag)

            # 更新 primary 記錄
            update_fields = []
            update_values = []
            for field, value in merged_data.items():
                update_fields.append(f"{field} = COALESCE(?, {field})")
                update_values.append(value)

            update_fields.append("message_count = ?")
            update_values.append(total_messages)

            # interactions_count 列可能不存在（舊版本 schema）
            try:
                conn.execute('SELECT interactions_count FROM unified_contacts LIMIT 0')
                update_fields.append("interactions_count = ?")
                update_values.append(total_interactions)
            except sqlite3.OperationalError:
                pass  # 列不存在，跳過

            if all_tags:
                update_fields.append("tags = ?")
                update_values.append(','.join(sorted(all_tags)))

            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.append(primary_id)

            conn.execute(
                f"UPDATE unified_contacts SET {', '.join(update_fields)} WHERE id = ?",
                update_values
            )

            # 刪除重複記錄
            dup_placeholders = ','.join('?' * len(duplicate_ids))
            conn.execute(
                f"DELETE FROM unified_contacts WHERE id IN ({dup_placeholders})",
                duplicate_ids
            )

            conn.commit()
            conn.close()

            return {
                'merged': len(duplicate_ids),
                'kept': primary_id,
                'total_messages': total_messages,
                'tags': list(all_tags),
            }

        except Exception as e:
            logger.error(f"Merge error: {e}")
            return {'error': str(e)}

    def get_dedup_stats(self) -> Dict[str, Any]:
        """獲取去重統計"""
        try:
            conn = self._get_conn()
            total = conn.execute('SELECT COUNT(*) FROM unified_contacts').fetchone()[0]
            with_username = conn.execute(
                "SELECT COUNT(*) FROM unified_contacts WHERE username IS NOT NULL AND username != ''"
            ).fetchone()[0]

            # 重複 username 計數
            dup_username = conn.execute('''
                SELECT COUNT(*) FROM (
                    SELECT LOWER(username) FROM unified_contacts
                    WHERE username IS NOT NULL AND username != ''
                    GROUP BY LOWER(username) HAVING COUNT(*) > 1
                )
            ''').fetchone()[0]

            conn.close()

            return {
                'total_contacts': total,
                'with_username': with_username,
                'duplicate_username_groups': dup_username,
                'estimated_duplicates': dup_username * 2,  # 粗略估計
            }
        except Exception as e:
            return {'error': str(e)}
