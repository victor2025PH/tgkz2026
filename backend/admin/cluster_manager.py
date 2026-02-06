"""
多集群管理系統

功能：
- 集群註冊和管理
- 跨區域 API 池
- 就近分配策略
- 集群健康監控
- 故障轉移
"""

import asyncio
import aiohttp
import logging
import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'clusters.db')


class ClusterStatus(str, Enum):
    """集群狀態"""
    ACTIVE = "active"           # 活躍
    STANDBY = "standby"         # 備用
    MAINTENANCE = "maintenance" # 維護中
    OFFLINE = "offline"         # 離線
    DEGRADED = "degraded"       # 降級


class RegionType(str, Enum):
    """區域類型"""
    ASIA = "asia"
    EUROPE = "europe"
    NORTH_AMERICA = "north_america"
    SOUTH_AMERICA = "south_america"
    OCEANIA = "oceania"
    AFRICA = "africa"


class AllocationStrategy(str, Enum):
    """分配策略"""
    NEAREST = "nearest"           # 就近分配
    ROUND_ROBIN = "round_robin"   # 輪詢
    LEAST_LOADED = "least_loaded" # 最低負載
    WEIGHTED = "weighted"         # 加權
    FAILOVER = "failover"         # 故障轉移（主備）


@dataclass
class ClusterNode:
    """集群節點"""
    id: str
    name: str
    region: str
    endpoint: str                    # API 端點
    api_key: str = ""                # 認證密鑰
    status: ClusterStatus = ClusterStatus.ACTIVE
    priority: int = 0                # 優先級（越高越優先）
    weight: int = 100                # 權重
    max_capacity: int = 1000         # 最大容量
    current_load: int = 0            # 當前負載
    latency_ms: float = 0            # 延遲（毫秒）
    health_score: float = 100.0      # 健康分數
    last_heartbeat: str = ""
    metadata: Dict = field(default_factory=dict)
    created_at: str = ""
    updated_at: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "region": self.region,
            "endpoint": self.endpoint,
            "status": self.status.value if isinstance(self.status, ClusterStatus) else self.status,
            "priority": self.priority,
            "weight": self.weight,
            "max_capacity": self.max_capacity,
            "current_load": self.current_load,
            "load_percent": round(self.current_load / self.max_capacity * 100, 1) if self.max_capacity > 0 else 0,
            "latency_ms": self.latency_ms,
            "health_score": self.health_score,
            "last_heartbeat": self.last_heartbeat,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class ClusterConfig:
    """集群配置"""
    strategy: AllocationStrategy = AllocationStrategy.NEAREST
    failover_enabled: bool = True
    failover_threshold: float = 30.0     # 健康分低於此值觸發故障轉移
    heartbeat_interval: int = 30         # 心跳間隔（秒）
    heartbeat_timeout: int = 90          # 心跳超時（秒）
    max_retries: int = 3                 # 最大重試次數
    retry_delay: int = 5                 # 重試延遲（秒）
    enable_geo_routing: bool = True      # 啟用地理路由


