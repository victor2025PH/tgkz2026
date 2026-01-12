"""
TG-Matrix Batch Operations Module
Provides batch operation capabilities for leads, accounts, and other entities
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Callable
from dataclasses import dataclass, asdict
from enum import Enum


class BatchOperationType(Enum):
    """Types of batch operations"""
    UPDATE_STATUS = "update_status"
    ADD_TAG = "add_tag"
    REMOVE_TAG = "remove_tag"
    SEND_MESSAGE = "send_message"
    ADD_TO_DNC = "add_to_dnc"
    REMOVE_FROM_DNC = "remove_from_dnc"
    ASSIGN_ACCOUNT = "assign_account"
    DELETE = "delete"
    EXPORT = "export"
    UPDATE_FUNNEL_STAGE = "update_funnel_stage"


@dataclass
class BatchOperationResult:
    """Result of a single item in batch operation"""
    item_id: int
    success: bool
    error: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


@dataclass
class BatchOperationRecord:
    """Record of a batch operation for history and undo"""
    id: str
    operation_type: str
    target_type: str  # 'lead', 'account', etc.
    item_ids: List[int]
    parameters: Dict[str, Any]
    results: List[Dict[str, Any]]
    created_at: str
    created_by: str
    success_count: int
    failure_count: int
    is_reversible: bool
    reversed: bool = False
    reversed_at: Optional[str] = None


class BatchOperationManager:
    """Manages batch operations with history and undo support"""
    
    MAX_HISTORY_SIZE = 50  # Maximum number of operations to keep in history
    MAX_BATCH_SIZE = 1000  # Maximum items per batch operation
    
    def __init__(self, db, event_callback: Callable = None):
        self.db = db
        self.event_callback = event_callback
        self.operation_history: List[BatchOperationRecord] = []
        self._initialized = False
    
    async def initialize(self):
        """Initialize batch operation manager and load history from database"""
        if self._initialized:
            return
        
        # Create batch_operations table if not exists
        await self._ensure_tables()
        
        # Load recent operation history
        await self._load_history()
        
        self._initialized = True
        print("[BatchOps] Batch operation manager initialized", file=sys.stderr)
    
    async def _ensure_tables(self):
        """Ensure required database tables exist"""
        try:
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS batch_operations (
                    id TEXT PRIMARY KEY,
                    operation_type TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    item_ids TEXT NOT NULL,
                    parameters TEXT NOT NULL,
                    results TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT DEFAULT 'system',
                    success_count INTEGER DEFAULT 0,
                    failure_count INTEGER DEFAULT 0,
                    is_reversible INTEGER DEFAULT 0,
                    reversed INTEGER DEFAULT 0,
                    reversed_at TEXT
                )
            ''')
            
            # Create index for faster queries
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_batch_operations_created_at 
                ON batch_operations(created_at DESC)
            ''')
            
            # Create lead_tags table if not exists
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS lead_tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lead_id INTEGER NOT NULL,
                    tag TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(lead_id, tag),
                    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
                )
            ''')
            
            # Create tags table if not exists
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    color TEXT DEFAULT '#3B82F6',
                    created_at TEXT NOT NULL
                )
            ''')
            
        except Exception as e:
            print(f"[BatchOps] Error creating tables: {e}", file=sys.stderr)
    
    async def _load_history(self):
        """Load recent operation history from database"""
        try:
            rows = await self.db.fetch_all('''
                SELECT * FROM batch_operations 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (self.MAX_HISTORY_SIZE,))
            
            self.operation_history = []
            for row in rows:
                record = BatchOperationRecord(
                    id=row['id'],
                    operation_type=row['operation_type'],
                    target_type=row['target_type'],
                    item_ids=json.loads(row['item_ids']),
                    parameters=json.loads(row['parameters']),
                    results=json.loads(row['results']),
                    created_at=row['created_at'],
                    created_by=row['created_by'],
                    success_count=row['success_count'],
                    failure_count=row['failure_count'],
                    is_reversible=bool(row['is_reversible']),
                    reversed=bool(row['reversed']),
                    reversed_at=row['reversed_at']
                )
                self.operation_history.append(record)
                
        except Exception as e:
            print(f"[BatchOps] Error loading history: {e}", file=sys.stderr)
    
    async def _save_operation(self, record: BatchOperationRecord):
        """Save operation record to database"""
        try:
            await self.db.execute('''
                INSERT INTO batch_operations 
                (id, operation_type, target_type, item_ids, parameters, results, 
                 created_at, created_by, success_count, failure_count, is_reversible, reversed, reversed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.id,
                record.operation_type,
                record.target_type,
                json.dumps(record.item_ids),
                json.dumps(record.parameters),
                json.dumps(record.results),
                record.created_at,
                record.created_by,
                record.success_count,
                record.failure_count,
                1 if record.is_reversible else 0,
                1 if record.reversed else 0,
                record.reversed_at
            ))
            
            # Add to history (at beginning)
            self.operation_history.insert(0, record)
            
            # Trim history if needed
            if len(self.operation_history) > self.MAX_HISTORY_SIZE:
                self.operation_history = self.operation_history[:self.MAX_HISTORY_SIZE]
                
        except Exception as e:
            print(f"[BatchOps] Error saving operation: {e}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    def _send_progress(self, operation_id: str, current: int, total: int, message: str = ""):
        """Send progress update to frontend"""
        self._send_event("batch-operation-progress", {
            "operationId": operation_id,
            "current": current,
            "total": total,
            "percent": int((current / total) * 100) if total > 0 else 0,
            "message": message
        })
    
    # ==================== Lead Batch Operations ====================
    
    async def batch_update_lead_status(
        self, 
        lead_ids: List[int], 
        new_status: str,
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch update status for multiple leads"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        if len(lead_ids) > self.MAX_BATCH_SIZE:
            return {"success": False, "error": f"Maximum batch size is {self.MAX_BATCH_SIZE}"}
        
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                # Get current status for undo
                lead = await self.db.get_lead(lead_id)
                if not lead:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=False,
                        error="Lead not found"
                    ))
                    continue
                
                old_status = lead.get('status', 'Unknown')
                
                # Update status
                await self.db.update_lead_status(lead_id, new_status)
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    old_value=old_status,
                    new_value=new_status
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            # Send progress update every 10 items or at end
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"更新狀態: {i + 1}/{total}")
        
        # Create operation record
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.UPDATE_STATUS.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={"new_status": new_status},
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=True
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    async def batch_add_tag(
        self,
        lead_ids: List[int],
        tag: str,
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch add tag to multiple leads"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        if not tag or not tag.strip():
            return {"success": False, "error": "Tag is required"}
        
        tag = tag.strip()
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        
        # Ensure tag exists in tags table
        try:
            await self.db.execute('''
                INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, ?)
            ''', (tag, datetime.now().isoformat()))
        except Exception as e:
            print(f"[BatchOps] Error creating tag: {e}", file=sys.stderr)
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                # Check if lead exists
                lead = await self.db.get_lead(lead_id)
                if not lead:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=False,
                        error="Lead not found"
                    ))
                    continue
                
                # Add tag
                await self.db.execute('''
                    INSERT OR IGNORE INTO lead_tags (lead_id, tag, created_at)
                    VALUES (?, ?, ?)
                ''', (lead_id, tag, datetime.now().isoformat()))
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    new_value=tag
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"添加標籤: {i + 1}/{total}")
        
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.ADD_TAG.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={"tag": tag},
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=True
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    async def batch_remove_tag(
        self,
        lead_ids: List[int],
        tag: str,
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch remove tag from multiple leads"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        if not tag or not tag.strip():
            return {"success": False, "error": "Tag is required"}
        
        tag = tag.strip()
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                # Check if tag exists on lead
                row = await self.db.fetch_one('''
                    SELECT id FROM lead_tags WHERE lead_id = ? AND tag = ?
                ''', (lead_id, tag))
                
                if not row:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=True,  # Already doesn't have the tag
                        old_value=None
                    ))
                    continue
                
                # Remove tag
                await self.db.execute('''
                    DELETE FROM lead_tags WHERE lead_id = ? AND tag = ?
                ''', (lead_id, tag))
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    old_value=tag
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"移除標籤: {i + 1}/{total}")
        
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.REMOVE_TAG.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={"tag": tag},
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=True
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    async def batch_add_to_dnc(
        self,
        lead_ids: List[int],
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch add leads to Do Not Contact list"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                lead = await self.db.get_lead(lead_id)
                if not lead:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=False,
                        error="Lead not found"
                    ))
                    continue
                
                old_value = lead.get('do_not_contact', False)
                
                # Update DNC flag
                await self.db.update_lead(lead_id, {"do_not_contact": True})
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    old_value=old_value,
                    new_value=True
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"添加到 DNC: {i + 1}/{total}")
        
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.ADD_TO_DNC.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={},
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=True
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    async def batch_remove_from_dnc(
        self,
        lead_ids: List[int],
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch remove leads from Do Not Contact list"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                lead = await self.db.get_lead(lead_id)
                if not lead:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=False,
                        error="Lead not found"
                    ))
                    continue
                
                old_value = lead.get('do_not_contact', False)
                
                # Update DNC flag
                await self.db.update_lead(lead_id, {"do_not_contact": False})
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    old_value=old_value,
                    new_value=False
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"從 DNC 移除: {i + 1}/{total}")
        
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.REMOVE_FROM_DNC.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={},
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=True
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    async def batch_update_funnel_stage(
        self,
        lead_ids: List[int],
        new_stage: str,
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch update funnel stage for multiple leads"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                lead = await self.db.get_lead(lead_id)
                if not lead:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=False,
                        error="Lead not found"
                    ))
                    continue
                
                old_stage = lead.get('funnel_stage', 'new')
                
                # Update funnel stage
                await self.db.update_lead(lead_id, {"funnel_stage": new_stage})
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    old_value=old_stage,
                    new_value=new_stage
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"更新漏斗階段: {i + 1}/{total}")
        
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.UPDATE_FUNNEL_STAGE.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={"new_stage": new_stage},
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=True
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    async def batch_delete_leads(
        self,
        lead_ids: List[int],
        created_by: str = "user"
    ) -> Dict[str, Any]:
        """Batch delete multiple leads (NOT reversible)"""
        if not lead_ids:
            return {"success": False, "error": "No leads selected"}
        
        operation_id = str(uuid.uuid4())
        results: List[BatchOperationResult] = []
        deleted_leads_backup = []  # Store deleted leads for record
        
        total = len(lead_ids)
        for i, lead_id in enumerate(lead_ids):
            try:
                # Get lead data before deletion (for backup)
                lead = await self.db.get_lead(lead_id)
                if not lead:
                    results.append(BatchOperationResult(
                        item_id=lead_id,
                        success=False,
                        error="Lead not found"
                    ))
                    continue
                
                # Store backup
                deleted_leads_backup.append(lead)
                
                # Delete lead
                await self.db.execute('DELETE FROM leads WHERE id = ?', (lead_id,))
                
                # Delete related data
                await self.db.execute('DELETE FROM lead_tags WHERE lead_id = ?', (lead_id,))
                await self.db.execute('DELETE FROM interactions WHERE lead_id = ?', (lead_id,))
                
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=True,
                    old_value=lead
                ))
                
            except Exception as e:
                results.append(BatchOperationResult(
                    item_id=lead_id,
                    success=False,
                    error=str(e)
                ))
            
            if (i + 1) % 10 == 0 or i == total - 1:
                self._send_progress(operation_id, i + 1, total, f"刪除 Lead: {i + 1}/{total}")
        
        success_count = sum(1 for r in results if r.success)
        failure_count = len(results) - success_count
        
        record = BatchOperationRecord(
            id=operation_id,
            operation_type=BatchOperationType.DELETE.value,
            target_type="lead",
            item_ids=lead_ids,
            parameters={"backup": deleted_leads_backup},  # Store backup for potential recovery
            results=[asdict(r) for r in results],
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            success_count=success_count,
            failure_count=failure_count,
            is_reversible=False  # Delete is not reversible through normal undo
        )
        
        await self._save_operation(record)
        
        return {
            "success": True,
            "operationId": operation_id,
            "successCount": success_count,
            "failureCount": failure_count,
            "results": [asdict(r) for r in results]
        }
    
    # ==================== Undo Operations ====================
    
    async def undo_operation(self, operation_id: str) -> Dict[str, Any]:
        """Undo a previous batch operation"""
        # Find operation in history
        operation = None
        for op in self.operation_history:
            if op.id == operation_id:
                operation = op
                break
        
        if not operation:
            return {"success": False, "error": "Operation not found"}
        
        if not operation.is_reversible:
            return {"success": False, "error": "This operation cannot be undone"}
        
        if operation.reversed:
            return {"success": False, "error": "This operation has already been undone"}
        
        # Perform undo based on operation type
        undo_results = []
        
        try:
            if operation.operation_type == BatchOperationType.UPDATE_STATUS.value:
                # Restore old status values
                for result in operation.results:
                    if result.get('success') and result.get('old_value'):
                        await self.db.update_lead_status(result['item_id'], result['old_value'])
                        undo_results.append({"item_id": result['item_id'], "success": True})
                        
            elif operation.operation_type == BatchOperationType.ADD_TAG.value:
                # Remove the added tag
                tag = operation.parameters.get('tag')
                for result in operation.results:
                    if result.get('success'):
                        await self.db.execute('''
                            DELETE FROM lead_tags WHERE lead_id = ? AND tag = ?
                        ''', (result['item_id'], tag))
                        undo_results.append({"item_id": result['item_id'], "success": True})
                        
            elif operation.operation_type == BatchOperationType.REMOVE_TAG.value:
                # Add the removed tag back
                tag = operation.parameters.get('tag')
                for result in operation.results:
                    if result.get('success') and result.get('old_value'):
                        await self.db.execute('''
                            INSERT OR IGNORE INTO lead_tags (lead_id, tag, created_at)
                            VALUES (?, ?, ?)
                        ''', (result['item_id'], tag, datetime.now().isoformat()))
                        undo_results.append({"item_id": result['item_id'], "success": True})
                        
            elif operation.operation_type == BatchOperationType.ADD_TO_DNC.value:
                # Restore old DNC values
                for result in operation.results:
                    if result.get('success'):
                        old_value = result.get('old_value', False)
                        await self.db.update_lead(result['item_id'], {"do_not_contact": old_value})
                        undo_results.append({"item_id": result['item_id'], "success": True})
                        
            elif operation.operation_type == BatchOperationType.REMOVE_FROM_DNC.value:
                # Restore old DNC values
                for result in operation.results:
                    if result.get('success'):
                        old_value = result.get('old_value', True)
                        await self.db.update_lead(result['item_id'], {"do_not_contact": old_value})
                        undo_results.append({"item_id": result['item_id'], "success": True})
                        
            elif operation.operation_type == BatchOperationType.UPDATE_FUNNEL_STAGE.value:
                # Restore old funnel stage values
                for result in operation.results:
                    if result.get('success') and result.get('old_value'):
                        await self.db.update_lead(result['item_id'], {"funnel_stage": result['old_value']})
                        undo_results.append({"item_id": result['item_id'], "success": True})
            
            # Mark operation as reversed
            operation.reversed = True
            operation.reversed_at = datetime.now().isoformat()
            
            await self.db.execute('''
                UPDATE batch_operations SET reversed = 1, reversed_at = ? WHERE id = ?
            ''', (operation.reversed_at, operation_id))
            
            return {
                "success": True,
                "operationId": operation_id,
                "undoResults": undo_results
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== History and Stats ====================
    
    async def get_operation_history(
        self,
        limit: int = 50,
        offset: int = 0,
        operation_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get batch operation history"""
        try:
            query = '''
                SELECT * FROM batch_operations 
                WHERE 1=1
            '''
            params = []
            
            if operation_type:
                query += ' AND operation_type = ?'
                params.append(operation_type)
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            # Get total count
            count_query = 'SELECT COUNT(*) as count FROM batch_operations WHERE 1=1'
            count_params = []
            if operation_type:
                count_query += ' AND operation_type = ?'
                count_params.append(operation_type)
            
            count_row = await self.db.fetch_one(count_query, tuple(count_params))
            total = count_row['count'] if count_row else 0
            
            operations = []
            for row in rows:
                operations.append({
                    "id": row['id'],
                    "operationType": row['operation_type'],
                    "targetType": row['target_type'],
                    "itemCount": len(json.loads(row['item_ids'])),
                    "successCount": row['success_count'],
                    "failureCount": row['failure_count'],
                    "createdAt": row['created_at'],
                    "createdBy": row['created_by'],
                    "isReversible": bool(row['is_reversible']),
                    "reversed": bool(row['reversed']),
                    "reversedAt": row['reversed_at']
                })
            
            return {
                "success": True,
                "operations": operations,
                "total": total,
                "limit": limit,
                "offset": offset
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_all_tags(self) -> Dict[str, Any]:
        """Get all available tags"""
        try:
            rows = await self.db.fetch_all('''
                SELECT t.*, COUNT(lt.id) as usage_count
                FROM tags t
                LEFT JOIN lead_tags lt ON t.name = lt.tag
                GROUP BY t.id
                ORDER BY usage_count DESC
            ''')
            
            tags = []
            for row in rows:
                tags.append({
                    "id": row['id'],
                    "name": row['name'],
                    "color": row['color'],
                    "usageCount": row['usage_count']
                })
            
            return {"success": True, "tags": tags}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_lead_tags(self, lead_id: int) -> Dict[str, Any]:
        """Get tags for a specific lead"""
        try:
            rows = await self.db.fetch_all('''
                SELECT tag FROM lead_tags WHERE lead_id = ?
            ''', (lead_id,))
            
            tags = [row['tag'] for row in rows]
            
            return {"success": True, "tags": tags}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def create_tag(self, name: str, color: str = "#3B82F6") -> Dict[str, Any]:
        """Create a new tag"""
        try:
            if not name or not name.strip():
                return {"success": False, "error": "Tag name is required"}
            
            name = name.strip()
            
            await self.db.execute('''
                INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)
            ''', (name, color, datetime.now().isoformat()))
            
            return {"success": True, "name": name, "color": color}
            
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                return {"success": False, "error": "Tag already exists"}
            return {"success": False, "error": str(e)}
    
    async def delete_tag(self, tag_name: str) -> Dict[str, Any]:
        """Delete a tag and remove it from all leads"""
        try:
            # Remove from all leads
            await self.db.execute('DELETE FROM lead_tags WHERE tag = ?', (tag_name,))
            
            # Remove tag itself
            await self.db.execute('DELETE FROM tags WHERE name = ?', (tag_name,))
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
batch_ops: Optional[BatchOperationManager] = None


async def init_batch_operations(db, event_callback=None) -> BatchOperationManager:
    """Initialize batch operations manager"""
    global batch_ops
    batch_ops = BatchOperationManager(db, event_callback)
    await batch_ops.initialize()
    return batch_ops


def get_batch_ops() -> Optional[BatchOperationManager]:
    """Get batch operations manager instance"""
    return batch_ops
