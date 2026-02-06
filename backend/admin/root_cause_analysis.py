"""
智能根因分析

功能：
- 故障關聯分析
- 時間序列異常檢測
- 依賴關係分析
- 根因定位
- 建議生成
"""

import logging
import sqlite3
import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'rca.db')


class IncidentSeverity(str, Enum):
    """事件嚴重程度"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(str, Enum):
    """事件狀態"""
    OPEN = "open"
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ComponentType(str, Enum):
    """組件類型"""
    API = "api"
    PROXY = "proxy"
    DATABASE = "database"
    NETWORK = "network"
    EXTERNAL = "external"


@dataclass
class Symptom:
    """症狀"""
    id: str
    name: str
    metric_name: str
    threshold: float
    current_value: float
    severity: IncidentSeverity
    detected_at: str
    component: str = ""
    component_type: ComponentType = ComponentType.API


@dataclass
class Incident:
    """事件"""
    id: str
    title: str
    description: str = ""
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    status: IncidentStatus = IncidentStatus.OPEN
    symptoms: List[Symptom] = field(default_factory=list)
    affected_components: List[str] = field(default_factory=list)
    root_cause: str = ""
    recommendations: List[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
    resolved_at: str = ""


@dataclass
class DependencyEdge:
    """依賴關係邊"""
    source: str
    target: str
    weight: float = 1.0
    latency_impact: float = 0  # 毫秒
    error_propagation: float = 0  # 錯誤傳播率


class DependencyGraph:
    """依賴關係圖"""
    
    def __init__(self):
        self._edges: Dict[str, List[DependencyEdge]] = defaultdict(list)
        self._reverse_edges: Dict[str, List[DependencyEdge]] = defaultdict(list)
    
    def add_dependency(
        self,
        source: str,
        target: str,
        weight: float = 1.0,
        latency_impact: float = 0,
        error_propagation: float = 0.5
    ):
        """添加依賴關係"""
        edge = DependencyEdge(source, target, weight, latency_impact, error_propagation)
        self._edges[source].append(edge)
        self._reverse_edges[target].append(edge)
    
    def get_dependencies(self, component: str) -> List[str]:
        """獲取組件的依賴"""
        return [e.target for e in self._edges.get(component, [])]
    
    def get_dependents(self, component: str) -> List[str]:
        """獲取依賴該組件的其他組件"""
        return [e.source for e in self._reverse_edges.get(component, [])]
    
    def get_impact_path(self, failed_component: str, max_depth: int = 5) -> List[List[str]]:
        """獲取故障影響路徑"""
        paths = []
        
        def dfs(current: str, path: List[str], depth: int):
            if depth >= max_depth:
                return
            
            dependents = self.get_dependents(current)
            for dep in dependents:
                if dep not in path:
                    new_path = path + [dep]
                    paths.append(new_path)
                    dfs(dep, new_path, depth + 1)
        
        dfs(failed_component, [failed_component], 0)
        return paths
    
    def calculate_blast_radius(self, component: str) -> Dict[str, float]:
        """計算爆炸半徑（受影響組件及其受影響程度）"""
        affected = {}
        visited = set()
        
        def propagate(current: str, impact: float):
            if current in visited or impact < 0.01:
                return
            
            visited.add(current)
            affected[current] = impact
            
            for edge in self._reverse_edges.get(current, []):
                new_impact = impact * edge.error_propagation
                propagate(edge.source, new_impact)
        
        propagate(component, 1.0)
        del affected[component]  # 移除源組件
        
        return affected


class CorrelationAnalyzer:
    """相關性分析器"""
    
    def __init__(self):
        self._time_window = 300  # 5分鐘窗口
    
    def find_correlated_events(
        self,
        events: List[Dict],
        time_window_seconds: int = 300
    ) -> List[List[Dict]]:
        """查找時間相關的事件"""
        if not events:
            return []
        
        # 按時間排序
        sorted_events = sorted(events, key=lambda e: e.get('timestamp', ''))
        
        clusters = []
        current_cluster = [sorted_events[0]]
        
        for event in sorted_events[1:]:
            prev_time = datetime.fromisoformat(current_cluster[-1]['timestamp'])
            curr_time = datetime.fromisoformat(event['timestamp'])
            
            if (curr_time - prev_time).total_seconds() <= time_window_seconds:
                current_cluster.append(event)
            else:
                if len(current_cluster) > 1:
                    clusters.append(current_cluster)
                current_cluster = [event]
        
        if len(current_cluster) > 1:
            clusters.append(current_cluster)
        
        return clusters
    
    def calculate_correlation(
        self,
        series_a: List[float],
        series_b: List[float]
    ) -> float:
        """計算兩個時間序列的相關係數"""
        if len(series_a) != len(series_b) or len(series_a) < 2:
            return 0
        
        n = len(series_a)
        mean_a = sum(series_a) / n
        mean_b = sum(series_b) / n
        
        numerator = sum((a - mean_a) * (b - mean_b) for a, b in zip(series_a, series_b))
        
        std_a = (sum((a - mean_a) ** 2 for a in series_a) / n) ** 0.5
        std_b = (sum((b - mean_b) ** 2 for b in series_b) / n) ** 0.5
        
        if std_a == 0 or std_b == 0:
            return 0
        
        return numerator / (n * std_a * std_b)
    
    def detect_leading_indicator(
        self,
        events: List[Dict],
        target_event_type: str,
        max_lag: int = 5
    ) -> List[Dict]:
        """檢測先行指標（預示問題的事件）"""
        # 找出目標事件
        target_events = [e for e in events if e.get('event_type') == target_event_type]
        other_events = [e for e in events if e.get('event_type') != target_event_type]
        
        if not target_events or not other_events:
            return []
        
        # 分析哪些事件類型經常在目標事件之前發生
        leading_counts = defaultdict(int)
        
        for target in target_events:
            target_time = datetime.fromisoformat(target['timestamp'])
            
            for event in other_events:
                event_time = datetime.fromisoformat(event['timestamp'])
                lag = (target_time - event_time).total_seconds() / 60  # 分鐘
                
                if 0 < lag <= max_lag:
                    leading_counts[event['event_type']] += 1
        
        # 返回排名靠前的先行指標
        sorted_indicators = sorted(leading_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {"event_type": k, "occurrence_count": v, "avg_lead_time_min": max_lag / 2}
            for k, v in sorted_indicators[:5]
        ]


class RootCauseAnalyzer:
    """根因分析器"""
    
    _instance = None
    
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
        self.dependency_graph = DependencyGraph()
        self.correlation_analyzer = CorrelationAnalyzer()
        self._init_default_dependencies()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 事件表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                severity TEXT,
                status TEXT,
                symptoms TEXT DEFAULT '[]',
                affected_components TEXT DEFAULT '[]',
                root_cause TEXT,
                recommendations TEXT DEFAULT '[]',
                created_at TEXT,
                updated_at TEXT,
                resolved_at TEXT
            )
        ''')
        
        # 症狀表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS symptoms (
                id TEXT PRIMARY KEY,
                incident_id TEXT,
                name TEXT,
                metric_name TEXT,
                threshold REAL,
                current_value REAL,
                severity TEXT,
                component TEXT,
                component_type TEXT,
                detected_at TEXT
            )
        ''')
        
        # 依賴關係表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dependencies (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                weight REAL DEFAULT 1.0,
                latency_impact REAL DEFAULT 0,
                error_propagation REAL DEFAULT 0.5,
                created_at TEXT
            )
        ''')
        
        # 根因知識庫
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS root_cause_knowledge (
                id TEXT PRIMARY KEY,
                symptom_pattern TEXT,
                root_cause TEXT,
                recommendations TEXT DEFAULT '[]',
                confidence REAL DEFAULT 0.5,
                occurrence_count INTEGER DEFAULT 1,
                last_seen TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_incident_status ON incidents(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_symptom_incident ON symptoms(incident_id)')
        
        conn.commit()
        conn.close()
        logger.info("根因分析數據庫已初始化")
    
    def _init_default_dependencies(self):
        """初始化默認依賴關係"""
        # API 系統常見依賴
        default_deps = [
            ("api_pool", "database", 0.9, 10, 0.8),
            ("api_pool", "network", 0.7, 50, 0.6),
            ("proxy_pool", "network", 0.8, 30, 0.7),
            ("scheduler", "database", 0.6, 5, 0.5),
            ("webhook", "network", 0.9, 100, 0.9),
            ("billing", "database", 0.95, 20, 0.8),
        ]
        
        for source, target, weight, latency, error_prop in default_deps:
            self.dependency_graph.add_dependency(source, target, weight, latency, error_prop)
    
    # ==================== 事件管理 ====================
    
    def create_incident(
        self,
        title: str,
        symptoms: List[Dict],
        severity: IncidentSeverity = None,
        description: str = ""
    ) -> str:
        """創建事件"""
        incident_id = str(uuid.uuid4())
        
        # 自動確定嚴重程度
        if severity is None:
            if any(s.get('severity') == 'critical' for s in symptoms):
                severity = IncidentSeverity.CRITICAL
            elif any(s.get('severity') == 'high' for s in symptoms):
                severity = IncidentSeverity.HIGH
            else:
                severity = IncidentSeverity.MEDIUM
        
        # 提取受影響組件
        affected = list(set(s.get('component', '') for s in symptoms if s.get('component')))
        
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO incidents 
            (id, title, description, severity, status, symptoms, affected_components, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            incident_id, title, description, 
            severity.value if isinstance(severity, IncidentSeverity) else severity,
            IncidentStatus.OPEN.value, json.dumps(symptoms), json.dumps(affected), now, now
        ))
        
        # 保存症狀
        for symptom in symptoms:
            cursor.execute('''
                INSERT INTO symptoms 
                (id, incident_id, name, metric_name, threshold, current_value, severity, component, component_type, detected_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), incident_id, symptom.get('name', ''),
                symptom.get('metric_name', ''), symptom.get('threshold', 0),
                symptom.get('current_value', 0), symptom.get('severity', 'medium'),
                symptom.get('component', ''), symptom.get('component_type', 'api'), now
            ))
        
        conn.commit()
        conn.close()
        
        return incident_id
    
    def get_incident(self, incident_id: str) -> Optional[Dict]:
        """獲取事件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return None
        
        # 獲取症狀
        cursor.execute('SELECT * FROM symptoms WHERE incident_id = ?', (incident_id,))
        symptom_rows = cursor.fetchall()
        conn.close()
        
        symptoms = [{
            "id": s[0], "name": s[2], "metric_name": s[3],
            "threshold": s[4], "current_value": s[5], "severity": s[6],
            "component": s[7], "component_type": s[8], "detected_at": s[9]
        } for s in symptom_rows]
        
        return {
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "severity": row[3],
            "status": row[4],
            "symptoms": symptoms,
            "affected_components": json.loads(row[6]) if row[6] else [],
            "root_cause": row[7],
            "recommendations": json.loads(row[8]) if row[8] else [],
            "created_at": row[9],
            "updated_at": row[10],
            "resolved_at": row[11]
        }
    
    def list_incidents(
        self,
        status: IncidentStatus = None,
        severity: IncidentSeverity = None,
        limit: int = 50
    ) -> List[Dict]:
        """列出事件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT id, title, severity, status, affected_components, root_cause, created_at FROM incidents WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = ?'
            params.append(status.value if isinstance(status, IncidentStatus) else status)
        
        if severity:
            query += ' AND severity = ?'
            params.append(severity.value if isinstance(severity, IncidentSeverity) else severity)
        
        query += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "title": row[1],
            "severity": row[2],
            "status": row[3],
            "affected_components": json.loads(row[4]) if row[4] else [],
            "root_cause": row[5],
            "created_at": row[6]
        } for row in rows]
    
    def update_incident_status(
        self,
        incident_id: str,
        status: IncidentStatus,
        root_cause: str = None,
        recommendations: List[str] = None
    ) -> bool:
        """更新事件狀態"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            updates = ["status = ?", "updated_at = ?"]
            params = [status.value if isinstance(status, IncidentStatus) else status, datetime.now().isoformat()]
            
            if root_cause:
                updates.append("root_cause = ?")
                params.append(root_cause)
            
            if recommendations:
                updates.append("recommendations = ?")
                params.append(json.dumps(recommendations))
            
            if status == IncidentStatus.RESOLVED:
                updates.append("resolved_at = ?")
                params.append(datetime.now().isoformat())
            
            params.append(incident_id)
            
            cursor.execute(f'''
                UPDATE incidents SET {', '.join(updates)} WHERE id = ?
            ''', params)
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新事件狀態失敗: {e}")
            return False
    
    # ==================== 根因分析 ====================
    
    def analyze_root_cause(self, incident_id: str) -> Dict[str, Any]:
        """分析根因"""
        incident = self.get_incident(incident_id)
        if not incident:
            return {"error": "事件不存在"}
        
        symptoms = incident['symptoms']
        affected = incident['affected_components']
        
        analysis_result = {
            "incident_id": incident_id,
            "symptoms_count": len(symptoms),
            "affected_components": affected,
            "probable_root_causes": [],
            "impact_analysis": {},
            "recommendations": [],
            "confidence": 0
        }
        
        # 1. 基於症狀模式匹配知識庫
        pattern_matches = self._match_symptom_patterns(symptoms)
        analysis_result["pattern_matches"] = pattern_matches
        
        # 2. 依賴關係分析
        if affected:
            # 找出最可能的源頭
            source_scores = {}
            for component in affected:
                # 計算該組件作為源頭時影響的組件數
                blast_radius = self.dependency_graph.calculate_blast_radius(component)
                covered = len(set(blast_radius.keys()) & set(affected))
                source_scores[component] = covered
            
            if source_scores:
                most_likely_source = max(source_scores.items(), key=lambda x: x[1])
                analysis_result["probable_root_causes"].append({
                    "component": most_likely_source[0],
                    "confidence": min(0.9, most_likely_source[1] / len(affected)),
                    "reason": "依賴關係分析顯示該組件故障可解釋大部分受影響組件"
                })
                
                # 影響分析
                analysis_result["impact_analysis"] = self.dependency_graph.calculate_blast_radius(
                    most_likely_source[0]
                )
        
        # 3. 時間相關性分析
        if len(symptoms) > 1:
            time_analysis = self._analyze_symptom_timeline(symptoms)
            if time_analysis.get('first_symptom'):
                analysis_result["probable_root_causes"].append({
                    "component": time_analysis['first_symptom'].get('component', 'unknown'),
                    "confidence": 0.7,
                    "reason": f"首個出現的症狀，時間: {time_analysis.get('first_time')}"
                })
        
        # 4. 生成建議
        recommendations = self._generate_recommendations(symptoms, analysis_result["probable_root_causes"])
        analysis_result["recommendations"] = recommendations
        
        # 計算總體置信度
        if analysis_result["probable_root_causes"]:
            analysis_result["confidence"] = max(
                rc["confidence"] for rc in analysis_result["probable_root_causes"]
            )
        
        # 更新事件
        if analysis_result["probable_root_causes"]:
            top_cause = analysis_result["probable_root_causes"][0]
            self.update_incident_status(
                incident_id,
                IncidentStatus.IDENTIFIED,
                root_cause=f"{top_cause['component']}: {top_cause['reason']}",
                recommendations=recommendations
            )
            
            # 學習到知識庫
            self._learn_pattern(symptoms, top_cause['component'], recommendations)
        
        return analysis_result
    
    def _match_symptom_patterns(self, symptoms: List[Dict]) -> List[Dict]:
        """匹配症狀模式"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM root_cause_knowledge ORDER BY confidence DESC, occurrence_count DESC')
        rows = cursor.fetchall()
        conn.close()
        
        matches = []
        symptom_names = set(s.get('name', '') for s in symptoms)
        
        for row in rows:
            pattern = json.loads(row[1]) if row[1] else []
            pattern_names = set(pattern)
            
            if pattern_names and pattern_names.issubset(symptom_names):
                matches.append({
                    "pattern": pattern,
                    "root_cause": row[2],
                    "recommendations": json.loads(row[3]) if row[3] else [],
                    "confidence": row[4],
                    "occurrence_count": row[5]
                })
        
        return matches[:5]  # 返回前 5 個匹配
    
    def _analyze_symptom_timeline(self, symptoms: List[Dict]) -> Dict:
        """分析症狀時間線"""
        sorted_symptoms = sorted(
            [s for s in symptoms if s.get('detected_at')],
            key=lambda x: x['detected_at']
        )
        
        if not sorted_symptoms:
            return {}
        
        first = sorted_symptoms[0]
        last = sorted_symptoms[-1]
        
        return {
            "first_symptom": first,
            "first_time": first.get('detected_at'),
            "last_symptom": last,
            "last_time": last.get('detected_at'),
            "timeline": [{"name": s['name'], "time": s['detected_at']} for s in sorted_symptoms]
        }
    
    def _generate_recommendations(
        self,
        symptoms: List[Dict],
        root_causes: List[Dict]
    ) -> List[str]:
        """生成建議"""
        recommendations = []
        
        # 基於症狀的通用建議
        symptom_names = [s.get('name', '').lower() for s in symptoms]
        
        if any('error_rate' in n or 'failure' in n for n in symptom_names):
            recommendations.append("檢查 API 錯誤日誌，查找具體錯誤信息")
            recommendations.append("考慮暫時切換到備用 API 或啟動故障轉移")
        
        if any('latency' in n or 'timeout' in n for n in symptom_names):
            recommendations.append("檢查網絡連接狀態和延遲")
            recommendations.append("考慮增加超時時間或重試次數")
        
        if any('capacity' in n or 'quota' in n for n in symptom_names):
            recommendations.append("檢查資源配額使用情況")
            recommendations.append("考慮擴容或優化資源使用")
        
        # 基於根因的建議
        for cause in root_causes:
            component = cause.get('component', '')
            
            if 'database' in component.lower():
                recommendations.append("檢查數據庫連接池狀態")
                recommendations.append("確認數據庫服務器健康狀態")
            
            if 'network' in component.lower():
                recommendations.append("檢查網絡連通性和防火牆規則")
                recommendations.append("確認 DNS 解析正常")
            
            if 'api' in component.lower():
                recommendations.append("檢查 API 提供商狀態頁面")
                recommendations.append("驗證 API 憑據有效性")
        
        return list(set(recommendations))[:10]  # 去重並限制數量
    
    def _learn_pattern(
        self,
        symptoms: List[Dict],
        root_cause: str,
        recommendations: List[str]
    ):
        """學習症狀模式"""
        pattern = sorted([s.get('name', '') for s in symptoms])
        pattern_json = json.dumps(pattern)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 檢查是否已有類似模式
        cursor.execute('''
            SELECT id, occurrence_count, confidence FROM root_cause_knowledge
            WHERE symptom_pattern = ? AND root_cause = ?
        ''', (pattern_json, root_cause))
        
        row = cursor.fetchone()
        now = datetime.now().isoformat()
        
        if row:
            # 更新已有記錄
            new_count = row[1] + 1
            new_confidence = min(0.95, row[2] + 0.05)  # 逐漸增加置信度
            
            cursor.execute('''
                UPDATE root_cause_knowledge 
                SET occurrence_count = ?, confidence = ?, last_seen = ?
                WHERE id = ?
            ''', (new_count, new_confidence, now, row[0]))
        else:
            # 創建新記錄
            cursor.execute('''
                INSERT INTO root_cause_knowledge 
                (id, symptom_pattern, root_cause, recommendations, confidence, occurrence_count, last_seen)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            ''', (str(uuid.uuid4()), pattern_json, root_cause, json.dumps(recommendations), 0.5, now))
        
        conn.commit()
        conn.close()
    
    # ==================== 智能預警 ====================
    
    def predict_issues(self, recent_events: List[Dict]) -> List[Dict]:
        """基於最近事件預測潛在問題"""
        predictions = []
        
        # 檢測先行指標
        leading_indicators = self.correlation_analyzer.detect_leading_indicator(
            recent_events, "api_failure"
        )
        
        for indicator in leading_indicators:
            if indicator['occurrence_count'] >= 3:
                predictions.append({
                    "type": "potential_failure",
                    "confidence": min(0.9, indicator['occurrence_count'] * 0.1),
                    "trigger_event": indicator['event_type'],
                    "expected_issue": "API 故障",
                    "expected_lead_time_min": indicator['avg_lead_time_min'],
                    "recommendation": f"監控 {indicator['event_type']} 事件，提前做好故障準備"
                })
        
        # 檢測相關事件集群
        clusters = self.correlation_analyzer.find_correlated_events(recent_events)
        
        for cluster in clusters:
            if len(cluster) >= 3:
                event_types = set(e.get('event_type', '') for e in cluster)
                predictions.append({
                    "type": "event_cluster",
                    "confidence": min(0.8, len(cluster) * 0.15),
                    "events": list(event_types),
                    "cluster_size": len(cluster),
                    "recommendation": "多個相關事件同時發生，建議檢查共同依賴"
                })
        
        return predictions
    
    # ==================== 統計 ====================
    
    def get_rca_stats(self) -> Dict[str, Any]:
        """獲取根因分析統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 事件統計
        cursor.execute('''
            SELECT status, COUNT(*) FROM incidents GROUP BY status
        ''')
        status_counts = dict(cursor.fetchall())
        
        # 嚴重程度分佈
        cursor.execute('''
            SELECT severity, COUNT(*) FROM incidents GROUP BY severity
        ''')
        severity_counts = dict(cursor.fetchall())
        
        # 常見根因
        cursor.execute('''
            SELECT root_cause, COUNT(*) as cnt FROM incidents 
            WHERE root_cause IS NOT NULL AND root_cause != ''
            GROUP BY root_cause ORDER BY cnt DESC LIMIT 5
        ''')
        top_causes = [{"cause": row[0], "count": row[1]} for row in cursor.fetchall()]
        
        # 知識庫規模
        cursor.execute('SELECT COUNT(*) FROM root_cause_knowledge')
        knowledge_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "incident_status": status_counts,
            "severity_distribution": severity_counts,
            "top_root_causes": top_causes,
            "knowledge_base_size": knowledge_count,
            "timestamp": datetime.now().isoformat()
        }


# 獲取單例
def get_rca_analyzer() -> RootCauseAnalyzer:
    return RootCauseAnalyzer()
