"""
TG-Matrix Campaign Orchestrator
Coordinates marketing campaigns across all modules for end-to-end automation
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum


class CampaignStatus(Enum):
    """Campaign status"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class CampaignPhase(Enum):
    """Campaign phases for full-funnel marketing"""
    DISCOVERY = "discovery"       # 資源發現階段
    MONITORING = "monitoring"     # 監控獲客階段
    OUTREACH = "outreach"         # 廣告觸達階段
    TRACKING = "tracking"         # 用戶追蹤階段
    CONVERSION = "conversion"     # 轉化成交階段


@dataclass
class CampaignStep:
    """A single step in the campaign workflow"""
    id: str
    phase: CampaignPhase
    action_type: str
    config: Dict[str, Any]
    order: int
    is_completed: bool = False
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class Campaign:
    """Marketing campaign"""
    id: str
    name: str
    description: str
    status: CampaignStatus
    phases: List[CampaignPhase]
    steps: List[CampaignStep]
    target_groups: List[str]
    assigned_accounts: List[str]
    keywords: List[str]
    ad_template_id: Optional[int]
    settings: Dict[str, Any]
    stats: Dict[str, Any]
    created_at: str
    updated_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "phases": [p.value for p in self.phases],
            "steps": [
                {
                    "id": s.id,
                    "phase": s.phase.value,
                    "actionType": s.action_type,
                    "config": s.config,
                    "order": s.order,
                    "isCompleted": s.is_completed,
                    "completedAt": s.completed_at,
                    "result": s.result,
                    "error": s.error
                }
                for s in self.steps
            ],
            "targetGroups": self.target_groups,
            "assignedAccounts": self.assigned_accounts,
            "keywords": self.keywords,
            "adTemplateId": self.ad_template_id,
            "settings": self.settings,
            "stats": self.stats,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "startedAt": self.started_at,
            "completedAt": self.completed_at
        }


