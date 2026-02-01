#!/usr/bin/env python3
"""Update server and restart API"""
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

print('\n=== Step 2: Verify cache.py has the fix ===')
stdin, stdout, stderr = ssh.exec_command('grep -n "CacheManager" /opt/tg-matrix/backend/core/cache.py | head -5')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 3: Rebuild API container ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose build --no-cache api 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
# Filter output to show progress
lines = output.split('\n')
for line in lines[-50:]:  # Show last 50 lines
    print(line)

print('\n=== Step 4: Restart API container ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d api 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(10)

print('\n=== Step 5: Check container status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 6: Check API logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=30 api 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output)

print('\n=== Step 7: Test API health ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 8: Test send-code endpoint ===')
stdin, stdout, stderr = ssh.exec_command('''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118"}}' 2>&1''')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
