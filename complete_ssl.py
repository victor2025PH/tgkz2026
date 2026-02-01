#!/usr/bin/env python3
import paramiko
import time

NGINX_HTTPS_CONFIG = """
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
                    '"$http_user_agent"';
    
    access_log /var/log/nginx/access.log main;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    
    # HTTP - redirect to HTTPS
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
    
    # HTTP for IP access
    server {
        listen 80;
        server_name 165.154.210.154 localhost;
        
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
        }
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    
    # HTTPS
    server {
        listen 443 ssl http2;
        server_name tgw.usdt2026.cc;
        
        ssl_certificate /etc/letsencrypt/live/tgw.usdt2026.cc/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/tgw.usdt2026.cc/privkey.pem;
        
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
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
            proxy_set_header X-Forwarded-Proto https;
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
"""

def main():
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

    print("Updating docker-compose for SSL...")
    stdin, stdout, stderr = ssh.exec_command(
        "cd /opt/tg-matrix && "
        "sed -i 's|./certbot/conf:/etc/letsencrypt:ro|/etc/letsencrypt:/etc/letsencrypt:ro|' docker-compose.yml"
    )
    stdout.read()

    print("Updating nginx.conf...")
    sftp = ssh.open_sftp()
    with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
        f.write(NGINX_HTTPS_CONFIG)
    sftp.close()

    print("Starting nginx with HTTPS...")
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose up -d web')
    print(stdout.read().decode())
    time.sleep(5)

    print("=== Container Status ===")
    stdin, stdout, stderr = ssh.exec_command('cd /opt/tg-matrix && docker compose ps')
    print(stdout.read().decode())

    print("=== Testing ===")
    stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost/health')
    print("HTTP:", stdout.read().decode())

    stdin, stdout, stderr = ssh.exec_command('curl -sk https://localhost/health')
    print("HTTPS:", stdout.read().decode())

    ssh.close()
    print("\nSSL Configuration Complete!")
    print("Access: https://tgw.usdt2026.cc")

if __name__ == '__main__':
    main()
