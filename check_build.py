#!/usr/bin/env python3
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Check if docker build is running ===')
stdin, stdout, stderr = ssh.exec_command('ps aux | grep docker')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Container Status ===')
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
print('Accounts:', stdout.read().decode('utf-8', errors='replace')[:300])

ssh.close()
