#!/usr/bin/env python3
"""Fix nginx SSL and restart"""
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: Check SSL certificate...')
stdin, stdout, stderr = ssh.exec_command('ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

print('Step 2: Check docker-compose SSL mount...')
stdin, stdout, stderr = ssh.exec_command("grep -A5 'letsencrypt' /opt/tg-matrix/docker-compose.yml")
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 3: Update docker-compose.yml...')
# Read current docker-compose
stdin, stdout, stderr = ssh.exec_command('cat /opt/tg-matrix/docker-compose.yml')
compose_content = stdout.read().decode('utf-8', errors='replace')

# Ensure correct SSL mount
if '/etc/letsencrypt:/etc/letsencrypt:ro' not in compose_content:
    print('Updating SSL mount...')
    new_content = compose_content.replace(
        './certbot/conf:/etc/letsencrypt:ro',
        '/etc/letsencrypt:/etc/letsencrypt:ro'
    )
    sftp = ssh.open_sftp()
    with sftp.file('/opt/tg-matrix/docker-compose.yml', 'w') as f:
        f.write(new_content)
    sftp.close()
    print('Updated!')
else:
    print('SSL mount already correct')

print('Step 4: Restart web container...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose restart web 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(10)

print('\n=== Container Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Nginx logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=10 web 2>&1')
output = stdout.read().decode('utf-8', errors='replace')
print(''.join(c if ord(c) < 128 else '?' for c in output))

print('=== Test API endpoints ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print('Health:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/accounts')
print('Accounts:', stdout.read().decode('utf-8', errors='replace')[:500])

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/credentials')
print('Credentials:', stdout.read().decode('utf-8', errors='replace')[:500])

stdin, stdout, stderr = ssh.exec_command('curl -s -k https://localhost/health')
print('HTTPS Health:', stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