class ClusterManager:
    """集群管理器"""
    
    _instance = None
    
    # 區域距離矩陣（簡化版，實際可用更精確的計算）
    REGION_DISTANCES = {
        "asia": {"asia": 0, "europe": 2, "north_america": 3, "oceania": 1, "south_america": 4, "africa": 3},
        "europe": {"asia": 2, "europe": 0, "north_america": 1, "oceania": 3, "south_america": 2, "africa": 1},
        "north_america": {"asia": 3, "europe": 1, "north_america": 0, "oceania": 4, "south_america": 1, "africa": 2},
        "oceania": {"asia": 1, "europe": 3, "north_america": 4, "oceania": 0, "south_america": 4, "africa": 3},
        "south_america": {"asia": 4, "europe": 2, "north_america": 1, "oceania": 4, "south_america": 0, "africa": 2},
        "africa": {"asia": 3, "europe": 1, "north_america": 2, "oceania": 3, "south_america": 2, "africa": 0}
    }
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._init_db()
        self.config = ClusterConfig()
        self._round_robin_index = 0
        self._running = False
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 集群節點表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cluster_nodes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                region TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                api_key TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                priority INTEGER DEFAULT 0,
                weight INTEGER DEFAULT 100,
                max_capacity INTEGER DEFAULT 1000,
                current_load INTEGER DEFAULT 0,
                latency_ms REAL DEFAULT 0,
                health_score REAL DEFAULT 100,
                last_heartbeat TEXT,
                metadata TEXT DEFAULT '{}',
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # 路由規則表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS routing_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_region TEXT,
                target_cluster_id TEXT,
                priority INTEGER DEFAULT 0,
                conditions TEXT DEFAULT '{}',
                is_active INTEGER DEFAULT 1,
                created_at TEXT
            )
        ''')
        
        # 故障轉移歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS failover_history (
                id TEXT PRIMARY KEY,
                from_cluster_id TEXT,
                to_cluster_id TEXT,
                reason TEXT,
                initiated_at TEXT,
                completed_at TEXT,
                success INTEGER DEFAULT 1,
                details TEXT DEFAULT '{}'
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_nodes_region ON cluster_nodes(region)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_nodes_status ON cluster_nodes(status)')
        
        conn.commit()
        conn.close()
        logger.info("集群管理數據庫已初始化")
    
    # ==================== 集群節點管理 ====================
    
    def register_cluster(self, node: ClusterNode) -> bool:
        """註冊集群節點"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT OR REPLACE INTO cluster_nodes 
                (id, name, region, endpoint, api_key, status, priority, weight,
                 max_capacity, current_load, latency_ms, health_score, 
                 last_heartbeat, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                node.id, node.name, node.region, node.endpoint, node.api_key,
                node.status.value if isinstance(node.status, ClusterStatus) else node.status,
                node.priority, node.weight, node.max_capacity, node.current_load,
                node.latency_ms, node.health_score, now,
                json.dumps(node.metadata), node.created_at or now, now
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"註冊集群節點: {node.name} ({node.region})")
            return True
        except Exception as e:
            logger.error(f"註冊集群節點失敗: {e}")
            return False
    
    def update_cluster(self, cluster_id: str, updates: Dict[str, Any]) -> bool:
        """更新集群"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            updates['updated_at'] = datetime.now().isoformat()
            
            set_clauses = []
            values = []
            for key, value in updates.items():
                if key == 'metadata' and isinstance(value, dict):
                    value = json.dumps(value)
                set_clauses.append(f"{key} = ?")
                values.append(value)
            
            values.append(cluster_id)
            
            cursor.execute(f'''
                UPDATE cluster_nodes 
                SET {', '.join(set_clauses)}
                WHERE id = ?
            ''', values)
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新集群失敗: {e}")
            return False
    
    def remove_cluster(self, cluster_id: str) -> bool:
        """移除集群"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM cluster_nodes WHERE id = ?', (cluster_id,))
            conn.commit()
            conn.close()
            logger.info(f"移除集群節點: {cluster_id}")
            return True
        except Exception as e:
            logger.error(f"移除集群失敗: {e}")
            return False
    
    def get_cluster(self, cluster_id: str) -> Optional[ClusterNode]:
        """獲取集群"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM cluster_nodes WHERE id = ?', (cluster_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_node(row)
        return None
    
    def list_clusters(self, region: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        """列出集群"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM cluster_nodes WHERE 1=1'
        params = []
        
        if region:
            query += ' AND region = ?'
            params.append(region)
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY priority DESC, health_score DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_node(row).to_dict() for row in rows]
    
    def _row_to_node(self, row) -> ClusterNode:
        return ClusterNode(
            id=row[0],
            name=row[1],
            region=row[2],
            endpoint=row[3],
            api_key=row[4] or "",
            status=ClusterStatus(row[5]) if row[5] else ClusterStatus.ACTIVE,
            priority=row[6] or 0,
            weight=row[7] or 100,
            max_capacity=row[8] or 1000,
            current_load=row[9] or 0,
            latency_ms=row[10] or 0,
            health_score=row[11] or 100,
            last_heartbeat=row[12] or "",
            metadata=json.loads(row[13]) if row[13] else {},
            created_at=row[14] or "",
            updated_at=row[15] or ""
        )
    
    # ==================== 智能路由 ====================
    
    def select_cluster(
        self,
        client_region: Optional[str] = None,
        strategy: Optional[AllocationStrategy] = None,
        exclude_clusters: List[str] = None
    ) -> Optional[ClusterNode]:
        """
        選擇最佳集群
        
        Args:
            client_region: 客戶端區域
            strategy: 分配策略（可選，默認使用全局配置）
            exclude_clusters: 要排除的集群 ID 列表
        """
        strategy = strategy or self.config.strategy
        exclude_clusters = exclude_clusters or []
        
        # 獲取所有活躍集群
        clusters = self.list_clusters(status='active')
        clusters = [c for c in clusters if c['id'] not in exclude_clusters]
        
        if not clusters:
            # 嘗試獲取備用集群
            clusters = self.list_clusters(status='standby')
            clusters = [c for c in clusters if c['id'] not in exclude_clusters]
        
        if not clusters:
            return None
        
        # 根據策略選擇
        if strategy == AllocationStrategy.NEAREST and client_region:
            return self._select_nearest(clusters, client_region)
        elif strategy == AllocationStrategy.ROUND_ROBIN:
            return self._select_round_robin(clusters)
        elif strategy == AllocationStrategy.LEAST_LOADED:
            return self._select_least_loaded(clusters)
        elif strategy == AllocationStrategy.WEIGHTED:
            return self._select_weighted(clusters)
        elif strategy == AllocationStrategy.FAILOVER:
            return self._select_failover(clusters)
        else:
            # 默認：就近 + 健康優先
            return self._select_smart(clusters, client_region)
    
    def _select_nearest(self, clusters: List[Dict], client_region: str) -> Optional[ClusterNode]:
        """就近選擇"""
        client_region = client_region.lower()
        
        def distance_score(cluster):
            cluster_region = cluster['region'].lower()
            distance = self.REGION_DISTANCES.get(client_region, {}).get(cluster_region, 5)
            # 結合健康分數
            return distance - (cluster['health_score'] / 100)
        
        sorted_clusters = sorted(clusters, key=distance_score)
        if sorted_clusters:
            return self.get_cluster(sorted_clusters[0]['id'])
        return None
    
    def _select_round_robin(self, clusters: List[Dict]) -> Optional[ClusterNode]:
        """輪詢選擇"""
        if not clusters:
            return None
        
        self._round_robin_index = (self._round_robin_index + 1) % len(clusters)
        return self.get_cluster(clusters[self._round_robin_index]['id'])
    
    def _select_least_loaded(self, clusters: List[Dict]) -> Optional[ClusterNode]:
        """最低負載選擇"""
        sorted_clusters = sorted(clusters, key=lambda c: c['load_percent'])
        if sorted_clusters:
            return self.get_cluster(sorted_clusters[0]['id'])
        return None
    
    def _select_weighted(self, clusters: List[Dict]) -> Optional[ClusterNode]:
        """加權選擇"""
        import random
        
        total_weight = sum(c['weight'] for c in clusters)
        if total_weight == 0:
            return self._select_round_robin(clusters)
        
        pick = random.uniform(0, total_weight)
        current = 0
        
        for cluster in clusters:
            current += cluster['weight']
            if current >= pick:
                return self.get_cluster(cluster['id'])
        
        return self.get_cluster(clusters[-1]['id'])
    
    def _select_failover(self, clusters: List[Dict]) -> Optional[ClusterNode]:
        """故障轉移選擇（主備模式）"""
        # 按優先級排序
        sorted_clusters = sorted(clusters, key=lambda c: -c['priority'])
        
        for cluster in sorted_clusters:
            if cluster['health_score'] >= self.config.failover_threshold:
                return self.get_cluster(cluster['id'])
        
        # 所有主節點都不健康，返回最健康的
        if sorted_clusters:
            best = max(sorted_clusters, key=lambda c: c['health_score'])
            return self.get_cluster(best['id'])
        
        return None
    
    def _select_smart(self, clusters: List[Dict], client_region: Optional[str]) -> Optional[ClusterNode]:
        """智能選擇（綜合考慮）"""
        def smart_score(cluster):
            score = cluster['health_score'] * 0.4
            score += (100 - cluster['load_percent']) * 0.3
            score += cluster['priority'] * 0.2
            
            # 區域加成
            if client_region:
                cluster_region = cluster['region'].lower()
                distance = self.REGION_DISTANCES.get(client_region.lower(), {}).get(cluster_region, 5)
                score += (5 - distance) * 4  # 最近加 20 分
            
            return score
        
        sorted_clusters = sorted(clusters, key=smart_score, reverse=True)
        if sorted_clusters:
            return self.get_cluster(sorted_clusters[0]['id'])
        return None
    
    # ==================== 健康監控 ====================
    
    async def check_cluster_health(self, cluster_id: str) -> Tuple[bool, Dict]:
        """檢查集群健康狀態"""
        cluster = self.get_cluster(cluster_id)
        if not cluster:
            return False, {"error": "集群不存在"}
        
        try:
            start_time = datetime.now()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{cluster.endpoint}/health",
                    headers={"X-API-Key": cluster.api_key} if cluster.api_key else {},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    latency = (datetime.now() - start_time).total_seconds() * 1000
                    
                    if response.status == 200:
                        data = await response.json()
                        
                        # 更新集群狀態
                        self.update_cluster(cluster_id, {
                            "latency_ms": latency,
                            "health_score": data.get('health_score', 100),
                            "current_load": data.get('current_load', 0),
                            "last_heartbeat": datetime.now().isoformat(),
                            "status": "active"
                        })
                        
                        return True, {
                            "latency_ms": latency,
                            "health_score": data.get('health_score', 100),
                            "status": "healthy"
                        }
                    else:
                        self.update_cluster(cluster_id, {
                            "health_score": max(0, cluster.health_score - 10),
                            "status": "degraded"
                        })
                        return False, {"error": f"HTTP {response.status}"}
                        
        except asyncio.TimeoutError:
            self.update_cluster(cluster_id, {
                "health_score": max(0, cluster.health_score - 20),
                "status": "degraded"
            })
            return False, {"error": "超時"}
        except Exception as e:
            self.update_cluster(cluster_id, {
                "health_score": max(0, cluster.health_score - 30),
                "status": "offline"
            })
            return False, {"error": str(e)}
    
    async def check_all_clusters(self) -> Dict[str, Any]:
        """檢查所有集群健康狀態"""
        clusters = self.list_clusters()
        results = {}
        
        for cluster in clusters:
            healthy, info = await self.check_cluster_health(cluster['id'])
            results[cluster['id']] = {
                "name": cluster['name'],
                "region": cluster['region'],
                "healthy": healthy,
                "info": info
            }
        
        return results
    
    # ==================== 故障轉移 ====================
    
    async def trigger_failover(
        self,
        from_cluster_id: str,
        reason: str = "手動觸發"
    ) -> Tuple[bool, str, Optional[str]]:
        """
        觸發故障轉移
        
        Returns:
            (success, message, new_cluster_id)
        """
        import uuid
        
        from_cluster = self.get_cluster(from_cluster_id)
        if not from_cluster:
            return False, "源集群不存在", None
        
        # 標記源集群為維護狀態
        self.update_cluster(from_cluster_id, {"status": "maintenance"})
        
        # 選擇目標集群
        to_cluster = self.select_cluster(
            client_region=from_cluster.region,
            strategy=AllocationStrategy.FAILOVER,
            exclude_clusters=[from_cluster_id]
        )
        
        if not to_cluster:
            # 恢復源集群狀態
            self.update_cluster(from_cluster_id, {"status": "degraded"})
            return False, "沒有可用的備用集群", None
        
        # 記錄故障轉移
        failover_id = str(uuid.uuid4())
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO failover_history 
            (id, from_cluster_id, to_cluster_id, reason, initiated_at, completed_at, success, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            failover_id, from_cluster_id, to_cluster.id, reason,
            datetime.now().isoformat(), datetime.now().isoformat(),
            1, json.dumps({"from_region": from_cluster.region, "to_region": to_cluster.region})
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"故障轉移: {from_cluster.name} -> {to_cluster.name}, 原因: {reason}")
        
        return True, f"已切換到 {to_cluster.name}", to_cluster.id
    
    def get_failover_history(self, limit: int = 50) -> List[Dict]:
        """獲取故障轉移歷史"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM failover_history ORDER BY initiated_at DESC LIMIT ?
        ''', (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "from_cluster_id": row[1],
            "to_cluster_id": row[2],
            "reason": row[3],
            "initiated_at": row[4],
            "completed_at": row[5],
            "success": bool(row[6]),
            "details": json.loads(row[7]) if row[7] else {}
        } for row in rows]
    
    # ==================== 統計信息 ====================
    
    def get_cluster_stats(self) -> Dict[str, Any]:
        """獲取集群統計信息"""
        clusters = self.list_clusters()
        
        stats = {
            "total_clusters": len(clusters),
            "by_status": {},
            "by_region": {},
            "total_capacity": 0,
            "total_load": 0,
            "average_health": 0,
            "average_latency": 0
        }
        
        for cluster in clusters:
            # 按狀態統計
            status = cluster['status']
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            
            # 按區域統計
            region = cluster['region']
            if region not in stats['by_region']:
                stats['by_region'][region] = {"count": 0, "capacity": 0, "load": 0}
            stats['by_region'][region]['count'] += 1
            stats['by_region'][region]['capacity'] += cluster['max_capacity']
            stats['by_region'][region]['load'] += cluster['current_load']
            
            # 累計
            stats['total_capacity'] += cluster['max_capacity']
            stats['total_load'] += cluster['current_load']
            stats['average_health'] += cluster['health_score']
            stats['average_latency'] += cluster['latency_ms']
        
        if clusters:
            stats['average_health'] = round(stats['average_health'] / len(clusters), 1)
            stats['average_latency'] = round(stats['average_latency'] / len(clusters), 1)
        
        stats['utilization_percent'] = round(
            stats['total_load'] / stats['total_capacity'] * 100, 1
        ) if stats['total_capacity'] > 0 else 0
        
        return stats
    
    def update_config(self, updates: Dict[str, Any]) -> bool:
        """更新配置"""
        try:
            for key, value in updates.items():
                if hasattr(self.config, key):
                    if key == 'strategy':
                        value = AllocationStrategy(value)
                    setattr(self.config, key, value)
            return True
        except Exception as e:
            logger.error(f"更新配置失敗: {e}")
            return False
    
    def get_config(self) -> Dict[str, Any]:
        """獲取配置"""
        return {
            "strategy": self.config.strategy.value,
            "failover_enabled": self.config.failover_enabled,
            "failover_threshold": self.config.failover_threshold,
            "heartbeat_interval": self.config.heartbeat_interval,
            "heartbeat_timeout": self.config.heartbeat_timeout,
            "max_retries": self.config.max_retries,
            "retry_delay": self.config.retry_delay,
            "enable_geo_routing": self.config.enable_geo_routing
        }


# 獲取單例
def get_cluster_manager() -> ClusterManager:
    return ClusterManager()
