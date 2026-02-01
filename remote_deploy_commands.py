#!/usr/bin/env python3
"""Remote deployment script for TG-Matrix server."""
import paramiko
import time
import sys

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, command, timeout=120):
    """Run a command and return output."""
    print(f"\n{'='*60}")
    print(f"Running: {command}")
    print('='*60)
    
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    
    # Get output
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
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {HOST}...")
        ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        # Step 1: Pull latest code
        print("\n" + "="*60)
        print("STEP 1: Pull latest code")
        print("="*60)
        run_command(ssh, "cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main")
        
        # Step 2: Rebuild API
        print("\n" + "="*60)
        print("STEP 2: Rebuild API")
        print("="*60)
        run_command(ssh, "cd /opt/tg-matrix && docker compose build api 2>&1 | tail -20", timeout=300)
        
        # Step 3: Restart API
        print("\n" + "="*60)
        print("STEP 3: Restart API")
        print("="*60)
        run_command(ssh, "cd /opt/tg-matrix && docker compose restart api")
        
        # Step 4: Wait 10 seconds
        print("\n" + "="*60)
        print("STEP 4: Waiting 10 seconds...")
        print("="*60)
        time.sleep(10)
        print("Done waiting.")
        
        # Step 5: Test credentials endpoint
        print("\n" + "="*60)
        print("STEP 5: Test credentials endpoint")
        print("="*60)
        run_command(ssh, "curl -s http://localhost:8000/api/v1/credentials")
        
        # Step 6: Test get-api-credentials command
        print("\n" + "="*60)
        print("STEP 6: Test get-api-credentials command")
        print("="*60)
        run_command(ssh, '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "get-api-credentials", "payload": {}}' ''')
        
        # Step 7: Check container status
        print("\n" + "="*60)
        print("STEP 7: Check container status")
        print("="*60)
        run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
        
        print("\n" + "="*60)
        print("ALL STEPS COMPLETED!")
        print("="*60)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
