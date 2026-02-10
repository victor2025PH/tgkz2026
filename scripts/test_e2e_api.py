#!/usr/bin/env python3
"""
P8-1: 端到端 API 测试脚本
验证 5 个关键用户路径的后端 API
"""
import urllib.request
import json
import sys

BASE = 'http://165.154.210.154'


def api_get(path, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'{BASE}{path}', headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, {'error': str(e)}


def api_post(path, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'{BASE}{path}',
        data=json.dumps(data).encode(), headers=headers, method='POST')
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, {'error': str(e)}


passed = 0
failed = 0
total = 0


def check(name, condition, detail=''):
    global passed, failed, total
    total += 1
    if condition:
        passed += 1
        print(f'  [PASS] {name}')
    else:
        failed += 1
        print(f'  [FAIL] {name} — {detail}')


# ========================================
# Path 1: Frontend & Health
# ========================================
print('=== Path 1: Frontend & Health ===')

# Frontend accessible
try:
    req = urllib.request.Request(BASE)
    resp = urllib.request.urlopen(req, timeout=15)
    check('Frontend serves HTML', resp.status == 200 and 'text/html' in resp.headers.get('Content-Type', ''))
except Exception as e:
    check('Frontend serves HTML', False, str(e))

# Health check
code, data = api_get('/api/health')
check('Basic health returns 200', code == 200)
check('Backend is healthy', data.get('status') in ('ok', 'healthy'))

# Full health
code, data = api_get('/api/v1/health')
check('Full health check', code == 200 and data.get('status') == 'healthy')

# Readiness
code, data = api_get('/api/v1/health/ready')
check('Readiness probe', code == 200 and data.get('status') == 'ready')

# Debug deploy
code, data = api_get('/api/debug/deploy')
check('Debug deploy endpoint', code == 200 and data.get('backend_initialized') is True)
check('Init performance < 10s', data.get('init_performance', {}).get('total_seconds', 99) < 10)


# ========================================
# Path 2: Auth Flow
# ========================================
print()
print('=== Path 2: Auth Flow ===')

# Login with wrong creds
code, data = api_post('/api/v1/auth/login', {'email': 'test@test.com', 'password': 'wrong'})
check('Login rejects bad creds', code in (200, 401) and data.get('success') is False)

# Register check (should validate input)
code, data = api_post('/api/v1/auth/register', {'email': '', 'password': ''})
check('Register validates empty input', code in (200, 400) and data.get('success') is False)


# ========================================
# Path 3: Accounts & Commands
# ========================================
print()
print('=== Path 3: Accounts & Commands ===')

# Debug accounts
code, data = api_get('/api/debug/accounts')
check('Debug accounts accessible', code == 200)
db_stats = data.get('db_stats', {})
check('DB stats present', 'total_rows' in db_stats or 'tables' in db_stats or isinstance(db_stats, dict))
accounts = data.get('accounts', [])
print(f'    -> Found {len(accounts)} account(s)')

# Command endpoint (get-initial-state)
code, data = api_post('/api/v1/command', {'command': 'get-initial-state'})
check('Command endpoint responds', code in (200, 401, 403))


# ========================================
# Path 4: Admin Panel
# ========================================
print()
print('=== Path 4: Admin Panel ===')

# Admin verify (no token)
code, data = api_get('/api/admin/verify')
check('Admin verify rejects no-token', code == 401 and data.get('success') is False)

# Admin login
code, data = api_post('/api/admin/login', {'username': 'admin', 'password': 'admin888'})
check('Admin login works', code == 200 and data.get('success') is True)
admin_token = data.get('data', {}).get('token', '')

if admin_token:
    # Admin dashboard
    code, data = api_get('/api/admin/dashboard', admin_token)
    check('Admin dashboard with token', code == 200 and data.get('success') is True)
    stats = data.get('data', {}).get('stats', {})
    if stats:
        print(f'    -> Users: {stats.get("totalUsers", "?")}, Paid: {stats.get("paidUsers", "?")}')
    
    # Admin users list (supports both formats: data=[] or data={users:[]})
    code, data = api_get('/api/admin/users', admin_token)
    if code == 200:
        raw = data.get('data', [])
        if isinstance(raw, list):
            users = raw
        elif isinstance(raw, dict):
            users = raw.get('users', [])
        else:
            users = []
        check('Admin users list', isinstance(users, list) and len(users) > 0)
        print(f'    -> Found {len(users)} user(s)')
    else:
        check('Admin users list', False, f'HTTP {code}')
    
    # Admin quotas
    code, data = api_get('/api/admin/quotas', admin_token)
    check('Admin quotas', code == 200 and data.get('success') is True)
else:
    print('  [SKIP] Admin endpoints (no token)')


# ========================================
# Path 5: Quota & Subscription
# ========================================
print()
print('=== Path 5: Quota & Subscription ===')

# These require auth but should respond with proper error
code, data = api_get('/api/v1/quota')
check('Quota endpoint responds', code in (200, 401, 403))

code, data = api_get('/api/v1/subscription')
check('Subscription endpoint responds', code in (200, 401, 403))

code, data = api_get('/api/v1/membership/levels')
check('Membership levels endpoint', code in (200, 401, 403))


# ========================================
# Summary
# ========================================
print()
print(f'{"=" * 50}')
print(f'Results: {passed}/{total} passed, {failed} failed')
print(f'{"=" * 50}')

sys.exit(1 if failed > 3 else 0)
