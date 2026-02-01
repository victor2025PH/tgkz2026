#!/usr/bin/env python3
"""Rebuild and restart API container with latest code"""
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: Pull latest code...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && git pull origin main 2>&1', timeout=60)
output = stdout.read().decode('utf-8', errors='replace')
print(output[:1000] if len(output) > 1000 else output)

print('\nStep 2: Rebuild API container...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose build --no-cache api 2>&1', timeout=300)
output = stdout.read().decode('utf-8', errors='replace')
# Print last 2000 chars
print(output[-2000:] if len(output) > 2000 else output)

print('\nStep 3: Restart API container...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d api 2>&1', timeout=60)
print(stdout.read().decode('utf-8', errors='replace'))

print('\nWaiting for container to start...')
time.sleep(10)

print('\nStep 4: Check status...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\nStep 5: Test API...')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print('Health:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/accounts')
print('Accounts:', stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
