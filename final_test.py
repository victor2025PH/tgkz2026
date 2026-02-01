#!/usr/bin/env python3
"""Final test - fix nginx and test send-code"""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

# Fix nginx config
print('=== Step 1: Write nginx.conf (HTTP only) ===')
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
print('Done')

print('\n=== Step 2: Restart web container ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose restart web 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

time.sleep(5)

print('\n=== Step 3: Check status ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 4: Test send-code directly ===')
# Need actual API credentials
stdin, stdout, stderr = ssh.exec_command('''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118"}}' 2>&1''')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 5: Get credentials list ===')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:8000/api/v1/credentials')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Step 6: Check API logs for send-code ===')
stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose logs --tail=20 api 2>&1 | grep -i "send"')
output = stdout.read().decode('utf-8', errors='replace')
output = ''.join(c if ord(c) < 128 else '?' for c in output)
print(output if output else 'No send-code logs found')

ssh.close()
print('\nDone!')
