#!/usr/bin/env python3
"""
SSL 證書配置腳本
使用 Let's Encrypt (Certbot) 生成 SSL 證書
"""

import paramiko
import time

# HTTP-only nginx config for certbot verification
NGINX_HTTP_CONFIG = '''
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
    
    server {
        listen 80;
        server_name tgw.usdt2026.cc 165.154.210.154 localhost;
        
        root /usr/share/nginx/html;
        index index.html;
        
        # Certbot verification
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

# HTTPS nginx config (after certificate is obtained)
NGINX_HTTPS_CONFIG = '''
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
    
    # HTTP for IP access (no redirect)
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
'''

def run_command(ssh, cmd, timeout=60):
    """Run command and return output"""
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    return out, err

def main():
    print("=" * 50)
    print("SSL Certificate Setup for tgw.usdt2026.cc")
    print("=" * 50)
    
    # Connect
    print("\n[1/6] Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)
    print("Connected!")
    
    # Create certbot directories
    print("\n[2/6] Creating certbot directories...")
    run_command(ssh, 'sudo mkdir -p /opt/tg-matrix/certbot/conf')
    run_command(ssh, 'sudo mkdir -p /opt/tg-matrix/certbot/www')
    run_command(ssh, 'sudo chown -R ubuntu:ubuntu /opt/tg-matrix/certbot')
    print("Done!")
    
    # Update nginx config for certbot verification
    print("\n[3/6] Updating nginx for certbot verification...")
    sftp = ssh.open_sftp()
    with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
        f.write(NGINX_HTTP_CONFIG)
    sftp.close()
    
    # Restart nginx
    out, err = run_command(ssh, 'cd /opt/tg-matrix && docker compose restart web')
    print(out or err)
    time.sleep(3)
    
    # Install certbot if needed
    print("\n[4/6] Installing/updating certbot...")
    out, err = run_command(ssh, 'sudo apt-get update && sudo apt-get install -y certbot', timeout=120)
    if 'certbot is already' in out or 'is already the newest' in out:
        print("Certbot already installed")
    else:
        print("Certbot installed")
    
    # Stop nginx temporarily for standalone mode
    print("\n[5/6] Obtaining SSL certificate...")
    print("Stopping nginx temporarily...")
    run_command(ssh, 'cd /opt/tg-matrix && docker compose stop web')
    time.sleep(2)
    
    # Run certbot
    print("Running certbot (this may take a minute)...")
    certbot_cmd = (
        'sudo certbot certonly --standalone '
        '-d tgw.usdt2026.cc '
        '--non-interactive --agree-tos '
        '--email admin@tg-matrix.com '
        '--http-01-port 80'
    )
    out, err = run_command(ssh, certbot_cmd, timeout=120)
    print(out)
    if err and 'error' in err.lower():
        print(f"Error: {err}")
    
    # Check if certificate was obtained
    out, _ = run_command(ssh, 'sudo ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/')
    if 'fullchain.pem' in out:
        print("\n✅ Certificate obtained successfully!")
        
        # Copy certificates to docker-accessible location
        print("Copying certificates...")
        run_command(ssh, 'sudo cp -rL /etc/letsencrypt/live /opt/tg-matrix/certbot/conf/')
        run_command(ssh, 'sudo cp -rL /etc/letsencrypt/archive /opt/tg-matrix/certbot/conf/')
        run_command(ssh, 'sudo chmod -R 755 /opt/tg-matrix/certbot/conf')
        
        # Update nginx to HTTPS config
        print("\n[6/6] Configuring HTTPS...")
        sftp = ssh.open_sftp()
        with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
            f.write(NGINX_HTTPS_CONFIG)
        sftp.close()
        
        # Update docker-compose to mount certificates correctly
        print("Updating docker-compose volumes...")
        run_command(ssh, '''
            cd /opt/tg-matrix && \
            sed -i 's|./certbot/conf:/etc/letsencrypt:ro|/etc/letsencrypt:/etc/letsencrypt:ro|' docker-compose.yml
        ''')
        
        # Start nginx
        print("Starting nginx with HTTPS...")
        out, err = run_command(ssh, 'cd /opt/tg-matrix && docker compose up -d web')
        print(out or err)
        time.sleep(3)
        
        # Verify
        print("\n=== Verification ===")
        out, _ = run_command(ssh, 'cd /opt/tg-matrix && docker compose ps')
        print(out)
        
        out, _ = run_command(ssh, 'curl -s http://localhost/health')
        print(f"HTTP Health: {out}")
        
        print("\n" + "=" * 50)
        print("✅ SSL Certificate configured successfully!")
        print("=" * 50)
        print("\nYou can now access:")
        print("  🔒 https://tgw.usdt2026.cc")
        print("  📡 http://165.154.210.154 (IP access)")
        
    else:
        print("\n❌ Failed to obtain certificate")
        print("Starting nginx without HTTPS...")
        run_command(ssh, 'cd /opt/tg-matrix && docker compose up -d web')
        print("\nPossible issues:")
        print("- Domain DNS not pointing to this server")
        print("- Port 80 blocked by firewall")
        print("- Rate limit exceeded")
    
    ssh.close()
    print("\nDone!")

if __name__ == '__main__':
    main()
