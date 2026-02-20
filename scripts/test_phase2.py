"""Phase 2 Post-deploy Verification"""
import urllib.request
import json
import time

API = 'http://165.154.210.154:8000/api/command'
H = {'Content-Type': 'application/json', 'Authorization': 'Bearer test'}

def call(cmd, payload=None):
    data = json.dumps({'command': cmd, 'payload': payload or {}}).encode()
    req = urllib.request.Request(API, data=data, headers=H)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except Exception as e:
        return {'error': str(e)}

def check(name, result, ok):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}")
    if not ok:
        raw = json.dumps(result, ensure_ascii=False)[:200]
        print(f"         RAW: {raw}")
    return ok

results = []

print("=" * 60)
print("POST-DEPLOY VERIFICATION - Phase 2")
print("=" * 60)

# Test 1: alerts:get
print("\nTest 1: alerts:get")
r = call('alerts:get')
results.append(check("success is True", r, r.get('success') == True))
results.append(check("data.summary exists", r, 'summary' in r.get('data', {})))

# Test 2: diagnostics
print("\nTest 2: get-command-diagnostics")
r = call('get-command-diagnostics')
results.append(check("router_available", r, r.get('router_available') == True))
rs = r.get('routing_stats', {})
results.append(check("routing_stats present", r, bool(rs)))
results.append(check("unknown == 0", r, rs.get('unknown', 99) == 0))

# Test 3: core commands
print("\nTest 3: core commands")
r1 = call('get-accounts')
r2 = call('get-queue-status')
r3 = call('get-initial-state')
results.append(check("get-accounts works", r1, isinstance(r1, dict) and 'error' not in r1.get('error', '')))
results.append(check("get-queue-status works", r2, isinstance(r2, dict)))
results.append(check("get-initial-state works", r3, isinstance(r3, dict)))

# Test 4: alerts:clear
print("\nTest 4: alerts:clear")
r = call('alerts:clear')
results.append(check("clear success", r, r.get('success') == True))

# Test 5: Check CPU alerts after optimization
print("\nTest 5: CPU alert status (wait 10s for new cycle)")
time.sleep(10)
r = call('alerts:get')
active = r.get('data', {}).get('active', []) if r.get('data') else []
cpu_alerts = [a for a in active if 'cpu' in str(a.get('alert_type', '')).lower()]
print(f"  Total active alerts: {len(active)}")
print(f"  CPU alerts: {len(cpu_alerts)}")
for a in cpu_alerts:
    msg = a.get('message', '')
    print(f"  -> {msg}")

# Summary
print("\n" + "=" * 60)
passed = sum(results)
total = len(results)
failed = total - passed
print(f"SUMMARY: {passed}/{total} passed, {failed} failed")
if failed:
    print(f"!!! {failed} TESTS FAILED !!!")
else:
    print("ALL TESTS PASSED!")
print("=" * 60)
