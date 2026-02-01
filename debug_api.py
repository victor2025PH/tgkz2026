#!/usr/bin/env python3
"""Debug API connectivity issues"""
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Nginx Logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=20 web 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
print(output[:2000])

print('\n=== Test API from inside web container ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T web curl -s http://api:8000/health')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Test HTTPS externally ===')
stdin, stdout, stderr = ssh.exec_command('curl -s -k https://tgw.usdt2026.cc/api/v1/accounts 2>&1 | head -c 500')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Test send-code endpoint ===')
cmd = """curl -s http://localhost:8000/api/v1/accounts/send-code -X POST -H "Content-Type: application/json" -d '{"phone": "+639277356118", "api_id": "123", "api_hash": "abc"}' 2>&1"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Check API routes ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/ 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Check web_server.py version ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api head -50 web_server.py 2>&1')
print(stdout.read().decode('utf-8', errors='replace')[:1500])

ssh.close()
print('\nDone!')
