#!/usr/bin/env python3
"""Check command endpoint"""
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Test /api/command endpoint ===')
stdin, stdout, stderr = ssh.exec_command('''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118"}}' 2>&1''')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Search for api/command route ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api grep -rn "api/command" . 2>&1 | head -20')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Check http_server.py routes ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api head -200 api/http_server.py 2>&1 | tail -100')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
