"""
Database Health Guard - P2: 定期 integrity check + WAL 管理 + 自動備份
在服務啟動時做一次校驗，之後每 6 小時執行一次健康檢查。
"""
import asyncio
import os
import sys
import shutil
import sqlite3
import glob
from datetime import datetime
from typing import Optional


class DatabaseHealthGuard:
    """SQLite 數據庫健康守護"""

    CHECK_INTERVAL_HOURS = 6
    BACKUP_RETAIN_DAYS = 7

    def __init__(self, data_dir: str = "/app/data"):
        self.data_dir = data_dir
        self._task: Optional[asyncio.Task] = None
        self._running = False

    # ───────── 啟動 / 停止 ─────────

    async def start(self):
        """啟動守護（啟動時立即檢查一次，然後定期）"""
        self._running = True
        print("[DBHealthGuard] Starting database health guard", file=sys.stderr)
        # 啟動時快速校驗
        await self.run_startup_check()
        # 啟動定時任務
        self._task = asyncio.create_task(self._periodic_loop())

    async def stop(self):
        """停止守護，做最後一次 WAL checkpoint"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        # graceful shutdown: final checkpoint
        await self.checkpoint_all()
        print("[DBHealthGuard] Stopped", file=sys.stderr)

    # ───────── 定期循環 ─────────

    async def _periodic_loop(self):
        interval = self.CHECK_INTERVAL_HOURS * 3600
        while self._running:
            try:
                await asyncio.sleep(interval)
                if not self._running:
                    break
                print(f"[DBHealthGuard] Periodic health check at {datetime.now().isoformat()}", file=sys.stderr)
                report = await self.run_full_check()
                if report.get("corrupted"):
                    print(f"[DBHealthGuard] CORRUPTION detected: {report['corrupted']}", file=sys.stderr)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[DBHealthGuard] Periodic check error: {e}", file=sys.stderr)

    # ───────── 核心檢查 ─────────

    async def run_startup_check(self):
        """啟動時的快速校驗"""
        loop = asyncio.get_event_loop()
        report = await loop.run_in_executor(None, self._check_all_sync)
        if report.get("corrupted"):
            print(f"[DBHealthGuard] STARTUP WARNING - corrupted databases: {report['corrupted']}", file=sys.stderr)
        else:
            ok_count = len(report.get("ok", []))
            print(f"[DBHealthGuard] Startup check passed: {ok_count} databases OK", file=sys.stderr)
        return report

    async def run_full_check(self):
        """完整健康檢查 + WAL checkpoint + 備份"""
        loop = asyncio.get_event_loop()
        report = await loop.run_in_executor(None, self._check_all_sync)
        await self.checkpoint_all()
        await self.auto_backup()
        return report

    def _check_all_sync(self):
        """同步檢查所有 .db 文件的完整性"""
        report = {"ok": [], "corrupted": [], "errors": []}

        db_files = glob.glob(os.path.join(self.data_dir, "*.db"))
        db_files += glob.glob(os.path.join(self.data_dir, "tenants", "*.db"))

        for db_path in sorted(db_files):
            name = os.path.relpath(db_path, self.data_dir)
            if ".broken" in name or ".backup" in name or ".corrupt" in name:
                continue
            try:
                conn = sqlite3.connect(db_path, timeout=10)
                result = conn.execute("PRAGMA integrity_check(1)").fetchone()
                conn.close()
                status = result[0] if result else "unknown"
                if status == "ok":
                    report["ok"].append(name)
                else:
                    report["corrupted"].append({"name": name, "detail": status[:200]})
            except Exception as e:
                report["errors"].append({"name": name, "error": str(e)[:200]})

        return report

    # ───────── WAL 管理 ─────────

    async def checkpoint_all(self):
        """對所有 WAL 模式的數據庫做 checkpoint"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._checkpoint_all_sync)

    def _checkpoint_all_sync(self):
        db_files = glob.glob(os.path.join(self.data_dir, "*.db"))
        db_files += glob.glob(os.path.join(self.data_dir, "tenants", "*.db"))

        for db_path in sorted(db_files):
            if ".broken" in db_path or ".backup" in db_path:
                continue
            try:
                conn = sqlite3.connect(db_path, timeout=10)
                mode = conn.execute("PRAGMA journal_mode").fetchone()
                if mode and mode[0] == "wal":
                    conn.execute("PRAGMA wal_checkpoint(PASSIVE)")
                conn.close()
            except Exception:
                pass

    # ───────── 自動備份 ─────────

    async def auto_backup(self):
        """自動備份主數據庫，保留最近 N 天"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._auto_backup_sync)

    def _auto_backup_sync(self):
        main_db = os.path.join(self.data_dir, "tgmatrix.db")
        backup_dir = os.path.join(self.data_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        if not os.path.exists(main_db):
            return

        # 備份（先 checkpoint）
        try:
            conn = sqlite3.connect(main_db, timeout=10)
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            conn.close()
        except Exception:
            pass

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = os.path.join(backup_dir, f"health_backup_{ts}.db")
        try:
            shutil.copy2(main_db, dest)
            size_mb = os.path.getsize(dest) / 1024 / 1024
            print(f"[DBHealthGuard] Backup created: {dest} ({size_mb:.2f} MB)", file=sys.stderr)
        except Exception as e:
            print(f"[DBHealthGuard] Backup failed: {e}", file=sys.stderr)
            return

        # 清理舊備份
        self._cleanup_old_backups(backup_dir)

    def _cleanup_old_backups(self, backup_dir: str):
        """保留最近 BACKUP_RETAIN_DAYS 天的備份"""
        import time as _time
        cutoff = _time.time() - self.BACKUP_RETAIN_DAYS * 86400
        for f in glob.glob(os.path.join(backup_dir, "health_backup_*.db")):
            try:
                if os.path.getmtime(f) < cutoff:
                    os.remove(f)
            except Exception:
                pass


# 單例
_guard: Optional[DatabaseHealthGuard] = None


def get_db_health_guard(data_dir: str = "/app/data") -> DatabaseHealthGuard:
    global _guard
    if _guard is None:
        _guard = DatabaseHealthGuard(data_dir)
    return _guard
