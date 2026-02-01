#!/usr/bin/env python3
"""Check why backend is not initialized"""
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Check API startup logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=100 api 2>&1 | head -60')
output = stdout.read().decode('utf-8', errors='replace')
# Filter non-ASCII
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output)

print('\n=== Check for initialization errors ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs api 2>&1 | grep -i "error\|fail\|except\|warning" | head -30')
output = stdout.read().decode('utf-8', errors='replace')
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output)

print('\n=== Check web_server.py init_backend function ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api grep -A 20 "async def init_backend" web_server.py 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Check if BackendService exists ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api grep -n "class BackendService" main.py 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Try to import main.py manually ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api python -c "from main import BackendService; print(BackendService)" 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
