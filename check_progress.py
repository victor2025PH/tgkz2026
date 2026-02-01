#!/usr/bin/env python3
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Check build process ===')
stdin, stdout, stderr = ssh.exec_command('pgrep -f "docker compose build" | head -1')
pid = stdout.read().decode().strip()
if pid:
    print(f'Build still running (pid: {pid})')
    # Check how long it's been running
    stdin, stdout, stderr = ssh.exec_command(f'ps -o etime= -p {pid}')
    etime = stdout.read().decode().strip()
    print(f'Running for: {etime}')
else:
    print('Build completed or not running')

print('\n=== Check docker images ===')
stdin, stdout, stderr = ssh.exec_command('docker images tg-matrix-api --format "{{.ID}} {{.CreatedAt}}"')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Container Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Disk Space ===')
stdin, stdout, stderr = ssh.exec_command('df -h /')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
