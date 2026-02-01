#!/usr/bin/env python3
"""Retry build with longer timeout"""
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: Check disk space...')
stdin, stdout, stderr = ssh.exec_command('df -h /')
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 2: Update nginx.conf...')
nginx_config = '''worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;
events { worker_connections 1024; }
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
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
        location /api/ { proxy_pass http://api:8000/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-Proto https; proxy_connect_timeout 120s; proxy_send_timeout 120s; proxy_read_timeout 120s; }
        location /ws { proxy_pass http://api:8000/ws; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
        location / { try_files $uri $uri/ /index.html; }
    }
}'''
sftp = ssh.open_sftp()
with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
    f.write(nginx_config)
sftp.close()
print('Done')

print('Step 3: Build and start (retry)...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d --build 2>&1', timeout=1800)
output = stdout.read().decode('utf-8', errors='replace')
print(output[-3000:] if len(output) > 3000 else output)

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
