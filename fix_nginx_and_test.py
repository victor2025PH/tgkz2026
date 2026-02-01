#!/usr/bin/env python3
"""Fix nginx and test send-code"""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Step 1: Check nginx logs ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=10 web 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 2: Check SSL cert ===')
stdin, stdout, stderr = ssh.exec_command('sudo ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/ 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 3: Update nginx.conf (HTTP only for now) ===')
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
    f.write(nginx_http)
sftp.close()
print('nginx.conf updated to HTTP only')

print('\n=== Step 4: Restart web container ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose restart web 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(5)

print('\n=== Step 5: Check container status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 6: Test API via nginx ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost/api/v1/accounts')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 7: Test send-code via API ===')
stdin, stdout, stderr = ssh.exec_command('''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}' 2>&1''')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
