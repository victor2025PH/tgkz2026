#!/usr/bin/env python3
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Container Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== API Logs (last 30 lines) ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=30 api 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
# Filter out emoji issues
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output)

print('=== Test API Health ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Test Accounts API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/accounts')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Test Credentials API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/credentials')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
