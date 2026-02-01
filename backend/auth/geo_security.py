"""
地理安全服務

Phase 5 安全功能：
1. IP 地理位置檢測
2. 異常登入檢測（異地登入）
3. 信任位置管理
4. 安全事件通知

使用免費 IP 地理位置 API：
- ip-api.com（免費，每分鐘 45 次請求）
"""

import os
import json
import hashlib
import logging
import sqlite3
import aiohttp
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class GeoLocation:
    """地理位置信息"""
    ip: str
    country: str = 'Unknown'
    country_code: str = ''
    region: str = ''
    city: str = ''
    latitude: float = 0.0
    longitude: float = 0.0
    isp: str = ''
    is_vpn: bool = False
    is_proxy: bool = False
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    def get_display_location(self) -> str:
        """獲取顯示用的位置字符串"""
        parts = [self.city, self.region, self.country]
        return ', '.join(p for p in parts if p and p != 'Unknown')


@dataclass
class SecurityAlert:
    """安全警報"""
    alert_type: str  # new_location, suspicious_ip, vpn_detected
    severity: str    # low, medium, high, critical
    message: str
    details: Dict[str, Any]
    created_at: datetime


class GeoSecurityService:
    """
    地理安全服務
    
    功能：
    1. IP 地理位置查詢
    2. 異常登入檢測
    3. 信任位置管理
    4. 安全事件追蹤
    """
    
    # IP 地理位置 API（免費）
    GEO_API_URL = "http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,proxy,hosting"
    
    # 緩存有效期（秒）
    CACHE_TTL = 86400  # 24 小時
    
    # 距離閾值（公里）- 超過此距離視為異地
    SUSPICIOUS_DISTANCE_KM = 500
    
    def __init__(self, db_path: str = None):
        """初始化服務"""
        self.db_path = db_path or os.environ.get(
            'AUTH_DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'auth.db')
        )
        self._init_db()
    
    def _get_db(self):
        """獲取數據庫連接"""
        db = sqlite3.connect(self.db_path)
        db.row_factory = sqlite3.Row
        return db
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            # IP 地理位置緩存表
            db.execute('''
                CREATE TABLE IF NOT EXISTS geo_cache (
                    ip TEXT PRIMARY KEY,
                    country TEXT,
                    country_code TEXT,
                    region TEXT,
                    city TEXT,
                    latitude REAL,
                    longitude REAL,
                    isp TEXT,
                    is_vpn INTEGER DEFAULT 0,
                    is_proxy INTEGER DEFAULT 0,
                    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 用戶信任位置表
            db.execute('''
                CREATE TABLE IF NOT EXISTS trusted_locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    country_code TEXT,
                    city TEXT,
                    ip_prefix TEXT,
                    trusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, country_code, city)
                )
            ''')
            
            # 安全事件表
            db.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT DEFAULT 'low',
                    ip_address TEXT,
                    location TEXT,
                    details TEXT,
                    acknowledged INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            db.execute('CREATE INDEX IF NOT EXISTS idx_geo_cache_cached ON geo_cache(cached_at)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_trusted_locations_user ON trusted_locations(user_id)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at)')
            
            db.commit()
            logger.info("Geo security tables initialized")
        except Exception as e:
            logger.error(f"Failed to initialize geo security tables: {e}")
        finally:
            db.close()
    
    async def get_location(self, ip: str) -> GeoLocation:
        """
        獲取 IP 地理位置
        
        優先使用緩存，否則調用 API
        """
        # 跳過本地 IP
        if ip in ('127.0.0.1', 'localhost', '::1') or ip.startswith('192.168.') or ip.startswith('10.'):
            return GeoLocation(ip=ip, country='Local', city='Local Network')
        
        # 檢查緩存
        cached = self._get_cached_location(ip)
        if cached:
            return cached
        
        # 調用 API
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.GEO_API_URL.format(ip=ip),
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('status') == 'success':
                            location = GeoLocation(
                                ip=ip,
                                country=data.get('country', 'Unknown'),
                                country_code=data.get('countryCode', ''),
                                region=data.get('regionName', ''),
                                city=data.get('city', ''),
                                latitude=data.get('lat', 0),
                                longitude=data.get('lon', 0),
                                isp=data.get('isp', ''),
                                is_vpn=data.get('hosting', False),
                                is_proxy=data.get('proxy', False)
                            )
                            
                            # 緩存結果
                            self._cache_location(location)
                            return location
        except Exception as e:
            logger.warning(f"Geo lookup failed for {ip}: {e}")
        
        return GeoLocation(ip=ip)
    
    def _get_cached_location(self, ip: str) -> Optional[GeoLocation]:
        """從緩存獲取位置"""
        db = self._get_db()
        try:
            cutoff = (datetime.utcnow() - timedelta(seconds=self.CACHE_TTL)).isoformat()
            cursor = db.execute('''
                SELECT * FROM geo_cache WHERE ip = ? AND cached_at > ?
            ''', (ip, cutoff))
            
            row = cursor.fetchone()
            if row:
                return GeoLocation(
                    ip=row['ip'],
                    country=row['country'] or 'Unknown',
                    country_code=row['country_code'] or '',
                    region=row['region'] or '',
                    city=row['city'] or '',
                    latitude=row['latitude'] or 0,
                    longitude=row['longitude'] or 0,
                    isp=row['isp'] or '',
                    is_vpn=bool(row['is_vpn']),
                    is_proxy=bool(row['is_proxy'])
                )
            return None
        finally:
            db.close()
    
    def _cache_location(self, location: GeoLocation) -> None:
        """緩存位置信息"""
        db = self._get_db()
        try:
            db.execute('''
                INSERT OR REPLACE INTO geo_cache 
                (ip, country, country_code, region, city, latitude, longitude, isp, is_vpn, is_proxy, cached_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                location.ip, location.country, location.country_code,
                location.region, location.city, location.latitude, location.longitude,
                location.isp, int(location.is_vpn), int(location.is_proxy),
                datetime.utcnow().isoformat()
            ))
            db.commit()
        except Exception as e:
            logger.debug(f"Failed to cache location: {e}")
        finally:
            db.close()
    
    async def check_login_location(
        self,
        user_id: str,
        ip: str
    ) -> Tuple[bool, Optional[SecurityAlert]]:
        """
        檢查登入位置是否異常
        
        Args:
            user_id: 用戶 ID
            ip: 登入 IP
        
        Returns:
            (is_suspicious, alert) 元組
        """
        location = await self.get_location(ip)
        
        alerts = []
        
        # 1. 檢查是否使用 VPN/代理
        if location.is_vpn or location.is_proxy:
            alerts.append(SecurityAlert(
                alert_type='vpn_detected',
                severity='medium',
                message='檢測到 VPN 或代理登入',
                details={
                    'ip': ip,
                    'isp': location.isp,
                    'location': location.get_display_location()
                },
                created_at=datetime.utcnow()
            ))
        
        # 2. 檢查是否為新位置
        is_trusted = self._is_trusted_location(user_id, location)
        
        if not is_trusted:
            # 獲取用戶最近的登入位置
            recent_locations = self._get_recent_login_locations(user_id)
            
            if recent_locations:
                # 計算與最近位置的距離
                min_distance = float('inf')
                for recent in recent_locations:
                    dist = self._haversine_distance(
                        location.latitude, location.longitude,
                        recent['latitude'], recent['longitude']
                    )
                    min_distance = min(min_distance, dist)
                
                if min_distance > self.SUSPICIOUS_DISTANCE_KM:
                    severity = 'high' if min_distance > 1000 else 'medium'
                    alerts.append(SecurityAlert(
                        alert_type='new_location',
                        severity=severity,
                        message=f'從新位置登入：{location.get_display_location()}',
                        details={
                            'ip': ip,
                            'location': location.get_display_location(),
                            'distance_km': round(min_distance, 2),
                            'country_code': location.country_code
                        },
                        created_at=datetime.utcnow()
                    ))
            else:
                # 首次登入，記錄為信任位置
                self._add_trusted_location(user_id, location)
        
        # 記錄安全事件
        if alerts:
            for alert in alerts:
                self._record_security_event(user_id, alert, ip, location)
            
            # 返回最嚴重的警報
            most_severe = max(alerts, key=lambda a: 
                ['low', 'medium', 'high', 'critical'].index(a.severity))
            return True, most_severe
        
        return False, None
    
    def _is_trusted_location(self, user_id: str, location: GeoLocation) -> bool:
        """檢查是否為信任位置"""
        db = self._get_db()
        try:
            cursor = db.execute('''
                SELECT 1 FROM trusted_locations
                WHERE user_id = ? AND country_code = ? AND city = ?
                LIMIT 1
            ''', (user_id, location.country_code, location.city))
            return cursor.fetchone() is not None
        finally:
            db.close()
    
    def _add_trusted_location(self, user_id: str, location: GeoLocation) -> None:
        """添加信任位置"""
        db = self._get_db()
        try:
            db.execute('''
                INSERT OR IGNORE INTO trusted_locations 
                (user_id, country_code, city, ip_prefix, trusted_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                user_id, location.country_code, location.city,
                '.'.join(location.ip.split('.')[:2]) + '.*.*',
                datetime.utcnow().isoformat()
            ))
            db.commit()
            logger.info(f"Added trusted location for user {user_id}: {location.get_display_location()}")
        finally:
            db.close()
    
    def _get_recent_login_locations(self, user_id: str, days: int = 30) -> List[Dict]:
        """獲取用戶最近的登入位置"""
        db = self._get_db()
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            # 從設備會話獲取最近的 IP
            cursor = db.execute('''
                SELECT DISTINCT ip_address FROM device_sessions
                WHERE user_id = ? AND created_at > ? AND ip_address IS NOT NULL
                ORDER BY last_active DESC LIMIT 10
            ''', (user_id, cutoff))
            
            locations = []
            for row in cursor.fetchall():
                ip = row['ip_address']
                if ip:
                    cached = self._get_cached_location(ip)
                    if cached and cached.latitude and cached.longitude:
                        locations.append({
                            'ip': ip,
                            'latitude': cached.latitude,
                            'longitude': cached.longitude
                        })
            
            return locations
        except Exception as e:
            logger.debug(f"Failed to get recent locations: {e}")
            return []
        finally:
            db.close()
    
    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        計算兩點之間的距離（公里）
        
        使用 Haversine 公式
        """
        import math
        
        if not all([lat1, lon1, lat2, lon2]):
            return 0
        
        R = 6371  # 地球半徑（公里）
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat / 2) ** 2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def _record_security_event(
        self,
        user_id: str,
        alert: SecurityAlert,
        ip: str,
        location: GeoLocation
    ) -> None:
        """記錄安全事件"""
        db = self._get_db()
        try:
            db.execute('''
                INSERT INTO security_events 
                (user_id, event_type, severity, ip_address, location, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, alert.alert_type, alert.severity, ip,
                location.get_display_location(),
                json.dumps(alert.details),
                alert.created_at.isoformat()
            ))
            db.commit()
        finally:
            db.close()
    
    def get_user_security_events(
        self,
        user_id: str,
        limit: int = 20,
        unacknowledged_only: bool = False
    ) -> List[Dict]:
        """獲取用戶安全事件"""
        db = self._get_db()
        try:
            query = '''
                SELECT * FROM security_events
                WHERE user_id = ?
            '''
            params = [user_id]
            
            if unacknowledged_only:
                query += ' AND acknowledged = 0'
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            cursor = db.execute(query, params)
            
            events = []
            for row in cursor.fetchall():
                events.append({
                    'id': row['id'],
                    'event_type': row['event_type'],
                    'severity': row['severity'],
                    'ip_address': row['ip_address'],
                    'location': row['location'],
                    'details': json.loads(row['details']) if row['details'] else {},
                    'acknowledged': bool(row['acknowledged']),
                    'created_at': row['created_at']
                })
            
            return events
        finally:
            db.close()
    
    def acknowledge_event(self, user_id: str, event_id: int) -> bool:
        """確認安全事件"""
        db = self._get_db()
        try:
            result = db.execute('''
                UPDATE security_events SET acknowledged = 1
                WHERE id = ? AND user_id = ?
            ''', (event_id, user_id))
            db.commit()
            return result.rowcount > 0
        finally:
            db.close()
    
    def get_user_trusted_locations(self, user_id: str) -> List[Dict]:
        """獲取用戶信任位置列表"""
        db = self._get_db()
        try:
            cursor = db.execute('''
                SELECT * FROM trusted_locations
                WHERE user_id = ?
                ORDER BY trusted_at DESC
            ''', (user_id,))
            
            locations = []
            for row in cursor.fetchall():
                locations.append({
                    'id': row['id'],
                    'country_code': row['country_code'],
                    'city': row['city'],
                    'ip_prefix': row['ip_prefix'],
                    'trusted_at': row['trusted_at']
                })
            
            return locations
        finally:
            db.close()
    
    def remove_trusted_location(self, user_id: str, location_id: int) -> bool:
        """移除信任位置"""
        db = self._get_db()
        try:
            result = db.execute('''
                DELETE FROM trusted_locations
                WHERE id = ? AND user_id = ?
            ''', (location_id, user_id))
            db.commit()
            return result.rowcount > 0
        finally:
            db.close()


# 全局服務實例
_geo_security: Optional[GeoSecurityService] = None


def get_geo_security() -> GeoSecurityService:
    """獲取全局地理安全服務"""
    global _geo_security
    if _geo_security is None:
        _geo_security = GeoSecurityService()
    return _geo_security
