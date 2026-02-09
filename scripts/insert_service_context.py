"""Insert ServiceContext wiring into main.py."""
import sys

MAIN_PY = "backend/main.py"

INSERTION = """
        # ── Build ServiceContext (shared dependency container for domain handlers) ──
        try:
            from service_context import ServiceContext, set_service_context
            ctx = ServiceContext(
                db=db,
                telegram_manager=self.telegram_manager,
                send_event=self.send_event,
                send_log=self.send_log,
                message_queue=self.message_queue,
                alert_manager=self.alert_manager,
                backup_manager=self.backup_manager,
                smart_alert_manager=self.smart_alert_manager,
                proxy_rotation_manager=self.proxy_rotation_manager,
                enhanced_health_monitor=self.enhanced_health_monitor,
                queue_optimizer=self.queue_optimizer,
                error_recovery_manager=self.error_recovery_manager,
                qr_auth_manager=self.qr_auth_manager,
                ip_binding_manager=self.ip_binding_manager,
                credential_scraper=self.credential_scraper,
                batch_ops=getattr(self, 'batch_ops', None),
                send_accounts_updated=self._send_accounts_updated,
                save_session_metadata=self._save_session_metadata,
                invalidate_cache=self._invalidate_cache,
                start_log_batch_mode=self.start_log_batch_mode,
                stop_log_batch_mode=self.stop_log_batch_mode,
                cache=self._cache,
                cache_timestamps=self._cache_timestamps,
                backend_service=self,
            )
            self._service_context = ctx
            set_service_context(ctx)
            print(f"[Backend] ServiceContext initialized", file=sys.stderr)
        except Exception as ctx_err:
            print(f"[Backend] ServiceContext init error: {ctx_err}", file=sys.stderr)
"""

with open(MAIN_PY, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Check if already inserted
for line in lines:
    if "ServiceContext" in line and "set_service_context" in line:
        print("ServiceContext wiring already present, skipping.")
        sys.exit(0)

# Find insertion point: after the ObservabilityBridge setup block
insert_idx = None
for i, line in enumerate(lines):
    if "ObservabilityBridge setup" in line:
        # Find the end of this try/except block
        j = i + 1
        while j < len(lines):
            if "bridge_err" in lines[j]:
                insert_idx = j + 1
                break
            j += 1
        break

if insert_idx is None:
    # Fallback: find 'total_init_time' line
    for i, line in enumerate(lines):
        if "total_init_time" in line and "time.time()" in line:
            insert_idx = i
            break

if insert_idx is None:
    print("ERROR: Could not find insertion point!")
    sys.exit(1)

# Insert
insertion_lines = [l + "\n" for l in INSERTION.split("\n")]
new_lines = lines[:insert_idx] + insertion_lines + lines[insert_idx:]

with open(MAIN_PY, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Inserted ServiceContext wiring at line {insert_idx + 1}")
print(f"New file: {len(new_lines)} lines")
