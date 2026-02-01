#!/usr/bin/env python3
"""Check logs on remote server"""
import paramiko
import sys
import io

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, command, description):
    print(f"\n{'='*60}")
    print(f"STEP: {description}")
    print('='*60)
    
    stdin, stdout, stderr = ssh.exec_command(command, timeout=60)
    stdout.channel.recv_exit_status()
    
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        print(output)
    if error:
        print(f"STDERR:\n{error}")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)

# Check API logs
run_command(ssh, "cd /opt/tg-matrix && docker compose logs api --tail 100", "API Logs")

# Check nginx logs
run_command(ssh, "cd /opt/tg-matrix && docker compose logs web --tail 30", "Nginx Logs")

# Check container status again
run_command(ssh, "cd /opt/tg-matrix && docker compose ps", "Container Status")

# Test send-code with verbose curl
run_command(ssh, 
    '''curl -v -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}' 2>&1''',
    "Test send-code with verbose")

ssh.close()
