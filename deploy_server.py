#!/usr/bin/env python3
"""Deploy script to update server via SSH"""
import paramiko
import time
import sys

# Server credentials
HOST = "165.154.210.154"
USER = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, cmd, timeout=120):
    """Run a command and return output"""
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print('='*60)
    
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    
    # Read output
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if out:
        print(out)
    if err:
        print(f"STDERR: {err}")
    print(f"Exit code: {exit_code}")
    
    return exit_code, out, err

def main():
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {HOST}...")
        ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
        print("Connected!")
        
        # 1. Fetch and reset
        run_command(ssh, "cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main")
        
        # 2. Docker build
        run_command(ssh, "cd /opt/tg-matrix && docker compose build api 2>&1 | tail -10", timeout=300)
        
        # 3. Docker down and up
        run_command(ssh, "cd /opt/tg-matrix && docker compose down && docker compose up -d", timeout=120)
        
        # 4. Wait 15 seconds
        print("\nWaiting 15 seconds for services to start...")
        time.sleep(15)
        
        # 5. Docker ps
        run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
        
        # 6. Health check
        run_command(ssh, "curl -s http://localhost:8000/health")
        
        # 7. Test send-code
        send_code_cmd = '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}'
'''
        run_command(ssh, send_code_cmd)
        
        print("\n" + "="*60)
        print("DEPLOYMENT COMPLETE!")
        print("="*60)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
