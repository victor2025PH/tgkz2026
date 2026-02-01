#!/usr/bin/env python3
"""Fix nginx SSL issue on server"""

import paramiko
import time

NGINX_CONFIG = '''
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    
    server {
        listen 80;
        server_name tgw.usdt2026.cc 165.154.210.154 localhost;
        
        root /usr/share/nginx/html;
        index index.html;
        
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
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        location /ws {
            proxy_pass http://api:8000/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
'''

def main():
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)
    
    # Write nginx config via SFTP
    print("Updating nginx.conf...")
    sftp = ssh.open_sftp()
    with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
        f.write(NGINX_CONFIG)
    sftp.close()
    
    # Restart web container
    print("Restarting nginx...")
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose restart web')
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    # Wait
    time.sleep(5)
    
    # Check status
    print("\n=== Container Status ===")
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
    print(stdout.read().decode())
    
    # Test health
    print("=== Health Check ===")
    stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost/health')
    result = stdout.read().decode()
    print(f"Health: {result}")
    
    ssh.close()
    print("\nDone!")

if __name__ == '__main__':
    main()
