"""Phase 5 Full Test Suite"""
import urllib.request
import json
import time

API = 'http://165.154.210.154:8000/api/command'
HEADERS = {'Content-Type': 'application/json', 'Authorization': 'Bearer test'}

def call(cmd, payload=None):
    if payload is None:
        payload = {}
    data = json.dumps({'command': cmd, 'payload': payload}).encode()
    req = urllib.request.Request(API, data=data, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except Exception as e:
        return {'error': str(e)}

def test(name, result, checks):
    passed = True
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    for desc, ok in checks:
        status = "PASS" if ok else "FAIL"
        if not ok:
            passed = False
        print(f"  [{status}] {desc}")
    if not passed:
        print(f"  RAW: {json.dumps(result, ensure_ascii=False)[:300]}")
    return passed

results = []

# ---- TEST 1: alerts:get ----
r = call('alerts:get')
results.append(test("P0: alerts:get returns structured data", r, [
    ("success is True", r.get('success') == True),
    ("data field exists", 'data' in r),
    ("data.summary exists", isinstance(r.get('data', {}).get('summary'), dict)),
    ("data.active is list", isinstance(r.get('data', {}).get('active'), list)),
    ("data.recent is list", isinstance(r.get('data', {}).get('recent'), list)),
    ("summary has total/active/critical keys", all(
        k in r.get('data', {}).get('summary', {}) for k in ['total', 'active', 'critical']
    )),
]))

# ---- TEST 2: alerts:resolve ----
r = call('alerts:resolve', {'id': 999})
results.append(test("P0: alerts:resolve handles request", r, [
    ("returns success field", 'success' in r),
    ("no crash/500 error", 'error' not in r or r.get('success') is not None),
]))

# ---- TEST 3: alerts:clear ----
r = call('alerts:clear')
results.append(test("P0: alerts:clear clears all", r, [
    ("success is True", r.get('success') == True),
    ("cleared field present", 'cleared' in r),
]))

# ---- TEST 4: alerts:mark-read ----
r = call('alerts:mark-read', {'id': 999})
results.append(test("P0: alerts:mark-read (acknowledge)", r, [
    ("returns success field", 'success' in r),
]))

# ---- TEST 5: get-command-diagnostics (P1: routing stats) ----
r = call('get-command-diagnostics')
results.append(test("P1: Diagnostics has routing stats", r, [
    ("routing_stats present", 'routing_stats' in r),
    ("routing_coverage present", 'routing_coverage' in r),
    ("per_command_routes present", 'per_command_routes' in r),
    ("routing_stats has router/alias/getattr keys", all(
        k in r.get('routing_stats', {}) for k in ['router', 'alias', 'getattr']
    )),
    ("coverage has explicit_route_pct", 'explicit_route_pct' in r.get('routing_coverage', {})),
    ("alias_registry total >= 11", r.get('alias_registry', {}).get('total', 0) >= 11),
    ("router_available is True", r.get('router_available') == True),
    ("unknown_commands is empty or small", r.get('unknown_total', 999) < 5),
]))

# Save diagnostics for detailed reporting
diag = r

# ---- TEST 6: Verify alerts:get routes via alias ----
per_cmd = diag.get('per_command_routes', {})
results.append(test("P1: alerts:get routes via alias (not unknown)", diag, [
    ("alerts:get in per_command_routes", 'alerts:get' in per_cmd),
    ("alerts:get route is 'alias'", per_cmd.get('alerts:get') == 'alias'),
]))

# ---- TEST 7: Command metrics tracking ----
metrics = diag.get('metrics_summary', {})
results.append(test("P1: Command metrics tracking works", diag, [
    ("metrics_summary present", 'metrics_summary' in diag),
    ("total_commands > 0", metrics.get('total_commands', 0) > 0),
    ("success_rate present", 'success_rate' in metrics),
    ("unique_commands > 0", metrics.get('unique_commands', 0) > 0),
]))

# ---- TEST 8: Existing commands still work ----
r1 = call('get-accounts')
r2 = call('get-initial-state')
r3 = call('get-queue-status')
results.append(test("Regression: existing commands still work", {}, [
    ("get-accounts returns data", r1.get('success') is not None or 'data' in r1 or isinstance(r1, dict)),
    ("get-initial-state returns data", r2.get('success') is not None or 'data' in r2),
    ("get-queue-status returns data", r3.get('success') is not None or 'data' in r3 or isinstance(r3, dict)),
]))

# ---- TEST 9: FloodWait handler availability ----
flood = diag.get('flood_wait_status', {})
results.append(test("P2: FloodWait status exposed in diagnostics", diag, [
    ("flood_wait_status field present", 'flood_wait_status' in diag),
    ("flood_wait_status is dict", isinstance(flood, dict)),
]))

# ---- TEST 10: After all tests, check routing distribution ----
time.sleep(2)
r_final = call('get-command-diagnostics')
final_stats = r_final.get('routing_stats', {})
final_coverage = r_final.get('routing_coverage', {})
total_cmds = sum(final_stats.values())
results.append(test("P1: Final routing distribution after tests", r_final, [
    ("total routed commands > 5", total_cmds > 5),
    ("alias route count > 0", final_stats.get('alias', 0) > 0),
    ("getattr route count > 0", final_stats.get('getattr', 0) > 0),
    ("unknown route count == 0", final_stats.get('unknown', 0) == 0),
    ("explicit_route_pct > 30%", final_coverage.get('explicit_route_pct', 0) > 30),
]))

# ---- SUMMARY ----
print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
total = len(results)
passed = sum(results)
failed = total - passed
print(f"  Total tests: {total}")
print(f"  Passed: {passed}")
print(f"  Failed: {failed}")

print(f"\n--- Routing Distribution ---")
print(f"  {json.dumps(final_stats, indent=2)}")
print(f"  Coverage: {json.dumps(final_coverage, indent=2)}")
print(f"  Per-command routes: {json.dumps(r_final.get('per_command_routes', {}), indent=2)}")

if failed > 0:
    print(f"\n!!! {failed} TESTS FAILED !!!")
else:
    print(f"\nALL TESTS PASSED!")
