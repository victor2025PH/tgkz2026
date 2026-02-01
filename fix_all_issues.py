#!/usr/bin/env python3
"""Fix all API issues"""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

# Step 1: Check SSL certificate
print('=== Step 1: Check SSL certificate ===')
stdin, stdout, stderr = ssh.exec_command('sudo ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/ 2>&1')
result = stdout.read().decode('utf-8', errors='replace')
print(result)

ssl_exists = 'fullchain.pem' in result

if not ssl_exists:
    print('\n=== SSL certificate missing, need to regenerate ===')
    print('First, update nginx.conf to HTTP only...')
    
    nginx_http_only = '''worker_processes auto;
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
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location /health {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
        
        location /api/ {
            proxy_pass http://api:8000/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 120s;
            proxy_send_timeout 120s;
            proxy_read_timeout 120s;
        }
        
        location /ws {
            proxy_pass http://api:8000/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
'''
    
    sftp = ssh.open_sftp()
    with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
        f.write(nginx_http_only)
    sftp.close()
    print('nginx.conf updated to HTTP only')
    
    # Restart web container
    print('\nRestarting web container...')
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose restart web 2>&1')
    print(stdout.read().decode('utf-8', errors='replace'))
    
    time.sleep(5)
    
    # Create certbot directory
    print('\nCreating certbot directory...')
    stdin, stdout, stderr = ssh.exec_command('sudo mkdir -p /var/www/certbot && sudo chmod 755 /var/www/certbot')
    
    # Get SSL certificate
    print('\nGetting SSL certificate with certbot...')
    stdin, stdout, stderr = ssh.exec_command('sudo certbot certonly --webroot -w /var/www/certbot -d tgw.usdt2026.cc --non-interactive --agree-tos -m admin@usdt2026.cc 2>&1')
    print(stdout.read().decode('utf-8', errors='replace'))
    
    # Check if certificate was created
    stdin, stdout, stderr = ssh.exec_command('sudo ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/ 2>&1')
    result = stdout.read().decode('utf-8', errors='replace')
    print(result)
    ssl_exists = 'fullchain.pem' in result

if ssl_exists:
    print('\n=== Step 2: Update nginx.conf with HTTPS ===')
    
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
    
    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name tgw.usdt2026.cc;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }
    
    # HTTP server for IP access
    server {
        listen 80;
        server_name 165.154.210.154 localhost;
        
        root /usr/share/nginx/html;
        
        location /health {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
        
        location /api/ {
            proxy_pass http://api:8000/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_connect_timeout 120s;
            proxy_send_timeout 120s;
            proxy_read_timeout 120s;
        }
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl;
        http2 on;
        server_name tgw.usdt2026.cc;
        
        ssl_certificate /etc/letsencrypt/live/tgw.usdt2026.cc/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/tgw.usdt2026.cc/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        
        root /usr/share/nginx/html;
        
        location /health {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
        
        location /api/ {
            proxy_pass http://api:8000/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
            proxy_connect_timeout 120s;
            proxy_send_timeout 120s;
            proxy_read_timeout 120s;
        }
        
        location /ws {
            proxy_pass http://api:8000/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
'''
    
    sftp = ssh.open_sftp()
    with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
        f.write(nginx_https)
    sftp.close()
    print('nginx.conf updated with HTTPS')
    
    # Update docker-compose to mount SSL
    print('\n=== Step 3: Update docker-compose.yml ===')
    stdin, stdout, stderr = ssh.exec_command('cat /opt/tg-matrix/docker-compose.yml')
    compose = stdout.read().decode('utf-8', errors='replace')
    
    if '/etc/letsencrypt:/etc/letsencrypt:ro' not in compose:
        compose = compose.replace(
            '- ./dist:/usr/share/nginx/html:ro',
            '- ./dist:/usr/share/nginx/html:ro\n      - /etc/letsencrypt:/etc/letsencrypt:ro\n      - /var/www/certbot:/var/www/certbot:ro'
        )
        sftp = ssh.open_sftp()
        with sftp.file('/opt/tg-matrix/docker-compose.yml', 'w') as f:
            f.write(compose)
        sftp.close()
        print('docker-compose.yml updated')
    else:
        print('docker-compose.yml already has SSL mounts')
    
    # Restart web container
    print('\n=== Step 4: Restart web container ===')
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d web 2>&1')
    print(stdout.read().decode('utf-8', errors='replace'))

else:
    print('\n=== Running without HTTPS ===')

# Step 5: Check API send-code route
print('\n=== Step 5: Check API code ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api grep -n "send-code" api/http_server.py 2>&1 | head -20')
result = stdout.read().decode('utf-8', errors='replace')
print(result)

if not result or 'No such file' in result:
    print('send-code route may not exist, checking routes...')
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose exec -T api grep -n "route\|post\|accounts" api/http_server.py 2>&1 | head -30')
    print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(5)

# Step 6: Final status check
print('\n=== Step 6: Final Status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Test HTTP ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost/api/v1/accounts 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Test HTTPS ===')
stdin, stdout, stderr = ssh.exec_command('curl -s -k https://tgw.usdt2026.cc/api/v1/accounts 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
