"""
🔧 Phase 2 優化：內存使用監控和報警

功能：
1. 定期監控內存使用情況
2. 超過閾值時觸發報警
3. 自動執行清理操作
4. 提供內存使用報告
"""

import sys
import gc
import asyncio
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field


@dataclass
class MemorySnapshot:
    """內存快照"""
    timestamp: datetime
    rss_mb: float  # 常駐內存
    vms_mb: float  # 虛擬內存
    percent: float  # 內存使用百分比
    gc_objects: int  # GC 對象數量
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'rss_mb': round(self.rss_mb, 2),
            'vms_mb': round(self.vms_mb, 2),
            'percent': round(self.percent, 2),
            'gc_objects': self.gc_objects
        }


class MemoryMonitor:
    """
    內存監控器
    
    使用方式：
        monitor = MemoryMonitor()
        await monitor.start()
    """
    
    def __init__(
        self,
        warning_threshold_mb: float = 800.0,  # 警告閾值
        critical_threshold_mb: float = 1200.0,  # 危險閾值
        check_interval: float = 60.0,  # 檢查間隔（秒）
        history_size: int = 100,  # 保留歷史記錄數量
    ):
        self.warning_threshold_mb = warning_threshold_mb
        self.critical_threshold_mb = critical_threshold_mb
        self.check_interval = check_interval
        self.history_size = history_size
        
        self._history: List[MemorySnapshot] = []
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._event_callback: Optional[Callable] = None
        self._cleanup_callback: Optional[Callable] = None
        
        # 報警狀態
        self._last_warning_time: Optional[datetime] = None
        self._last_critical_time: Optional[datetime] = None
        self._warning_cooldown = timedelta(minutes=5)  # 報警冷卻時間
        
        # 統計
        self._stats = {
            'warnings': 0,
            'criticals': 0,
            'gc_runs': 0,
            'memory_cleaned_mb': 0.0,
        }
    
    def set_callbacks(
        self,
        event_callback: Optional[Callable] = None,
        cleanup_callback: Optional[Callable] = None
    ):
        """設置回調函數"""
        self._event_callback = event_callback
        self._cleanup_callback = cleanup_callback
    
    def _get_memory_info(self) -> Optional[MemorySnapshot]:
        """獲取當前內存信息"""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return MemorySnapshot(
                timestamp=datetime.now(),
                rss_mb=memory_info.rss / 1024 / 1024,
                vms_mb=memory_info.vms / 1024 / 1024,
                percent=process.memory_percent(),
                gc_objects=len(gc.get_objects())
            )
        except ImportError:
            # psutil 未安裝，使用簡化方法
            gc_objects = len(gc.get_objects())
            return MemorySnapshot(
                timestamp=datetime.now(),
                rss_mb=gc_objects * 0.001,  # 估算
                vms_mb=0,
                percent=0,
                gc_objects=gc_objects
            )
        except Exception as e:
            print(f"[MemoryMonitor] 獲取內存信息失敗: {e}", file=sys.stderr)
            return None
    
    async def _check_memory(self):
        """檢查內存使用情況"""
        snapshot = self._get_memory_info()
        if not snapshot:
            return
        
        # 保存歷史記錄
        self._history.append(snapshot)
        if len(self._history) > self.history_size:
            self._history = self._history[-self.history_size:]
        
        # 檢查閾值
        now = datetime.now()
        
        # 危險級別
        if snapshot.rss_mb >= self.critical_threshold_mb:
            if self._last_critical_time is None or now - self._last_critical_time > self._warning_cooldown:
                self._last_critical_time = now
                self._stats['criticals'] += 1
                
                print(f"[MemoryMonitor] ⚠️ 內存危險: {snapshot.rss_mb:.1f}MB (閾值: {self.critical_threshold_mb}MB)", file=sys.stderr)
                
                # 觸發報警
                if self._event_callback:
                    self._event_callback("memory-critical", {
                        "level": "critical",
                        "message": f"內存使用量達到 {snapshot.rss_mb:.1f}MB，請注意！",
                        "snapshot": snapshot.to_dict()
                    })
                
                # 嘗試清理
                await self._emergency_cleanup()
        
        # 警告級別
        elif snapshot.rss_mb >= self.warning_threshold_mb:
            if self._last_warning_time is None or now - self._last_warning_time > self._warning_cooldown:
                self._last_warning_time = now
                self._stats['warnings'] += 1
                
                print(f"[MemoryMonitor] ⚠️ 內存警告: {snapshot.rss_mb:.1f}MB (閾值: {self.warning_threshold_mb}MB)", file=sys.stderr)
                
                if self._event_callback:
                    self._event_callback("memory-warning", {
                        "level": "warning",
                        "message": f"內存使用量達到 {snapshot.rss_mb:.1f}MB",
                        "snapshot": snapshot.to_dict()
                    })
    
    async def _emergency_cleanup(self):
        """緊急清理"""
        print("[MemoryMonitor] 🧹 執行緊急內存清理...", file=sys.stderr)
        
        before = self._get_memory_info()
        
        # 1. 強制 GC
        gc.collect()
        gc.collect()
        gc.collect()
        self._stats['gc_runs'] += 3
        
        # 2. 調用外部清理回調
        if self._cleanup_callback:
            try:
                await self._cleanup_callback()
            except Exception as e:
                print(f"[MemoryMonitor] 清理回調失敗: {e}", file=sys.stderr)
        
        after = self._get_memory_info()
        
        if before and after:
            cleaned = before.rss_mb - after.rss_mb
            self._stats['memory_cleaned_mb'] += max(0, cleaned)
            print(f"[MemoryMonitor] 🧹 清理完成，釋放了 {cleaned:.1f}MB", file=sys.stderr)
    
    async def start(self):
        """啟動監控"""
        if self._running:
            return
        
        self._running = True
        print(f"[MemoryMonitor] 內存監控已啟動 (警告: {self.warning_threshold_mb}MB, 危險: {self.critical_threshold_mb}MB)", file=sys.stderr)
        
        async def monitor_loop():
            while self._running:
                await self._check_memory()
                await asyncio.sleep(self.check_interval)
        
        self._task = asyncio.create_task(monitor_loop())
    
    async def stop(self):
        """停止監控"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("[MemoryMonitor] 內存監控已停止", file=sys.stderr)
    
    def get_current_usage(self) -> Dict[str, Any]:
        """獲取當前內存使用情況"""
        snapshot = self._get_memory_info()
        if not snapshot:
            return {"error": "無法獲取內存信息"}
        
        return {
            "current": snapshot.to_dict(),
            "thresholds": {
                "warning_mb": self.warning_threshold_mb,
                "critical_mb": self.critical_threshold_mb,
            },
            "status": self._get_status(snapshot.rss_mb),
            "stats": self._stats,
        }
    
    def _get_status(self, rss_mb: float) -> str:
        """獲取狀態"""
        if rss_mb >= self.critical_threshold_mb:
            return "critical"
        elif rss_mb >= self.warning_threshold_mb:
            return "warning"
        else:
            return "normal"
    
    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """獲取歷史記錄"""
        return [s.to_dict() for s in self._history[-limit:]]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        return {
            **self._stats,
            "history_size": len(self._history),
            "is_running": self._running,
        }


# 全局實例
memory_monitor = MemoryMonitor()


def get_memory_monitor() -> MemoryMonitor:
    """獲取內存監控器實例"""
    return memory_monitor


async def init_memory_monitor(
    event_callback: Optional[Callable] = None,
    cleanup_callback: Optional[Callable] = None,
) -> MemoryMonitor:
    """初始化並啟動內存監控器"""
    memory_monitor.set_callbacks(event_callback, cleanup_callback)
    await memory_monitor.start()
    return memory_monitor
