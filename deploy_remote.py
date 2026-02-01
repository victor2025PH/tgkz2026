#!/usr/bin/env python3
"""Remote deployment script for TG-Matrix"""
import paramiko
import time
import sys

# Server configuration
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, command, description):
    """Execute a command and return output"""
    print(f"\n{'='*60}")
    print(f"STEP: {description}")
    print(f"CMD: {command}")
    print('='*60)
    
    stdin, stdout, stderr = ssh.exec_command(command, timeout=300)
    exit_code = stdout.channel.recv_exit_status()
    
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        print(f"OUTPUT:\n{output}")
    if error:
        print(f"STDERR:\n{error}")
    print(f"EXIT CODE: {exit_code}")
    
    return exit_code, output, error

def main():
    print(f"Connecting to {HOST}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        # Step 1: Pull latest code
        run_command(ssh, 
            "cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main",
            "Pull latest code")
        
        # Step 2: Rebuild API
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose build api 2>&1 | tail -20",
            "Rebuild API container")
        
        # Step 3: Restart containers
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose down && docker compose up -d",
            "Restart containers")
        
        # Step 4: Wait 15 seconds
        print(f"\n{'='*60}")
        print("Waiting 15 seconds for services to start...")
        print('='*60)
        time.sleep(15)
        
        # Step 5: Check status
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose ps",
            "Check container status")
        
        # Step 6: Test health endpoint
        run_command(ssh,
            "curl -s http://localhost:8000/health",
            "Test health endpoint")
        
        # Step 7: Test send-code endpoint
        send_code_cmd = '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}' '''
        run_command(ssh,
            send_code_cmd,
            "Test send-code endpoint")
        
        # Additional diagnostics
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose logs api --tail 50",
            "Check API logs")
        
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose logs web --tail 20",
            "Check nginx logs")
        
        print(f"\n{'='*60}")
        print("DEPLOYMENT COMPLETE")
        print('='*60)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
