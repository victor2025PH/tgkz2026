#!/usr/bin/env python3
"""Quick update server"""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Step 1: Pull latest code ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 2: Verify fix ===')
stdin, stdout, stderr = ssh.exec_command('grep -n "start_cleanup_task" /opt/tg-matrix/backend/core/cache.py')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 3: Rebuild API ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose build api 2>&1 | tail -20')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 4: Restart containers ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose down && docker compose up -d 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\nWaiting...')
time.sleep(15)

print('\n=== Step 5: Check status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 6: API logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=40 api 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output)

print('\n=== Step 7: Test health ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
