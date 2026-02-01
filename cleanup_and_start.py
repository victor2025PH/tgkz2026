#!/usr/bin/env python3
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: Kill any build processes...')
stdin, stdout, stderr = ssh.exec_command('pkill -9 -f "docker" 2>&1; sleep 2')
stdout.read()

print('Step 2: Clean Docker aggressively...')
stdin, stdout, stderr = ssh.exec_command('docker system prune -af --volumes 2>&1', timeout=120)
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 3: Check disk space...')
stdin, stdout, stderr = ssh.exec_command('df -h /')
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 4: Start containers (using existing image or building fresh)...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d --build 2>&1', timeout=600)
output = stdout.read().decode('utf-8', errors='replace')
print(output[-2000:] if len(output) > 2000 else output)

time.sleep(10)

print('\n=== Container Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Test API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print('Health:', stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('Done!')
