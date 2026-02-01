#!/usr/bin/env python3
"""Regenerate SSL certificate"""
import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('Step 1: First, setup HTTP-only nginx to get certificate...')
nginx_http = '''worker_processes auto;
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
        server_name tgw.usdt2026.cc 165.154.210.154 localhost;
        root /usr/share/nginx/html;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
        location /api/ { proxy_pass http://api:8000/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
        location / { try_files $uri $uri/ /index.html; }
    }
}'''
sftp = ssh.open_sftp()
with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
    f.write(nginx_http)
sftp.close()

# Temporarily remove SSL mount from docker-compose
stdin, stdout, stderr = ssh.exec_command("cd /opt/tg-matrix && sed -i '/letsencrypt/d' docker-compose.yml")
stdout.read()

print('Restarting nginx with HTTP only...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose restart web 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(5)

print('Check nginx status...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps web')
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 2: Get SSL certificate with certbot...')
stdin, stdout, stderr = ssh.exec_command(
    'sudo certbot certonly --webroot -w /var/www/certbot '
    '-d tgw.usdt2026.cc --email admin@usdt2026.cc --agree-tos --non-interactive 2>&1',
    timeout=120
)
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 3: Check certificate...')
stdin, stdout, stderr = ssh.exec_command('sudo ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/')
print(stdout.read().decode('utf-8', errors='replace'))

print('Step 4: Update nginx with HTTPS...')
nginx_https = '''worker_processes auto;
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
        listen 443 ssl;
        http2 on;
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
with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
    f.write(nginx_https)
sftp.close()

# Re-add SSL mount
stdin, stdout, stderr = ssh.exec_command('''
cd /opt/tg-matrix && cat docker-compose.yml | head -20
''')
compose_part = stdout.read().decode('utf-8', errors='replace')
print('Current web volumes section:')
print(compose_part)

# Update docker-compose to add SSL mount
stdin, stdout, stderr = ssh.exec_command('''
cd /opt/tg-matrix && sed -i '/- .\/dist:\/usr\/share\/nginx\/html:ro/a\\      - /etc/letsencrypt:/etc/letsencrypt:ro' docker-compose.yml
''')
stdout.read()

print('Step 5: Restart nginx...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d web 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(10)

print('\n=== Final Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('=== Test HTTPS ===')
stdin, stdout, stderr = ssh.exec_command('curl -s -k https://tgw.usdt2026.cc/health')
print('HTTPS Health:', stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
