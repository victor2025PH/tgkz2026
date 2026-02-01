#!/usr/bin/env python3
"""Rebuild with smaller image"""
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: Stop and clean up...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose down 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('docker system prune -af 2>&1', timeout=120)
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 2: Pull latest code...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main 2>&1', timeout=60)
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 3: Check disk space...')
stdin, stdout, stderr = ssh.exec_command('df -h /')
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 4: Build and start (this will take several minutes)...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d --build 2>&1', timeout=900)
output = stdout.read().decode('utf-8', errors='replace')
print(output[-2000:] if len(output) > 2000 else output)

time.sleep(15)

print('\n=== Container Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Test API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print('Health:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/accounts')
print('Accounts:', stdout.read().decode('utf-8', errors='replace')[:500])

ssh.close()
print('\nDone!')
