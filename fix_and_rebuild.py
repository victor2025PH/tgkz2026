#!/usr/bin/env python3
"""Fix git conflicts and rebuild API"""
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: Reset git and pull latest code...')
cmds = [
    'cd /opt/tg-matrix && git fetch origin',
    'cd /opt/tg-matrix && git reset --hard origin/main',
    'cd /opt/tg-matrix && git clean -fd'
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out)
    if err: print(err)

print('\nStep 2: Rebuild API container...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose build api 2>&1', timeout=600)
output = stdout.read().decode('utf-8', errors='replace')
# Print last 1500 chars
print(output[-1500:] if len(output) > 1500 else output)

print('\nStep 3: Update nginx.conf for HTTPS...')
# Re-apply nginx config since git reset may have overwritten it
nginx_config = '''
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    
    server {
        listen 80;
        server_name tgw.usdt2026.cc;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 301 https://$host$request_uri; }
    }
    
    server {
        listen 80;
        server_name 165.154.210.154 localhost;
        root /usr/share/nginx/html;
        index index.html;
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
        location /api/ { proxy_pass http://api:8000/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
        location / { try_files $uri $uri/ /index.html; }
    }
    
    server {
        listen 443 ssl http2;
        server_name tgw.usdt2026.cc;
        ssl_certificate /etc/letsencrypt/live/tgw.usdt2026.cc/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/tgw.usdt2026.cc/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        root /usr/share/nginx/html;
        index index.html;
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
        location /api/ { proxy_pass http://api:8000/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-Proto https; }
        location /ws { proxy_pass http://api:8000/ws; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
        location / { try_files $uri $uri/ /index.html; }
    }
}
'''
sftp = ssh.open_sftp()
with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
    f.write(nginx_config)
sftp.close()
print('nginx.conf updated')

print('\nStep 4: Update docker-compose for SSL...')
stdin, stdout, stderr = ssh.exec_command("cd /opt/tg-matrix && sed -i 's|./certbot/conf:/etc/letsencrypt:ro|/etc/letsencrypt:/etc/letsencrypt:ro|' docker-compose.yml")
stdout.read()

print('\nStep 5: Restart all services...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d 2>&1', timeout=120)
print(stdout.read().decode('utf-8', errors='replace'))

print('\nWaiting for services to start...')
time.sleep(15)

print('\n=== Final Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Test API ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/health')
print('Health:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/accounts')
result = stdout.read().decode('utf-8', errors='replace')
print('Accounts:', result[:200])

ssh.close()
print('\nDone!')
