#!/usr/bin/env python3
"""Redeploy with the HTTP response fix."""
import paramiko
import time

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, cmd, timeout=120):
    """Run command and return output."""
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print('='*60)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(f"STDERR: {err}")
    print(f"Exit code: {exit_code}")
    return out, err, exit_code

def main():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
    print("Connected!\n")
    
    # Step 1: Pull latest code
    print("\n" + "="*60)
    print("STEP 1: Pull latest code (commit c94c8cf)")
    print("="*60)
    run_command(ssh, "cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main")
    out, _, _ = run_command(ssh, "cd /opt/tg-matrix && git log -1 --format='%h %s'")
    
    if "c94c8cf" in out:
        print("\n✓ Commit c94c8cf verified!")
    else:
        print(f"\n⚠ Expected commit c94c8cf, got: {out.strip()}")
    
    # Step 2: Rebuild and restart API
    print("\n" + "="*60)
    print("STEP 2: Rebuild and restart API")
    print("="*60)
    run_command(ssh, "cd /opt/tg-matrix && docker compose build api", timeout=300)
    run_command(ssh, "cd /opt/tg-matrix && docker compose up -d api", timeout=60)
    
    # Step 3: Wait for API to be healthy
    print("\n" + "="*60)
    print("STEP 3: Wait 15 seconds for API to start")
    print("="*60)
    print("Waiting 15 seconds...")
    time.sleep(15)
    
    run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
    
    # Step 4: Test send-code endpoint
    print("\n" + "="*60)
    print("STEP 4: Test send-code endpoint")
    print("="*60)
    curl_cmd = '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}'
'''
    out, _, _ = run_command(ssh, curl_cmd)
    
    print("\n" + "="*60)
    print("FINAL RESULT - HTTP Response Body:")
    print("="*60)
    print(out)
    
    # Parse and verify
    import json
    try:
        response = json.loads(out)
        if response.get('success') == False and 'error' in response:
            print("\n✓ SUCCESS: Response is now returning JSON with error!")
            print(f"  success: {response.get('success')}")
            print(f"  error: {response.get('error')}")
        else:
            print(f"\n⚠ Unexpected response format: {response}")
    except json.JSONDecodeError:
        print(f"\n✗ Response is not valid JSON: {out}")
    
    ssh.close()

if __name__ == "__main__":
    main()
