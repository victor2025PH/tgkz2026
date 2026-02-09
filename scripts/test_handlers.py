#!/usr/bin/env python3
"""
Phase 4: Runtime handler tests.
Tests all P0/P1/P2 handlers via the HTTP API command endpoint.

Usage:
    python scripts/test_handlers.py [--host HOST] [--port PORT]
    
    Default: http://localhost:8000
    Remote:  python scripts/test_handlers.py --host 165.154.210.154 --port 8000
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error

# Global auth token (set after login)
_auth_token = None


def _auth_headers():
    """Return headers dict with auth token if available."""
    h = {"Content-Type": "application/json"}
    if _auth_token:
        h["Authorization"] = f"Bearer {_auth_token}"
    return h


def do_login(base_url, email, password):
    """Register (if needed) and login to get a JWT token."""
    global _auth_token
    
    # Try register first (ignore errors if already exists)
    try:
        data = json.dumps({"email": email, "password": password, "name": "Test"}).encode('utf-8')
        req = urllib.request.Request(
            f"{base_url}/api/v1/auth/register",
            data=data, headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass
    
    # Login
    data = json.dumps({"email": email, "password": password}).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/v1/auth/login",
        data=data, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            token = body.get("data", {}).get("access_token")
            if token:
                _auth_token = token
                return True, body.get("data", {}).get("user", {}).get("email", "?")
            return False, body.get("error", "no token")
    except urllib.error.HTTPError as e:
        return False, e.read().decode('utf-8', errors='replace')
    except Exception as e:
        return False, str(e)


def send_command(base_url, command, payload=None, timeout=15):
    """Send a command via the POST /api/v1/command endpoint."""
    url = f"{base_url}/api/v1/command"
    data = json.dumps({
        "command": command,
        "payload": payload or {}
    }).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers=_auth_headers(),
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode('utf-8'))
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def http_get(base_url, path, timeout=15):
    """Send a GET request."""
    url = f"{base_url}{path}"
    h = _auth_headers()
    h.pop("Content-Type", None)
    req = urllib.request.Request(url, method="GET", headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode('utf-8'))
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def check_result(name, status, body, expect_success=True):
    """Check a test result and return pass/fail."""
    # Check for NameError/TypeError/ImportError in response
    error_str = str(body.get("error", ""))
    critical_errors = ["NameError", "TypeError", "ImportError", "AttributeError", "SyntaxError"]
    
    for err_type in critical_errors:
        if err_type in error_str:
            return False, f"CRITICAL: {err_type} in response: {error_str[:200]}"
    
    if status == 0:
        return False, f"Connection failed: {body.get('error', 'unknown')}"
    
    if expect_success:
        success = body.get("success", None)
        if success is False and "not initialized" not in error_str.lower():
            return False, f"success=False: {error_str[:200]}"
    
    return True, "OK"


# ============================================================
# Test definitions
# ============================================================

P0_TESTS = [
    ("Health Check", "GET", "/api/health", None),
    ("Initial State", "GET", "/api/v1/initial-state", None),
    ("Get Accounts", "CMD", "get-accounts", None),
    ("Get Settings", "CMD", "get-settings", None),
    ("Get Monitoring Status", "CMD", "get-monitoring-status", None),
    ("Get Monitored Groups", "CMD", "get-monitored-groups", None),
    ("Get Keyword Sets", "CMD", "get-keyword-sets", None),
]

P1_TESTS = [
    ("Get Queue Status", "CMD", "get-queue-status", {}),
    ("Get AI Models", "CMD", "get-ai-models", None),
    ("Get AI Settings", "CMD", "get-ai-settings", None),
    ("Get Leads", "CMD", "get-leads", {"limit": 5}),
    ("Get Leads Paginated", "CMD", "get-leads-paginated", {"page": 1, "limit": 5}),
    ("Search Groups", "CMD", "search-groups", {"query": "test"}),
    ("Get Resources", "CMD", "get-resources", {}),
    ("Get Logs", "CMD", "get-logs", {"limit": 10}),
    ("Get Backup Info", "CMD", "get-backup-info", None),
    ("Get Unified Overview", "CMD", "get-unified-overview", {"days": 7}),
]

P2_TESTS = [
    ("Multi-Role Get Roles", "CMD", "multi-role-get-roles", None),
    ("Get Marketing Tasks", "CMD", "get-marketing-tasks", None),
    ("Get Ad Templates", "CMD", "get-ad-templates", None),
    ("Get Trigger Rules", "CMD", "get-trigger-rules", None),
    ("Get Knowledge Stats", "CMD", "get-knowledge-stats", None),
    ("Get AB Test Results", "CMD", "get-ab-test-results", None),
    ("Get All Tags", "CMD", "get-all-tags", None),
    ("Get Templates", "CMD", "get-templates", None),
    ("Get Campaigns", "CMD", "get-campaigns", None),
]


def run_test_group(base_url, name, tests):
    """Run a group of tests and return results."""
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    
    passed = 0
    failed = 0
    results = []
    
    for test_name, method, endpoint_or_cmd, payload in tests:
        start = time.time()
        
        if method == "GET":
            status, body = http_get(base_url, endpoint_or_cmd)
        else:  # CMD
            status, body = send_command(base_url, endpoint_or_cmd, payload)
        
        duration = time.time() - start
        ok, msg = check_result(test_name, status, body)
        
        icon = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1
        
        print(f"  [{icon}] {test_name} ({duration:.2f}s) - HTTP {status} - {msg}")
        results.append((test_name, ok, msg, duration))
    
    return passed, failed, results


def main():
    parser = argparse.ArgumentParser(description="Phase 4: Runtime handler tests")
    parser.add_argument("--host", default="localhost", help="Backend host")
    parser.add_argument("--port", default="8000", help="Backend port")
    parser.add_argument("--skip-p2", action="store_true", help="Skip P2 tests")
    parser.add_argument("--email", default="test@tg-matrix.com", help="Login email")
    parser.add_argument("--password", default="Test123456", help="Login password")
    parser.add_argument("--no-auth", action="store_true", help="Skip authentication")
    args = parser.parse_args()
    
    base_url = f"http://{args.host}:{args.port}"
    
    print(f"Testing backend at: {base_url}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Quick connectivity check
    print("\nChecking connectivity...")
    status, body = http_get(base_url, "/api/health")
    if status == 0:
        print(f"ERROR: Cannot connect to {base_url}")
        print(f"  {body.get('error', 'unknown error')}")
        sys.exit(1)
    print(f"  Connected! Health status: {body.get('status', 'unknown')}")
    
    # Authentication
    if not args.no_auth:
        print(f"\nAuthenticating as {args.email}...")
        ok, info = do_login(base_url, args.email, args.password)
        if ok:
            print(f"  Logged in as: {info}")
        else:
            print(f"  WARNING: Login failed: {info}")
            print(f"  Tests requiring auth will likely fail with 401")
    
    total_pass = 0
    total_fail = 0
    
    # P0 tests
    p, f, _ = run_test_group(base_url, "P0 - Core Functions (MUST pass)", P0_TESTS)
    total_pass += p
    total_fail += f
    
    if f > 0:
        print(f"\n*** P0 has failures - fix before continuing ***")
    
    # P1 tests
    p, f, _ = run_test_group(base_url, "P1 - Important Functions", P1_TESTS)
    total_pass += p
    total_fail += f
    
    # P2 tests
    if not args.skip_p2:
        p, f, _ = run_test_group(base_url, "P2 - Advanced Functions", P2_TESTS)
        total_pass += p
        total_fail += f
    
    # Summary
    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Total: {total_pass + total_fail} tests")
    print(f"  Passed: {total_pass}")
    print(f"  Failed: {total_fail}")
    print(f"{'='*60}")
    
    sys.exit(1 if total_fail > 0 else 0)


if __name__ == "__main__":
    main()
