#!/usr/bin/env python3
"""Force recreate all containers"""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Step 1: Stop all containers ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose down -v 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 2: Remove orphan containers ===')
stdin, stdout, stderr = ssh.exec_command('docker rm -f $(docker ps -aq) 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 3: Clean up ===')
stdin, stdout, stderr = ssh.exec_command('docker system prune -f 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 4: Start fresh containers ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\nWaiting for containers to start...')
time.sleep(15)

print('\n=== Step 5: Check container status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 6: Check API logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=50 api 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output)

print('\n=== Step 7: Test API health ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 8: Test send-code ===')
stdin, stdout, stderr = ssh.exec_command('''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118"}}' 2>&1''')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
