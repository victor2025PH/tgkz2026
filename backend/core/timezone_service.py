"""
時區服務

功能：
1. 時區轉換
2. 用戶時區管理
3. 本地化時間顯示
4. 定時任務時區調度
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
import threading
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)


# ==================== 常用時區 ====================

COMMON_TIMEZONES = {
    # 亞洲
    'Asia/Shanghai': {'name': '中國標準時間', 'abbr': 'CST', 'offset': '+08:00'},
    'Asia/Taipei': {'name': '台北時間', 'abbr': 'CST', 'offset': '+08:00'},
    'Asia/Hong_Kong': {'name': '香港時間', 'abbr': 'HKT', 'offset': '+08:00'},
    'Asia/Tokyo': {'name': '日本標準時間', 'abbr': 'JST', 'offset': '+09:00'},
    'Asia/Seoul': {'name': '韓國標準時間', 'abbr': 'KST', 'offset': '+09:00'},
    'Asia/Singapore': {'name': '新加坡時間', 'abbr': 'SGT', 'offset': '+08:00'},
    'Asia/Bangkok': {'name': '泰國時間', 'abbr': 'ICT', 'offset': '+07:00'},
    'Asia/Ho_Chi_Minh': {'name': '越南時間', 'abbr': 'ICT', 'offset': '+07:00'},
    'Asia/Jakarta': {'name': '印尼西部時間', 'abbr': 'WIB', 'offset': '+07:00'},
    'Asia/Kolkata': {'name': '印度標準時間', 'abbr': 'IST', 'offset': '+05:30'},
    'Asia/Dubai': {'name': '阿聯酋時間', 'abbr': 'GST', 'offset': '+04:00'},
    
    # 歐洲
    'Europe/London': {'name': '英國時間', 'abbr': 'GMT/BST', 'offset': '+00:00'},
    'Europe/Paris': {'name': '中歐時間', 'abbr': 'CET', 'offset': '+01:00'},
    'Europe/Berlin': {'name': '德國時間', 'abbr': 'CET', 'offset': '+01:00'},
    'Europe/Moscow': {'name': '莫斯科時間', 'abbr': 'MSK', 'offset': '+03:00'},
    
    # 美洲
    'America/New_York': {'name': '美國東部時間', 'abbr': 'EST/EDT', 'offset': '-05:00'},
    'America/Chicago': {'name': '美國中部時間', 'abbr': 'CST/CDT', 'offset': '-06:00'},
    'America/Denver': {'name': '美國山區時間', 'abbr': 'MST/MDT', 'offset': '-07:00'},
    'America/Los_Angeles': {'name': '美國太平洋時間', 'abbr': 'PST/PDT', 'offset': '-08:00'},
    'America/Sao_Paulo': {'name': '巴西時間', 'abbr': 'BRT', 'offset': '-03:00'},
    
    # 大洋洲
    'Australia/Sydney': {'name': '澳洲東部時間', 'abbr': 'AEST', 'offset': '+10:00'},
    'Pacific/Auckland': {'name': '紐西蘭時間', 'abbr': 'NZST', 'offset': '+12:00'},
    
    # 特殊
    'UTC': {'name': '協調世界時', 'abbr': 'UTC', 'offset': '+00:00'},
}

DEFAULT_TIMEZONE = 'Asia/Shanghai'


@dataclass
class UserTimezoneSettings:
    """用戶時區設置"""
    user_id: str
    timezone: str
    auto_detect: bool = True
    format_24h: bool = True
    first_day_of_week: int = 1  # 1=週一, 0=週日
    date_format: str = 'YYYY-MM-DD'
    time_format: str = 'HH:mm:ss'


class TimezoneService:
    """時區服務"""
    
    _instance: Optional['TimezoneService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        # 用戶時區緩存
        self._user_timezones: Dict[str, str] = {}
        
        self._init_db()
        self._initialized = True
        logger.info("TimezoneService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_timezone_settings (
                    user_id TEXT PRIMARY KEY,
                    timezone TEXT DEFAULT 'Asia/Shanghai',
                    auto_detect INTEGER DEFAULT 1,
                    format_24h INTEGER DEFAULT 1,
                    first_day_of_week INTEGER DEFAULT 1,
                    date_format TEXT DEFAULT 'YYYY-MM-DD',
                    time_format TEXT DEFAULT 'HH:mm:ss',
                    updated_at TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init timezone DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 時區列表 ====================
    
    def get_common_timezones(self) -> List[Dict[str, Any]]:
        """獲取常用時區列表"""
        result = []
        for tz_id, info in COMMON_TIMEZONES.items():
            result.append({
                'id': tz_id,
                'name': info['name'],
                'abbr': info['abbr'],
                'offset': info['offset'],
                'current_time': self.get_current_time(tz_id).strftime('%H:%M')
            })
        return sorted(result, key=lambda x: x['offset'])
    
    def is_valid_timezone(self, tz_id: str) -> bool:
        """驗證時區是否有效"""
        try:
            ZoneInfo(tz_id)
            return True
        except Exception:
            return False
    
    # ==================== 時區轉換 ====================
    
    def utc_now(self) -> datetime:
        """獲取當前 UTC 時間"""
        return datetime.now(timezone.utc)
    
    def get_current_time(self, tz_id: str = None) -> datetime:
        """獲取指定時區的當前時間"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        try:
            tz = ZoneInfo(tz_id)
            return datetime.now(tz)
        except Exception:
            return datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
    
    def convert_to_timezone(
        self,
        dt: datetime,
        target_tz: str,
        source_tz: str = None
    ) -> datetime:
        """轉換時區"""
        try:
            # 確保有時區信息
            if dt.tzinfo is None:
                if source_tz:
                    dt = dt.replace(tzinfo=ZoneInfo(source_tz))
                else:
                    dt = dt.replace(tzinfo=timezone.utc)
            
            # 轉換到目標時區
            target = ZoneInfo(target_tz)
            return dt.astimezone(target)
        except Exception as e:
            logger.warning(f"Convert timezone error: {e}")
            return dt
    
    def to_utc(self, dt: datetime, source_tz: str = None) -> datetime:
        """轉換為 UTC"""
        return self.convert_to_timezone(dt, 'UTC', source_tz)
    
    def from_utc(self, dt: datetime, target_tz: str) -> datetime:
        """從 UTC 轉換"""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return self.convert_to_timezone(dt, target_tz)
    
    # ==================== 用戶時區 ====================
    
    def get_user_timezone(self, user_id: str) -> str:
        """獲取用戶時區"""
        # 檢查緩存
        if user_id in self._user_timezones:
            return self._user_timezones[user_id]
        
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT timezone FROM user_timezone_settings WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            db.close()
            
            tz = row['timezone'] if row else DEFAULT_TIMEZONE
            self._user_timezones[user_id] = tz
            return tz
        except:
            return DEFAULT_TIMEZONE
    
    def set_user_timezone(self, user_id: str, tz_id: str) -> bool:
        """設置用戶時區"""
        if not self.is_valid_timezone(tz_id):
            return False
        
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            db.execute('''
                INSERT INTO user_timezone_settings (user_id, timezone, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET timezone = ?, updated_at = ?
            ''', (user_id, tz_id, now, tz_id, now))
            
            db.commit()
            db.close()
            
            # 更新緩存
            self._user_timezones[user_id] = tz_id
            
            return True
        except Exception as e:
            logger.error(f"Set user timezone error: {e}")
            return False
    
    def get_user_settings(self, user_id: str) -> UserTimezoneSettings:
        """獲取用戶完整時區設置"""
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT * FROM user_timezone_settings WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            db.close()
            
            if row:
                return UserTimezoneSettings(
                    user_id=user_id,
                    timezone=row['timezone'],
                    auto_detect=bool(row['auto_detect']),
                    format_24h=bool(row['format_24h']),
                    first_day_of_week=row['first_day_of_week'],
                    date_format=row['date_format'] or 'YYYY-MM-DD',
                    time_format=row['time_format'] or 'HH:mm:ss'
                )
            
            return UserTimezoneSettings(user_id=user_id, timezone=DEFAULT_TIMEZONE)
        except:
            return UserTimezoneSettings(user_id=user_id, timezone=DEFAULT_TIMEZONE)
    
    def update_user_settings(self, user_id: str, settings: Dict[str, Any]) -> bool:
        """更新用戶時區設置"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            # 構建更新
            fields = []
            values = []
            for key in ['timezone', 'auto_detect', 'format_24h', 'first_day_of_week', 
                       'date_format', 'time_format']:
                if key in settings:
                    fields.append(f'{key} = ?')
                    value = settings[key]
                    if key in ['auto_detect', 'format_24h']:
                        value = 1 if value else 0
                    values.append(value)
            
            if not fields:
                db.close()
                return False
            
            fields.append('updated_at = ?')
            values.append(now)
            values.append(user_id)
            
            # 先確保記錄存在
            db.execute('''
                INSERT OR IGNORE INTO user_timezone_settings (user_id, timezone, updated_at)
                VALUES (?, ?, ?)
            ''', (user_id, DEFAULT_TIMEZONE, now))
            
            db.execute(f'''
                UPDATE user_timezone_settings SET {', '.join(fields)}
                WHERE user_id = ?
            ''', values)
            
            db.commit()
            db.close()
            
            # 更新緩存
            if 'timezone' in settings:
                self._user_timezones[user_id] = settings['timezone']
            
            return True
        except Exception as e:
            logger.error(f"Update user settings error: {e}")
            return False
    
    # ==================== 時間格式化 ====================
    
    def format_datetime(
        self,
        dt: datetime,
        tz_id: str = None,
        format_str: str = None,
        include_timezone: bool = False
    ) -> str:
        """格式化日期時間"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        
        # 轉換時區
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local_dt = self.convert_to_timezone(dt, tz_id)
        
        # 默認格式
        if not format_str:
            format_str = '%Y-%m-%d %H:%M:%S'
        
        result = local_dt.strftime(format_str)
        
        if include_timezone:
            result += f' ({tz_id})'
        
        return result
    
    def format_date(self, dt: datetime, tz_id: str = None) -> str:
        """格式化日期"""
        return self.format_datetime(dt, tz_id, '%Y-%m-%d')
    
    def format_time(self, dt: datetime, tz_id: str = None) -> str:
        """格式化時間"""
        return self.format_datetime(dt, tz_id, '%H:%M:%S')
    
    def format_for_user(self, dt: datetime, user_id: str) -> str:
        """為用戶格式化時間"""
        settings = self.get_user_settings(user_id)
        tz_id = settings.timezone
        
        # 轉換時區
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local_dt = self.convert_to_timezone(dt, tz_id)
        
        # 根據用戶設置格式化
        if settings.format_24h:
            time_format = '%H:%M'
        else:
            time_format = '%I:%M %p'
        
        date_format = settings.date_format.replace('YYYY', '%Y').replace('MM', '%m').replace('DD', '%d')
        
        return local_dt.strftime(f'{date_format} {time_format}')
    
    # ==================== 日期計算 ====================
    
    def get_day_start(self, dt: datetime = None, tz_id: str = None) -> datetime:
        """獲取當天開始時間（00:00:00）"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        if dt is None:
            dt = self.get_current_time(tz_id)
        elif dt.tzinfo is None:
            dt = self.convert_to_timezone(dt.replace(tzinfo=timezone.utc), tz_id)
        
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    
    def get_day_end(self, dt: datetime = None, tz_id: str = None) -> datetime:
        """獲取當天結束時間（23:59:59）"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        day_start = self.get_day_start(dt, tz_id)
        return day_start.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    def get_week_range(self, dt: datetime = None, tz_id: str = None) -> Tuple[datetime, datetime]:
        """獲取本週的開始和結束時間"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        if dt is None:
            dt = self.get_current_time(tz_id)
        
        day_start = self.get_day_start(dt, tz_id)
        weekday = day_start.weekday()
        
        week_start = day_start - timedelta(days=weekday)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        return week_start, week_end
    
    def get_month_range(self, dt: datetime = None, tz_id: str = None) -> Tuple[datetime, datetime]:
        """獲取本月的開始和結束時間"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        if dt is None:
            dt = self.get_current_time(tz_id)
        
        month_start = self.get_day_start(dt.replace(day=1), tz_id)
        
        # 下個月第一天減一秒
        if dt.month == 12:
            next_month = month_start.replace(year=dt.year + 1, month=1)
        else:
            next_month = month_start.replace(month=dt.month + 1)
        
        month_end = next_month - timedelta(seconds=1)
        
        return month_start, month_end
    
    # ==================== 定時任務調度 ====================
    
    def schedule_at_local_time(
        self,
        hour: int,
        minute: int,
        tz_id: str = None
    ) -> datetime:
        """計算下一次本地時間觸發的 UTC 時間"""
        tz_id = tz_id or DEFAULT_TIMEZONE
        
        now = self.get_current_time(tz_id)
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        # 如果已過，則是明天
        if target <= now:
            target += timedelta(days=1)
        
        # 轉換為 UTC
        return self.to_utc(target)
    
    def get_next_daily_reset(self, tz_id: str = None) -> datetime:
        """獲取下一次每日重置時間（00:00 本地時間）"""
        return self.schedule_at_local_time(0, 0, tz_id)


# ==================== 單例訪問 ====================

_timezone_service: Optional[TimezoneService] = None


def get_timezone_service() -> TimezoneService:
    """獲取時區服務"""
    global _timezone_service
    if _timezone_service is None:
        _timezone_service = TimezoneService()
    return _timezone_service