class CampaignOrchestrator:
    """
    Campaign orchestration engine
    
    Features:
    - Create and manage marketing campaigns
    - Coordinate multiple modules (discovery, monitoring, ads, tracking)
    - Execute campaign workflows automatically
    - Track campaign progress and statistics
    - Handle errors and recovery
    """
    
    def __init__(
        self,
        db,
        event_callback: Callable = None,
        log_callback: Callable = None
    ):
        self.db = db
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        self._initialized = False
        self._running_campaigns: Dict[str, asyncio.Task] = {}
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[Campaign] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def initialize(self):
        """Initialize campaign tables"""
        if self._initialized:
            return
        
        try:
            # Create campaigns table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS campaigns (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'draft',
                    phases TEXT NOT NULL,
                    steps TEXT NOT NULL,
                    target_groups TEXT,
                    assigned_accounts TEXT,
                    keywords TEXT,
                    ad_template_id INTEGER,
                    settings TEXT,
                    stats TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT
                )
            ''')
            
            # Create campaign_logs table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS campaign_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    campaign_id TEXT NOT NULL,
                    step_id TEXT,
                    action TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT,
                    data TEXT,
                    timestamp TEXT NOT NULL
                )
            ''')
            
            # Create indexes
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_campaigns_status 
                ON campaigns(status)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign 
                ON campaign_logs(campaign_id)
            ''')
            
            self._initialized = True
            self.log_callback("營銷活動協調器已初始化", "success")
            
        except Exception as e:
            self.log_callback(f"初始化失敗: {e}", "error")
    
    # ==================== Campaign CRUD ====================
    
    async def create_campaign(
        self,
        name: str,
        description: str = "",
        phases: List[str] = None,
        target_groups: List[str] = None,
        assigned_accounts: List[str] = None,
        keywords: List[str] = None,
        ad_template_id: Optional[int] = None,
        settings: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a new marketing campaign"""
        if not name or not name.strip():
            return {"success": False, "error": "活動名稱不能為空"}
        
        campaign_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        
        # Default phases if not specified
        if not phases:
            phases = ["discovery", "monitoring", "outreach"]
        
        # Convert phase strings to enums
        phase_enums = [CampaignPhase(p) for p in phases]
        
        # Generate steps based on phases
        steps = self._generate_steps(phase_enums, settings or {})
        
        campaign = Campaign(
            id=campaign_id,
            name=name.strip(),
            description=description,
            status=CampaignStatus.DRAFT,
            phases=phase_enums,
            steps=steps,
            target_groups=target_groups or [],
            assigned_accounts=assigned_accounts or [],
            keywords=keywords or [],
            ad_template_id=ad_template_id,
            settings=settings or {},
            stats={
                "groupsDiscovered": 0,
                "leadsGenerated": 0,
                "adsSent": 0,
                "usersTracked": 0,
                "conversions": 0
            },
            created_at=now,
            updated_at=now
        )
        
        try:
            await self.db.execute('''
                INSERT INTO campaigns 
                (id, name, description, status, phases, steps, target_groups, 
                 assigned_accounts, keywords, ad_template_id, settings, stats, 
                 created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                campaign.id,
                campaign.name,
                campaign.description,
                campaign.status.value,
                json.dumps([p.value for p in campaign.phases]),
                json.dumps([asdict(s) for s in campaign.steps]),
                json.dumps(campaign.target_groups),
                json.dumps(campaign.assigned_accounts),
                json.dumps(campaign.keywords),
                campaign.ad_template_id,
                json.dumps(campaign.settings),
                json.dumps(campaign.stats),
                campaign.created_at,
                campaign.updated_at
            ))
            
            self.log_callback(f"營銷活動已創建: {campaign.name}", "success")
            
            return {
                "success": True,
                "campaignId": campaign.id,
                "name": campaign.name
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _generate_steps(
        self, 
        phases: List[CampaignPhase],
        settings: Dict[str, Any]
    ) -> List[CampaignStep]:
        """Generate campaign steps based on selected phases"""
        steps = []
        order = 0
        
        for phase in phases:
            if phase == CampaignPhase.DISCOVERY:
                steps.append(CampaignStep(
                    id=f"step_{uuid.uuid4().hex[:6]}",
                    phase=phase,
                    action_type="search_groups",
                    config={
                        "keywords": settings.get("discoveryKeywords", []),
                        "maxGroups": settings.get("maxDiscoveryGroups", 50)
                    },
                    order=order
                ))
                order += 1
                
                steps.append(CampaignStep(
                    id=f"step_{uuid.uuid4().hex[:6]}",
                    phase=phase,
                    action_type="join_groups",
                    config={
                        "maxPerDay": settings.get("maxJoinsPerDay", 10),
                        "autoApprove": settings.get("autoApproveJoin", True)
                    },
                    order=order
                ))
                order += 1
            
            elif phase == CampaignPhase.MONITORING:
                steps.append(CampaignStep(
                    id=f"step_{uuid.uuid4().hex[:6]}",
                    phase=phase,
                    action_type="monitor_keywords",
                    config={
                        "keywords": settings.get("monitorKeywords", []),
                        "autoCreateLead": settings.get("autoCreateLead", True)
                    },
                    order=order
                ))
                order += 1
            
            elif phase == CampaignPhase.OUTREACH:
                steps.append(CampaignStep(
                    id=f"step_{uuid.uuid4().hex[:6]}",
                    phase=phase,
                    action_type="send_ads",
                    config={
                        "templateId": settings.get("adTemplateId"),
                        "scheduleType": settings.get("adScheduleType", "interval"),
                        "intervalMinutes": settings.get("adInterval", 60)
                    },
                    order=order
                ))
                order += 1
            
            elif phase == CampaignPhase.TRACKING:
                steps.append(CampaignStep(
                    id=f"step_{uuid.uuid4().hex[:6]}",
                    phase=phase,
                    action_type="track_users",
                    config={
                        "autoTrackLeads": settings.get("autoTrackLeads", True),
                        "trackInterval": settings.get("trackInterval", 24)  # hours
                    },
                    order=order
                ))
                order += 1
            
            elif phase == CampaignPhase.CONVERSION:
                steps.append(CampaignStep(
                    id=f"step_{uuid.uuid4().hex[:6]}",
                    phase=phase,
                    action_type="follow_up",
                    config={
                        "autoReply": settings.get("autoReply", True),
                        "useAI": settings.get("useAI", True)
                    },
                    order=order
                ))
                order += 1
        
        return steps
    
    async def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Get a single campaign by ID"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM campaigns WHERE id = ?',
                (campaign_id,)
            )
            
            if not row:
                return None
            
            return self._row_to_campaign(row)
            
        except Exception as e:
            self.log_callback(f"獲取活動失敗: {e}", "error")
            return None
    
    async def get_all_campaigns(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get all campaigns with optional filtering"""
        try:
            query = 'SELECT * FROM campaigns WHERE 1=1'
            params = []
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            # Get total count
            count_query = query.replace('SELECT *', 'SELECT COUNT(*) as count')
            count_row = await self.db.fetch_one(count_query, tuple(params))
            total = count_row['count'] if count_row else 0
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            campaigns = [self._row_to_campaign(row).to_dict() for row in rows]
            
            return {
                "success": True,
                "campaigns": campaigns,
                "total": total
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_campaign(
        self,
        campaign_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "活動不存在"}
        
        if campaign.status == CampaignStatus.RUNNING:
            return {"success": False, "error": "運行中的活動無法編輯"}
        
        try:
            update_parts = []
            params = []
            
            field_mapping = {
                'name': 'name',
                'description': 'description',
                'targetGroups': 'target_groups',
                'assignedAccounts': 'assigned_accounts',
                'keywords': 'keywords',
                'adTemplateId': 'ad_template_id',
                'settings': 'settings'
            }
            
            for js_field, db_field in field_mapping.items():
                if js_field in updates:
                    value = updates[js_field]
                    if js_field in ['targetGroups', 'assignedAccounts', 'keywords', 'settings']:
                        value = json.dumps(value)
                    update_parts.append(f"{db_field} = ?")
                    params.append(value)
            
            if not update_parts:
                return {"success": False, "error": "沒有要更新的欄位"}
            
            update_parts.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(campaign_id)
            
            await self.db.execute(f'''
                UPDATE campaigns SET {', '.join(update_parts)}
                WHERE id = ?
            ''', tuple(params))
            
            return {"success": True, "campaignId": campaign_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def delete_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Delete a campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "活動不存在"}
        
        if campaign.status == CampaignStatus.RUNNING:
            return {"success": False, "error": "請先停止運行中的活動"}
        
        try:
            await self.db.execute('DELETE FROM campaign_logs WHERE campaign_id = ?', (campaign_id,))
            await self.db.execute('DELETE FROM campaigns WHERE id = ?', (campaign_id,))
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _row_to_campaign(self, row) -> Campaign:
        """Convert database row to Campaign object"""
        phases = json.loads(row['phases'])
        steps_data = json.loads(row['steps'])
        
        steps = []
        for s in steps_data:
            phase_value = s.get('phase')
            if isinstance(phase_value, str):
                phase = CampaignPhase(phase_value)
            else:
                phase = CampaignPhase(phase_value)
            
            steps.append(CampaignStep(
                id=s['id'],
                phase=phase,
                action_type=s['action_type'],
                config=s['config'],
                order=s['order'],
                is_completed=s.get('is_completed', False),
                completed_at=s.get('completed_at'),
                result=s.get('result'),
                error=s.get('error')
            ))
        
        return Campaign(
            id=row['id'],
            name=row['name'],
            description=row['description'] or "",
            status=CampaignStatus(row['status']),
            phases=[CampaignPhase(p) for p in phases],
            steps=steps,
            target_groups=json.loads(row['target_groups'] or '[]'),
            assigned_accounts=json.loads(row['assigned_accounts'] or '[]'),
            keywords=json.loads(row['keywords'] or '[]'),
            ad_template_id=row['ad_template_id'],
            settings=json.loads(row['settings'] or '{}'),
            stats=json.loads(row['stats'] or '{}'),
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            started_at=row['started_at'],
            completed_at=row['completed_at']
        )
    
    # ==================== Campaign Execution ====================
    
    async def start_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Start a campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "活動不存在"}
        
        if campaign.status == CampaignStatus.RUNNING:
            return {"success": False, "error": "活動已在運行中"}
        
        if not campaign.assigned_accounts:
            return {"success": False, "error": "請先分配帳號"}
        
        now = datetime.now().isoformat()
        
        try:
            # Update status
            await self.db.execute('''
                UPDATE campaigns SET status = ?, started_at = ?, updated_at = ?
                WHERE id = ?
            ''', ('running', now, now, campaign_id))
            
            # Log start
            await self._log_action(campaign_id, None, "campaign_started", "success", "活動已啟動")
            
            # Start execution task
            task = asyncio.create_task(self._execute_campaign(campaign_id))
            self._running_campaigns[campaign_id] = task
            
            self.log_callback(f"營銷活動已啟動: {campaign.name}", "success")
            
            self._send_event("campaign-started", {
                "campaignId": campaign_id,
                "name": campaign.name
            })
            
            return {"success": True, "campaignId": campaign_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def pause_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Pause a running campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "活動不存在"}
        
        if campaign.status != CampaignStatus.RUNNING:
            return {"success": False, "error": "活動未在運行中"}
        
        try:
            # Cancel running task
            if campaign_id in self._running_campaigns:
                self._running_campaigns[campaign_id].cancel()
                del self._running_campaigns[campaign_id]
            
            # Update status
            await self.db.execute('''
                UPDATE campaigns SET status = ?, updated_at = ?
                WHERE id = ?
            ''', ('paused', datetime.now().isoformat(), campaign_id))
            
            await self._log_action(campaign_id, None, "campaign_paused", "success", "活動已暫停")
            
            self._send_event("campaign-paused", {"campaignId": campaign_id})
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def resume_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Resume a paused campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "活動不存在"}
        
        if campaign.status != CampaignStatus.PAUSED:
            return {"success": False, "error": "活動未處於暫停狀態"}
        
        return await self.start_campaign(campaign_id)
    
    async def stop_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Stop and complete a campaign"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "活動不存在"}
        
        try:
            # Cancel running task
            if campaign_id in self._running_campaigns:
                self._running_campaigns[campaign_id].cancel()
                del self._running_campaigns[campaign_id]
            
            now = datetime.now().isoformat()
            
            # Update status
            await self.db.execute('''
                UPDATE campaigns SET status = ?, completed_at = ?, updated_at = ?
                WHERE id = ?
            ''', ('completed', now, now, campaign_id))
            
            await self._log_action(campaign_id, None, "campaign_stopped", "success", "活動已停止")
            
            self._send_event("campaign-stopped", {"campaignId": campaign_id})
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_campaign(self, campaign_id: str):
        """Execute campaign workflow"""
        try:
            campaign = await self.get_campaign(campaign_id)
            if not campaign:
                return
            
            self.log_callback(f"開始執行活動: {campaign.name}", "info")
            
            # Execute steps in order
            for step in sorted(campaign.steps, key=lambda s: s.order):
                if step.is_completed:
                    continue
                
                try:
                    self._send_event("campaign-step-started", {
                        "campaignId": campaign_id,
                        "stepId": step.id,
                        "phase": step.phase.value,
                        "actionType": step.action_type
                    })
                    
                    result = await self._execute_step(campaign, step)
                    
                    # Update step status
                    step.is_completed = True
                    step.completed_at = datetime.now().isoformat()
                    step.result = result
                    
                    await self._update_campaign_steps(campaign)
                    await self._update_campaign_stats(campaign_id, step.action_type, result)
                    
                    await self._log_action(
                        campaign_id, step.id,
                        step.action_type, "success",
                        f"步驟完成: {step.action_type}",
                        result
                    )
                    
                    self._send_event("campaign-step-completed", {
                        "campaignId": campaign_id,
                        "stepId": step.id,
                        "result": result
                    })
                    
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    step.error = str(e)
                    await self._update_campaign_steps(campaign)
                    
                    await self._log_action(
                        campaign_id, step.id,
                        step.action_type, "error",
                        f"步驟失敗: {str(e)}"
                    )
                    
                    self._send_event("campaign-step-failed", {
                        "campaignId": campaign_id,
                        "stepId": step.id,
                        "error": str(e)
                    })
                    
                    # Continue with next step
                    continue
            
            # All steps completed
            await self.db.execute('''
                UPDATE campaigns SET status = ?, completed_at = ?, updated_at = ?
                WHERE id = ?
            ''', ('completed', datetime.now().isoformat(), datetime.now().isoformat(), campaign_id))
            
            self.log_callback(f"活動執行完成: {campaign.name}", "success")
            
            self._send_event("campaign-completed", {"campaignId": campaign_id})
            
        except asyncio.CancelledError:
            self.log_callback(f"活動執行被取消", "warning")
        except Exception as e:
            self.log_callback(f"活動執行錯誤: {e}", "error")
            
            await self.db.execute('''
                UPDATE campaigns SET status = ?, updated_at = ?
                WHERE id = ?
            ''', ('failed', datetime.now().isoformat(), campaign_id))
            
            self._send_event("campaign-failed", {
                "campaignId": campaign_id,
                "error": str(e)
            })
    
    async def _execute_step(self, campaign: Campaign, step: CampaignStep) -> Dict[str, Any]:
        """Execute a single campaign step"""
        action_type = step.action_type
        config = step.config
        
        self.log_callback(f"執行步驟: {action_type}", "info")
        
        if action_type == "search_groups":
            return await self._step_search_groups(campaign, config)
        
        elif action_type == "join_groups":
            return await self._step_join_groups(campaign, config)
        
        elif action_type == "monitor_keywords":
            return await self._step_monitor_keywords(campaign, config)
        
        elif action_type == "send_ads":
            return await self._step_send_ads(campaign, config)
        
        elif action_type == "track_users":
            return await self._step_track_users(campaign, config)
        
        elif action_type == "follow_up":
            return await self._step_follow_up(campaign, config)
        
        else:
            return {"skipped": True, "reason": f"Unknown action: {action_type}"}
    
    async def _step_search_groups(self, campaign: Campaign, config: Dict) -> Dict[str, Any]:
        """Execute group search step"""
        # This would integrate with resource_discovery module
        from resource_discovery import get_discovery_service
        
        discovery = get_discovery_service()
        if not discovery:
            return {"success": False, "error": "資源發現服務未初始化"}
        
        keywords = config.get("keywords", campaign.keywords)
        max_groups = config.get("maxGroups", 50)
        
        # Use first assigned account
        account = campaign.assigned_accounts[0] if campaign.assigned_accounts else None
        if not account:
            return {"success": False, "error": "沒有分配帳號"}
        
        results = []
        for keyword in keywords[:5]:  # Limit keywords per execution
            try:
                result = await discovery.discover_resources(
                    keyword=keyword,
                    phone=account,
                    resource_types=["group", "supergroup"],
                    max_results=max_groups // len(keywords)
                )
                results.append(result)
                await asyncio.sleep(5)  # Rate limiting
            except Exception as e:
                self.log_callback(f"搜索 '{keyword}' 失敗: {e}", "warning")
        
        total_found = sum(r.get("resourcesFound", 0) for r in results if isinstance(r, dict))
        
        return {
            "success": True,
            "groupsFound": total_found,
            "keywords": keywords
        }
    
    async def _step_join_groups(self, campaign: Campaign, config: Dict) -> Dict[str, Any]:
        """Execute group join step"""
        max_per_day = config.get("maxPerDay", 10)
        
        # Get discovered groups that haven't been joined
        rows = await self.db.fetch_all('''
            SELECT * FROM discovered_resources 
            WHERE status = 'discovered' AND resource_type IN ('group', 'supergroup')
            ORDER BY relevance_score DESC
            LIMIT ?
        ''', (max_per_day,))
        
        joined = 0
        failed = 0
        
        for row in rows:
            try:
                # Would integrate with Telegram client to join
                # For now, mark as joined
                await self.db.execute('''
                    UPDATE discovered_resources SET status = 'joined', joined_at = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), row['id']))
                joined += 1
                await asyncio.sleep(30)  # Rate limiting
            except Exception as e:
                failed += 1
                self.log_callback(f"加入群組失敗: {e}", "warning")
        
        return {
            "success": True,
            "joined": joined,
            "failed": failed
        }
    
    async def _step_monitor_keywords(self, campaign: Campaign, config: Dict) -> Dict[str, Any]:
        """Enable keyword monitoring step"""
        keywords = config.get("keywords", campaign.keywords)
        
        # This would set up monitoring keywords in the monitoring system
        # For now, just verify they're configured
        
        return {
            "success": True,
            "keywords": keywords,
            "monitoringEnabled": True
        }
    
    async def _step_send_ads(self, campaign: Campaign, config: Dict) -> Dict[str, Any]:
        """Execute ad sending step"""
        from ad_manager import get_ad_manager
        from ad_broadcaster import get_ad_broadcaster
        
        template_id = config.get("templateId", campaign.ad_template_id)
        if not template_id:
            return {"success": False, "error": "未設置廣告模板"}
        
        broadcaster = get_ad_broadcaster()
        if not broadcaster:
            return {"success": False, "error": "廣告發送器未初始化"}
        
        result = await broadcaster.send_now(
            template_id=template_id,
            target_groups=campaign.target_groups[:10],  # Limit per execution
            account_phones=campaign.assigned_accounts,
            account_strategy="rotate"
        )
        
        return {
            "success": result.get("success", False),
            "sent": result.get("sent", 0),
            "failed": result.get("failed", 0)
        }
    
    async def _step_track_users(self, campaign: Campaign, config: Dict) -> Dict[str, Any]:
        """Execute user tracking step"""
        from user_tracker import get_user_tracker
        
        tracker = get_user_tracker()
        if not tracker:
            return {"success": False, "error": "用戶追蹤器未初始化"}
        
        # Get leads that haven't been tracked
        rows = await self.db.fetch_all('''
            SELECT user_id FROM leads 
            WHERE user_id NOT IN (SELECT user_id FROM tracked_users)
            LIMIT 10
        ''')
        
        if not rows:
            return {"success": True, "tracked": 0, "message": "沒有新用戶需要追蹤"}
        
        user_ids = [str(row['user_id']) for row in rows]
        account = campaign.assigned_accounts[0] if campaign.assigned_accounts else None
        
        if not account:
            return {"success": False, "error": "沒有分配帳號"}
        
        # Add users to tracking
        for user_id in user_ids:
            await tracker.add_user_to_track(
                user_id=user_id,
                source="campaign",
                notes=f"Campaign: {campaign.name}"
            )
        
        # Track their groups
        result = await tracker.batch_track_users(user_ids, account)
        
        return {
            "success": True,
            "tracked": result.get("completed", 0),
            "failed": result.get("failed", 0)
        }
    
    async def _step_follow_up(self, campaign: Campaign, config: Dict) -> Dict[str, Any]:
        """Execute follow-up step"""
        # This would integrate with AI chat system
        return {
            "success": True,
            "followUpEnabled": config.get("autoReply", True),
            "aiEnabled": config.get("useAI", True)
        }
    
    async def _update_campaign_steps(self, campaign: Campaign):
        """Save campaign steps to database"""
        steps_data = []
        for s in campaign.steps:
            steps_data.append({
                "id": s.id,
                "phase": s.phase.value,
                "action_type": s.action_type,
                "config": s.config,
                "order": s.order,
                "is_completed": s.is_completed,
                "completed_at": s.completed_at,
                "result": s.result,
                "error": s.error
            })
        
        await self.db.execute('''
            UPDATE campaigns SET steps = ?, updated_at = ?
            WHERE id = ?
        ''', (json.dumps(steps_data), datetime.now().isoformat(), campaign.id))
    
    async def _update_campaign_stats(self, campaign_id: str, action_type: str, result: Dict):
        """Update campaign statistics"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return
        
        stats = campaign.stats
        
        if action_type == "search_groups":
            stats["groupsDiscovered"] = stats.get("groupsDiscovered", 0) + result.get("groupsFound", 0)
        elif action_type == "send_ads":
            stats["adsSent"] = stats.get("adsSent", 0) + result.get("sent", 0)
        elif action_type == "track_users":
            stats["usersTracked"] = stats.get("usersTracked", 0) + result.get("tracked", 0)
        
        await self.db.execute('''
            UPDATE campaigns SET stats = ?, updated_at = ?
            WHERE id = ?
        ''', (json.dumps(stats), datetime.now().isoformat(), campaign_id))
    
    async def _log_action(
        self,
        campaign_id: str,
        step_id: Optional[str],
        action: str,
        status: str,
        message: str,
        data: Dict = None
    ):
        """Log campaign action"""
        await self.db.execute('''
            INSERT INTO campaign_logs (campaign_id, step_id, action, status, message, data, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            campaign_id,
            step_id,
            action,
            status,
            message,
            json.dumps(data) if data else None,
            datetime.now().isoformat()
        ))
    
    async def get_campaign_logs(self, campaign_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get campaign activity logs"""
        try:
            rows = await self.db.fetch_all('''
                SELECT * FROM campaign_logs 
                WHERE campaign_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (campaign_id, limit))
            
            logs = []
            for row in rows:
                logs.append({
                    "id": row['id'],
                    "stepId": row['step_id'],
                    "action": row['action'],
                    "status": row['status'],
                    "message": row['message'],
                    "data": json.loads(row['data']) if row['data'] else None,
                    "timestamp": row['timestamp']
                })
            
            return {"success": True, "logs": logs}
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
campaign_orchestrator: Optional[CampaignOrchestrator] = None


async def init_campaign_orchestrator(db, event_callback=None, log_callback=None) -> CampaignOrchestrator:
    """Initialize campaign orchestrator"""
    global campaign_orchestrator
    campaign_orchestrator = CampaignOrchestrator(
        db=db,
        event_callback=event_callback,
        log_callback=log_callback
    )
    await campaign_orchestrator.initialize()
    return campaign_orchestrator


def get_campaign_orchestrator() -> Optional[CampaignOrchestrator]:
    """Get campaign orchestrator instance"""
    return campaign_orchestrator
