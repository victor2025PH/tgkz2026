#!/usr/bin/env python3
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Docker processes ===')
stdin, stdout, stderr = ssh.exec_command('ps aux | grep docker | grep -v grep')
output = stdout.read().decode('utf-8', errors='replace')
for line in output.split('\n')[:10]:
    print(line[:100])

print('\n=== Docker images ===')
stdin, stdout, stderr = ssh.exec_command('docker images')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Disk Space ===')
stdin, stdout, stderr = ssh.exec_command('df -h /')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== docker compose logs (last lines) ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=20 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
print(''.join(c if ord(c) < 128 else '?' for c in output))

print('=== Try manual start ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
