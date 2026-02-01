#!/usr/bin/env python3
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Wait for build to complete ===')
for i in range(10):
    stdin, stdout, stderr = ssh.exec_command('pgrep -f "docker compose" | head -1')
    pid = stdout.read().decode().strip()
    if not pid:
        print('Build completed!')
        break
    print(f'Still running... waiting 30s')
    time.sleep(30)

print('\n=== Container Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== API Logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=10 api 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
print(''.join(c if ord(c) < 128 else '?' for c in output))

print('=== Test API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print('Health:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/accounts')
print('Accounts:', stdout.read().decode('utf-8', errors='replace')[:500])

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/credentials')
print('Credentials:', stdout.read().decode('utf-8', errors='replace')[:500])

ssh.close()
print('\nDone!')
