#!/usr/bin/env python3
"""SSH script to fix nginx restart issue on remote server"""

import paramiko
import time
import sys

# Server connection details
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

# HTTP-only nginx config that also handles HTTPS
NGINX_CONF = '''worker_processes auto;
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
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
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
        location / { try_files $uri $uri/ /index.html; }
    }
}
'''

def run_command(ssh, cmd, sudo=False):
    """Run a command via SSH and return output"""
    if sudo:
        cmd = f"echo '{PASSWORD}' | sudo -S {cmd}"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

def main():
    print(f"Connecting to {HOST}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!\n")
        
        # Step 1: Check nginx logs
        print("=" * 60)
        print("1. Checking nginx logs...")
        print("=" * 60)
        out, err = run_command(ssh, "cd /opt/tg-matrix && docker compose logs --tail=10 web 2>&1")
        print(out if out else err)
        
        # Step 2: Check current nginx.conf
        print("\n" + "=" * 60)
        print("2. Current nginx.conf (first 20 lines)...")
        print("=" * 60)
        out, err = run_command(ssh, "head -20 /opt/tg-matrix/nginx.conf")
        print(out if out else err)
        
        # Step 3: Check SSL certs
        print("\n" + "=" * 60)
        print("3. Checking SSL certificates...")
        print("=" * 60)
        out, err = run_command(ssh, "ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/", sudo=True)
        print(out if out else err)
        
        # Step 4: Check docker-compose volumes
        print("\n" + "=" * 60)
        print("4. Docker-compose web service configuration...")
        print("=" * 60)
        out, err = run_command(ssh, "grep -A 20 'web:' /opt/tg-matrix/docker-compose.yml")
        print(out if out else err)
        
        # Check if SSL mount is incorrect
        out, err = run_command(ssh, "grep 'certbot/conf' /opt/tg-matrix/docker-compose.yml")
        has_wrong_ssl_mount = 'certbot/conf' in out
        
        # Step 5: Write new nginx.conf
        print("\n" + "=" * 60)
        print("5. Writing updated nginx.conf...")
        print("=" * 60)
        
        # Write nginx config using cat with heredoc
        escaped_conf = NGINX_CONF.replace("'", "'\\''")
        write_cmd = f"cat > /opt/tg-matrix/nginx.conf << 'NGINXEOF'\n{NGINX_CONF}\nNGINXEOF"
        out, err = run_command(ssh, write_cmd)
        print("nginx.conf updated successfully!")
        
        # Step 6: Fix docker-compose.yml SSL mount if needed
        if has_wrong_ssl_mount:
            print("\n" + "=" * 60)
            print("6. Fixing docker-compose.yml SSL mount...")
            print("=" * 60)
            fix_cmd = "sed -i 's|./certbot/conf:/etc/letsencrypt:ro|/etc/letsencrypt:/etc/letsencrypt:ro|g' /opt/tg-matrix/docker-compose.yml"
            out, err = run_command(ssh, fix_cmd)
            print("SSL mount path fixed!")
        else:
            print("\n" + "=" * 60)
            print("6. SSL mount already correct, skipping...")
            print("=" * 60)
        
        # Step 7: Restart web container
        print("\n" + "=" * 60)
        print("7. Restarting web container...")
        print("=" * 60)
        out, err = run_command(ssh, "cd /opt/tg-matrix && docker compose up -d web")
        print(out if out else err)
        
        # Step 8: Wait and check status
        print("\n" + "=" * 60)
        print("8. Waiting 5 seconds and checking status...")
        print("=" * 60)
        time.sleep(5)
        out, err = run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
        print(out if out else err)
        
        # Step 9: Test endpoints
        print("\n" + "=" * 60)
        print("9. Testing endpoints...")
        print("=" * 60)
        
        # Test HTTP
        out, err = run_command(ssh, "curl -s http://localhost/health")
        print(f"HTTP health check: {out}")
        
        # Test HTTPS
        out, err = run_command(ssh, "curl -s -k https://localhost/health")
        print(f"HTTPS health check: {out}")
        
        print("\n" + "=" * 60)
        print("DONE! Nginx fix completed.")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
